from sqlalchemy import ForeignKey, Numeric, String, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from app.models.base_model import BaseModel
from app.models.lot import Lot
from app.models.variation import Variation

class Product(BaseModel):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    minimum_stock: Mapped[int] = mapped_column(default=0)
    size: Mapped[str | None] = mapped_column(String(50))
    cost_price: Mapped[float | None] = mapped_column(Numeric(10, 2))

    image_path: Mapped[str | None] = mapped_column(String(255))

    @property
    def image_url(self) -> str | None:
        if self.image_path is None:
            return None
        return f"/uploads/{self.image_path}"

    @property
    def unit_profit(self) -> float | None:
        if self.cost_price is None:
            return None
        return float(self.price) - float(self.cost_price)

    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    category: Mapped["Category"] = relationship(back_populates="products")
    variations: Mapped[list["Variation"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    movements: Mapped[list["StockMovement"]] = relationship(back_populates="product", cascade="all, delete-orphan")

# Derived columns: they are not stored in "products", the database computes them from the lots every time a product is loaded or filtered.
Product.stock_quantity = column_property(
    select(func.coalesce(func.sum(Lot.quantity), 0))
    .where(Lot.variation_id == Variation.id, Variation.product_id == Product.id)
    .correlate_except(Lot, Variation)
    .scalar_subquery()
)

Product.expiration_date = column_property(
    select(func.min(Lot.expiration_date))
    .where(
        Lot.variation_id == Variation.id,
        Variation.product_id == Product.id,
        Lot.quantity > 0,
    )
    .correlate_except(Lot, Variation)
    .scalar_subquery()
)