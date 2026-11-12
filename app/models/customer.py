from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class Customer(BaseModel):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(150))
    # digits only; unique, but optional (a NULL phone can repeat)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    notes: Mapped[str | None] = mapped_column(Text)