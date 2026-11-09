from sqlalchemy.orm import Session

from app.models.sale import Sale


class SaleRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, sale: Sale) -> Sale:
        self.db.add(sale)
        return sale

    def get_by_id(self, sale_id: int) -> Sale | None:
        return self.db.query(Sale).filter(Sale.id == sale_id).first()