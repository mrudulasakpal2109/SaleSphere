"""Product catalogue router: filtering, searching, sorting, pagination, and product details."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException

from backend.lib.db import list_products as db_list_products, get_product_by_id
from backend.models.catalog import Product, ProductListResponse

router = APIRouter(tags=["catalog"])

def _multi(value: Optional[str]) -> List[str]:
    return [v.strip() for v in value.split(",") if v.strip()] if value else []

@router.get("/products", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    in_stock: bool = False,
    on_sale: bool = False,
    ids: Optional[str] = None,
    exclude: Optional[str] = None,
    sort: str = "popular",
    page: int = 1,
    limit: int = 12
) -> ProductListResponse:
    id_list = _multi(ids) if ids else None
    res = db_list_products(
        category=category,
        subcategory=subcategory,
        tag=tag,
        q=q,
        min_price=min_price,
        max_price=max_price,
        size=size,
        color=color,
        in_stock=in_stock,
        on_sale=on_sale,
        ids=id_list,
        exclude=exclude,
        sort=sort,
        page=page,
        limit=limit
    )
    return ProductListResponse(**res)

@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str) -> Product:
    prod = get_product_by_id(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")
    return Product(**prod)
