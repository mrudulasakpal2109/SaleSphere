"""Pydantic models for the product catalogue."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from lib.dates import utcnow


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    description: str = ""
    category: str  # men | women | kids
    subcategory: str
    price: float = Field(gt=0)
    original_price: float | None = Field(default=None, gt=0)
    discount_percent: int = 0
    sizes: list[str] = []
    colors: list[str] = []
    stock: int = Field(default=0, ge=0)
    images: list[str] = []
    # Colour name -> photo of this product in that colour (AI-recoloured from the lead photo).
    color_images: dict[str, str] = {}
    rating: float | None = Field(default=None, ge=0, le=5)
    rating_count: int | None = Field(default=None, ge=0)
    tags: list[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @model_validator(mode="after")
    def _sync_discount(self):
        # discount_percent is stored (so Mongo can sort on it) and always derived
        # from price/original_price so it can never disagree with them.
        if self.original_price and self.original_price > self.price:
            self.discount_percent = round((1 - self.price / self.original_price) * 100)
        else:
            self.discount_percent = 0
        return self


class ProductListResponse(BaseModel):
    items: list[Product]
    total: int
    page: int
    pages: int
