import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext
from jose import jwt
import json

from app.config import get_settings
from app.models.entities import (
    User, UserSession, Address, Vehicle, UserVehicle, Category, Product,
    ProductVariant, ProductImage, ProductFitment, Cart, CartItem, Coupon,
    Order, OrderItem, PaymentTransaction, Shipment, ReturnRequest, ReturnItem,
    IdempotencyKey, PriceHistory, StockMovement, AuditLog, Banner, Appointment,
    Settings, Role, ProductStatus, OrderSource, OrderStatus, PaymentMethod,
    CouponType, AppointmentStatus, StockMovementReason, PriceHistorySource
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
    SearchResult, SearchResponse, ConsentRequest, ConsentResponse,
    NotificationResponse, PaginatedResponse
)

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =============================================================================
# Auth Service
# =============================================================================

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def create_refresh_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str, secret: str) -> dict:
        return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])

    @staticmethod
    async def register(db: AsyncSession, data: RegisterRequest) -> User:
        if data.email:
            existing = await db.execute(select(User).where(User.email == data.email))
            if existing.scalar_one_or_none():
                raise ValueError("Email already registered")

        if data.phone:
            existing = await db.execute(select(User).where(User.phone == data.phone))
            if existing.scalar_one_or_none():
                raise ValueError("Phone already registered")

        user = User(
            email=data.email,
            phone=data.phone,
            password_hash=AuthService.hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def login(db: AsyncSession, data: LoginRequest) -> Optional[User]:
        query = select(User)
        if data.email:
            query = query.where(User.email == data.email)
        elif data.phone:
            query = query.where(User.phone == data.phone)
        else:
            return None

        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if user and AuthService.verify_password(data.password, user.password_hash):
            return user
        return None

    @staticmethod
    async def create_tokens(user: User) -> TokenResponse:
        access_token = AuthService.create_access_token({"sub": str(user.id), "role": user.role.value})
        refresh_token = AuthService.create_refresh_token({"sub": str(user.id)})

        # Store refresh token hash
        refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        # In production, store in user_sessions table

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )


# =============================================================================
# Cart Service
# =============================================================================

