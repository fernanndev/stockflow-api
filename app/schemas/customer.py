from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.sale import SaleResponse


class Customerbase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    notes: str | None = Field(default=None, max_length=500)

    model_config = {"str_strip_whitespace": True}

    @field_validator("phone")
    @classmethod
    def keep_only_phone_digits(cls, value: str | None) -> str | None:
        if not value: 
            return None

        digits = "".join(char for char in value if char.isdigit())

        # DDD + number (10-11 digits), with or without the country code 55
        if not 10 <= len(digits) <= 13:
            raise ValueError("Invalid phone number.")

        return digits

    @field_validator("notes")
    @classmethod
    def blank_notes_is_none(cls, value: str | None) -> str | None:
        return value or None


class CustomerCreate(Customerbase):
    pass


class CustomerUpdate(Customerbase):
    pass


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    notes: str | None
    # canceled sales and gift-only sales are not counted
    purchases: int
    total_spent: float
    last_purchase_at: datetime | None
    open_balance: float

    model_config = {"from_attributes": True}


class CustomerDetailResponse(CustomerResponse):
    # newest first; canceled sales are listed too (the history stays visible)
    sales: list[SaleResponse]