from sqlalchemy.orm import Query, Session

from app.models.packaging import Packaging

class PackagingRepository:

    def __init__(self, db: Session, store_id: int):
        self.db = db
        self.store_id = store_id

    def _query(self) -> Query:
        # every read starts here, so a packaging of another store is never visible
        return self.db.query(Packaging).filter(Packaging.store_id == self.store_id)

    def create(self, packaging: Packaging) -> Packaging:
        self.db.add(packaging)
        self.db.commit()
        self.db.refresh(packaging)
        return packaging

    def get_by_id(self, packaging_id: int) -> Packaging | None:
        return self._query().filter(Packaging.id == packaging_id).first()

    def get_by_name(self, name: str) -> Packaging | None:
        return self._query().filter(Packaging.name == name).first()

    def list_all(self) -> list[Packaging]:
        return self._query().order_by(Packaging.name).all()

    def update(self, packaging: Packaging) -> Packaging:
        self.db.commit()
        self.db.refresh(packaging)
        return packaging

    def delete(self, packaging: Packaging) -> None:
        self.db.delete(packaging)
        self.db.commit()
