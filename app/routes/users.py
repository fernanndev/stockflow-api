from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user

from app.models.user import User
from app.database.dependencies import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post(
    "/",
    response_model=UserResponse,
    status_code=201,
    dependencies=[Depends(get_current_user)],
)
def create_user(
    user : UserCreate,
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        return service.create(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)
    return service.list_all()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)

    try:
        service.delete(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))