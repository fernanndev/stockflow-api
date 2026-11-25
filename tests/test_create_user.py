import pytest
from sqlalchemy.orm import sessionmaker

from app import create_user as command


def login(client, email, password):
    return client.post("/auth/login", data={"username": email, "password": password})


def test_a_user_created_by_the_command_can_log_in(client, engine):
    with sessionmaker(bind=engine)() as session:
        assert command.create_user(session, "Maria", "maria@example.com", "password123") == (
            "maria@example.com"
        )

    assert login(client, "maria@example.com", "password123").status_code == 200


def test_the_command_reads_the_password_from_the_environment(client, engine, monkeypatch, capsys):
    monkeypatch.setattr(command, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setenv("NEW_USER_PASSWORD", "password123")

    code = command.main(["--name", "Ana", "--email", "ana@example.com"])

    assert code == 0
    assert "ana@example.com created" in capsys.readouterr().out
    assert login(client, "ana@example.com", "password123").status_code == 200


@pytest.mark.parametrize(
    "email, password, message",
    [
        ("not-an-email", "password123", "Invalid data"),
        ("bia@example.com", "short", "Invalid data"),
    ],
)
def test_the_command_rejects_invalid_data(engine, monkeypatch, capsys, email, password, message):
    monkeypatch.setattr(command, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setenv("NEW_USER_PASSWORD", password)

    assert command.main(["--name", "Bia", "--email", email]) == 1
    assert message in capsys.readouterr().err


def test_the_command_does_not_create_the_same_email_twice(engine, monkeypatch, capsys):
    monkeypatch.setattr(command, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setenv("NEW_USER_PASSWORD", "password123")

    assert command.main(["--name", "Caio", "--email", "caio@example.com"]) == 0
    assert command.main(["--name", "Caio", "--email", "caio@example.com"]) == 1
    assert "Error" in capsys.readouterr().err
