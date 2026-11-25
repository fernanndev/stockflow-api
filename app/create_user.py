"""Creates a user from the command line (how the first user of a new server is made).

    docker compose exec api python -m app.create_user --name "Maria" --email maria@example.com

The password is asked on the terminal (it never goes into the shell history). For scripts,
it can be given in the NEW_USER_PASSWORD environment variable.
"""
import argparse
import getpass
import os
import sys

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.user import UserCreate
from app.services.user_service import UserService


def create_user(db: Session, name: str, email: str, password: str) -> str:
    user = UserService(db).create(UserCreate(name=name, email=email, password=password))

    return user.email


def ask_password() -> str:
    password = getpass.getpass("Password (at least 8 characters): ")

    if password != getpass.getpass("Repeat the password: "):
        raise ValueError("The passwords do not match.")

    return password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create a StockFlow user.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args(argv)

    db = SessionLocal()

    try:
        password = os.environ.get("NEW_USER_PASSWORD") or ask_password()
        email = create_user(db, args.name, args.email, password)
    except ValidationError as error:
        problems = "; ".join(item["msg"] for item in error.errors())
        print(f"Invalid data: {problems}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"User {email} created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
