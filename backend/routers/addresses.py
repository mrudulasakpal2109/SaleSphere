"""Saved customer shipping addresses."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException

from backend.lib.auth import require_user
from backend.lib.db import list_user_addresses, create_address, update_address, delete_address
from backend.models.users import Address, AddressIn, UserOut

router = APIRouter(tags=["addresses"])

@router.get("/addresses", response_model=List[Address])
async def list_addresses(user: UserOut = Depends(require_user)) -> List[Address]:
    addr_list = list_user_addresses(user.id)
    return [Address(**a) for a in addr_list]

@router.post("/addresses", response_model=Address, status_code=201)
async def add_address(input: AddressIn, user: UserOut = Depends(require_user)) -> Address:
    created = create_address(user.id, input.model_dump())
    return Address(**created)

@router.patch("/addresses/{address_id}", response_model=Address)
async def edit_address(address_id: str, input: AddressIn, user: UserOut = Depends(require_user)) -> Address:
    updated = update_address(address_id, user.id, input.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Address not found.")
    return Address(**updated)

@router.delete("/addresses/{address_id}")
async def remove_address(address_id: str, user: UserOut = Depends(require_user)):
    deleted = delete_address(address_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Address not found.")
    return {"ok": True, "message": "Address deleted."}
