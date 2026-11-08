from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from decimal import Decimal
import uuid


# Enums matching the database
class Role(str, Enum):
    CUSTOMER = "CUSTOMER"
    STAFF = "STAFF"
    ADMIN = "ADMIN"


class ProductStatus(str, Enum):
    ACTIVE = "ACTIVE"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    PASSIVE = "PASSIVE"
    DRAFT = "DRAFT"


class OrderSource(str, Enum):
    APP = "APP"
    WEB = "WEB"


class OrderStatus(str, Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID = "PAID"
    PREPARING = "PREPARING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    CARD = "CARD"
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    BANK_TRANSFER = "BANK_TRANSFER"


class CouponType(str, Enum):
    PERCENT = "PERCENT"
    FIXED = "FIXED"
    FREE_SHIPPING = "FREE_SHIPPING"


class AppointmentStatus(str, Enum):
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# Base schemas
class BaseSchema(BaseModel):
    model_config = {"from_attributes": True}


# Auth schemas
class RegisterRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+90\d{10}$")
    password: str = Field(..., min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not v.startswith("+90"):
            raise ValueError("Phone must start with +90")
        return v


class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str

    @field_validator("email", "phone")
    @classmethod
    def validate_login(cls, v):
        return v


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseSchema):
    id: uuid.UUID
    email: Optional[EmailStr]
    phone: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    role: Role
    is_active: bool
    email_verified: bool
    phone_verified: bool
    created_at: datetime


# Address schemas
class AddressCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: str = Field(..., max_length=20)
    city: str = Field(..., max_length=100)
    district: str = Field(..., max_length=100)
    neighborhood: Optional[str] = Field(None, max_length=100)
    line: str
    postal_code: Optional[str] = Field(None, max_length=10)
    is_default: bool = False
    is_corporate: bool = False
    tax_office: Optional[str] = Field(None, max_length=100)
    tax_number: Optional[str] = Field(None, max_length=20)


class AddressResponse(BaseSchema):
    id: uuid.UUID
    title: Optional[str]
    first_name: str
    last_name: str
    phone: str
    city: str
    district: str
    neighborhood: Optional[str]
    line: str
    postal_code: Optional[str]
    is_default: bool
    is_corporate: bool
    tax_office: Optional[str]
    tax_number: Optional[str]
    created_at: datetime


# Vehicle schemas
class VehicleResponse(BaseSchema):
    id: uuid.UUID
    brand: str
    model: str
    generation: Optional[str]
    body_type: Optional[str]
    year_from: int
    year_to: Optional[int]
    engine_code: Optional[str]
    ktype_code: Optional[str]


class VehicleHierarchy(BaseModel):
    brands: List[str]
    models: Dict[str, List[str]]
    generations: Dict[str, List[str]]
    years: Dict[str, List[int]]
    engines: Dict[str, List[str]]


class UserVehicleCreate(BaseModel):
    vehicle_id: uuid.UUID
    vin_code: Optional[str] = Field(None, pattern=r"^[A-HJ-NPR-Z0-9]{17}$")
    is_primary: bool = False


class UserVehicleResponse(BaseSchema):
    id: uuid.UUID
    vehicle: VehicleResponse
    vin_code: Optional[str]
    is_primary: bool


# Product schemas
class ProductImageResponse(BaseSchema):
    id: uuid.UUID
    url: str
    sort_order: int


class ProductVariantResponse(BaseSchema):
    id: uuid.UUID
    sku: str
    attributes: Dict[str, Any]
    price_kurus: Optional[int]
    stock: int


class ProductListItem(BaseSchema):
    id: uuid.UUID
    seller_code: str
    oem_code: Optional[str]
    title: str
    slug: str
    brand: Optional[str]
    price_kurus: int
    list_price_kurus: Optional[int]
    lowest_price_30d_kurus: Optional[int]
    vat_rate: int
    currency: str
    stock: int
    status: ProductStatus
    is_universal: bool
    is_featured: bool
    is_hidden: bool
    requires_montage: bool
    rating_avg: int
    rating_count: int
    sold_count: int
    image: Optional[str]
    fitment_vehicle_ids: List[uuid.UUID]


class ProductDetail(BaseSchema):
    id: uuid.UUID
    seller_code: str
    oem_code: Optional[str]
    title: str
    subtitle: Optional[str]
    description: Optional[str]
    slug: str
    brand: Optional[str]
    price_kurus: int
    list_price_kurus: Optional[int]
    lowest_price_30d_kurus: Optional[int]
    vat_rate: int
    currency: str
    stock: int
    reserved_stock: int
    max_per_order: int
    status: ProductStatus
    is_universal: bool
    is_featured: bool
    is_hidden: bool
    requires_montage: bool
    attributes: Dict[str, Any]
    rating_avg: int
    rating_count: int
    sold_count: int
    version: int
    images: List[ProductImageResponse]
    variants: List[ProductVariantResponse]
    fitment_vehicle_ids: List[uuid.UUID]
    category_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime


class ProductCreate(BaseModel):
    seller_code: str = Field(..., max_length=50)
    oem_code: Optional[str] = Field(None, max_length=50)
    title: str = Field(..., max_length=255)
    subtitle: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    slug: str = Field(..., max_length=255)
    brand: Optional[str] = Field(None, max_length=100)
    price_kurus: int = Field(..., ge=0)
    list_price_kurus: Optional[int] = Field(None, ge=0)
    vat_rate: int = Field(20, ge=0, le=100)
    stock: int = Field(0, ge=0)
    max_per_order: int = Field(10, ge=1, le=100)
    is_universal: bool = False
    is_featured: bool = False
    is_hidden: bool = False
    requires_montage: bool = False
    category_id: Optional[uuid.UUID] = None
    attributes: Dict[str, Any] = {}


class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    price_kurus: Optional[int] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    is_universal: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_hidden: Optional[bool] = None


class FitmentCheckRequest(BaseModel):
    product_id: uuid.UUID
    vehicle_id: uuid.UUID


class FitmentCheckResponse(BaseSchema):
    product_id: uuid.UUID
    vehicle_id: uuid.UUID
    vehicle_label: str
    compatible: bool
    is_universal: bool
    fitment_warning: bool
    message: str
    match_type: str


# Category schemas
class CategoryResponse(BaseSchema):
    id: uuid.UUID
    name: str
    slug: str
    icon: Optional[str]
    parent_id: Optional[uuid.UUID]
    sort_order: int
    children: List["CategoryResponse"] = []


CategoryResponse.model_rebuild()


# Cart schemas
class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(1, ge=1, le=100)
    variant_id: Optional[uuid.UUID] = None
    vehicle_id: Optional[uuid.UUID] = None


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1, le=100)


