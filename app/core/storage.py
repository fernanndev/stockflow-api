import uuid
from pathlib import Path
from typing import BinaryIO

UPLOAD_DIR = Path("uploads")
MAX_IMAGE_SIZE = 5 * 1024 * 1024 # = 5MB

UPLOAD_DIR.mkdir(exist_ok=True)

def _detect_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None

def save_image(file: BinaryIO) -> str:
    content = file.read(MAX_IMAGE_SIZE + 1)

    if len(content) > MAX_IMAGE_SIZE:
        raise ValueError("Image is too large. Maximum size is 5 MB.")

    extension = _detect_extension(content)

    if extension is None:
        raise ValueError("Invalid image. Use JPEG, PNG or WebP.")

    filename = f"{uuid.uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(content)

    return filename

def delete_image(filename: str | None) -> None:
    if not filename: 
        return

    (UPLOAD_DIR / filename).unlink(missing_ok=True)