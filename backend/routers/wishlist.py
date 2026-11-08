from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import WishlistItem, Product
from schemas import WishlistItemCreate, WishlistItemResponse
from auth import get_current_user

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=List[WishlistItemResponse])
def get_wishlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Kullanıcının favori listesini getir."""
    items = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
    result = []
    for item in items:
        if not item.product:
            continue
        discount = 0
        if item.product.old_price and item.product.old_price > item.product.price:
            discount = round((item.product.old_price - item.product.price) / item.product.old_price * 100)
        installment = round(item.product.price / 6, 2)
        result.append(WishlistItemResponse(
            id=item.id,
            product_id=item.product_id,
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
            )
        ))
    return result


@router.post("", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    item_data: WishlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Favorilere ekle."""
    product = db.query(Product).filter(Product.id == item_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == item_data.product_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ürün zaten favorilerinizde")

    item = WishlistItem(user_id=current_user.id, product_id=item_data.product_id)
    db.add(item)
    db.commit()
    db.refresh(item)

    discount = 0
    if product.old_price and product.old_price > product.price:
        discount = round((product.old_price - product.price) / product.old_price * 100)
    return WishlistItemResponse(
        id=item.id,
        product_id=item.product_id,
        product=ProductResponse(
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
            badge_type=product.badge_type,
            free_shipping=product.free_shipping,
            compat_json=product.compat_json,
            created_at=product.created_at,
            discount_percent=discount,
            installment_6=round(product.price / 6, 2),
            in_stock=product.stock > 0,
        )
    )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Favorilerden çıkar."""
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Favori öğesi bulunamadı")
    db.delete(item)
    db.commit()


# ProductResponse import'u için
from schemas import ProductResponse
