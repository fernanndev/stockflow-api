from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

# "#rrggbb" is the only color format the screens understand; stored in lowercase
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$", to_lower=True)]


class StoreUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    primary_color: HexColor
    background_color: HexColor
    surface_color: HexColor
    # optional: a save that does not mention them keeps the current values
    card_surcharge_percent: float | None = Field(default=None, ge=0, le=30)
    interest_free_installments: int | None = Field(default=None, ge=1, le=12)

    model_config = {"str_strip_whitespace": True}


class StoreResponse(BaseModel):
    id: int
    name: str
    primary_color: str
    background_color: str
    surface_color: str
    card_surcharge_percent: float
    interest_free_installments: int
    logo_url: str | None = None

    model_config = {"from_attributes": True}
