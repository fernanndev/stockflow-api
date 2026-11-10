from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.models.sale import SaleStatus
from app.schemas.sale import (
    CustomerDebtResponse,
    SaleCreate,
    SaleListResponse,
    SalePaymentCreate,
    SaleResponse,
)
from app.services.sale_service import SaleService

router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
    dependencies=[Depends(get_current_user)],
)


def to_http_error(error: ValueError) -> HTTPException:
    message = str(error)
    code = 404 if message == "Sale not found." else 400

    return HTTPException(status_code=code, detail=message)


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(data: SaleCreate, db: Session = Depends(get_db)):
    try:
        return SaleService(db).create(data)
    except ValueError as e: 
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=SaleListResponse)
def list_sales(
    start_date: date | None = None,
    end_date: date | None = None,
    sale_status: SaleStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    try:
        return SaleService(db).list_all(start_date, end_date, sale_status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/open-credit", response_model=list[CustomerDebtResponse])
def list_open_credits(db: Session = Depends(get_db)):
    return SaleService(db).open_credits()


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    try:
        return SaleService(db).get(sale_id)
    except ValueError as e:
        raise to_http_error(e)


@router.post(
    "/{sale_id}/payments",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_payments(sale_id: int, data: SalePaymentCreate, db: Session = Depends(get_db)):
    try:
        return SaleService(db).add_payment(sale_id, data)
    except ValueError as e:
        raise to_http_error(e)
    

@router.post("/{sale_id}/cancel", response_model=SaleResponse)
def cancel_sale(sale_id: int, db: Session = Depends(get_db)):
    try:
        return SaleService(db).cancel(sale_id)
    except ValueError as e:
        raise to_http_error(e)
