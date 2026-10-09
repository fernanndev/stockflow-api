from datetime import date
from pydantic import BaseModel

from app.schemas.category import CategoryResponse

class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price: float
    stock_quantity: int = 0
    minimum_stock: int = 0
    size: str | None = None
    expiration_date: date | None = None
    category_id: int

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str | None
    price: float
    stock_quantity: int
    minimum_stock: int
    size: str | None = None
    expiration_date: date | None = None
    category: CategoryResponse

    model_config = {"from_attributes": True}

class ProductUpdate(BaseModel):
    name: str
    description: str | None = None
    price: float
    minimum_stock: int = 0
    size: str | None
    expiration_date: date | None = None
    category_id: int