from sqlalchemy.orm import Query, Session

from app.models.category import Category

class CategoryRepository:
    def __init__(self, db: Session, store_id: int):
        self.db = db
        self.store_id = store_id

    def _query(self) -> Query:
        # every read starts here, so a category of another store is never visible
        return self.db.query(Category).filter(Category.store_id == self.store_id)

    def create(self, category: Category) -> Category:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def get_by_name(self, name: str) -> Category | None:
        return self._query().filter(Category.name == name).first()

    def list_all(self) -> list[Category]:
        return self._query().all()

    def get_by_id(self, category_id: int) -> Category | None:
        return self._query().filter(Category.id == category_id).first()

    def update(self, category: Category) -> Category:
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.commit()
