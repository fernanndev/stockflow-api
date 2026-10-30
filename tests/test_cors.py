from app.core.config import settings


def preflight(client, origin):
    return client.options(
        "/products/",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )


def test_origins_from_the_settings_are_allowed(client):
    allowed = settings.cors_origins.split(",")[0].strip()

    response = preflight(client, allowed)

    assert response.headers["access-control-allow-origin"] == allowed


def test_unknown_origins_are_not_allowed(client):
    response = preflight(client, "http://unknown.example")

    assert "access-control-allow-origin" not in response.headers