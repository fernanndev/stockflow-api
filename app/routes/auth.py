from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.core.rate_limit import login_limiter
from app.core.security import create_access_token
from app.database.dependencies import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import PasswordChange
from app.services.user_service import UserService, WrongCurrentPassword

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    client = request.client.host if request.client else "unknown"
    attempt_key = f"{client}:{form_data.username.strip().lower()}"

    if login_limiter.is_blocked(attempt_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in a few minutes.",
            headers={"Retry-After": str(login_limiter.retry_after(attempt_key))},
        )

    service = UserService(db)
    user = service.authenticate(form_data.username, form_data.password)

    if not user:
        login_limiter.register_failure(attempt_key)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_limiter.reset(attempt_key)
    access_token = create_access_token(data={"sub": user.email})

    return Token(access_token=access_token)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # someone with a stolen login token must not be able to guess the password here either
    attempt_key = f"password:{current_user.email.lower()}"

    if login_limiter.is_blocked(attempt_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in a few minutes.",
            headers={"Retry-After": str(login_limiter.retry_after(attempt_key))},
        )

    try:
        UserService(db).change_password(current_user, data.current_password, data.new_password)
    except WrongCurrentPassword as error:
        login_limiter.register_failure(attempt_key)
        raise HTTPException(status_code=400, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    login_limiter.reset(attempt_key)
