from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from database import get_db
from models import Product, Vehicle
from schemas import VINLookupRequest, VINLookupResponse, ProductResponse, VehicleResponse
from auth import get_current_user

router = APIRouter(prefix="/vin", tags=["vin"])


# Basit VIN -> Araç eşleştirme (demo için)
# Gerçek uygulamada bu bir dış API veya veritabanı sorgusu olurdu
VIN_DATABASE = {
    "WVWZZZ1KZ9W123456": {"make": "Volkswagen", "model": "Golf 7", "year": 2018, "engine": "1.5 TSI"},
    "VF1RZG00H56789012": {"make": "Renault", "model": "Clio 5", "year": 2020, "engine": "1.0 TCe"},
    "JTDKN3DU3F1234567": {"make": "Toyota", "model": "Corolla", "year": 2021, "engine": "1.8 Hybrid"},
    "VF35R5HZ5KL123456": {"make": "Peugeot", "model": "3008 II", "year": 2019, "engine": "1.5 BlueHDi"},
    "WF0MXXGCD5NM12345": {"make": "Ford", "model": "Puma", "year": 2020, "engine": "1.0 EcoBoost"},
    "ZFA31200012345678": {"make": "Fiat", "model": "Egea", "year": 2019, "engine": "1.3 MJET"},
    "W0LZT6FF5K1123456": {"make": "Opel", "model": "Astra K", "year": 2018, "engine": "1.4 Turbo"},
}


def find_vehicle_from_vin(vin: str) -> Optional[dict]:
    """VIN'den araç bilgisi bul (demo)."""
    return VIN_DATABASE.get(vin.upper())


def find_compatible_products(db: Session, vehicle: dict) -> List[Product]:
    """Araca uygun ürünleri bul."""
    make = vehicle.get("make")
    model = vehicle.get("model")
    year = vehicle.get("year")

    if not all([make, model, year]):
        return []

    products = db.query(Product).all()
    compatible = []
    for p in products:
        if p.compat_json:
            for compat in p.compat_json:
                if (compat.get("make") == make and
                    compat.get("model") == model and
                    compat.get("year_start") <= year <= compat.get("year_end")):
                    compatible.append(p)
                    break
    return compatible


@router.post("/lookup", response_model=VINLookupResponse)
def lookup_vin(request: VINLookupRequest, db: Session = Depends(get_db)):
    """VIN ile araç sorgula ve uyumlu ürünleri getir."""
    vin = request.vin.strip().upper()

    # VIN doğrulama (schema'da zaten var ama tekrar kontrol)
    if len(vin) != 17:
        raise HTTPException(status_code=400, detail="VIN 17 karakter olmalıdır")
    forbidden = {"I", "O", "Q"}
    if any(c in forbidden for c in vin):
        raise HTTPException(status_code=400, detail="VIN I, O, Q harflerini içeremez")

    vehicle_data = find_vehicle_from_vin(vin)

    if not vehicle_data:
        return VINLookupResponse(
            vin=vin,
            vehicle=None,
            compatible_products=[],
            message="Bu VIN numarası sistemimizde kayıtlı değil. Lütfen doğru girdiğinizden emin olun veya manuel araç seçin."
        )

    # Araç veritabanında varsa getir, yoksa oluştur
    vehicle = db.query(Vehicle).filter(
        Vehicle.make == vehicle_data["make"],
        Vehicle.model == vehicle_data["model"],
        Vehicle.year_start <= vehicle_data["year"],
        Vehicle.year_end >= vehicle_data["year"]
    ).first()

    vehicle_resp = None
    if vehicle:
        vehicle_resp = VehicleResponse.model_validate(vehicle)

    compatible = find_compatible_products(db, vehicle_data)

    product_responses = []
    for p in compatible:
        discount = 0
        if p.old_price and p.old_price > p.price:
            discount = round((p.old_price - p.price) / p.old_price * 100)
        product_responses.append(ProductResponse(
            id=p.id, sku=p.sku, oem_no=p.oem_no, title=p.title,
            description=p.description, brand_id=p.brand_id, category_id=p.category_id,
            image=p.image, price=p.price, old_price=p.old_price, stock=p.stock,
            rating=p.rating, review_count=p.review_count, badge_type="Tam Uyum",
            free_shipping=p.free_shipping, compat_json=p.compat_json,
            created_at=p.created_at, discount_percent=discount,
            installment_6=round(p.price / 6, 2), in_stock=p.stock > 0,
        ))

    return VINLookupResponse(
        vin=vin,
        vehicle=vehicle_resp,
        compatible_products=product_responses,
        message=f"{vehicle_data['make']} {vehicle_data['model']} ({vehicle_data['year']}) aracı bulundu. {len(product_responses)} uyumlu ürün listeleniyor."
    )
