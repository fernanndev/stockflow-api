from datetime import date, timedelta

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.models.stock_movement import MovementReason, MovementType, StockMovement
from app.repositories.sale import LOCAL_TIMEZONE


class ReportRepository:

    def __init__(self, db: Session):
        self.db = db

    def count_products(self) -> int:
        return self.db.query(func.count(Product.id)).scalar()

    def count_categories(self) -> int:
        return self.db.query(func.count(Category.id)).scalar()

    def total_stock_value(self) -> float:
        total = self.db.query(
            func.sum(Product.price * Product.stock_quantity)
        ).scalar()

        return total or 0

    def projected_profit(self) -> float:
        total = (
            self.db.query(
                func.sum((Product.price - Product.cost_price) * Product.stock_quantity)
            )
            .filter(Product.cost_price.is_not(None))
            .scalar()
        )

        return total or 0

    def low_stock_products(self) -> list[Product]:
        return self.db.query(Product).filter(
            Product.stock_quantity <= Product.minimum_stock
        ).all()

    def expiring_products(self, days: int) -> list[Product]:
        limit_date = date.today() + timedelta(days=days)

        return (
            self.db.query(Product)
            .filter(
                Product.expiration_date.is_not(None),
                Product.expiration_date <= limit_date,
            )
            .order_by(Product.expiration_date)
            .all()
        )

    def losses(self, start_date: date | None, end_date: date | None) -> list[StockMovement]:
        """Manual exits (expired, loss, other) in the period, by the store's local day."""
        movement_day = cast(func.timezone(LOCAL_TIMEZONE, StockMovement.created_at), Date)

        query = self.db.query(StockMovement).filter(
            StockMovement.type == MovementType.OUT,
            StockMovement.reason.in_(
                [MovementReason.EXPIRED, MovementReason.LOSS, MovementReason.OTHER]
            ),
        )

        if start_date: 
            query = query.filter(movement_day >= start_date)

        if end_date:
            query = query.filter(movement_day <= end_date)

        return query.all()
