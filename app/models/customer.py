from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class Customer(BaseModel):
    __tablename__ = "customers"
    # digits only; unique inside one store, but optional (a NULL phone can repeat)
    __table_args__ = (UniqueConstraint("store_id", "phone", name="uq_customers_store_phone"),)

    name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)

    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), index=True)
