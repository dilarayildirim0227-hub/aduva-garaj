from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
import uuid
import secrets
from datetime import datetime

from app.database import get_db
from app.services.core import AuthService, CartService, ProductService, SearchService
from app.models.entities import (
    Cart, CartItem, Product, Coupon, User, Address, Vehicle,
    UserVehicle, Category, Order, OrderItem, PaymentTransaction,
    Shipment, ReturnRequest, ReturnItem, Banner, Appointment,
    Settings, Role, ProductStatus, OrderSource, OrderStatus,
    PaymentMethod, CouponType, AppointmentStatus,
    StockMovementReason, PriceHistorySource
)
from app.schemas.models import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    AddressCreate, AddressResponse, VehicleResponse, VehicleHierarchy,
    UserVehicleCreate, UserVehicleResponse, ProductListItem, ProductDetail,
    ProductCreate, ProductUpdate, FitmentCheckRequest, FitmentCheckResponse,
    CategoryResponse, CartItemCreate, CartItemUpdate, CartItemResponse,
    CartSummary, CartResponse, CouponApplyRequest, CouponResponse,
    OrderResponse, CheckoutRequest, CheckoutResponse, CouponCreate,
    AdminDashboardResponse, PriceStockUpdateRequest, SearchRequest,
    SearchResponse, ConsentRequest, ConsentResponse, NotificationResponse,
    PaginatedResponse
)
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix=settings.API_PREFIX)


