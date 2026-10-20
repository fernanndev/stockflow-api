from sqlalchemy.orm import Session
from typing import BinaryIO

from app.core.storage import delete_image, save_image
from app.models.product import Product
from app.repositories.category import CategoryRepository
from app.repositories.product import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:

    def __init__(self, db: Session):
        self.repository = ProductRepository(db)
        self.category_repository = CategoryRepository(db)

    def create(self, data: ProductCreate) -> Product:
        category = self.category_repository.get_by_id(data.category_id)

        if not category:
            raise ValueError("Category not found.")

        product = Product(
            name=data.name,
            description=data.description,
            price=data.price,
            stock_quantity=data.stock_quantity,
            minimum_stock=data.minimum_stock,
            expiration_date =data.expiration_date,
            category_id=data.category_id,
        )

        return self.repository.create(product)

    def list_all(self) -> list[Product]:
        return self.repository.list_all()

    def update(self, product_id: int, data: ProductUpdate) -> Product:
        product = self.repository.get_by_id(product_id)

        if not product:
            raise ValueError("Product not found.")

        category = self.category_repository.get_by_id(data.category_id)

        if not category:
            raise ValueError("Category not found.")

        product.name = data.name
        product.description = data.description
        product.price = data.price
        product.minimum_stock = data.minimum_stock
        product.size = data.size
        product.expiration_date = data.expiration_date
        product.category_id = data.category_id

        return self.repository.update(product)

    def delete(self, product_id: int) -> None:
        product = self.repository.get_by_id(product_id)

        if not product:
            raise ValueError("Product not found.")

        image_filename = product.image_path
        self.repository.delete(product)
        delete_image(image_filename)

    def set_image(self, product_id: int, file: BinaryIO) -> Product:
        product = self.repository.get_by_id(product_id)

        if not product:
            raise ValueError("Product not found.")

        new_filename = save_image(file)
        old_filename = product.image_path

        product.image_path = new_filename
        updated = self.repository.update(product)

        delete_image(old_filename)

        return updated

    def remove_image(self, product_id: int) -> Product:
        product = self.repository.get_by_id(product_id)

        if not product:
            raise ValueError("Product not found.")

        old_filename = product.image_path
        product.image_path = None
        updated = self.repository.update(product)

        delete_image(old_filename)

        return updated
        