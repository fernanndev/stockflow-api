from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import BaseModel

class Category(BaseModel):
    __tablename__ = "categories"
    # the same name can exist in two stores, but only once inside one store
    __table_args__ = (UniqueConstraint("store_id", "name", name="uq_categories_store_name"),)

    name: Mapped[str] = mapped_column(String(100))

    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), index=True)

    products: Mapped[list["Product"]] = relationship(back_populates="category")
