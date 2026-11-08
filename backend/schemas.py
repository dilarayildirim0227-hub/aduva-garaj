from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime


# --- Kullanıcı şemaları ---
class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Şifre en az 6 karakter olmalıdır")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    vehicle: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Kategori şemaları ---
class CategoryBase(BaseModel):
    name: str
    slug: str
    icon: str
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    product_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# --- Marka şemaları ---
class BrandBase(BaseModel):
    name: str
    slug: str
    sort_order: int = 0


class BrandCreate(BrandBase):
    pass


class BrandResponse(BrandBase):
    id: int
    product_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# --- Ürün şemaları ---
class ProductBase(BaseModel):
    sku: str
    oem_no: Optional[str] = None
    title: str
    description: Optional[str] = None
    brand_id: int
    category_id: int
    image: Optional[str] = None
    price: float
    old_price: Optional[float] = None
    stock: int = 0
    rating: float = 0.0
    review_count: int = 0
    badge_type: Optional[str] = None
    free_shipping: bool = False
    compat_json: Optional[List[dict]] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[float] = None
    old_price: Optional[float] = None
    stock: Optional[int] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    badge_type: Optional[str] = None
    free_shipping: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    discount_percent: int = 0
    installment_6: float = 0.0
    in_stock: bool = True
    category: Optional[CategoryResponse] = None
    brand: Optional[BrandResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    category_counts: dict


# --- Sepet şemaları ---
class CartItemBase(BaseModel):
    product_id: int
    qty: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    qty: int

    @field_validator("qty")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Adet en az 1 olmalıdır")
        return v


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    qty: int
    product: ProductResponse
    line_total: float

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    subtotal: float
    shipping_cost: float
    total: float
    installment_6: float
    item_count: int


# --- Favoriler şemaları ---
class WishlistItemCreate(BaseModel):
    product_id: int


class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)


# --- Sipariş şemaları ---
class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    qty: int
    price: float
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    status: str
    total: float
    shipping_cost: float
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)


# --- Araç şemaları ---
class VehicleBase(BaseModel):
    make: str
    model: str
    year_start: int
    year_end: int
    engine: Optional[str] = None
    fuel_type: Optional[str] = None


class VehicleResponse(VehicleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class VehicleWizardStep(BaseModel):
    makes: List[str] = []
    models: List[str] = []
    years: List[int] = []
    engines: List[str] = []


# --- VIN şemaları ---
class VINLookupRequest(BaseModel):
    vin: str

    @field_validator("vin")
    @classmethod
    def validate_vin(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 17:
            raise ValueError("VIN 17 karakter olmalıdır")
        forbidden = {"I", "O", "Q"}
        if any(c in forbidden for c in v):
            raise ValueError("VIN I, O, Q harflerini içeremez")
        return v


class VINLookupResponse(BaseModel):
    vin: str
    vehicle: Optional[VehicleResponse] = None
    compatible_products: List[ProductResponse] = []
    message: Optional[str] = None


# --- Admin şemaları ---
class AdminOrderUpdate(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None


class AdminProductUpdate(BaseModel):
    price: Optional[float] = None
    old_price: Optional[float] = None
    stock: Optional[int] = None


class N11SyncResponse(BaseModel):
    last_sync: Optional[datetime] = None
    updated_count: int
    message: str


# --- Genel hata şeması ---
class ErrorResponse(BaseModel):
    detail: str
