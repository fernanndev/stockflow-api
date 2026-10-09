from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product


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
