from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.customer import (
    CustomerCreate,
    CustomerDetailResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.customer_service import CustomerService

router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
    dependencies=[Depends(get_current_user)],
)


def to_http_error(error: ValueError) -> HTTPException:
    message = str(error)
    code = 404 if message == "Customer not found." else 400

    return HTTPException(status_code=code, detail=message)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    try:
        return CustomerService(db).create(data)
    except ValueError as e:
        raise to_http_error(e)


@router.get("/", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return CustomerService(db).list_all()


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    try:
        return CustomerService(db).get(customer_id)
    except ValueError as e:
        raise to_http_error(e)


@router.put("/{customer_id}", response_model=CustomerDetailResponse)
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    try:
        return CustomerService(db).update(customer_id, data)
    except ValueError as e:
        raise to_http_error(e)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    try:
        CustomerService(db).delete(customer_id)
    except ValueError as e:
        raise to_http_error(e)
        