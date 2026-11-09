import enum
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import BaseModel


class MovementType(str, enum.Enum):
    IN = "in"
    OUT = "out"


class MovementReason(str, enum.Enum):
    SALE = "sale"
    GIFT = "gift"
    EXPIRED = "expired"
    LOSS = "loss"
    OTHER = "other"
    SALE_CANCELED = "sale_canceled"


class StockMovement(BaseModel):
    __tablename__ = "stock_movements"

    quantity: Mapped[int] = mapped_column(Integer)
    type: Mapped[MovementType] = mapped_column(Enum(MovementType))

    # empty on old rows and on plain entries; every new exit gets a reason
    reason: Mapped[MovementReason | None] = mapped_column(
        Enum(MovementReason, native_enum=False, length=20)
    )
    # values of the day, copied so later price changes do not rewrite history
    unit_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    unit_cost: Mapped[float | None] = mapped_column(Numeric(10, 4))

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product: Mapped["Product"] = relationship(back_populates="movements")

    variation_id: Mapped[int] = mapped_column(ForeignKey("variations.id"))
    variation: Mapped["Variation"] = relationship(back_populates="movements")

    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id", ondelete="SET NULL"))
    sale: Mapped["Sale"] = relationship(back_populates="movements")

    allocations: Mapped[list["MovementAllocation"]] = relationship(
        back_populates="movement", cascade="all, delete-orphan"
    )


class MovementAllocation(BaseModel):
    """Which lots a movement took from (by expiration date, since lots can be merged)."""

    __tablename__ = "movement_allocations"

    quantity: Mapped[int] = mapped_column(Integer)
    expiration_date: Mapped[date | None] = mapped_column(Date)

    movement_id: Mapped[int] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="CASCADE")
    )
    movement: Mapped["StockMovement"] = relationship(back_populates="allocations")