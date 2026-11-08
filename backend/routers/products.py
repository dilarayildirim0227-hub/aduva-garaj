from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_
from typing import Optional, List
from math import ceil

from database import get_db
from models import Product, Category, Brand
from schemas import (
    ProductResponse, ProductListResponse, CategoryResponse, BrandResponse,
    VehicleWizardStep, VehicleResponse
)

router = APIRouter(prefix="/products", tags=["products"])


def calculate_discount(old_price: Optional[float], price: float) -> int:
    """İndirim yüzdesini hesapla."""
    if old_price and old_price > price:
        return round((old_price - price) / old_price * 100)
    return 0


def product_to_response(product: Product, vehicle_compat: Optional[dict] = None) -> ProductResponse:
    """Product modelini ProductResponse'a dönüştür."""
    discount = calculate_discount(product.old_price, product.price)
    installment = round(product.price / 6, 2) if product.price else 0
    badge = product.badge_type
    if vehicle_compat and vehicle_compat.get("compatible"):
        badge = "Tam Uyum"
    return ProductResponse(
        id=product.id,
        sku=product.sku,
        oem_no=product.oem_no,
        title=product.title,
        description=product.description,
        brand_id=product.brand_id,
        category_id=product.category_id,
        image=product.image,
        price=product.price,
        old_price=product.old_price,
        stock=product.stock,
        rating=product.rating,
        review_count=product.review_count,
        badge_type=badge,
        free_shipping=product.free_shipping,
        compat_json=product.compat_json,
        created_at=product.created_at,
        discount_percent=discount,
        installment_6=installment,
        in_stock=product.stock > 0,
        category=CategoryResponse.model_validate(product.category) if product.category else None,
        brand=BrandResponse.model_validate(product.brand) if product.brand else None,
    )


