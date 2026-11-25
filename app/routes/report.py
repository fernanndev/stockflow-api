from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.auth.store import get_current_store

from app.database.dependencies import get_db
from app.models.store import Store

from app.schemas.product import ProductResponse
from app.schemas.report import DashboardResponse, ResultResponse

from app.services.report_service import ReportService

router=APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    service = ReportService(db, store.id)
    return service.dashboard()


@router.get("/low_stock", response_model=list[ProductResponse])
def get_low_stock_products(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    service = ReportService(db, store.id)
    return service.low_stock_products()

@router.get("/expiring", response_model=list[ProductResponse])
def get_expiring_products(days: int = 30, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    service = ReportService(db, store.id)
    return service.expiring_products(days)

@router.get("/result", response_model=ResultResponse)
def get_result(
    start_date: date | None = None,
    end_date: date | None = None,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    try:
        return ReportService(db, store.id).result(start_date, end_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))