from typing import BinaryIO

from sqlalchemy.orm import Session

from app.core.storage import delete_image, save_image
from app.models.store import Store
from app.repositories.store import StoreRepository
from app.schemas.store import StoreUpdate


class StoreService:

    def __init__(self, db: Session):
        self.repository = StoreRepository(db)

    def get(self) -> Store:
        store = self.repository.get()

        if store:
            return store

        # first access: the first store starts with the default look
        return self.repository.create(Store())

    def update(self, data: StoreUpdate) -> Store:
        store = self.get()

        store.name = data.name
        store.primary_color = data.primary_color
        store.background_color = data.background_color
        store.surface_color = data.surface_color

        return self.repository.update(store)

    def set_logo(self, file: BinaryIO) -> Store:
        store = self.get()

        new_filename = save_image(file)
        old_filename = store.logo_path

        store.logo_path = new_filename
        updated = self.repository.update(store)

        delete_image(old_filename)

        return updated

    def remove_logo(self) -> Store:
        store = self.get()

        old_filename = store.logo_path
        store.logo_path = None
        updated = self.repository.update(store)

        delete_image(old_filename)

        return updated