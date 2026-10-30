"""Storefront shopping assistant — streams responses over Server-Sent Events (SSE).
Matches user inquiries with catalog products and provides styling advice.
"""

import json
import uuid
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.lib.auth import get_current_user
from backend.lib.db import list_products, get_op_conn
from backend.models.users import UserOut

router = APIRouter(prefix="/assistant", tags=["assistant"])

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    conversation_id: Optional[str] = Field(default=None, max_length=64)

class ChatMessage(BaseModel):
    role: str
    content: str

class ConversationOut(BaseModel):
    conversation_id: str
    messages: List[ChatMessage]

def _match_recommendations(msg: str) -> tuple[str, list[str]]:
    m = msg.lower()
    cat = None
    if "men" in m or "guy" in m or "boy" in m:
        cat = "men"
    elif "women" in m or "girl" in m or "lady" in m or "saree" in m or "kurta" in m:
        cat = "women"
    elif "kid" in m or "child" in m:
        cat = "kids"

    # Search products
    res = list_products(category=cat, limit=4, in_stock=True)
    items = res.get("items", [])
    product_tags = [f"[[product:{it['id']}]]" for it in items[:3]]

    if "festive" in m or "wedding" in m or "diwali" in m or "party" in m:
        reply = "Here are some of our most celebrated festive outfits tailored for you. Rich fabrics, elegant silhouettes, and vibrant celebration shades."
    elif "work" in m or "office" in m or "formal" in m:
        reply = "For a polished, comfortable workday look, here are some refined wardrobe staples with crisp tailoring."
    elif "casual" in m or "weekend" in m or "summer" in m:
        reply = "Looking for effortless everyday comfort? Check out these breathable cotton essentials."
    else:
        reply = "I'd love to help you find the perfect look! Here are some of our trending and best-selling pieces right now:"

    full_text = reply + "\n" + "\n".join(product_tags) if product_tags else reply
    return full_text, [it['id'] for it in items[:3]]

@router.post("/chat")
async def chat_stream(input: ChatIn, user: Optional[UserOut] = Depends(get_current_user)):
    conv_id = input.conversation_id or uuid.uuid4().hex
    reply_text, _ = _match_recommendations(input.message)

    # Save messages in op_assistant_messages
    conn = get_op_conn()
    conn.execute("INSERT INTO op_assistant_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, datetime('now'));",
                 (str(uuid.uuid4()), conv_id, "user", input.message))
    conn.execute("INSERT INTO op_assistant_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, datetime('now'));",
                 (str(uuid.uuid4()), conv_id, "assistant", reply_text))
    conn.commit()
    conn.close()

    async def event_generator():
        yield f"data: {json.dumps({'type': 'start', 'conversation_id': conv_id})}\n\n"
        # Stream chunks
        words = reply_text.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield f"data: {json.dumps({'type': 'delta', 'text': chunk})}\n\n"
            await asyncio.sleep(0.04)
        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
async def get_conversation(conversation_id: str):
    conn = get_op_conn()
    rows = conn.execute("SELECT role, content FROM op_assistant_messages WHERE conversation_id = ? ORDER BY created_at ASC;", (conversation_id,)).fetchall()
    conn.close()
    return ConversationOut(
        conversation_id=conversation_id,
        messages=[ChatMessage(role=r["role"], content=r["content"]) for r in rows]
    )
