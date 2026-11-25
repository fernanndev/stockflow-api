from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.store import get_current_store
from app.database.dependencies import get_db
from app.models.store import Store
from app.schemas.store import StoreResponse, StoreUpdate
from app.services.store_service import StoreService

# "the store": the one the user is working in (see get_current_store)
router = APIRouter(prefix="/store", tags=["Store"])


# public on purpose: the login screen already shows the logo and colors of the store.
# It can send X-Store-Id (the last store used on this device); an unknown id falls back
# to the first store instead of failing, so the login always works.
@router.get("/", response_model=StoreResponse)
def get_store(
    x_store_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
):
    service = StoreService(db)

    if x_store_id is not None:
        store = service.get_by_id(x_store_id)

        if store:
            return store

    return service.get()


@router.put("/", response_model=StoreResponse)
def update_store(
    data: StoreUpdate,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    return StoreService(db).update(store, data)


@router.post("/logo", response_model=StoreResponse)
def upload_logo(
    image: UploadFile = File(...),
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    try:
        return StoreService(db).set_logo(store, image.file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/logo", response_model=StoreResponse)
def delete_logo(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    return StoreService(db).remove_logo(store)
