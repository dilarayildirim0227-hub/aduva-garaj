from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import CartItem, Product, User
from schemas import (
    CartItemCreate, CartItemUpdate, CartItemResponse, CartResponse,
    ErrorResponse
)
from auth import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


FREE_SHIPPING_THRESHOLD = 750.0


def calculate_cart_totals(items: List[CartItem]) -> tuple:
    """Sepet toplamlarını hesapla."""
    subtotal = sum(item.qty * item.product.price for item in items)
    shipping = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else 29.99
    total = subtotal + shipping
    installment = round(total / 6, 2)
    return subtotal, shipping, total, installment


def build_cart_response(items: List[CartItem]) -> CartResponse:
    """Sepet yanıtı oluştur."""
    item_responses = []
    for item in items:
        if not item.product:
            continue
        discount = 0
        if item.product.old_price and item.product.old_price > item.product.price:
            discount = round((item.product.old_price - item.product.price) / item.product.old_price * 100)
        installment = round(item.product.price / 6, 2)
        item_responses.append(CartItemResponse(
            id=item.id,
            product_id=item.product_id,
            qty=item.qty,
            product=ProductResponse(
                id=item.product.id,
                sku=item.product.sku,
                oem_no=item.product.oem_no,
                title=item.product.title,
                description=item.product.description,
                brand_id=item.product.brand_id,
                category_id=item.product.category_id,
                image=item.product.image,
                price=item.product.price,
                old_price=item.product.old_price,
                stock=item.product.stock,
                rating=item.product.rating,
                review_count=item.product.review_count,
                badge_type=item.product.badge_type,
                free_shipping=item.product.free_shipping,
                compat_json=item.product.compat_json,
                created_at=item.product.created_at,
                discount_percent=discount,
                installment_6=installment,
                in_stock=item.product.stock > 0,
            ),
            line_total=item.qty * item.product.price,
        ))
    subtotal, shipping, total, installment = calculate_cart_totals(items)
    return CartResponse(
        items=item_responses,
        subtotal=subtotal,
        shipping_cost=shipping,
        total=total,
        installment_6=installment,
        item_count=sum(item.qty for item in items),
    )


@router.get("", response_model=CartResponse)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Kullanıcının sepetini getir."""
    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    return build_cart_response(items)


@router.post("", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    item_data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sepete ürün ekle."""
    product = db.query(Product).filter(Product.id == item_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.stock < item_data.qty:
        raise HTTPException(status_code=400, detail=f"Yetersiz stok. Mevcut: {product.stock}")

    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == item_data.product_id
    ).first()

    if existing:
        new_qty = existing.qty + item_data.qty
        if product.stock < new_qty:
            raise HTTPException(status_code=400, detail=f"Yetersiz stok. Mevcut: {product.stock}")
        existing.qty = new_qty
        db.commit()
        db.refresh(existing)
        item = existing
    else:
        item = CartItem(
            user_id=current_user.id,
            product_id=item_data.product_id,
            qty=item_data.qty
        )
        db.add(item)
        db.commit()
        db.refresh(item)

    db.refresh(item, attribute_names=["product"])
    discount = 0
    if item.product.old_price and item.product.old_price > item.product.price:
        discount = round((item.product.old_price - item.product.price) / item.product.old_price * 100)
    return CartItemResponse(
        id=item.id,
        product_id=item.product_id,
        qty=item.qty,
        product=ProductResponse(
            id=item.product.id,
            sku=item.product.sku,
            oem_no=item.product.oem_no,
            title=item.product.title,
            description=item.product.description,
            brand_id=item.product.brand_id,
            category_id=item.product.category_id,
            image=item.product.image,
            price=item.product.price,
            old_price=item.product.old_price,
            stock=item.product.stock,
            rating=item.product.rating,
            review_count=item.product.review_count,
            badge_type=item.product.badge_type,
            free_shipping=item.product.free_shipping,
            compat_json=item.product.compat_json,
            created_at=item.product.created_at,
            discount_percent=discount,
            installment_6=round(item.product.price / 6, 2),
            in_stock=item.product.stock > 0,
        ),
        line_total=item.qty * item.product.price,
    )


@router.patch("/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    update_data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sepet ürün adedini güncelle."""
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Sepet öğesi bulunamadı")

    if item.product.stock < update_data.qty:
        raise HTTPException(status_code=400, detail=f"Yetersiz stok. Mevcut: {item.product.stock}")

    item.qty = update_data.qty
    db.commit()
    db.refresh(item)

    discount = 0
    if item.product.old_price and item.product.old_price > item.product.price:
        discount = round((item.product.old_price - item.product.price) / item.product.old_price * 100)
    return CartItemResponse(
        id=item.id,
        product_id=item.product_id,
        qty=item.qty,
        product=ProductResponse(
            id=item.product.id,
            sku=item.product.sku,
            oem_no=item.product.oem_no,
            title=item.product.title,
            description=item.product.description,
            brand_id=item.product.brand_id,
            category_id=item.product.category_id,
            image=item.product.image,
            price=item.product.price,
            old_price=item.product.old_price,
            stock=item.product.stock,
            rating=item.product.rating,
            review_count=item.product.review_count,
            badge_type=item.product.badge_type,
            free_shipping=item.product.free_shipping,
            compat_json=item.product.compat_json,
            created_at=item.product.created_at,
            discount_percent=discount,
            installment_6=round(item.product.price / 6, 2),
            in_stock=item.product.stock > 0,
        ),
        line_total=item.qty * item.product.price,
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sepetten ürün çıkar."""
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Sepet öğesi bulunamadı")
    db.delete(item)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sepeti tamamen temizle."""
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()


@router.post("/merge", response_model=CartResponse)
def merge_guest_cart(
    guest_items: List[CartItemCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Misafir sepetini üye sepetine birleştir."""
    for guest_item in guest_items:
        product = db.query(Product).filter(Product.id == guest_item.product_id).first()
        if not product:
            continue
        if product.stock < guest_item.qty:
            continue

        existing = db.query(CartItem).filter(
            CartItem.user_id == current_user.id,
            CartItem.product_id == guest_item.product_id
        ).first()

        if existing:
            new_qty = existing.qty + guest_item.qty
            if product.stock >= new_qty:
                existing.qty = new_qty
        else:
            new_item = CartItem(
                user_id=current_user.id,
                product_id=guest_item.product_id,
                qty=guest_item.qty
            )
            db.add(new_item)
    db.commit()

    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    return build_cart_response(items)


# ProductResponse import'u için (circular import önleme)
from schemas import ProductResponse
