from datetime import date

from pydantic import BaseModel

class LotResponse(BaseModel):
    id: int
    quantity: int
    expiration_date: date | None = None

    model_config = {"from_attributes": True}

class VariationResponse(BaseModel):
    id: int
    name: str
    stock_quantity: int
    lots: list[LotResponse]

    model_config = {"from_attributes": True}