from sqlalchemy.orm import Query, Session, selectinload

from app.models.product import Product
from app.models.variation import Variation

class ProductRepository:

    def __init__(self, db: Session, store_id: int):
        self.db = db
        self.store_id = store_id

    def _query(self) -> Query:
        # every read starts here, so a product of another store is never visible
        return self.db.query(Product).filter(Product.store_id == self.store_id)

    def create(self, product: Product) -> Product:
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def get_by_id(self, product_id: int) -> Product | None:
        return self._query().filter(Product.id == product_id).first()

    def list_all(self) -> list[Product]:
        return (
            self._query()
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
