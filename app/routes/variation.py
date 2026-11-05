from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.variation import VariationCreate, VariationResponse, VariationUpdate
from app.services.variation_service import VariationService

router = APIRouter(
    tags=["Variations"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/products/{product_id}/variations", response_model=VariationResponse, status_code=status.HTTP_201_CREATED,)
def create_variation(product_id: int, data: VariationCreate, db: Session = Depends(get_db)):
    try:
        return VariationService(db).create(product_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/variations/{variation_id}", response_model=VariationResponse)
def update_variation(variation_id: int, data: VariationUpdate, db: Session = Depends(get_db)):
    try:
        return VariationService(db).update(variation_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/variations/{variation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variation(variation_id: int, db: Session = Depends(get_db)):
    try:
        VariationService(db).delete(variation_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))