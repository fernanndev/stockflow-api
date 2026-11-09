from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.sale import SaleCreate, SaleResponse
from app.services.sale_service import SaleService

router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(data: SaleCreate, db: Session = Depends(get_db)):
    try:
        return SaleService(db).create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    try:
        return SaleService(db).get(sale_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))