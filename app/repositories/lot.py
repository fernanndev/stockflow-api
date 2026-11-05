from datetime import date

from sqlalchemy.orm import Session

from app.models.lot import Lot

class LotRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, lot: Lot) -> Lot:
        self.db.add(lot)
        return lot

    def get_by_id(self, lot_id: int) -> Lot | None:
        return self.db.query(Lot).filter(Lot.id == lot_id).first()

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