from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import BaseModel

class Variation(BaseModel):
    __tablename__ = "variations"
    __table_args__ = (UniqueConstraint("product_id", "name"),)

    name: Mapped[str] = mapped_column(String(100))

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product: Mapped["Product"] = relationship(back_populates="variations")
    lots: Mapped[list["Lot"]] = relationship(back_populates="variation", cascade="all, delete-orphan")
    movements: Mapped[list["StockMovement"]] = relationship(back_populates="variation", cascade="all, delete-orphan")

    @property
    def stock_quantity(self) -> int:
        return sum(lot.quantity for lot in self.lots)