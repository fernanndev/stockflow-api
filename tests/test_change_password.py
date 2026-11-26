from sqlalchemy.orm import sessionmaker

from app import reset_password as command


def login(client, password, email="tester@example.com"):
    return client.post("/auth/login", data={"username": email, "password": password})


def change(client, headers, current, new):
    return client.post(
        "/auth/change-password",
        json={"current_password": current, "new_password": new},
        headers=headers,
    )


def test_the_password_can_be_changed_and_the_new_one_logs_in(client, auth_headers):
    response = change(client, auth_headers, "password123", "another-pass-456")

    assert response.status_code == 204
    assert login(client, "another-pass-456").status_code == 200
    assert login(client, "password123").status_code == 401


def test_a_wrong_current_password_changes_nothing(client, auth_headers):
    response = change(client, auth_headers, "not-my-password", "another-pass-456")

    assert response.status_code == 400
    assert response.json()["detail"] == "Current password is incorrect."
    assert login(client, "password123").status_code == 200


def test_the_new_password_must_be_different_and_long_enough(client, auth_headers):
    same = change(client, auth_headers, "password123", "password123")
    short = change(client, auth_headers, "password123", "short")

    assert same.status_code == 400
    assert short.status_code == 422


def test_changing_the_password_requires_login(client):
    response = client.post(
        "/auth/change-password",
        json={"current_password": "password123", "new_password": "another-pass-456"},
    )

    assert response.status_code == 401


def test_guessing_the_current_password_is_limited(client, auth_headers):
    for _ in range(5):
        assert change(client, auth_headers, "wrong", "another-pass-456").status_code == 400

    blocked = change(client, auth_headers, "wrong", "another-pass-456")

    assert blocked.status_code == 429
    # even with the right current password: the block would be useless otherwise
    assert change(client, auth_headers, "password123", "another-pass-456").status_code == 429


def test_the_administrator_command_sets_a_new_password(client, auth_headers, engine, monkeypatch, capsys):
    monkeypatch.setattr(command, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setenv("NEW_USER_PASSWORD", "reset-pass-789")

    code = command.main(["--email", "tester@example.com"])

    assert code == 0
    assert "changed" in capsys.readouterr().out
    assert login(client, "reset-pass-789").status_code == 200
    assert login(client, "password123").status_code == 401


def test_the_administrator_command_rejects_an_unknown_user_and_a_short_password(
    engine, monkeypatch, capsys
):
    monkeypatch.setattr(command, "SessionLocal", sessionmaker(bind=engine))

    monkeypatch.setenv("NEW_USER_PASSWORD", "long-enough-123")
    assert command.main(["--email", "nobody@example.com"]) == 1
    assert "User not found" in capsys.readouterr().err

    monkeypatch.setenv("NEW_USER_PASSWORD", "short")
    assert command.main(["--email", "nobody@example.com"]) == 1
    assert "Invalid data" in capsys.readouterr().err
