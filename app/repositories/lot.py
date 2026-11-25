from datetime import date

from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.variation import Variation

class LotRepository:

    def __init__(self, db: Session, store_id: int):
        self.db = db
        self.store_id = store_id

    def create(self, lot: Lot) -> Lot:
        self.db.add(lot)
        return lot

    def get_by_id(self, lot_id: int) -> Lot | None:
        # a lot belongs to a store through its variation
        return (
            self.db.query(Lot)
            .join(Variation, Lot.variation_id == Variation.id)
            .filter(Lot.id == lot_id, Variation.store_id == self.store_id)
            .first()
        )

    def find_by_expiration(self, variation_id: int, expiration_date: date | None) -> Lot | None:
        query = self.db.query(Lot).filter(Lot.variation_id == variation_id)

        if expiration_date is None:
            query = query.filter(Lot.expiration_date.is_(None))
        else:
            query = query.filter(Lot.expiration_date == expiration_date)

        return query.first()

    def list_available(self, variation_id: int) -> list[Lot]:
        # FEFO: first expired, first out. Lots without expiration go last.
        return (
            self.db.query(Lot)
            .filter(Lot.variation_id == variation_id, Lot.quantity > 0)
            .order_by(Lot.expiration_date.asc().nulls_last(), Lot.id)
            .all()
        )

    def delete(self, lot: Lot) -> None:
        self.db.delete(lot)
