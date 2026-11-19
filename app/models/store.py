from sqlalchemy import Numeric ,String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class Store(BaseModel):
    """One store: its name, logo and colors. Business data will belong to a store."""

    __tablename__ = "stores"

    name: Mapped[str] = mapped_column(String(100), default="Minha loja")

    # "#rrggbb"; the defaults are the colors the system already had
    primary_color: Mapped[str] = mapped_column(String(7), default="#0f766e")
    background_color: Mapped[str] = mapped_column(String(7), default="#f8fafc")
    surface_color: Mapped[str] = mapped_column(String(7), default="#ffffff")

    logo_path: Mapped[str | None] = mapped_column(String(255))

    # Card price = cash price / (1 - percent / 100), the same math as the card machine.
    # 0 means "do not show a card price"
    card_surcharge_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    interest_free_installments: Mapped[int] = mapped_column(default=3)

    @property
    def logo_url(self) -> str | None:
        if self.logo_path is None:
            return None
        return f"/uploads/{self.logo_path}"