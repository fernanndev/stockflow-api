from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories.category import CategoryRepository
from app.schemas.category import CategoryCreate

class CategoryService:

    def __init__(self, db: Session, store_id: int):
        self.store_id = store_id
        self.repository = CategoryRepository(db, store_id)

    def create(self, data: CategoryCreate) -> Category:
        existing = self.repository.get_by_name(data.name)

        if existing:
            raise ValueError("Category already created.")

        category = Category(name=data.name, store_id=self.store_id)

        return self.repository.create(category)

    def list_all(self) -> list[Category]:
        return self.repository.list_all()

    def update(self, category_id: int, data: CategoryCreate) -> Category:
        category = self.repository.get_by_id(category_id)

        if not category:
            raise ValueError("Category not found.")

        existing = self.repository.get_by_name(data.name)

        if existing and existing.id != category_id:
            raise ValueError("Category already registered.")

        category.name = data.name

        return self.repository.update(category)

    def delete(self, category_id: int) -> None:
        category = self.repository.get_by_id(category_id)

        if not category:
            raise ValueError("Category not found.")

        if category.products:
            raise ValueError("It is not possible to delete a category with associated products.")

        self.repository.delete(category)
