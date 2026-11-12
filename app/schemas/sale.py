from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.sale import PaymentMethod, SaleStatus


class SaleItemCreate(BaseModel):
    product_id: int
    variation_id: int | None = None
    quantity: int = Field(gt=0)
    # empty = the product price; a gift always uses the product price
    unit_price: float | None = Field(default=None, ge=0)
    is_gift: bool = False


class SalePackagingCreate(BaseModel):
    packaging_id: int
    quantity: int = Field(gt=0)


class SalePaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: PaymentMethod


class SaleCreate(BaseModel):
    customer_id: int | None = None
    customer_name: str | None = Field(default=None, max_length=150)
    customer_phone: str | None = Field(default=None, max_length=30)
    items: list[SaleItemCreate] = Field(min_length=1)
    packagings: list[SalePackagingCreate] = []
    payments: list[SalePaymentCreate] = []

    model_config = {"str_strip_whitespace": True}

    @field_validator("customer_name")
    @classmethod
    def blank_customer_is_none(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("customer_phone")
    @classmethod
    def keep_only_phone_digit(cls, value: str | None) -> str | None:
        if not value:
            return None

        digits = "".join(char for char in value if char.isdigit())

        # DDD + number (10-11 digits), with or without the country code 55
        if not 10 <= len(digits) <= 13:
            raise ValueError("Invalid phone number.")

        return digits


class SaleItemResponse(BaseModel):
    id: int
    product_id: int | None
    variation_id: int | None
    product_name: str
    variation_name: str
    quantity: int
    unit_price: float
    unit_cost: float | None
    is_gift: bool

    model_config = {"from_attributes": True}


class SalePackagingResponse(BaseModel):
    id: int
    packaging_id: int | None
    packaging_name: str
    quantity: int
    unit_cost: float

    model_config = {"from_attributes": True}


class SalePaymentResponse(BaseModel):
    id: int
    amount: float
    method: PaymentMethod
    created_at: datetime

    model_config = {"from_attributes": True}


class SaleResponse(BaseModel):
    id: int
    created_at: datetime
    customer_name: str | None
    customer_phone: str | None
    status: SaleStatus
    canceled_at: datetime | None
    items: list[SaleItemResponse] 
    packagings: list[SalePackagingResponse]
    payments: list[SalePaymentResponse]
    total: float
    paid_amount: float
    balance: float

    model_config = {"from_attributes": True}


class SaleListResponse(BaseModel):
    sales: list[SaleResponse]
    # canceled sales are not counted in the totals
    total_sold: float
    total_paid: float
    total_open: float


class OpenCreditSaleResponse(BaseModel):
    id: int
    created_at: datetime
    total: float
    paid_amount: float
    balance: float

    model_config = {"from_attributes": True}


class CustomerDebtResponse(BaseModel):
    customer_name: str
    customer_phone: str | None
    balance: float
    sales: list[OpenCreditSaleResponse]