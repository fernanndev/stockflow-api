from app.core import storage
from app.core.config import settings

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def in_store(headers, store_id):
    return {**headers, "X-Store-Id": str(store_id)}


def test_the_store_list_and_the_plan_need_login(client):
    assert client.get("/stores/").status_code == 401
    assert client.get("/stores/plan").status_code == 401
    assert client.post("/stores/", json={"name": "Nova"}).status_code == 401


def test_the_first_store_always_exists_and_new_stores_are_added(client, auth_headers):
    first = client.get("/stores/", headers=auth_headers).json()

    assert [store["name"] for store in first] == ["Minha loja"]

    created = client.post("/stores/", json={"name": "Loja do Centro"}, headers=auth_headers)

    assert created.status_code == 201
    assert created.json()["name"] == "Loja do Centro"
    # a new store starts with the default look and no logo
    assert created.json()["primary_color"] == "#0f766e"
    assert created.json()["logo_url"] is None

    listed = client.get("/stores/", headers=auth_headers).json()
    assert [store["name"] for store in listed] == ["Minha loja", "Loja do Centro"]


def test_the_plan_limits_how_many_stores_can_be_created(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "max_stores", 2)

    assert client.get("/stores/plan", headers=auth_headers).json() == {
        "max_stores": 2,
        "total_stores": 1,
    }
    assert client.post("/stores/", json={"name": "Segunda"}, headers=auth_headers).status_code == 201

    blocked = client.post("/stores/", json={"name": "Terceira"}, headers=auth_headers)

    assert blocked.status_code == 400
    assert blocked.json()["detail"] == "Your plan allows up to 2 stores."
    assert client.get("/stores/plan", headers=auth_headers).json()["total_stores"] == 2


def test_a_store_needs_a_name(client, auth_headers):
    for name in ("", "   "):
        response = client.post("/stores/", json={"name": name}, headers=auth_headers)

        assert response.status_code == 422


def test_the_look_and_the_logo_belong_to_the_active_store(
    client, auth_headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)
    first = client.get("/stores/", headers=auth_headers).json()[0]
    second = client.post("/stores/", json={"name": "Soul"}, headers=auth_headers).json()
    from_second = in_store(auth_headers, second["id"])

    look = {
        "name": "SoulAtletica",
        "primary_color": "#9B86FF",
        "background_color": "#F5F3FF",
        "surface_color": "#FFFFFF",
    }

    assert client.put("/store/", json=look, headers=from_second).json()["name"] == "SoulAtletica"

    logo = client.post(
        "/store/logo",
        files={"image": ("logo.png", PNG, "image/png")},
        headers=from_second,
    )

    assert logo.json()["logo_url"].startswith("/uploads/")

    # the first store is untouched
    stores = {store["id"]: store for store in client.get("/stores/", headers=auth_headers).json()}
    assert stores[first["id"]]["name"] == "Minha loja"
    assert stores[first["id"]]["logo_url"] is None
    assert stores[second["id"]]["primary_color"] == "#9b86ff"

    # and so is the public login screen: it shows the store it is asked for
    assert client.get("/store/", headers={"X-Store-Id": str(second["id"])}).json()["name"] == "SoulAtletica"
    assert client.get("/store/").json()["name"] == "Minha loja"
    assert client.get("/store/", headers={"X-Store-Id": "9999"}).json()["name"] == "Minha loja"
