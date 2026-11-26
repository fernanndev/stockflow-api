from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate

class WrongCurrentPassword(ValueError):
    """The current password typed to change it is not the right one."""


class UserService:
    
    def __init__(self, db: Session):
        self.repository = UserRepository(db)

    def create(self, data: UserCreate) -> User:
        existing_user = self.repository.get_by_email(data.email)

        if existing_user:
            raise ValueError("Email already registered.")
        
        user = User(
            name=data.name,
            email=data.email,
            hashed_password=get_password_hash(data.password),
        )

        return self.repository.create(user)

    def authenticate(self, email: str, password: str) -> User | None:
        user = self.repository.get_by_email(email)

        if not user or not verify_password(password, user.hashed_password):
            return None
        
        return user

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise WrongCurrentPassword("Current password is incorrect.")

        if current_password == new_password:
            raise ValueError("The new password must be different from the current one.")

        user.hashed_password = get_password_hash(new_password)
        self.repository.update(user)

    def reset_password(self, email: str, new_password: str) -> None:
        """For an administrator on the server: sets a new password without knowing the old one."""
        user = self.repository.get_by_email(email)

        if not user:
            raise ValueError("User not found.")

        user.hashed_password = get_password_hash(new_password)
        self.repository.update(user)

    def list_all(self) -> list[User]:
        return self.repository.list_all()

    def delete(self, user_id: int) -> None:
        user = self.repository.get_by_id(user_id)

        if not user:
            raise ValueError("User not found.")

        self.repository.delete(user)