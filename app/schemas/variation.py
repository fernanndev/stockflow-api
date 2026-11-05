from datetime import date

from pydantic import BaseModel, Field

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

class VariationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    model_config = {"str_strip_whitespace": True}

class VariationUpdate(VariationCreate):
    pass

class LotUpdate(BaseModel):
    # no defaults on pupose: the screen always sends both values, so
    # sending nothing must not silently clear the date of the quantity
    expiration_date: date | None
    quantity: int = Field(ge=0)