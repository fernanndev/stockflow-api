from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependecies import get_current_user
from app.database.dependencies import get_db
from app.models.store import Store
from app.models.user import User
from app.services.store_service import StoreService


def get_current_store(
    x_store_id: int | None = Header(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Store:
    """The store the user is working in, sent by the front end in the X-Store-Id header.

    Every logged-in user can use every store of the installation. Without the header
    the first store is used, so clients that do not send it keep working.
    """
    service = StoreService(db)

    if x_store_id is None:
        return service.get()

    store = service.get_by_id(x_store_id)

    if store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found.")

    return store