class CartItemResponse(BaseSchema):
    id: uuid.UUID
    product_id: uuid.UUID
    variant_id: Optional[uuid.UUID]
    vehicle_id: Optional[uuid.UUID]
    quantity: int
    unit_price_snapshot: int
    product: ProductListItem
    variant: Optional[ProductVariantResponse] = None


class CartSummary(BaseSchema):
    item_count: int
    total: int
    free_shipping_remaining: int
    free_shipping_threshold: int
    currency: str = "TRY"


class CartResponse(BaseSchema):
    id: uuid.UUID
    items: List[CartItemResponse]
    subtotal: int
    discount: int
    shipping: int
    tax: int
    total: int
    coupon: Optional["CouponResponse"] = None
    free_shipping_remaining: int
    free_shipping_threshold: int
    item_count: int
    currency: str = "TRY"


class CouponApplyRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)


class CouponResponse(BaseSchema):
    id: uuid.UUID
    code: str
    type: CouponType
    value: int
    min_total: int
    description: Optional[str]


# Order schemas
class OrderItemResponse(BaseSchema):
    id: uuid.UUID
    title: str
    sku_snapshot: Optional[str]
    oem_code_snapshot: Optional[str]
    unit_price_kurus: int
    vat_rate_snapshot: int
    quantity: int


class OrderResponse(BaseSchema):
    id: uuid.UUID
    order_number: str
    source: OrderSource
    subtotal_kurus: int
    discount_kurus: int
    shipping_kurus: int
    vat_total_kurus: int
    grand_total_kurus: int
    status: OrderStatus
    items: List[OrderItemResponse]
    created_at: datetime


class CheckoutRequest(BaseModel):
    shipping_address: AddressCreate
    billing_address: Optional[AddressCreate] = None
    payment_method: PaymentMethod = PaymentMethod.CARD
    notes: Optional[str] = None


class CheckoutResponse(BaseSchema):
    order_id: uuid.UUID
    order_number: str
    grand_total_kurus: int
    payment_url: Optional[str] = None


# Coupon schemas
class CouponCreate(BaseModel):
    code: str = Field(..., max_length=50)
    type: CouponType
    value: int = Field(..., ge=0)
    min_total: int = Field(0, ge=0)
    min_cart_total: int = Field(0, ge=0)
    max_uses: Optional[int] = Field(None, ge=1)
    per_user_limit: int = Field(1, ge=1)
    category_id: Optional[uuid.UUID] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    active: bool = True
    description: Optional[str] = None


# Admin schemas
class AdminDashboardResponse(BaseModel):
    total_orders: int
    total_products: int
    total_vehicles: int
    total_revenue_kurus: int
    total_vat_kurus: int
    avg_order_value_kurus: int
    abandoned_cart_rate: float
    daily_sales: List[Dict[str, Any]]
    top_products: List[Dict[str, Any]]


class PriceStockUpdateRequest(BaseModel):
    new_price_kurus: int = Field(..., ge=0)
    stock_delta: int = 0
    expected_version: Optional[int] = None
    source: str = "ADMIN_MANUAL"


# Search schemas
class SearchRequest(BaseModel):
    q: str = Field(..., min_length=1)
    vehicle_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class SearchResult(BaseSchema):
    id: uuid.UUID
    seller_code: str
    title: str
    brand: Optional[str]
    price_kurus: int
    stock: int
    is_universal: bool
    is_featured: bool
    image: Optional[str]
    search_score: float


class SearchResponse(BaseModel):
    query: str
    normalized_query: str
    total_matches: int
    execution_time_ms: float
    items: List[SearchResult]


# KVKK schemas
class ConsentRequest(BaseModel):
    user_id: uuid.UUID
    consent_type: str = Field(..., pattern=r"^(KVKK_AYDINLATMA|EXPLICIT_CONSENT|IYS_SMS|IYS_EMAIL)$")
    policy_version: Optional[str] = "v2026.1"
    granted: bool
    ip_address: Optional[str] = "127.0.0.1"


class ConsentResponse(BaseSchema):
    id: str
    user_id: uuid.UUID
    consent_type: str
    policy_version: str
    granted: bool
    ip_address: str
    created_at: datetime


# Notifications schemas
class NotificationResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str
    channel: str
    read: bool
    created_at: datetime


# Pagination
class PaginatedResponse(BaseModel):
    items: List[Any]
    next_cursor: Optional[str] = None
    total: Optional[int] = None