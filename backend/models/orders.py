"""Pydantic models for checkout and orders (COD)."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from lib.dates import utcnow
from models.users import PHONE_PATTERN, AddressIn


class OrderItemIn(BaseModel):
    product_id: str
    size: str | None = None
    color: str | None = None
    quantity: int = Field(ge=1, le=10, default=1)


class ShippingAddress(AddressIn):
    pass


class CheckoutIn(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    customer_name: str = Field(min_length=2, max_length=80)
    customer_email: EmailStr
    customer_phone: str = Field(pattern=PHONE_PATTERN)
    shipping_address: ShippingAddress
    payment_method: str = "COD"  # only COD is accepted in this phase
    save_address: bool = False


class OrderItem(BaseModel):
    product_id: str
    name: str
    sku: str
    image: str = ""
    size: str | None = None
    color: str | None = None
    unit_price: float
    original_price: float | None = None
    quantity: int
    line_total: float


class Order(BaseModel):
    id: str  # human-readable order code, e.g. SP-4F7A21BC
    customer_id: str | None = None
    customer_name: str
    customer_email: str
    customer_phone: str
    items: list[OrderItem]
    shipping_address: ShippingAddress
    subtotal: float
    discount_total: float
    delivery_charge: float
    total: float
    payment_method: str = "COD"
    payment_status: str = "Pending"
    status: str = "Placed"
    placed_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
