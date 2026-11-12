from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories.customer import CustomerRepository


class CustomerService:

    def __init__(self, db: Session):
        self.repository = CustomerRepository(db)

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