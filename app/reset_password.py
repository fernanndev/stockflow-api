"""Sets a new password for an existing user (when someone forgot it), from the command line.

    docker compose exec api python -m app.reset_password --email maria@example.com

The password is asked on the terminal. For scripts, it can be given in the NEW_USER_PASSWORD
environment variable.
"""
import argparse
import getpass
import os
import sys

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.user import PasswordReset
from app.services.user_service import UserService


def reset_password(db: Session, email: str, password: str) -> None:
    data = PasswordReset(password=password)

    UserService(db).reset_password(email, data.password)


def ask_password() -> str:
    password = getpass.getpass("New password (at least 8 characters): ")

    if password != getpass.getpass("Repeat the password: "):
        raise ValueError("The passwords do not match.")

    return password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Set a new password for a StockFlow user.")
    parser.add_argument("--email", required=True)
    args = parser.parse_args(argv)

    db = SessionLocal()

    try:
        password = os.environ.get("NEW_USER_PASSWORD") or ask_password()
        reset_password(db, args.email, password)
    except ValidationError as error:
        problems = "; ".join(item["msg"] for item in error.errors())
        print(f"Invalid data: {problems}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"Password of {args.email} changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
