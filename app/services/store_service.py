from typing import BinaryIO

from sqlalchemy.orm import Session

from app.core.storage import delete_image, save_image
from app.models.store_settings import StoreSettings
from app.repositories.store import StoreSettingsRepository
from app.schemas.store import StoreSettingsUpdate


class StoreService:

    def __init__(self, db: Session):
        self.repository = StoreSettingsRepository(db)

    def get(self) -> StoreSettings:
        settings = self.repository.get()

        if settings:
            return settings

        # first access: the store starts with the default look
        return self.repository.create(StoreSettings())

    def update(self, data: StoreSettingsUpdate) -> StoreSettings:
        settings = self.get()

        settings.name = data.name
        settings.primary_color = data.primary_color
        settings.background_color = data.background_color
        settings.surface_color = data.surface_color

        return self.repository.update(settings)

    def set_logo(self, file: BinaryIO) -> StoreSettings:
        settings = self.get()

        new_filename = save_image(file)
        old_filename = settings.logo_path

        settings.logo_path = new_filename
        updated = self.repository.update(settings)

        delete_image(old_filename)

        return updated

    def remove_logo(self) -> StoreSettings:
        settings = self.get()

        old_filename = settings.logo_path
        settings.logo_path = None
        updated = self.repository.update(settings)

        delete_image(old_filename)

        return updated