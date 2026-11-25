from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.auth.store import get_current_store
from app.database.dependencies import get_db
from app.models.store import Store
from app.schemas.packaging import (
    PackagingCreate,
    PackagingPurchase,
    PackagingResponse,
    PackagingUpdate,
)
from app.services.packaging_service import PackagingService

router = APIRouter(
    prefix="/packagings",
    tags=["Packagings"],
    dependencies=[Depends(get_current_user)],
)

@router.post("/", response_model=PackagingResponse, status_code=status.HTTP_201_CREATED)
def create_packaging(data: PackagingCreate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    try:
        return PackagingService(db, store.id).create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.get("/", response_model=list[PackagingResponse])
def list_packagings(store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    return PackagingService(db, store.id).list_all()


@router.put("/{packaging_id}", response_model=PackagingResponse)
def update_packaging(packaging_id: int, data: PackagingUpdate, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    try:
        return PackagingService(db, store.id).update(packaging_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{packaging_id}/purchases", response_model=PackagingResponse)
def register_purchase(packaging_id: int, data: PackagingPurchase, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    try:
        return PackagingService(db, store.id).register_purchase(packaging_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{packaging_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packaging(packaging_id: int, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    try:
        PackagingService(db, store.id).delete(packaging_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{packaging_id}/image", response_model=PackagingResponse)
def upload_packaging_image(
    packaging_id: int,
    image: UploadFile = File(...),
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    try:
        return PackagingService(db, store.id).set_image(packaging_id, image.file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{packaging_id}/image", response_model=PackagingResponse)
def delete_packaging_image(packaging_id: int, store: Store = Depends(get_current_store), db: Session = Depends(get_db)):
    try:
        return PackagingService(db, store.id).remove_image(packaging_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
