from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.product import ProductResponse
from app.schemas.report import DashboardResponse
from app.services.report_service import ReportService

router=APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.dashboard()


@router.get("/low_stock", response_model=list[ProductResponse])
def get_low_stock_products(db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.low_stock_products()

@router.get("/expiring", response_model=list[ProductResponse])
def get_expiring_products(days: int = 30, db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.expiring_products(days)