from datetime import date

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session, selectinload

from app.models.sale import Sale, SaleStatus

# the store's clock: a sale made at 22:00 in Brazil must count for that day, not the next
LOCAL_TIMEZONE = "America/Sao_Paulo"


class SaleRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, sale: Sale) -> Sale:
        self.db.add(sale)
        return sale

    def get_by_id(self, sale_id: int) -> Sale | None:
        return self.db.query(Sale).filter(Sale.id == sale_id).first()

    def list_all(
            self,
            start_date: date | None = None,
            end_date: date | None = None,
            status: SaleStatus | None = None,
    ) -> list[Sale]:
        query = self._with_children(self.db.query(Sale))
        sale_day = cast(func.timezone(LOCAL_TIMEZONE, Sale.created_at), Date)

        if start_date:
            query = query.filter(sale_day >= start_date)

        if end_date:
            query = query.filter(sale_day <= end_date)

        if status:
            query = query.filter(Sale.status == status)

        return query.order_by(Sale.created_at.desc(), Sale.id.desc()).all()

    def list_with_customer(self) -> list[Sale]:
        """Completed sales that have a customer, oldest first (candidates for open credit.)"""
        query = self._with_children(self.db.query(Sale)).filter(
            Sale.status == SaleStatus.COMPLETED,
            Sale.customer_id.isnot(None)
        )

        return query.order_by(Sale.created_at, Sale.id).all()

    def _with_children(self, query):
        # loads items and payments is one go instead of one query per sale
        return query.options(
            selectinload(Sale.items),
            selectinload(Sale.packagings),
            selectinload(Sale.payments),
            selectinload(Sale.customer),
        )