# =============================================================================
# Auth Dependencies
# =============================================================================

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
) -> UserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    try:
        payload = AuthService.decode_token(token, settings.JWT_SECRET)
        user_id = uuid.UUID(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return UserResponse.model_validate(user)


async def get_optional_user(
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
) -> Optional[UserResponse]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(db, authorization)
    except HTTPException:
        return None


def require_role(*roles: str):
    async def _check_role(user: UserResponse = Depends(get_current_user)):
        if user.role.value not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return _check_role


# =============================================================================
# Auth Routes
# =============================================================================

@router.post("/auth/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await AuthService.register(db, data)
        return await AuthService.create_tokens(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.login(db, data)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return await AuthService.create_tokens(user)


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(user: UserResponse = Depends(get_current_user)):
    return user


# =============================================================================
# Vehicle / Fitment Routes
# =============================================================================

@router.get("/fitment/hierarchy", response_model=VehicleHierarchy)
async def get_vehicle_hierarchy(db: AsyncSession = Depends(get_db)):
    return await ProductService.get_vehicle_hierarchy(db)


@router.get("/fitment/check", response_model=FitmentCheckResponse)
async def check_fitment(
    product_id: uuid.UUID = Query(...),
    vehicle_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await ProductService.check_fitment(db, product_id, vehicle_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# =============================================================================
# Product Routes
# =============================================================================

@router.get("/products", response_model=PaginatedResponse)
async def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[uuid.UUID] = None,
    vehicle_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    result = await ProductService.list_products(
        db, page, limit, category_id, vehicle_id, search, is_featured
    )
    return result


@router.get("/products/{product_id}", response_model=ProductDetail)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    product = await ProductService.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/products/slug/{slug}", response_model=ProductDetail)
async def get_product_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return await ProductService.get_product(db, product.id)


@router.post("/products", response_model=ProductDetail, dependencies=[Depends(require_role("ADMIN", "OPERATIONS", "STAFF"))])
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return await ProductService.get_product(db, product.id)


@router.patch("/products/{product_id}", response_model=ProductDetail, dependencies=[Depends(require_role("ADMIN", "OPERATIONS", "STAFF"))])
async def update_product(product_id: uuid.UUID, data: ProductUpdate, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    product.version += 1
    await db.commit()
    await db.refresh(product)
    return await ProductService.get_product(db, product_id)


# =============================================================================
# Category Routes
# =============================================================================

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category).where(Category.parent_id.is_(None))
        .order_by(Category.sort_order)
    )
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]


# =============================================================================
# Cart Routes
# =============================================================================

async def get_cart(
    db: AsyncSession = Depends(get_db),
    user: Optional[UserResponse] = Depends(get_optional_user),
    x_cart_token: Optional[str] = Header(None)
) -> Cart:
    if user:
        result = await db.execute(
            select(Cart).where(Cart.user_id == user.id)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
        )
    else:
        if not x_cart_token:
            # Create anonymous cart token
            x_cart_token = secrets.token_urlsafe(32)
        result = await db.execute(
            select(Cart).where(Cart.token == x_cart_token)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
        )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = await CartService.get_or_create_cart(db, user.id if user else None, x_cart_token)
        # Reload cart with items relationship loaded
        result = await db.execute(
            select(Cart).where(Cart.id == cart.id)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
        )
        cart = result.scalar_one()
    return cart


@router.get("/cart", response_model=CartResponse)
async def get_cart_endpoint(cart: Cart = Depends(get_cart), db: AsyncSession = Depends(get_db)):
    return await CartService.get_cart_response(db, cart)


@router.get("/cart/summary", response_model=CartSummary)
async def get_cart_summary(cart: Cart = Depends(get_cart), db: AsyncSession = Depends(get_db)):
    coupon = None
    if cart.coupon_id:
        coupon = await db.get(Coupon, cart.coupon_id)
    totals = CartService.calculate_totals(cart.items, coupon)
    return CartSummary(
        item_count=sum(item.quantity for item in cart.items),
        total=totals["total"],
        free_shipping_remaining=totals["free_shipping_remaining"],
        free_shipping_threshold=settings.CART_FREE_SHIPPING_KURUS
    )


@router.post("/cart/items", response_model=CartItemResponse)
async def add_to_cart(
    data: CartItemCreate,
    cart: Cart = Depends(get_cart),
    db: AsyncSession = Depends(get_db)
):
    try:
        item = await CartService.add_item(db, cart, data)
        # Reload with product
        result = await db.execute(
            select(CartItem).where(CartItem.id == item.id)
            .options(selectinload(CartItem.product).selectinload(Product.images))
        )
        item = result.scalar_one()
        product = item.product
        images = [img.url for img in product.images] if product.images else []
        return CartItemResponse(
            id=item.id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            vehicle_id=item.vehicle_id,
            quantity=item.quantity,
            unit_price_snapshot=item.unit_price_snapshot,
            product=ProductListItem(
                id=product.id,
                seller_code=product.seller_code,
                oem_code=product.oem_code,
                title=product.title,
                slug=product.slug,
                brand=product.brand,
                price_kurus=product.price_kurus,
                list_price_kurus=product.list_price_kurus,
                lowest_price_30d_kurus=product.lowest_price_30d_kurus,
                vat_rate=product.vat_rate,
                currency=product.currency,
                stock=product.stock,
                status=product.status,
                is_universal=product.is_universal,
                is_featured=product.is_featured,
                is_hidden=product.is_hidden,
                requires_montage=product.requires_montage,
                rating_avg=product.rating_avg,
                rating_count=product.rating_count,
                sold_count=product.sold_count,
                image=images[0] if images else None,
                fitment_vehicle_ids=[]
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/cart/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: uuid.UUID,
    data: CartItemUpdate,
    cart: Cart = Depends(get_cart),
    db: AsyncSession = Depends(get_db)
):
    try:
        item = await CartService.update_item(db, cart, item_id, data)
        # Similar response building as above
        return await get_cart_endpoint(cart, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/cart/items/{item_id}")
async def remove_cart_item(
    item_id: uuid.UUID,
    cart: Cart = Depends(get_cart),
    db: AsyncSession = Depends(get_db)
):
    success = await CartService.remove_item(db, cart, item_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {"success": True}


@router.delete("/cart")
async def clear_cart(cart: Cart = Depends(get_cart), db: AsyncSession = Depends(get_db)):
    await CartService.clear_cart(db, cart)
    return {"success": True}


@router.post("/cart/coupon", response_model=CartResponse)
async def apply_coupon(
    data: CouponApplyRequest,
    cart: Cart = Depends(get_cart),
    db: AsyncSession = Depends(get_db)
):
    try:
        await CartService.apply_coupon(db, cart, data.code)
        return await CartService.get_cart_response(db, cart)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/cart/coupon", response_model=CartResponse)
async def remove_coupon(cart: Cart = Depends(get_cart), db: AsyncSession = Depends(get_db)):
    await CartService.remove_coupon(db, cart)
    return await CartService.get_cart_response(db, cart)


# =============================================================================
# Search Routes
# =============================================================================

@router.get("/search", response_model=SearchResponse)
async def search_products(
    q: str = Query(..., min_length=1),
    vehicle_id: Optional[uuid.UUID] = None,
    category_id: Optional[uuid.UUID] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    request = SearchRequest(q=q, vehicle_id=vehicle_id, category_id=category_id, page=page, limit=limit)
    return await SearchService.search(db, request)


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health")
async def health_check():
    return {"ok": True, "status": "UP", "time": datetime.utcnow().isoformat()}