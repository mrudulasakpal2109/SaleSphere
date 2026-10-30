"""Pydantic models for customers, auth and addresses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from lib.dates import utcnow

PHONE_PATTERN = r"^\d{10}$"


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)


class UserOut(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class MessageOut(BaseModel):
    ok: bool = True
    message: str


class AddressIn(BaseModel):
    label: str | None = Field(default=None, max_length=40)
    full_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(pattern=PHONE_PATTERN)
    line1: str = Field(min_length=4, max_length=160)
    line2: str | None = Field(default=None, max_length=160)
    city: str = Field(min_length=2, max_length=60)
    state: str = Field(min_length=2, max_length=60)
    postal_code: str = Field(pattern=r"^\d{6}$")
    is_default: bool = False


class Address(AddressIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
