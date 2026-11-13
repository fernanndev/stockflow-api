from datetime import date
from pydantic import BaseModel

from app.schemas.category import CategoryResponse
from app.schemas.variation import Barcode, VariationResponse

class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price: float
    cost_price: float | None = None
    stock_quantity: int = 0
    minimum_stock: int = 0
    size: str | None = None
    expiration_date: date | None = None
    category_id: int
    # goes to the product's first (default) variation
    barcode: Barcode = None

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str | None
    price: float
    cost_price: float | None = None
    unit_profit: float | None = None
    stock_quantity: int
    minimum_stock: int
    size: str | None = None
    expiration_date: date | None = None
    image_url: str | None = None
    category: CategoryResponse
    variations: list[VariationResponse]

    model_config = {"from_attributes": True}

class ProductUpdate(BaseModel):
    name: str
    description: str | None = None
    price: float
    cost_price: float | None = None
    minimum_stock: int = 0
    size: str | None
    category_id: int
    # only for products with a single variation; omitted = keep the current one
    barcode: Barcode = None