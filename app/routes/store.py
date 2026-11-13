from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.store import StoreSettingsResponse, StoreSettingsUpdate
from app.services.store_service import StoreService

router = APIRouter(prefix="/store", tags=["Store"])


# public on purpose: the login screen already shows the store's logo and colors
@router.get("/", response_model=StoreSettingsResponse)
def get_store(db: Session = Depends(get_db)):
    return StoreService(db).get()


@router.put(
    "/",
    response_model=StoreSettingsResponse,
    dependencies=[Depends(get_current_user)],
)
def update_store(data: StoreSettingsUpdate, db: Session = Depends(get_db)):
    return StoreService(db).update(data)


@router.post(
    "/logo",
    response_model=StoreSettingsResponse,
    dependencies=[Depends(get_current_user)],
)
def upload_logo(image: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        return StoreService(db).set_logo(image.file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/logo",
    response_model=StoreSettingsResponse,
    dependencies=[Depends(get_current_user)],
)
def delete_logo(db: Session = Depends(get_db)):
    return StoreService(db).remove_logo()