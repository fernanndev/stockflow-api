from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer


class CustomerRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, customer: Customer) -> Customer:
        # flush, not commit: this runs inside the sale's transaction,
        # so if the sale fails the new customer is rolled back with it
        self.db.add(customer)
        self.db.flush()
        return customer

    def get_by_phone(self, phone: str) -> Customer | None:
        return self.db.query(Customer).filter(Customer.phone == phone).first()

    def get_by_name_without_phone(self, name: str) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(Customer.phone.is_(None), func.lower(Customer.name) == name.lower())
            .first()
        )