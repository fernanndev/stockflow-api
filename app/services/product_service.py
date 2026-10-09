from sqlalchemy.orm import Session

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

        if product.movements:
            raise ValueError("It is not possible to delete a product with recorded stock movements.")

        self.repository.delete(product)