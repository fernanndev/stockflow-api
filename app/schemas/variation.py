from datetime import date
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

def blank_to_none(value: str | None) -> str | None:
    return value or None


# What the screen/reader sends: trimmed, at most 50 characters, blank means "no barcode"
Barcode = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=50)] | None,
    AfterValidator(blank_to_none),
]

class LotResponse(BaseModel):
    id: int
    quantity: int
    expiration_date: date | None = None

    model_config = {"from_attributes": True}

class VariationResponse(BaseModel):
    id: int
    name: str
    barcode: str | None
    stock_quantity: int
    lots: list[LotResponse]

    model_config = {"from_attributes": True}

class VariationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    barcode: Barcode = None

    model_config = {"str_strip_whitespace": True}

class VariationUpdate(VariationCreate):
    pass

class LotUpdate(BaseModel):
    # no defaults on pupose: the screen always sends both values, so
    # sending nothing must not silently clear the date of the quantity
    expiration_date: date | None
    quantity: int = Field(ge=0)