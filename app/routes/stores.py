from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.store import StoreCreate, StorePlanResponse, StoreResponse
from app.services.store_service import StoreService

# every store of the installation (the user can switch between them)
router = APIRouter(
    prefix="/stores",
    tags=["Stores"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=list[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    return StoreService(db).list_all()


@router.get("/plan", response_model=StorePlanResponse)
def get_plan(db: Session = Depends(get_db)):
    return StoreService(db).plan()


@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(data: StoreCreate, db: Session = Depends(get_db)):
    try:
        return StoreService(db).create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
