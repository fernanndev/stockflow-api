def test_login_with_valid_credentials_returns_a_token(client, auth_headers):
    response = client.post(
        "/auth/login",
        data={"username": "tester@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_with_wrong_password_is_rejected(client, auth_headers):
    response = client.post(
        "/auth/login",
        data={"username": "tester@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_protected_routes_require_a_token(client):
    assert client.get("/products/").status_code == 401


def test_creating_a_user_requires_authentication(client):
    response = client.post(
        "/users/",
        json={"name": "Someone", "email": "someone@example.com", "password": "password123"},
    )

    assert response.status_code == 401


def test_creating_a_user_rejects_short_passwords(client, auth_headers):
    response = client.post(
        "/users/",
        json={"name": "Someone", "email": "someone@example.com", "password": "short"},
        headers=auth_headers,
    )

    assert response.status_code == 422