@router.get("", response_model=ProductListResponse)
def list_products(
    q: Optional[str] = Query(None, description="Arama terimi"),
    category: Optional[str] = Query(None, description="Kategori slug"),
    brand: Optional[str] = Query(None, description="Marka slug"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum fiyat"),
    max_price: Optional[float] = Query(None, ge=0, description="Maksimum fiyat"),
    sort: Optional[str] = Query("featured", description="Sıralama: featured, price_asc, price_desc, rating, discount, newest"),
    vehicle: Optional[str] = Query(None, description="Araç ID (JSON string)"),
    page: int = Query(1, ge=1),
    limit: int = Query(105, ge=1, le=105),
    db: Session = Depends(get_db),
):
    """Ürün listeleme, filtreleme, arama ve sıralama."""
    query = db.query(Product)

    # Arama filtresi
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Product.title.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.oem_no.ilike(search_term),
                Brand.name.ilike(search_term),
            )
        ).join(Brand, Product.brand_id == Brand.id, isouter=True)

    # Kategori filtresi
    if category:
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)

    # Marka filtresi
    if brand:
        br = db.query(Brand).filter(Brand.slug == brand).first()
        if br:
            query = query.filter(Product.brand_id == br.id)

    # Fiyat aralığı
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    # Araç uyumluluk filtresi
    vehicle_compat_map = {}
    if vehicle:
        try:
            import json
            vehicle_data = json.loads(vehicle)
            # Tüm ürünleri çekip Python'da filtrele (JSON içinde arama için)
            all_products = query.all()
            filtered_ids = []
            for p in all_products:
                if p.compat_json:
                    for compat in p.compat_json:
                        if (compat.get("make") == vehicle_data.get("make") and
                            compat.get("model") == vehicle_data.get("model") and
                            compat.get("year_start") <= vehicle_data.get("year") <= compat.get("year_end")):
                            filtered_ids.append(p.id)
                            vehicle_compat_map[p.id] = {"compatible": True}
                            break
            if filtered_ids:
                query = db.query(Product).filter(Product.id.in_(filtered_ids))
            else:
                query = db.query(Product).filter(Product.id == -1)  # boş sonuç
        except Exception:
            pass

    # Sıralama
    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    elif sort == "discount":
        # İndirimli ürünler önce (Python tarafında hesaplanacağı için hepsini çekip sıralayacağız)
        pass
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    else:  # featured
        query = query.order_by(Product.rating.desc(), Product.review_count.desc())

    # Toplam sayı
    total = query.count()

    # Sayfalama (limit 105 olduğu için hepsini çekeriz)
    products = query.offset((page - 1) * limit).limit(limit).all()

    # İndirim sıralaması Python tarafında
    if sort == "discount":
        products.sort(key=lambda p: calculate_discount(p.old_price, p.price), reverse=True)

    # Kategori sayıları
    category_counts = {}
    categories = db.query(Category).all()
    for cat in categories:
        count = db.query(Product).filter(Product.category_id == cat.id).count()
        category_counts[cat.slug] = count
    category_counts["all"] = db.query(Product).count()

    return ProductListResponse(
        products=[product_to_response(p, vehicle_compat_map.get(p.id)) for p in products],
        total=total,
        category_counts=category_counts,
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Tek ürün detayı."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return product_to_response(product)


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """Tüm kategoriler (ürün sayılarıyla)."""
    categories = db.query(Category).order_by(Category.sort_order).all()
    result = []
    for cat in categories:
        count = db.query(Product).filter(Product.category_id == cat.id).count()
        result.append(CategoryResponse(
            id=cat.id, name=cat.name, slug=cat.slug, icon=cat.icon,
            sort_order=cat.sort_order, product_count=count
        ))
    return result


@router.get("/brands", response_model=List[BrandResponse])
def list_brands(db: Session = Depends(get_db)):
    """Tüm markalar (ürün sayılarıyla)."""
    brands = db.query(Brand).order_by(Brand.sort_order).all()
    result = []
    for br in brands:
        count = db.query(Product).filter(Product.brand_id == br.id).count()
        result.append(BrandResponse(
            id=br.id, name=br.name, slug=br.slug, sort_order=br.sort_order,
            product_count=count
        ))
    return result


# --- Araç Sihirbazı Endpointleri ---

@router.get("/vehicles/makes", response_model=List[str])
def get_makes(db: Session = Depends(get_db)):
    """Tüm markaları getir."""
    from models import Vehicle
    makes = db.query(Vehicle.make).distinct().order_by(Vehicle.make).all()
    return [m[0] for m in makes]


@router.get("/vehicles/models", response_model=List[str])
def get_models(make: str = Query(...), db: Session = Depends(get_db)):
    """Seçili markaya göre modelleri getir."""
    from models import Vehicle
    models = db.query(Vehicle.model).filter(Vehicle.make == make).distinct().order_by(Vehicle.model).all()
    return [m[0] for m in models]


@router.get("/vehicles/years", response_model=List[int])
def get_years(make: str = Query(...), model: str = Query(...), db: Session = Depends(get_db)):
    """Seçili marka+modele göre yılları getir."""
    from models import Vehicle
    vehicles = db.query(Vehicle).filter(Vehicle.make == make, Vehicle.model == model).all()
    years = set()
    for v in vehicles:
        years.update(range(v.year_start, v.year_end + 1))
    return sorted(years)


@router.get("/vehicles/engines", response_model=List[str])
def get_engines(make: str = Query(...), model: str = Query(...), year: int = Query(...), db: Session = Depends(get_db)):
    """Seçili marka+model+yıla göre motorları getir."""
    from models import Vehicle
    vehicles = db.query(Vehicle).filter(
        Vehicle.make == make,
        Vehicle.model == model,
        Vehicle.year_start <= year,
        Vehicle.year_end >= year
    ).all()
    engines = set()
    for v in vehicles:
        if v.engine:
            engines.add(v.engine)
    return sorted(engines)


@router.get("/vehicles/wizard", response_model=VehicleWizardStep)
def get_wizard_step(
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Sihirbaz adım verisi (tek endpoint)."""
    from models import Vehicle
    result = VehicleWizardStep()

    if not make:
        makes = db.query(Vehicle.make).distinct().order_by(Vehicle.make).all()
        result.makes = [m[0] for m in makes]
        return result

    if not model:
        models = db.query(Vehicle.model).filter(Vehicle.make == make).distinct().order_by(Vehicle.model).all()
        result.models = [m[0] for m in models]
        return result

    if not year:
        vehicles = db.query(Vehicle).filter(Vehicle.make == make, Vehicle.model == model).all()
        years = set()
        for v in vehicles:
            years.update(range(v.year_start, v.year_end + 1))
        result.years = sorted(years)
        return result

    vehicles = db.query(Vehicle).filter(
        Vehicle.make == make, Vehicle.model == model,
        Vehicle.year_start <= year, Vehicle.year_end >= year
    ).all()
    engines = set()
    for v in vehicles:
        if v.engine:
            engines.add(v.engine)
    result.engines = sorted(engines)
    return result
