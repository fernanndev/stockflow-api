from app.core import storage

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32

NEW_LOOK = {
    "name": "Flor de Lis Moda",
    "primary_color": "#6B1D3F",
    "background_color": "#FAF5F7",
    "surface_color": "#FFFFFF",
}


def upload_logo(client, headers, content=PNG):
    return client.post(
        "/store/logo",
        files={"image": ("logo.png", content, "image/png")},
        headers=headers,
    )


def test_the_store_starts_with_the_default_look_and_is_public(client):
    response = client.get("/store/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Minha loja",
        "primary_color": "#0f766e",
        "background_color": "#f8fafc",
        "surface_color": "#ffffff",
        "logo_url": None,
    }


def test_changing_the_store_requires_login(client):
    assert client.put("/store/", json=NEW_LOOK).status_code == 401
    assert client.delete("/store/logo").status_code == 401


def test_the_look_is_saved_and_everyone_sees_it(client, auth_headers):
    response = client.put("/store/", json=NEW_LOOK, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["name"] == "Flor de Lis Moda"
    # colors are stored in lowercase
    assert response.json()["primary_color"] == "#6b1d3f"

    # no login needed to read it (the login screen uses it)
    public = client.get("/store/").json()
    assert public["name"] == "Flor de Lis Moda"
    assert public["background_color"] == "#faf5f7"
    assert public["surface_color"] == "#ffffff"


def test_invalid_colors_and_names_are_rejected(client, auth_headers):
    for bad in ("red", "#12345", "#gggggg", "6b1d3f"):
        response = client.put(
            "/store/", json={**NEW_LOOK, "primary_color": bad}, headers=auth_headers
        )

        assert response.status_code == 422

    blank = client.put("/store/", json={**NEW_LOOK, "name": "   "}, headers=auth_headers)

    assert blank.status_code == 422


def test_the_logo_can_be_replaced_and_removed(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)

    first = upload_logo(client, auth_headers)

    assert first.status_code == 200
    assert first.json()["logo_url"].startswith("/uploads/")
    assert len(list(tmp_path.iterdir())) == 1

    # a new logo replaces the old one: the old file is deleted
    second = upload_logo(client, auth_headers)

    assert second.json()["logo_url"] != first.json()["logo_url"]
    assert len(list(tmp_path.iterdir())) == 1
    assert client.get("/store/").json()["logo_url"] == second.json()["logo_url"]

    removed = client.delete("/store/logo", headers=auth_headers)

    assert removed.json()["logo_url"] is None
    assert list(tmp_path.iterdir()) == []


def test_a_file_that_is_not_an_image_is_rejected_as_logo(
    client, auth_headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)

    response = upload_logo(client, auth_headers, content=b"just some text")

    assert response.status_code == 400
    assert list(tmp_path.iterdir()) == []