from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.auth.store import get_current_store
from app.database.dependencies import get_db
from app.models.store import Store
from app.schemas.stock_movement import StockMovementCreate, StockMovementResponse
from app.services.stock_movement_service import StockMovementService

router = APIRouter(
    prefix="/stock-movements",
    tags=["Stock Movements"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def create_stock_movement(
    data: StockMovementCreate,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    service = StockMovementService(db, store.id)

    try:
        return service.create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=list[StockMovementResponse])
def list_stock_movements(
    product_id: int | None = None,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    service = StockMovementService(db, store.id)
    return service.list_all(product_id)
