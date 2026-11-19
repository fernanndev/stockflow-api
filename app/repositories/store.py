from sqlalchemy.orm import Session

from app.models.store import Store


class StoreRepository:

    def __init__(self, db: Session):
        self.db = db

    def get(self) -> Store | None:
        # until the active store exists (M3), the system uses the first one
        return self.db.query(Store).order_by(Store.id).first()

    def create(self, store: Store) -> Store:
        self.db.add(store)
        self.db.commit()
        self.db.refresh(store)
        return store

    def update(self, store: Store) -> Store:
        self.db.commit()
        self.db.refresh(store)
        return store

        