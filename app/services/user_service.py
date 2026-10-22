from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate

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

    def list_all(self) -> list[User]:
        return self.repository.list_all()

    def delete(self, user_id: int) -> None:
        user = self.repository.get_by_id(user_id)

        if not user:
            raise ValueError("User not found.")

        self.repository.delete(user)