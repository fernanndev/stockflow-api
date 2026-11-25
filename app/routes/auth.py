from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.rate_limit import login_limiter
from app.core.security import create_access_token
from app.database.dependencies import get_db
from app.schemas.token import Token
from app.services.user_service import UserService

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
