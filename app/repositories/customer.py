from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.sale import Sale


class CustomerRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, customer: Customer) -> Customer:
        # flush, not commit: this runs inside the sale's transaction,
        # so if the sale fails the new customer is rolled back with it
        self.db.add(customer)
        self.db.flush()
        return customer

    def get_by_id(self, customer_id: int) -> Customer | None:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_by_phone(self, phone: str) -> Customer | None:
        return self.db.query(Customer).filter(Customer.phone == phone).first()

    def get_by_name_without_phone(self, name: str) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(Customer.phone.is_(None), func.lower(Customer.name) == name.lower())
            .first()
        )

    def list_all(self) -> list[Customer]:
        return self.db.query(Customer).order_by(func.lower(Customer.name)).all()

    def count_sales(self, customer_id: int) -> int:
        return self.db.query(Sale).filter(Sale.customer_id == customer_id).count()

    def delete(self, customer: Customer) -> None:
        self.db.delete(customer)