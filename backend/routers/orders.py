"""Checkout & order processing (Cash on Delivery demo flow)."""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.lib.auth import get_current_user, require_user
from backend.lib.db import (
    get_product_by_id, decrement_product_stock, create_order,
    list_user_orders, get_order_by_id, cancel_order, create_address, record_event
)
from backend.lib.dates import utcnow
from backend.models.orders import CheckoutIn, Order, OrderItem
from backend.models.users import UserOut

router = APIRouter(tags=["orders"])

FREE_SHIPPING_THRESHOLD = 1499.0
SHIPPING_FEE = 99.0

def _gen_order_id() -> str:
    return f"SP-{uuid.uuid4().hex[:8].upper()}"

@router.post("/orders", response_model=Order, status_code=201)
async def place_order(input: CheckoutIn, user: Optional[UserOut] = Depends(get_current_user)) -> Order:
    # 1. Validate every line item against operational product catalog
    lines: List[OrderItem] = []
    subtotal = 0.0
    discount_total = 0.0

    for item in input.items:
        pdoc = get_product_by_id(item.product_id)
        if not pdoc or not pdoc.get("is_active"):
            raise HTTPException(
                status_code=409,
                detail={"message": f"An item in your bag is no longer available. Please review your cart.", "product_id": item.product_id}
            )
        if pdoc.get("sizes") and item.size and item.size not in pdoc["sizes"]:
            raise HTTPException(
                status_code=409,
                detail={"message": f"Size {item.size} is unavailable for {pdoc['name']}."}
            )
        if pdoc.get("stock", 0) < item.quantity:
            raise HTTPException(
                status_code=409,
                detail={"message": f"Only {pdoc.get('stock', 0)} left in stock for {pdoc['name']}."}
            )

        unit_price = float(pdoc["price"])
        orig_price = float(pdoc["original_price"]) if pdoc.get("original_price") else None
        line_total = round(unit_price * item.quantity, 2)
        subtotal += line_total
        if orig_price and orig_price > unit_price:
            discount_total += round((orig_price - unit_price) * item.quantity, 2)

        lead_image = pdoc["images"][0] if pdoc.get("images") else ""
        if item.color and pdoc.get("color_images") and item.color in pdoc["color_images"]:
            lead_image = pdoc["color_images"][item.color]

        lines.append(OrderItem(
            product_id=pdoc["id"],
            name=pdoc["name"],
            sku=pdoc["sku"],
            image=lead_image,
            size=item.size,
            color=item.color,
            unit_price=unit_price,
            original_price=orig_price,
            quantity=item.quantity,
            line_total=line_total
        ))

    delivery = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE
    total = round(subtotal + delivery, 2)
    order_id = _gen_order_id()
    now_dt = utcnow()

    # 2. Decrement inventory
    for item in input.items:
        decrement_product_stock(item.product_id, item.quantity)

    # 3. Save address if requested and user signed in
    if input.save_address and user:
        addr_data = input.shipping_address.model_dump()
        addr_data["is_default"] = True
        create_address(user.id, addr_data)

    order_doc = {
        "id": order_id,
        "customer_id": user.id if user else None,
        "customer_name": input.customer_name.strip(),
        "customer_email": input.customer_email.strip().lower(),
        "customer_phone": input.customer_phone.strip(),
        "items": [it.model_dump() for it in lines],
        "shipping_address": input.shipping_address.model_dump(),
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
        "delivery_charge": delivery,
        "total": total,
        "payment_method": input.payment_method or "COD",
        "payment_status": "Pending",
        "status": "Placed",
        "placed_at": now_dt.isoformat(),
        "updated_at": now_dt.isoformat()
    }

    create_order(order_doc)
    record_event("purchase", customer_id=user.id if user else None, query=order_id)
    return Order(**order_doc)

@router.get("/orders", response_model=List[Order])
async def list_orders(user: UserOut = Depends(require_user)) -> List[Order]:
    orders = list_user_orders(user.id, email=user.email)
    return [Order(**o) for o in orders]

@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: Optional[UserOut] = Depends(get_current_user)) -> Order:
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return Order(**order)

@router.patch("/orders/{order_id}/cancel", response_model=Order)
async def cancel_order_endpoint(order_id: str, user: UserOut = Depends(require_user)) -> Order:
    cancelled = cancel_order(order_id, user_id=user.id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Only placed orders can be cancelled.")
    return Order(**cancelled)
