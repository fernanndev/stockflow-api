import sys
from getpass import getpass

from app.database.session import SessionLocal
from app.schemas.user import UserCreate
from app.services.user_service import UserService

def main() -> None:
    name = input("Nome: ").strip()
    email = input("E-mail: ").strip()
    password = input("Senha: ")
    confirmation = getpass("Repita a senha: ")

    if password != confirmation:
        print("As senhas não conferem.")
        sys.exit(1)

    db = SessionLocal()

    try:
        user = UserService(db).create(
            UserCreate(name=name, email=email, password=password)
        )
        print(f"Usuário criado: {user.email}")
    except ValueError as error:
        print(f"Erro: {error}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()