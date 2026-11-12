from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.sale import Sale, SaleStatus

from app.repositories.customer import CustomerRepository
from app.repositories.sale import SaleRepository

from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = CustomerRepository(db)
        self.sale_repository = SaleRepository(db)

    def find_or_create(self, name: str | None, phone: str | None) -> Customer | None:
        """The customer a sale belongs to; None for an anonymous sale."""
        if phone:
            existing = self.repository.get_by_phone(phone)

            # a know phone keeps the name already registered
            if existing:
                return existing

            return self.repository.create(Customer(name=name or phone, phone=phone))

        if name:
            existing = self.repository.get_by_name_without_phone(name)

            if existing:
                return existing

            return self.repository.create(Customer(name=name))

        return None

    def for_sale(self, customer_id: int | None, name: str | None, phone: str | None) -> Customer | None:
        """A registered customer (by id) wins; otherwise name/phone are looked up"""
        if customer_id is not None:
            return self._get(customer_id)

        return self.find_or_create(name, phone)

    def create(self, data: CustomerCreate) -> dict:
        self._check_unique(data.name, data.phone, None)

        customer = self.repository.create(
            Customer(name=data.name, phone=data.phone, notes=data.notes)
        )

        self.db.commit()
        self.db.refresh(customer)

        return self._with_stats(customer, [])

    def list_all(self) -> list[dict]:
        sales_by_customer: dict[int, list[Sale]] = defaultdict(list)

        for sale in self.sale_repository.list_with_customer():
            sales_by_customer[sale.customer_id].append(sale)

        return [
            self._with_stats(customer, sales_by_customer[customer.id])
            for customer in self.repository.list_all()
        ]

    def get(self, customer_id: int) -> dict:
        customer = self._get(customer_id)
        sales = self.sale_repository.list_by_customer(customer_id)

        return {**self._with_stats(customer, sales), "sales": sales}

    def update(self, customer_id: int, data: CustomerUpdate) -> dict:
        customer = self._get(customer_id)

        self._check_unique(data.name, data.phone, customer.id)

        customer.name = data.name
        customer.phone = data.phone
        customer.notes = data.notes

        self.db.commit()

        return self.get(customer_id)

    def delete(self, customer_id: int) -> None:
        customer = self._get(customer_id)

        # the sales keep pointing to the customer: deleting would erase their history
        if self.repository.count_sales(customer_id):
            raise ValueError("The customer has sales and cannot be deleted.")

        self.repository.delete(customer)
        self.db.commit()

    def _get(self, customer_id: int) -> Customer:
        customer = self.repository.get_by_id(customer_id)

        if not customer:
            raise ValueError("Customer not found.")

        return customer

    def _check_unique(self, name: str, phone: str | None, customer_id: int | None) -> None:
        # same rule as find_or_create: the phone identifies; without it, the name does
        if phone:
            existing = self.repository.get_by_phone(phone)
        else:
            existing = self.repository.get_by_name_without_phone(name)

        if existing and existing.id != customer_id:
            raise ValueError("Customer already registered.")

    def _with_stats(self, customer: Customer, sales: list[Sale]) -> dict:
        completed = [sale for sale in sales if sale.status == SaleStatus.COMPLETED]
        # a sale with only gifts is not a purchase
        purchases = [sale for sale in completed if sale.total > 0]

        return {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "notes": customer.notes,
            "purchases": len(purchases),
            "total_spent": sum((sale.total for sale in purchases), Decimal(0)),
            "last_purchase_at": max((sale.created_at for sale in purchases), default=None),
            "open_balance": sum((sale.balance for sale in completed if sale.balance > 0), Decimal(0)),
        }