class CartService:
    @staticmethod
    async def get_or_create_cart(
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
        cart_token: Optional[str] = None
    ) -> Cart:
        if user_id:
            result = await db.execute(
                select(Cart).where(Cart.user_id == user_id).options(selectinload(Cart.items))
            )
            cart = result.scalar_one_or_none()
            if cart:
                return cart

        if cart_token:
            result = await db.execute(
                select(Cart).where(Cart.token == cart_token).options(selectinload(Cart.items))
            )
            cart = result.scalar_one_or_none()
            if cart:
                return cart

        # Create new cart
        if user_id:
            cart = Cart(user_id=user_id, expires_at=datetime.utcnow() + timedelta(days=30))
        else:
            cart = Cart(token=secrets.token_urlsafe(32), expires_at=datetime.utcnow() + timedelta(days=30))

        db.add(cart)
        await db.commit()
        await db.refresh(cart)
        return cart

    @staticmethod
    async def add_item(
        db: AsyncSession,
        cart: Cart,
        data: CartItemCreate
    ) -> CartItem:
        # Check product exists and has stock
        product = await db.get(Product, data.product_id)
        if not product:
            raise ValueError("Product not found")
        if product.status != ProductStatus.ACTIVE:
            raise ValueError("Product not available")
        if product.stock - product.reserved_stock < data.quantity:
            raise ValueError("Insufficient stock")

        # Check variant if provided
        if data.variant_id:
            variant = await db.get(ProductVariant, data.variant_id)
            if not variant or variant.product_id != data.product_id:
                raise ValueError("Invalid variant")
            if variant.stock < data.quantity:
                raise ValueError("Insufficient variant stock")
            unit_price = variant.price_kurus or product.price_kurus
        else:
            unit_price = product.price_kurus

        # Check vehicle compatibility if provided
        if data.vehicle_id:
            vehicle = await db.get(Vehicle, data.vehicle_id)
            if not vehicle:
                raise ValueError("Vehicle not found")
            if not product.is_universal:
                fitment = await db.execute(
                    select(ProductFitment).where(
                        and_(
                            ProductFitment.product_id == data.product_id,
                            ProductFitment.vehicle_id == data.vehicle_id
                        )
                    )
                )
                if not fitment.scalar_one_or_none():
                    raise ValueError("Product not compatible with vehicle")

        # Check if item already exists
        existing = await db.execute(
            select(CartItem).where(
                and_(
                    CartItem.cart_id == cart.id,
                    CartItem.product_id == data.product_id,
                    CartItem.variant_id == data.variant_id
                )
            )
        )
        item = existing.scalar_one_or_none()

        if item:
            new_quantity = item.quantity + data.quantity
            if new_quantity > (product.max_per_order or settings.CART_MAX_PER_ORDER):
                raise ValueError("Max quantity per order exceeded")
            item.quantity = new_quantity
            item.updated_at = datetime.utcnow()
        else:
            item = CartItem(
                cart_id=cart.id,
                product_id=data.product_id,
                variant_id=data.variant_id,
                vehicle_id=data.vehicle_id,
                quantity=data.quantity,
                unit_price_snapshot=unit_price
            )
            db.add(item)

        # Reserve stock
        product.reserved_stock += data.quantity
        cart.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_item(
        db: AsyncSession,
        cart: Cart,
        item_id: uuid.UUID,
        data: CartItemUpdate
    ) -> CartItem:
        result = await db.execute(
            select(CartItem).where(
                and_(CartItem.id == item_id, CartItem.cart_id == cart.id)
            ).options(selectinload(CartItem.product))
        )
        item = result.scalar_one_or_none()
        if not item:
            raise ValueError("Item not found")

        product = item.product
        old_quantity = item.quantity
        new_quantity = data.quantity

        if new_quantity > (product.max_per_order or settings.CART_MAX_PER_ORDER):
            raise ValueError("Max quantity per order exceeded")

        # Check stock
        available = product.stock - product.reserved_stock + old_quantity
        if new_quantity > available:
            raise ValueError("Insufficient stock")

        # Update reserved stock
        product.reserved_stock += (new_quantity - old_quantity)
        item.quantity = new_quantity
        item.updated_at = datetime.utcnow()
        cart.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def remove_item(db: AsyncSession, cart: Cart, item_id: uuid.UUID) -> bool:
        result = await db.execute(
            select(CartItem).where(
                and_(CartItem.id == item_id, CartItem.cart_id == cart.id)
            ).options(selectinload(CartItem.product))
        )
        item = result.scalar_one_or_none()
        if not item:
            return False

        # Release reserved stock
        item.product.reserved_stock -= item.quantity

        await db.delete(item)
        cart.updated_at = datetime.utcnow()
        await db.commit()
        return True

    @staticmethod
    async def clear_cart(db: AsyncSession, cart: Cart) -> None:
        result = await db.execute(
            select(CartItem).where(CartItem.cart_id == cart.id)
            .options(selectinload(CartItem.product))
        )
        items = result.scalars().all()

        for item in items:
            item.product.reserved_stock -= item.quantity
            await db.delete(item)

        cart.coupon_id = None
        cart.updated_at = datetime.utcnow()
        await db.commit()

    @staticmethod
    async def apply_coupon(db: AsyncSession, cart: Cart, code: str) -> Coupon:
        result = await db.execute(
            select(Coupon).where(Coupon.code == code.upper())
        )
        coupon = result.scalar_one_or_none()

        if not coupon:
            raise ValueError("Coupon not found")
        if not coupon.active:
            raise ValueError("Coupon inactive")
        if coupon.starts_at and coupon.starts_at > datetime.utcnow():
            raise ValueError("Coupon not yet valid")
        if coupon.ends_at and coupon.ends_at < datetime.utcnow():
            raise ValueError("Coupon expired")
        if coupon.max_uses and coupon.used_count >= coupon.max_uses:
            raise ValueError("Coupon usage limit reached")

        # Check min cart total
        cart_items = await db.execute(
            select(CartItem).where(CartItem.cart_id == cart.id)
            .options(selectinload(CartItem.product))
        )
        items = cart_items.scalars().all()
        subtotal = sum(item.quantity * item.unit_price_snapshot for item in items)

        if subtotal < coupon.min_cart_total:
            raise ValueError(f"Minimum cart total {coupon.min_cart_total} kuruş required")

        cart.coupon_id = coupon.id
        cart.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(cart)
        return coupon

    @staticmethod
    async def remove_coupon(db: AsyncSession, cart: Cart) -> None:
        cart.coupon_id = None
        cart.updated_at = datetime.utcnow()
        await db.commit()

    @staticmethod
    def calculate_totals(items: list, coupon: Optional[Coupon] = None) -> dict:
        """Calculate cart totals from a list of cart items."""
        subtotal = sum(item.quantity * item.unit_price_snapshot for item in items)
        discount = 0

        if coupon:
            if coupon.type == CouponType.PERCENT:
                discount = (subtotal * coupon.value) // 100
            elif coupon.type == CouponType.FIXED:
                discount = min(coupon.value, subtotal)
            # FREE_SHIPPING handled in shipping calculation

        shipping = 0
        if subtotal - discount < settings.CART_FREE_SHIPPING_KURUS:
            if not (coupon and coupon.type == CouponType.FREE_SHIPPING):
                shipping = settings.CART_SHIPPING_FEE_KURUS

        vat = ((subtotal - discount + shipping) * 20) // 120  # %20 VAT
        total = subtotal - discount + shipping + vat

        free_shipping_remaining = max(0, settings.CART_FREE_SHIPPING_KURUS - (subtotal - discount))

        return {
            "subtotal": subtotal,
            "discount": discount,
            "shipping": shipping,
            "tax": vat,
            "total": total,
            "free_shipping_remaining": free_shipping_remaining,
        }

    @staticmethod
    async def get_cart_response(db: AsyncSession, cart: Cart) -> CartResponse:
        # Load items with products
        result = await db.execute(
            select(CartItem).where(CartItem.cart_id == cart.id)
            .options(
                selectinload(CartItem.product).selectinload(Product.images),
                selectinload(CartItem.variant)
            )
        )
        items = result.scalars().all()

        coupon = None
        if cart.coupon_id:
            coupon = await db.get(Coupon, cart.coupon_id)

        totals = CartService.calculate_totals(items, coupon)

        item_responses = []
        for item in items:
            product = item.product
            images = [img.url for img in product.images] if product.images else []
            image = images[0] if images else None

            item_responses.append(CartItemResponse(
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
                    image=image,
                    fitment_vehicle_ids=[]
                ),
                variant=None  # Simplified
            ))

        coupon_response = None
        if coupon:
            coupon_response = CouponResponse(
                id=coupon.id,
                code=coupon.code,
                type=coupon.type,
                value=coupon.value,
                min_total=coupon.min_total,
                description=coupon.description
            )

        item_count = sum(item.quantity for item in items)

        return CartResponse(
            id=cart.id,
            items=item_responses,
            coupon=coupon_response,
            free_shipping_threshold=settings.CART_FREE_SHIPPING_KURUS,
            item_count=item_count,
            **totals
        )


