from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import csv
import io

from database import get_db
from models import User, Product, Order, OrderItem
from schemas import AdminOrderUpdate, AdminProductUpdate, N11SyncResponse, OrderResponse, OrderItemResponse, ProductResponse
from auth import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/orders", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Tüm siparişleri listele (admin)."""
    query = db.query(Order).order_by(Order.created_at.desc())
    if status_filter:
        query = query.filter(Order.status == status_filter)
    orders = query.offset(offset).limit(limit).all()

    result = []
    for order in orders:
        items = []
        for oi in order.items:
            if not oi.product:
                continue
            discount = 0
            if oi.product.old_price and oi.product.old_price > oi.product.price:
                discount = round((oi.product.old_price - oi.product.price) / oi.product.old_price * 100)
            items.append(OrderItemResponse(
                id=oi.id, product_id=oi.product_id, qty=oi.qty, price=oi.price,
                product=ProductResponse(
                    id=oi.product.id, sku=oi.product.sku, oem_no=oi.product.oem_no,
                    title=oi.product.title, description=oi.product.description,
                    brand_id=oi.product.brand_id, category_id=oi.product.category_id,
                    image=oi.product.image, price=oi.product.price, old_price=oi.product.old_price,
                    stock=oi.product.stock, rating=oi.product.rating, review_count=oi.product.review_count,
                    badge_type=oi.product.badge_type, free_shipping=oi.product.free_shipping,
                    compat_json=oi.product.compat_json, created_at=oi.product.created_at,
                    discount_percent=discount, installment_6=round(oi.product.price / 6, 2),
                    in_stock=oi.product.stock > 0,
                )
            ))
        result.append(OrderResponse(
            id=order.id, status=order.status, total=order.total, shipping_cost=order.shipping_cost,
            shipping_address=order.shipping_address, tracking_number=order.tracking_number,
            created_at=order.created_at, items=items
        ))
    return result


@router.patch("/orders/{order_id}/shipment")
def update_order_shipment(
    order_id: int,
    update_data: AdminOrderUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Sipariş durumu ve kargo takip no güncelle."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    if update_data.status:
        valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        if update_data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Geçersiz durum")
        order.status = update_data.status

    if update_data.tracking_number is not None:
        order.tracking_number = update_data.tracking_number

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return {"message": "Sipariş güncellendi", "order_id": order.id}


@router.patch("/products/{product_id}")
def update_product_admin(
    product_id: int,
    update_data: AdminProductUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Ürün fiyat/stok güncelle (admin)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    if update_data.price is not None:
        if update_data.price < 0:
            raise HTTPException(status_code=400, detail="Fiyat negatif olamaz")
        product.price = update_data.price
    if update_data.old_price is not None:
        product.old_price = update_data.old_price
    if update_data.stock is not None:
        if update_data.stock < 0:
            raise HTTPException(status_code=400, detail="Stok negatif olamaz")
        product.stock = update_data.stock

    db.commit()
    db.refresh(product)

    discount = 0
    if product.old_price and product.old_price > product.price:
        discount = round((product.old_price - product.price) / product.old_price * 100)
    return ProductResponse(
        id=product.id, sku=product.sku, oem_no=product.oem_no, title=product.title,
        description=product.description, brand_id=product.brand_id, category_id=product.category_id,
        image=product.image, price=product.price, old_price=product.old_price, stock=product.stock,
        rating=product.rating, review_count=product.review_count, badge_type=product.badge_type,
        free_shipping=product.free_shipping, compat_json=product.compat_json,
        created_at=product.created_at, discount_percent=discount,
        installment_6=round(product.price / 6, 2), in_stock=product.stock > 0,
    )


@router.post("/n11/sync", response_model=N11SyncResponse)
def n11_sync(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """n11 Delta Senkronizasyonu (simülasyon)."""
    # Gerçek uygulamada n11 API'si çağrılır
    # Burada simülasyon: rastgele 0-15 arası ürün güncellendi gibi döndür
    import random
    updated = random.randint(0, 15)
    now = datetime.utcnow()
    return N11SyncResponse(
        last_sync=now,
        updated_count=updated,
        message=f"n11 Delta senkronizasyonu tamamlandı. {updated} ürün güncellendi."
    )


@router.get("/reports/orders.csv")
def export_orders_csv(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Siparişler CSV raporu indir."""
    query = db.query(Order).order_by(Order.created_at.desc())
    if status_filter:
        query = query.filter(Order.status == status_filter)
    orders = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Sipariş No", "Tarih", "Müşteri", "E-posta", "Durum",
        "Ara Toplam", "Kargo", "Toplam", "Kargo Takip No", "Teslimat Adresi"
    ])

    for order in orders:
        writer.writerow([
            order.id,
            order.created_at.strftime("%d.%m.%Y %H:%M"),
            order.user.name if order.user else "-",
            order.user.email if order.user else "-",
            order.status,
            f"{order.total - order.shipping_cost:.2f}",
            f"{order.shipping_cost:.2f}",
            f"{order.total:.2f}",
            order.tracking_number or "-",
            order.shipping_address or "-",
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="siparisler_{datetime.now().strftime("%Y%m%d")}.csv"'}
    )
