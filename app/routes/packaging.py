from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
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
def create_packaging(data: PackagingCreate, db: Session = Depends(get_db)):
    try:
        return PackagingService(db).create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.get("/", response_model=list[PackagingResponse])
def list_packagings(db: Session = Depends(get_db)):
    return PackagingService(db).list_all()


@router.put("/{packaging_id}", response_model=PackagingResponse)
def update_packaging(packaging_id: int, data: PackagingUpdate, db: Session = Depends(get_db)):
    try:
        return PackagingService(db).update(packaging_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{packaging_id}/purchases", response_model=PackagingResponse)
def register_purchase(packaging_id: int, data: PackagingPurchase, db: Session = Depends(get_db)):
    try:
        return PackagingService(db).register_purchase(packaging_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{packaging_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packaging(packaging_id: int, db: Session = Depends(get_db)):
    try:
        PackagingService(db).delete(packaging_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{packaging_id}/image", response_model=PackagingResponse)
def upload_packaging_image(
    packaging_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        return PackagingService(db).set_image(packaging_id, image.file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{packaging_id}/image", response_model=PackagingResponse)
def delete_packaging_image(packaging_id: int, db: Session = Depends(get_db)):
    try:
        return PackagingService(db).remove_image(packaging_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
