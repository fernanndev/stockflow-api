from datetime import datetime

from pydantic import BaseModel, Field

from app.models.stock_movement import MovementType
from app.schemas.product import ProductResponse

class StockMovementCreate(BaseModel):
    product_id: int
    type: MovementType
    quantity: int = Field(gt=0)


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    type: MovementType
    quantity: int
    created_at: datetime
    product: ProductResponse

    model_config = {"from_attributes": True}