"""Serves product colour variant photos from backend/static/colors and uploads from backend/static/uploads."""

import re
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter(prefix="/media", tags=["media"])

COLOR_DIR = Path(__file__).resolve().parent.parent / "static" / "colors"
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SAFE_NAME = re.compile(r"^[A-Za-z0-9_.-]+$")

@router.get("/colors/{filename}")
async def get_color_image(filename: str) -> FileResponse:
    if not SAFE_NAME.match(filename):
        raise HTTPException(status_code=404, detail="Not found.")
    path = COLOR_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found.")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=604800"})

@router.get("/uploads/{filename}")
async def get_uploaded_image(filename: str) -> FileResponse:
    if not SAFE_NAME.match(filename):
        raise HTTPException(status_code=404, detail="Not found.")
    path = UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found.")
    ext = path.suffix.lower()
    media_type = "image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "image/jpeg")
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "public, max-age=604800"})

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = UPLOAD_DIR / unique_filename
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {
        "status": "ok",
        "filename": unique_filename,
        "url": f"/api/media/uploads/{unique_filename}"
    }