# =============================================================================
# Product Service
# =============================================================================

class ProductService:
    @staticmethod
    async def list_products(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[uuid.UUID] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        is_featured: Optional[bool] = None,
        status: ProductStatus = ProductStatus.ACTIVE
    ) -> PaginatedResponse:
        query = select(Product).where(Product.status == status)

        if category_id:
            query = query.where(Product.category_id == category_id)

        if vehicle_id:
            query = query.where(
                or_(
                    Product.is_universal == True,
                    Product.id.in_(
                        select(ProductFitment.product_id).where(
                            ProductFitment.vehicle_id == vehicle_id
                        )
                    )
                )
            )

        if is_featured is not None:
            query = query.where(Product.is_featured == is_featured)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Product.title.ilike(search_term),
                    Product.seller_code.ilike(search_term),
                    Product.oem_code.ilike(search_term),
                    Product.brand.ilike(search_term)
                )
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar()

        # Paginate
        query = query.order_by(desc(Product.created_at))
        query = query.offset((page - 1) * limit).limit(limit)

        result = await db.execute(query.options(selectinload(Product.images)))
        products = result.scalars().all()

        items = []
        for p in products:
            images = [img.url for img in p.images] if p.images else []
            image = images[0] if images else None

            items.append(ProductListItem(
                id=p.id,
                seller_code=p.seller_code,
                oem_code=p.oem_code,
                title=p.title,
                slug=p.slug,
                brand=p.brand,
                price_kurus=p.price_kurus,
                list_price_kurus=p.list_price_kurus,
                lowest_price_30d_kurus=p.lowest_price_30d_kurus,
                vat_rate=p.vat_rate,
                currency=p.currency,
                stock=p.stock,
                status=p.status,
                is_universal=p.is_universal,
                is_featured=p.is_featured,
                is_hidden=p.is_hidden,
                requires_montage=p.requires_montage,
                rating_avg=p.rating_avg,
                rating_count=p.rating_count,
                sold_count=p.sold_count,
                image=image,
                fitment_vehicle_ids=[]
            ))

        return PaginatedResponse(items=items, total=total)

    @staticmethod
    async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Optional[ProductDetail]:
        result = await db.execute(
            select(Product).where(Product.id == product_id)
            .options(
                selectinload(Product.images),
                selectinload(Product.variants),
                selectinload(Product.fitments).selectinload(ProductFitment.vehicle)
            )
        )
        product = result.scalar_one_or_none()
        if not product:
            return None

        images = [ProductImageResponse(id=img.id, url=img.url, sort_order=img.sort_order) for img in product.images]
        variants = [ProductVariantResponse(id=v.id, sku=v.sku, attributes=v.attributes, price_kurus=v.price_kurus, stock=v.stock) for v in product.variants]
        fitment_ids = [f.vehicle_id for f in product.fitments]

        return ProductDetail(
            id=product.id,
            seller_code=product.seller_code,
            oem_code=product.oem_code,
            title=product.title,
            subtitle=product.subtitle,
            description=product.description,
            slug=product.slug,
            brand=product.brand,
            price_kurus=product.price_kurus,
            list_price_kurus=product.list_price_kurus,
            lowest_price_30d_kurus=product.lowest_price_30d_kurus,
            vat_rate=product.vat_rate,
            currency=product.currency,
            stock=product.stock,
            reserved_stock=product.reserved_stock,
            max_per_order=product.max_per_order,
            status=product.status,
            is_universal=product.is_universal,
            is_featured=product.is_featured,
            is_hidden=product.is_hidden,
            requires_montage=product.requires_montage,
            attributes=product.attributes,
            rating_avg=product.rating_avg,
            rating_count=product.rating_count,
            sold_count=product.sold_count,
            version=product.version,
            images=images,
            variants=variants,
            fitment_vehicle_ids=fitment_ids,
            category_id=product.category_id,
            created_at=product.created_at,
            updated_at=product.updated_at
        )

    @staticmethod
    async def check_fitment(db: AsyncSession, product_id: uuid.UUID, vehicle_id: uuid.UUID) -> FitmentCheckResponse:
        product = await db.get(Product, product_id)
        vehicle = await db.get(Vehicle, vehicle_id)

        if not product or not vehicle:
            raise ValueError("Product or vehicle not found")

        if product.is_universal:
            return FitmentCheckResponse(
                product_id=product_id,
                vehicle_id=vehicle_id,
                vehicle_label=f"{vehicle.brand} {vehicle.model} ({vehicle.year_from}-{vehicle.year_to or 'Günümüz'} {vehicle.engine_code or ''})",
                compatible=True,
                is_universal=True,
                fitment_warning=False,
                message="Bu ürün evrenseldir, tüm araçlarla uyumludur.",
                match_type="UNIVERSAL_FITMENT"
            )

        fitment = await db.execute(
            select(ProductFitment).where(
                and_(
                    ProductFitment.product_id == product_id,
                    ProductFitment.vehicle_id == vehicle_id
                )
            )
        )
        fitment = fitment.scalar_one_or_none()

        if fitment:
            return FitmentCheckResponse(
                product_id=product_id,
                vehicle_id=vehicle_id,
                vehicle_label=f"{vehicle.brand} {vehicle.model} ({vehicle.year_from}-{vehicle.year_to or 'Günümüz'} {vehicle.engine_code or ''})",
                compatible=True,
                is_universal=False,
                fitment_warning=False,
                message=f"Bu ürün {vehicle.brand} {vehicle.model} aracınız ile %100 uyumludur.",
                match_type="EXACT_VEHICLE_FITMENT"
            )
        else:
            return FitmentCheckResponse(
                product_id=product_id,
                vehicle_id=vehicle_id,
                vehicle_label=f"{vehicle.brand} {vehicle.model} ({vehicle.year_from}-{vehicle.year_to or 'Günümüz'} {vehicle.engine_code or ''})",
                compatible=False,
                is_universal=False,
                fitment_warning=True,
                message=f"Bu ürün {vehicle.brand} {vehicle.model} aracınız için uygun değildir.",
                match_type="INCOMPATIBLE"
            )

    @staticmethod
    async def get_vehicle_hierarchy(db: AsyncSession) -> VehicleHierarchy:
        # This is a simplified version - in production you'd query the actual data
        result = await db.execute(select(Vehicle).order_by(Vehicle.brand, Vehicle.model, Vehicle.year_from))
        vehicles = result.scalars().all()

        brands = sorted(list(set(v.brand for v in vehicles)))
        models = {}
        generations = {}
        years = {}
        engines = {}

        for v in vehicles:
            if v.brand not in models:
                models[v.brand] = []
            if v.model not in models[v.brand]:
                models[v.brand].append(v.model)

            key = f"{v.brand}:{v.model}"
            if key not in generations:
                generations[key] = []
            if v.generation and v.generation not in generations[key]:
                generations[key].append(v.generation)

            if key not in years:
                years[key] = []
            if v.year_from not in years[key]:
                years[key].append(v.year_from)

            if key not in engines:
                engines[key] = []
            if v.engine_code and v.engine_code not in engines[key]:
                engines[key].append(v.engine_code)

        return VehicleHierarchy(
            brands=brands,
            models=models,
            generations=generations,
            years=years,
            engines=engines
        )


