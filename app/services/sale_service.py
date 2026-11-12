from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.sale import Sale, SaleItem, SalePackaging, SalePayment, SaleStatus
from app.models.stock_movement import MovementReason, MovementType

from app.repositories.packaging import PackagingRepository
from app.repositories.product import ProductRepository
from app.repositories.sale import SaleRepository

from app.services.customer_service import CustomerService

from app.schemas.sale import (
    SaleCreate,
    SaleItemCreate,
    SalePackagingCreate,
    SalePaymentCreate,
)

from app.services.stock_movement_service import StockMovementService

CENT = Decimal("0.01")


def money(value) -> Decimal:
    return Decimal(str(value)).quantize(CENT)


class SaleService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = SaleRepository(db)
        self.product_repository = ProductRepository(db)
        self.packaging_repository = PackagingRepository(db)
        self.movements = StockMovementService(db)

    def create(self, data: SaleCreate) -> Sale:
        try:
            sale = self._build(data)
            self.db.commit()
        except Exception:
            # nothing is kept: no stock taken, no sale, no payment
            self.db.rollback()
            raise

        self.db.refresh(sale)

        return sale

    def get(self, sale_id: int) -> Sale:
        sale = self.repository.get_by_id(sale_id)

        if not sale:
            raise ValueError("Sale not found.")

        return sale

    def list_all(
        self,
        start_date: date | None,
        end_date: date | None,
        status: SaleStatus | None,
    ) -> dict:
        if start_date and end_date and start_date > end_date:
            raise ValueError("The start date is after the end date.")

        sales = self.repository.list_all(start_date, end_date, status)
        active = [sale for sale in sales if sale.status == SaleStatus.COMPLETED]

        return {
            "sales": sales,
            "total_sold": sum((sale.total for sale in active), Decimal(0)),
            "total_paid": sum((sale.paid_amount for sale in active), Decimal(0)),
            "total_open": sum((sale.balance for sale in active), Decimal(0)),
        }

    def open_credits(self) -> list[dict]:
        """Customers who still owe something, biggest debt first."""
        debts: dict[int, dict] = {}

        for sale in self.repository.list_with_customer():
            if sale.balance <= 0:
                continue

            debt = debts.setdefault(
                sale.customer_id,
                {
                    "customer_name": sale.customer.name,
                    "customer_phone": sale.customer.phone,
                    "balance": Decimal(0),
                    "sales": [],
                },
            )

            debt["balance"] += sale.balance
            debt["sales"].append(sale)

        return sorted(debts.values(), key=lambda debt: debt["balance"], reverse=True)

    def add_payment(self, sale_id: int, data: SalePaymentCreate) -> Sale:
        sale = self.get(sale_id)

        if sale.status == SaleStatus.CANCELED:
            raise ValueError("A canceled sale cannot receive payments.")

        amount = money(data.amount)

        if amount > sale.balance:
            raise ValueError("The payment is higher than the remaining balance.")

        sale.payments.append(SalePayment(amount=amount, method=data.method))

        self.db.commit()
        self.db.refresh(sale)

        return sale

    def cancel(self, sale_id: int) -> Sale:
        sale = self.get(sale_id)

        if sale.status == SaleStatus.CANCELED:
            raise ValueError("The sale is already canceled.")

        try:
            # list(): reversing adds new movements to sale.movements while we loop
            for movement in list(sale.movements):
                if movement.type == MovementType.OUT:
                    self.movements.reverse(movement, MovementReason.SALE_CANCELED, sale)

            for used in sale.packagings:
                # the packaging may have been deleted since the sale
                packaging = (
                    self.packaging_repository.get_by_id(used.packaging_id)
                    if used.packaging_id
                    else None
                )

                if packaging:
                    packaging.stock_quantity += used.quantity

            sale.status = SaleStatus.CANCELED
            sale.canceled_at = datetime.now(timezone.utc)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(sale)

        return sale

    def _build(self, data: SaleCreate) -> Sale:
        customer = CustomerService(self.db).find_or_create(
            data.customer_name, data.customer_phone
        )

        sale = self.repository.create(
            Sale(customer=customer, status=SaleStatus.COMPLETED)
        )

        for item in data.items:
            self._add_item(sale, item)

        for packaging in data.packagings:
            self._add_packaging(sale, packaging)

        self._add_payments(sale, data)

        return sale

    def _add_item(self, sale: Sale, item: SaleItemCreate) -> None:
        product = self.product_repository.get_by_id(item.product_id)

        if not product:
            raise ValueError("Product not found.")

        variation = self.movements.find_variation(product, item.variation_id, None)

        # a gift always carries the list price, so the revenue forgone can be shown later
        if item.is_gift or item.unit_price is None:
            unit_price = money(product.price)
        else:
            unit_price = money(item.unit_price)

        unit_cost = product.cost_price

        self.movements.register(
            product=product,
            variation=variation,
            type=MovementType.OUT,
            quantity=item.quantity,
            reason=MovementReason.GIFT if item.is_gift else MovementReason.SALE,
            unit_price=unit_price,
            unit_cost=unit_cost,
            sale=sale,
        )

        sale.items.append(
            SaleItem(
                product_id=product.id,
                variation_id=variation.id,
                product_name=product.name,
                variation_name=variation.name,
                quantity=item.quantity,
                unit_price=unit_price,
                unit_cost=unit_cost,
                is_gift=item.is_gift,
            )
        )

    def _add_packaging(self, sale: Sale, item: SalePackagingCreate) -> None:
        packaging = self.packaging_repository.get_by_id(item.packaging_id)

        if not packaging:
            raise ValueError("Packaging not found.")

        if item.quantity > packaging.stock_quantity:
            raise ValueError(f'Insufficient stock of packaging "{packaging.name}".')

        packaging.stock_quantity -= item.quantity

        sale.packagings.append(
            SalePackaging(
                packaging_id=packaging.id,
                packaging_name=packaging.name,
                quantity=item.quantity,
                unit_cost=packaging.unit_cost,
            )
        )

    def _add_payments(self, sale: Sale, data: SaleCreate) -> None:
        paid = Decimal(0)

        for payment in data.payments:
            amount = money(payment.amount)
            paid += amount
            sale.payments.append(SalePayment(amount=amount, method=payment.method))

        total = sale.total

        if paid > total:
            raise ValueError("The payments are higher than the sale total.")

        # not fully paid = credit ("fiado"): we must know who owes
        if paid < total and sale.customer is None:
            raise ValueError("Inform the customer: the sale is not fully paid.")