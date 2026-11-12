import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import BaseModel

class SaleStatus(str, enum.Enum):
    COMPLETED = "completed"
    CANCELED = "canceled"


class PaymentMethod(str, enum.Enum):
    PIX = "pix"
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    OTHER = "other"


class Sale(BaseModel):
    __tablename__ = "sales"

    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), index=True
    )
    customer: Mapped["Customer | None"] = relationship()
    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus, native_enum=False, length=20), default=SaleStatus.COMPLETED
    )
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )
    packagings: Mapped[list["SalePackaging"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[list["SalePayment"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )
    movements: Mapped[list["StockMovement"]] = relationship(
        back_populates="sale"
    )

    @property
    def total(self) -> Decimal:
        # gifts are listed on the sale but never charged
        return sum(
            (item.unit_price * item.quantity for item in self.items if not item.is_gift),
            Decimal(0),
        )

    @property
    def paid_amount(self) -> Decimal:
        return sum((payment.amount for payment in self.payments), Decimal(0))

    @property
    def balance(self) -> Decimal:
        # what the customer still owes: zero (or less) means the sale is settled
        return self.total - self.paid_amount

    # the name and phone live on the customer: one place to edit, every sale follows
    @property
    def customer_name(self) -> str | None:
        return self.customer.name if self.customer else None

    @property
    def customer_phone(self) -> str | None:
        return self.customer.phone if self.customer else None


class SaleItem(BaseModel):
    __tablename__ = "sale_items"

    quantity: Mapped[int] = mapped_column(Integer)
    # price actually charged (it can differ from the product price: discount).
    # For a gift it holds the list price, so the revenue forgone can be shown.
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))
    unit_cost: Mapped[float | None] = mapped_column(Numeric(10, 4))
    is_gift: Mapped[bool] = mapped_column(Boolean, default=False)

    # copied on puporse: the sale stays readable if the product is deleted later
    product_name: Mapped[str] = mapped_column(String(150))
    variation_name: Mapped[str] = mapped_column(String(100))

    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"))
    sale: Mapped["Sale"] = relationship(back_populates="items")

    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))
    variation_id: Mapped[int | None] = mapped_column(ForeignKey("variations.id", ondelete="SET NULL"))


class SalePackaging(BaseModel):
    __tablename__ = "sale_packagings"

    quantity: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 4))
    packaging_name: Mapped[str] = mapped_column(String(100))

    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"))
    sale: Mapped["Sale"] = relationship(back_populates="packagings")

    packaging_id: Mapped[int | None] = mapped_column(
        ForeignKey("packagings.id", ondelete="SET NULL")
    )


class SalePayment(BaseModel):
    """Money received for a sale. A credit ("fiado") sale is paid in one or more of these"""

    __tablename__ = "sale_payments"

    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, native_enum=False, length=20))

    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"))
    sale: Mapped["Sale"] = relationship(back_populates="payments")