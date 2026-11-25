from sqlalchemy.orm import Session

from app.models.store import Store


class StoreRepository:

    def __init__(self, db: Session):
        self.db = db

    def get(self) -> Store | None:
        # until the active store exists (M3), the system uses the first one
        return self.db.query(Store).order_by(Store.id).first()

    def list_all(self) -> list[Store]:
        return self.db.query(Store).order_by(Store.id).all()

    def count(self) -> int:
        return self.db.query(Store).count()

    def get_by_id(self, store_id: int) -> Store | None:
        return self.db.query(Store).filter(Store.id == store_id).first()

    def create(self, store: Store) -> Store:
        self.db.add(store)
        self.db.commit()
        self.db.refresh(store)
        return store

    def update(self, store: Store) -> Store:
        self.db.commit()
        self.db.refresh(store)
        return store

        