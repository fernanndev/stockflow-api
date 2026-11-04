from sqlalchemy.orm import Session, selectinload

from app.models.product import Product
from app.models.variation import Variation

class ProductRepository: 

    def __init__(self, db: Session):
        self.db = db

    def create(self, product: Product) -> Product:
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def get_by_id(self, product_id: int) -> Product | None:
        return self.db.query(Product).filter(Product.id == product_id).first()

    def list_all(self) -> list[Product]:
        return (
            self.db.query(Product)
            .options(selectinload(Product.variations).selectinload(Variation.lots))
            .all()
        )

    def update(self, product: Product) -> Product:
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.commit()