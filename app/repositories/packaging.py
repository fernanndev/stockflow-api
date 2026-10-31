from sqlalchemy.orm import Session

from app.models.packaging import Packaging

class PackagingRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, packaging: Packaging) -> Packaging:
        self.db.add(packaging)
        self.db.commit()
        self.db.refresh(packaging)
        return packaging

    def get_by_id(self, packaging_id: int) -> Packaging | None:
        return self.db.query(Packaging).filter(Packaging.id == packaging_id).first()

    def get_by_name(self, name: str) -> Packaging | None:
        return self.db.query(Packaging).filter(Packaging.name == name).first()

    def list_all(self) -> list[Packaging]:
        return self.db.query(Packaging).order_by(Packaging.name).all()

    def update(self, packaging: Packaging) -> Packaging:
        self.db.commit()
        self.db.refresh(packaging)
        return packaging

    def delete(self, packaging: Packaging) -> None:
        self.db.delete(packaging)
        self.db.commit()