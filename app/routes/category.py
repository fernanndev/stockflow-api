from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.auth.store import get_current_store
from app.database.dependencies import get_db
from app.models.store import Store
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services.category_service import CategoryService

router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
    dependencies=[Depends(get_current_user)],
)

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    service = CategoryService(db, store.id)

    try:
        return service.create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=list[CategoryResponse])
def list_categories(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    service = CategoryService(db, store.id)
    return service.list_all()

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryCreate,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    service = CategoryService(db, store.id)

    try:
        return service.update(category_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
):
    service = CategoryService(db, store.id)

    try:
        service.delete(category_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
