from datetime import date

from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import BaseModel

class Lot(BaseModel):
    __tablename__ = "lots"

    quantity: Mapped[int] = mapped_column(default=0)
    expiration_date: Mapped[date | None] = mapped_column(Date)

    variation_id: Mapped[int] = mapped_column(ForeignKey("variations.id"))
    variation: Mapped["Variation"] = relationship(back_populates="lots")