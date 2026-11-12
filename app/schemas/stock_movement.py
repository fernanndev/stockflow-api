from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.stock_movement import MovementReason, MovementType
from app.schemas.product import ProductResponse

class StockMovementCreate(BaseModel):
    product_id: int
    type: MovementType
    quantity: int = Field(gt=0)
    variation_id: int | None = None
    lot_id: int | None = None
    expiration_date: date | None = None
    reason: MovementReason | None = None


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    variation_id: int
    type: MovementType
    quantity: int
    reason: MovementReason | None
    sale_id: int | None
    created_at: datetime
    product: ProductResponse

    model_config = {"from_attributes": True}