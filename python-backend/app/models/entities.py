import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint, Index, Enum as SQLEnum, JSON, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship, declared_attr
from app.database import Base
import uuid
import time
import random


def generate_uuid7() -> uuid.UUID:
    """Generate a UUID version 7 (time-ordered)."""
    # uuid7 is available in Python 3.11+ but may not be in all builds
    # Fallback implementation using timestamp and random bytes
    if hasattr(uuid, 'uuid7'):
        return uuid.uuid7()

    # Manual uuid7 generation (RFC 9562)
    # 48 bits timestamp (milliseconds since Unix epoch) + 74 bits random + version/variant
    timestamp_ms = int(time.time() * 1000)
    # 48 bits timestamp
    timestamp_bytes = timestamp_ms.to_bytes(6, 'big')
    # 74 bits random (10 bytes - 6 bits for version/variant)
    random_bytes = random.randbytes(10)
    # Set version (7) and variant (10)
    random_bytes = bytearray(random_bytes)
    random_bytes[0] = (random_bytes[0] & 0x0F) | 0x70  # version 7
    random_bytes[1] = (random_bytes[1] & 0x3F) | 0x80  # variant 10
    return uuid.UUID(bytes=timestamp_bytes + bytes(random_bytes))


class Role(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    STAFF = "STAFF"
    ADMIN = "ADMIN"


class ProductStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    PASSIVE = "PASSIVE"
    DRAFT = "DRAFT"


class OrderSource(str, enum.Enum):
    APP = "APP"
    WEB = "WEB"


class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID = "PAID"
    PREPARING = "PREPARING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, enum.Enum):
    CARD = "CARD"
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    BANK_TRANSFER = "BANK_TRANSFER"


class CouponType(str, enum.Enum):
    PERCENT = "PERCENT"
    FIXED = "FIXED"
    FREE_SHIPPING = "FREE_SHIPPING"


class AppointmentStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class StockMovementReason(str, enum.Enum):
    ORDER_RESERVED = "ORDER_RESERVED"
    ORDER_RELEASED = "ORDER_RELEASED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    MANUAL_ADJUST = "MANUAL_ADJUST"
    RETURN_RESTOCK = "RETURN_RESTOCK"
    CAMPAIGN = "CAMPAIGN"


class PriceHistorySource(str, enum.Enum):
    ADMIN_MANUAL = "ADMIN_MANUAL"
    CAMPAIGN = "CAMPAIGN"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    tc_identity_enc = Column(Text, nullable=True)
    role = Column(SQLEnum(Role), default=Role.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    vehicles = relationship("UserVehicle", back_populates="user", cascade="all, delete-orphan")
    cart = relationship("Cart", back_populates="user", uselist=False, cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    consents = relationship("UserConsent", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(64), unique=True, nullable=False, index=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class UserConsent(Base):
    __tablename__ = "user_consents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(String(50), nullable=False)
    policy_version = Column(String(20), nullable=False)
    granted = Column(Boolean, nullable=False)
    ip_address = Column(INET, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="consents")


class Address(Base):
    __tablename__ = "addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    neighborhood = Column(String(100), nullable=True)
    line = Column(Text, nullable=False)
    postal_code = Column(String(10), nullable=True)
    is_default = Column(Boolean, default=False)
    is_corporate = Column(Boolean, default=False)
    tax_office = Column(String(100), nullable=True)
    tax_number = Column(String(20), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="addresses")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    generation = Column(String(100), nullable=True)
    body_type = Column(String(50), nullable=True)
    year_from = Column(Integer, nullable=False)
    year_to = Column(Integer, nullable=True)
    engine_code = Column(String(50), nullable=True)
    ktype_code = Column(String(20), nullable=True, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    fitments = relationship("ProductFitment", back_populates="vehicle", cascade="all, delete-orphan")
    user_vehicles = relationship("UserVehicle", back_populates="vehicle", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_vehicles_brand_model_year", "brand", "model", "year_from"),
    )


class UserVehicle(Base):
    __tablename__ = "user_vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    vin_code = Column(String(17), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="vehicles")
    vehicle = relationship("Vehicle", back_populates="user_vehicles")

    __table_args__ = (
        UniqueConstraint("user_id", "vehicle_id", name="uq_user_vehicle"),
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    name = Column(String(100), nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    icon = Column(String(50), nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    children = relationship("Category", backref="parent", remote_side=[id])
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    seller_code = Column(String(50), unique=True, nullable=False, index=True)
    oem_code = Column(String(50), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    brand = Column(String(100), nullable=True, index=True)
    price_kurus = Column(Integer, nullable=False, default=0)
    list_price_kurus = Column(Integer, nullable=True)
    lowest_price_30d_kurus = Column(Integer, nullable=True)
    vat_rate = Column(Integer, default=20)
    currency = Column(String(3), default="TRY")
    stock = Column(Integer, nullable=False, default=0)
    reserved_stock = Column(Integer, default=0)
    max_per_order = Column(Integer, default=10)
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.ACTIVE, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    is_universal = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    requires_montage = Column(Boolean, default=False)
    attributes = Column(JSON, default=dict)
    rating_avg = Column(Integer, default=0)
    rating_count = Column(Integer, default=0)
    sold_count = Column(Integer, default=0)
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    fitments = relationship("ProductFitment", back_populates="product", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("price_kurus >= 0", name="chk_products_price_nonnegative"),
        CheckConstraint("stock >= 0", name="chk_products_stock_nonnegative"),
        CheckConstraint("reserved_stock >= 0", name="chk_products_reserved_stock_nonnegative"),
        CheckConstraint("stock >= reserved_stock", name="chk_products_reserved_not_exceed"),
        Index("ix_products_search", "title", "brand", "seller_code", "oem_code"),
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    attributes = Column(JSON, default=dict)
    price_kurus = Column(Integer, nullable=True)
    stock = Column(Integer, nullable=False, default=0)
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="variants")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    product = relationship("Product", back_populates="images")


class ProductFitment(Base):
    __tablename__ = "product_fitments"

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), primary_key=True)
    notes = Column(Text, nullable=True)
    verified_by_vin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    product = relationship("Product", back_populates="fitments")
    vehicle = relationship("Vehicle", back_populates="fitments")


class Cart(Base):
    __tablename__ = "carts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=True, index=True)
    token = Column(String(64), unique=True, nullable=True, index=True)
    coupon_id = Column(UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cart")
    coupon = relationship("Coupon")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("(user_id IS NOT NULL) != (token IS NOT NULL)", name="chk_cart_user_or_token"),
    )


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price_snapshot = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product", back_populates="cart_items")
    variant = relationship("ProductVariant")

    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", "variant_id", name="uq_cart_product_variant"),
        CheckConstraint("quantity BETWEEN 1 AND 100", name="chk_cart_item_quantity"),
    )


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    code = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(SQLEnum(CouponType), nullable=False)
    value = Column(Integer, nullable=False)
    min_total = Column(Integer, default=0)
    min_cart_total = Column(Integer, default=0)
    max_uses = Column(Integer, nullable=True)
    per_user_limit = Column(Integer, default=1)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    used_count = Column(Integer, default=0)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    order_number = Column(String(30), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source = Column(SQLEnum(OrderSource), nullable=False)
    subtotal_kurus = Column(Integer, nullable=False, default=0)
    discount_kurus = Column(Integer, default=0)
    shipping_kurus = Column(Integer, default=0)
    vat_total_kurus = Column(Integer, default=0)
    grand_total_kurus = Column(Integer, nullable=False, default=0)
    shipping_address_snapshot = Column(JSON, nullable=False)
    billing_address_snapshot = Column(JSON, nullable=False)
    distance_sales_contract = Column(JSON, nullable=True)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING_PAYMENT, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("PaymentTransaction", back_populates="order", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="order", cascade="all, delete-orphan")
    returns = relationship("ReturnRequest", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    sku_snapshot = Column(String(50), nullable=True)
    oem_code_snapshot = Column(String(50), nullable=True)
    unit_price_kurus = Column(Integer, nullable=False)
    vat_rate_snapshot = Column(Integer, default=20)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), default="IYZICO")
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    amount_kurus = Column(Integer, nullable=False)
    status = Column(String(30), default="PENDING")
    masked_card = Column(String(20), nullable=True)
    callback_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    order = relationship("Order", back_populates="payments")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    carrier = Column(String(50), nullable=False)
    tracking_number = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(30), default="CREATED")
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    order = relationship("Order", back_populates="shipments")


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    status = Column(String(30), default="PENDING")
    return_cargo_code = Column(String(100), nullable=True)
    refund_amount_kurus = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    order = relationship("Order", back_populates="returns")
    items = relationship("ReturnItem", back_populates="return_request", cascade="all, delete-orphan")


class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    return_request_id = Column(UUID(as_uuid=True), ForeignKey("return_requests.id", ondelete="CASCADE"), nullable=False)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    return_request = relationship("ReturnRequest", back_populates="items")


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    actor_scope = Column(String(100), primary_key=True)
    key = Column(String(100), primary_key=True)
    response_status = Column(Integer, nullable=True)
    response_body = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    old_price_kurus = Column(Integer, nullable=False)
    new_price_kurus = Column(Integer, nullable=False)
    source = Column(SQLEnum(PriceHistorySource), nullable=False)
    changed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="price_history")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    delta = Column(Integer, nullable=False)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reason = Column(SQLEnum(StockMovementReason), nullable=False)
    reference_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="stock_movements")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor_id = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=False)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_actor", "actor_id", "created_at"),
    )


class Banner(Base):
    __tablename__ = "banners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    badge = Column(String(50), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    image_url = Column(Text, nullable=True)
    link_type = Column(String(50), nullable=True)
    link_target = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    vehicle_info = Column(String(255), nullable=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    service_type = Column(String(50), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.REQUESTED, nullable=False)
    bay_number = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    order_mode = Column(String(30), default="DIRECT_CHECKOUT")
    free_shipping_threshold = Column(Integer, default=75000)
    shipping_flat_rate = Column(Integer, default=7990)
    cod_fee = Column(Integer, default=4990)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("id = 1", name="chk_settings_singleton"),
    )