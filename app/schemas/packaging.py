from pydantic import BaseModel, Field

class PackagingCreate(BaseModel):
    name: str
    quantity: int | None = Field(default=None, gt=0)
    total_cost: float | None = Field(default=None, ge=0)


class PackagingUpdate(BaseModel):
    name: str
    stock_quantity: int | None = Field(default=None, ge=0)
    unit_cost: float | None = Field(default=None, ge=0)


class PackagingPurchase(BaseModel):
    quantity: int = Field(gt=0)
    total_cost: float = Field(ge=0)


class PackagingResponse(BaseModel):
    id: int
    name: str
    stock_quantity: int
    unit_cost: float
    image_url: str | None = None

    model_config = {"from_attributes": True}