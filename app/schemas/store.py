from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

# "#rrggbb" is the only color format the screens understand; stored in lowercase
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$", to_lower=True)]


class StoreSettingsUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    primary_color: HexColor
    background_color: HexColor
    surface_color: HexColor

    model_config = {"str_strip_whitespace": True}


class StoreSettingsResponse(BaseModel):
    name: str
    primary_color: str
    background_color: str
    surface_color: str
    logo_url: str | None = None

    model_config = {"from_attributes": True}