# =============================================================================
# Search Service (Turkish unaccent + trigram)
# =============================================================================

class SearchService:
    TURKISH_CHAR_MAP = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i',
        'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
    }

    @staticmethod
    def normalize(text: str) -> str:
        if not text:
            return ""
        return ''.join(SearchService.TURKISH_CHAR_MAP.get(c, c) for c in text).lower()

    @staticmethod
    def trigram_similarity(a: str, b: str) -> float:
        a = SearchService.normalize(a)
        b = SearchService.normalize(b)
        if not a or not b:
            return 0.0

        trigrams_a = set(a[i:i+3] for i in range(len(a) - 2))
        trigrams_b = set(b[i:i+3] for i in range(len(b) - 2))

        if not trigrams_a or not trigrams_b:
            return 0.0

        intersection = len(trigrams_a & trigrams_b)
        union = len(trigrams_a | trigrams_b)
        return intersection / union if union > 0 else 0.0

    @staticmethod
    async def search(
        db: AsyncSession,
        request: SearchRequest
    ) -> SearchResponse:
        start_time = datetime.utcnow()
        normalized = SearchService.normalize(request.q)
        tokens = normalized.split()

        # Base query - active products
        query = select(Product).where(Product.status == ProductStatus.ACTIVE)

        if request.category_id:
            query = query.where(Product.category_id == request.category_id)

        if request.vehicle_id:
            query = query.where(
                or_(
                    Product.is_universal == True,
                    Product.id.in_(
                        select(ProductFitment.product_id).where(
                            ProductFitment.vehicle_id == request.vehicle_id
                        )
                    )
                )
            )

        result = await db.execute(query.options(selectinload(Product.images)))
        products = result.scalars().all()

        results = []
        for p in products:
            norm_title = SearchService.normalize(p.title)
            norm_brand = SearchService.normalize(p.brand or "")
            norm_codes = SearchService.normalize(f"{p.oem_code or ''} {p.seller_code or ''}")

            token_hits = 0
            for tok in tokens:
                if tok in norm_title or tok in norm_brand or tok in norm_codes:
                    token_hits += 1

            trgm_title = SearchService.trigram_similarity(request.q, p.title)

            # Best word-level trigram
            token_sim = 0.0
            for tok in tokens:
                for word in norm_title.split():
                    sim = SearchService.trigram_similarity(tok, word)
                    token_sim = max(token_sim, sim)

            score = token_hits * 1.5 + trgm_title * 2.0 + (token_sim if token_sim >= 0.35 else 0)

            if token_hits > 0 or trgm_title >= 0.18 or token_sim >= 0.4:
                images = [img.url for img in p.images] if p.images else []
                results.append(SearchResult(
                    id=p.id,
                    seller_code=p.seller_code,
                    title=p.title,
                    brand=p.brand,
                    price_kurus=p.price_kurus,
                    stock=p.stock,
                    is_universal=p.is_universal,
                    is_featured=p.is_featured,
                    image=images[0] if images else None,
                    search_score=round(score, 4)
                ))

        results.sort(key=lambda x: x.search_score, reverse=True)
        paginated = results[(request.page - 1) * request.limit : request.page * request.limit]

        elapsed_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        return SearchResponse(
            query=request.q,
            normalized_query=normalized,
            total_matches=len(results),
            execution_time_ms=round(elapsed_ms, 3),
            items=paginated
        )