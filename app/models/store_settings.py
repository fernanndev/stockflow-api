from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class StoreSettings(BaseModel):
    """The look of one store: its name, logo and colors. The table has a single row."""

    __tablename__ = "store_settings"

    name: Mapped[str] = mapped_column(String(100), default="Minha loja")

    # "#rrggbb"; the defaults are the colors the system already had
    primary_color: Mapped[str] = mapped_column(String(7), default="#0f766e")
    background_color: Mapped[str] = mapped_column(String(7), default="#f8fafc")
    surface_color: Mapped[str] = mapped_column(String(7), default="#ffffff")

    logo_path: Mapped[str | None] = mapped_column(String(255))

    @property
    def logo_url(self) -> str | None:
        if self.logo_path is None:
            return None
        return f"/uploads/{self.logo_path}"