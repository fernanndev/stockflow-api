from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.models.stock_movement import StockMovement
from app.models.variation import Variation

class VariationRepository:

    def __init__(self, db: Session, store_id: int):
        self.db = db
        self.store_id = store_id

    def _query(self) -> Query:
        # every read starts here, so a variation of another store is never visible
        return self.db.query(Variation).filter(Variation.store_id == self.store_id)

    def create(self, variation: Variation) -> Variation:
        self.db.add(variation)
        return variation

    def get_by_id(self, variation_id: int) -> Variation | None:
        return self._query().filter(Variation.id == variation_id).first()

    def get_by_name(self, product_id: int, name: str) -> Variation | None:
        return (
            self._query()
            .filter(
                Variation.product_id == product_id,
                func.lower(Variation.name) == name.lower(),
            )
            .first()
        )

    def get_by_barcode(self, barcode: str) -> Variation | None:
        return self._query().filter(Variation.barcode == barcode).first()

    def count_movements(self, variation_id: int) -> int:
        return (
            self.db.query(func.count(StockMovement.id))
            .filter(StockMovement.variation_id == variation_id)
            .scalar()
        )

    def delete(self, variation: Variation) -> None:
        self.db.delete(variation)
