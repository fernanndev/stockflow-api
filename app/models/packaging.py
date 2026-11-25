from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel

class Packaging(BaseModel):
    __tablename__ = "packagings"
    # the same name can exist in two stores, but only once inside one store
    __table_args__ = (UniqueConstraint("store_id", "name", name="uq_packagings_store_name"),)

    name: Mapped[str] = mapped_column(String(100))
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), index=True)
    stock_quantity: Mapped[int] = mapped_column(default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 4), default=0)
    image_path: Mapped[str | None] = mapped_column(String(255))

    @property
    def image_url(self) -> str | None:
        if self.image_path is None:
            return None
        return f"/uploads/{self.image_path}"