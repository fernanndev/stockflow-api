from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import SaleStatus
from app.repositories.report import ReportRepository
from app.repositories.sale import SaleRepository

EXPIRING_SOON_DAYS = 30

ZERO = Decimal(0)
CENT = Decimal("0.01")


def cents(value: Decimal) -> Decimal:
    return value.quantize(CENT)


class ReportService:

    def __init__(self, db: Session):
        self.repository = ReportRepository(db)
        self.sale_repository = SaleRepository(db)

    def dashboard(self) -> dict:
        return {
            "total_products": self.repository.count_products(),
            "total_categories": self.repository.count_categories(),
            "total_stock_value": self.repository.total_stock_value(),
            "projected_profit": self.repository.projected_profit(),
            "low_stock_count": len(self.repository.low_stock_products()),
            "expiring_count": len(self.repository.expiring_products(EXPIRING_SOON_DAYS)),
        }

    def low_stock_products(self) -> list[Product]:
        return self.repository.low_stock_products()

    def expiring_products(self, days: int) -> list[Product]:
        return self.repository.expiring_products(days)

    def result(self, start_date: date | None, end_date: date | None) -> dict:
        """Profit of a period: revenue minus products, packagings, gifts and losses."""
        if start_date and end_date and start_date > end_date:
            raise ValueError("The start date is after the end date.")

        # canceled sales never count: their stock came back
        sales = self.sale_repository.list_all(start_date, end_date, SaleStatus.COMPLETED)
        losses = self.repository.losses(start_date, end_date)

        revenue = sum((sale.total for sale in sales), ZERO)
        received = sum((sale.paid_amount for sale in sales), ZERO)
        open_balance = sum((sale.balance for sale in sales if sale.balance > 0), ZERO)

        products_cost = ZERO
        gifts_cost = ZERO
        gifts_forgone = ZERO
        packagings_cost = ZERO
        without_cost = 0

        for sale in sales:
            for item in sale.items:
                if item.unit_cost is None:
                    without_cost += 1

                cost = (item.unit_cost or ZERO) * item.quantity

                if item.is_gift:
                    gifts_cost += cost
                    gifts_forgone += item.unit_price * item.quantity
                else:
                    products_cost += cost

            for used in sale.packagings:
                packagings_cost += used.unit_cost * used.quantity

        losses_cost = ZERO

        for movement in losses:
            if movement.unit_cost is None:
                without_cost += 1

            losses_cost += (movement.unit_cost or ZERO) * movement.quantity

        # round each part first, so the numbers on the screen add up exactly
        revenue = cents(revenue)
        products_cost = cents(products_cost)
        packagings_cost = cents(packagings_cost)
        gifts_cost = cents(gifts_cost)
        losses_cost = cents(losses_cost)

        return {
            "sales_count": len([sale for sale in sales if sale.total > 0]),
            "revenue": revenue,
            "received": cents(received),
            "open_balance": cents(open_balance),
            "products_cost": products_cost,
            "packagings_cost": packagings_cost,
            "gifts_cost": gifts_cost,
            "losses_cost": losses_cost,
            "profit": revenue - products_cost - packagings_cost - gifts_cost - losses_cost,
            "gifts_forgone_revenue": cents(gifts_forgone),
            "items_without_cost": without_cost,
        }