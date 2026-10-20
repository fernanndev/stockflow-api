from fastapi import APIRouter, Depends, File, HTTPException, UploadFile ,status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.product_service import ProductService

router = APIRouter(
    prefix="/products",
    tags=["Products"],
    dependencies=[Depends(get_current_user)],
)

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db)
):
    service = ProductService(db)

    try:
        return service.create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    service = ProductService(db)
    return service.list_all()


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        return service.update(product_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        service.delete(product_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{product_id}/image", response_model=ProductResponse)
def upload_product_image(
    product_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        return service.set_image(product_id, image.file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{product_id}/image", response_model=ProductResponse)
def delete_product_image(
    product_id: int,
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        return service.remove_image(product_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))