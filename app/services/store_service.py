from typing import BinaryIO

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.storage import delete_image, save_image
from app.models.store import Store
from app.repositories.store import StoreRepository
from app.schemas.store import StoreCreate, StoreUpdate


class StoreService:

    def __init__(self, db: Session):
        self.repository = StoreRepository(db)

    def get(self) -> Store:
        """The first store (the one used when nothing says otherwise)."""
        store = self.repository.get()

        if store:
            return store

        # first access: the first store starts with the default look
        return self.repository.create(Store())

    def get_by_id(self, store_id: int) -> Store | None:
        return self.repository.get_by_id(store_id)

    def list_all(self) -> list[Store]:
        self.get()  # makes sure the first store exists

        return self.repository.list_all()

    def plan(self) -> dict:
        self.get()

        return {"max_stores": settings.max_stores, "total_stores": self.repository.count()}

    def create(self, data: StoreCreate) -> Store:
        self.get()

        if self.repository.count() >= settings.max_stores:
            raise ValueError(f"Your plan allows up to {settings.max_stores} stores.")

        return self.repository.create(Store(name=data.name))

    def update(self, store: Store, data: StoreUpdate) -> Store:
        store.name = data.name
        store.primary_color = data.primary_color
        store.background_color = data.background_color
        store.surface_color = data.surface_color

        return self.repository.update(store)

    def set_logo(self, store: Store, file: BinaryIO) -> Store:
        new_filename = save_image(file)
        old_filename = store.logo_path

        store.logo_path = new_filename
        updated = self.repository.update(store)

        delete_image(old_filename)

        return updated

    def remove_logo(self, store: Store) -> Store:
        old_filename = store.logo_path
        store.logo_path = None
        updated = self.repository.update(store)

        delete_image(old_filename)

        return updated
