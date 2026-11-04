import enum

from sqlalchemy import Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import BaseModel


class MovementType(str, enum.Enum):
    IN = "in"
    OUT = "out"


class StockMovement(BaseModel):
    __tablename__ = "stock_movements"

    quantity: Mapped[int] = mapped_column(Integer)
    type: Mapped[MovementType] = mapped_column(Enum(MovementType))

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product: Mapped["Product"] = relationship(back_populates="movements")

    variation_id: Mapped[int] = mapped_column(ForeignKey("variations.id"))
    variation: Mapped["Variation"] = relationship(back_populates="movements")