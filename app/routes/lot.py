from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.auth.store import get_current_store
from app.database.dependencies import get_db
from app.models.store import Store
from app.schemas.variation import LotResponse, LotUpdate
from app.services.lot_service import LotService

router = APIRouter(
    prefix="/lots",
    tags=["lots"],
    dependencies=[Depends(get_current_user)],
)


@router.put("/{lot_id}", response_model=LotResponse)
def update_lot(lot_id: int, data: LotUpdate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    try:
        return LotService(db, store.id).update(lot_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    