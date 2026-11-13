from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.stock_movement import StockMovement
from app.models.variation import Variation

class VariationRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, variation: Variation) -> Variation:
        self.db.add(variation)
        return variation

    def get_by_id(self, variation_id: int) -> Variation | None:
        return self.db.query(Variation).filter(Variation.id == variation_id).first()

    def get_by_name(self, product_id: int, name: str) -> Variation | None:
        return (
            self.db.query(Variation)
            .filter(
                Variation.product_id == product_id,
                func.lower(Variation.name) == name.lower(),
            )
            .first()
        )

    def get_by_barcode(self, barcode: int) -> Variation | None:
        return self.db.query(Variation).filter(Variation.barcode == barcode).first()

    def count_movements(self, variation_id: int) -> int:
        return (
            self.db.query(func.count(StockMovement.id))
            .filter(StockMovement.variation_id == variation_id)
            .scalar()
        )

    def delete(self, variation: Variation) -> None:
        self.db.delete(variation)