"""Newsletter subscriptions & engagement endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from backend.lib.db import subscribe_newsletter

router = APIRouter(tags=["engagement"])

class NewsletterIn(BaseModel):
    email: EmailStr

class NewsletterOut(BaseModel):
    ok: bool = True
    message: str

@router.post("/newsletter", response_model=NewsletterOut)
async def newsletter_signup(input: NewsletterIn) -> NewsletterOut:
    subscribe_newsletter(input.email)
    return NewsletterOut(ok=True, message="Thank you for subscribing to SalesSphere exclusive updates!")
