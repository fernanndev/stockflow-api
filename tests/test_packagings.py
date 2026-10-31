from app.core import storage
from tests.helpers import create_packaging

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def purchase(client, headers, packaging_id, quantity, total_cost):
    return client.post(
        f"/packagings/{packaging_id}/purchases",
        json={"quantity": quantity, "total_cost": total_cost},
        headers=headers,
    )


def test_a_new_packaging_starts_without_stock_and_cost(client, auth_headers):
    packaging = create_packaging(client, auth_headers)

    assert packaging["stock_quantity"] == 0
    assert packaging["unit_cost"] == 0
    assert packaging["image_url"] is None


def test_creating_a_packaging_with_the_first_purchase(client, auth_headers):
    response = client.post(
        "/packagings/",
        json={"name": "Medium bag", "quantity": 73, "total_cost": 40.15},
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["stock_quantity"] == 73
    assert response.json()["unit_cost"] == 0.55


def test_quantity_and_total_cost_must_come_together(client, auth_headers):
    response = client.post(
        "/packagings/",
        json={"name": "Medium bag", "quantity": 73},
        headers=auth_headers,
    )

    assert response.status_code == 400


def test_packaging_names_must_be_unique(client, auth_headers):
    create_packaging(client, auth_headers, name="Small bag")

    response = client.post("/packagings/", json={"name": "Small bag"}, headers=auth_headers)

    assert response.status_code == 400


def test_the_next_purchase_averages_the_unit_cost(client, auth_headers):
    packaging = create_packaging(client, auth_headers)
    purchase(client, auth_headers, packaging["id"], 20, 6.0)

    response = purchase(client, auth_headers, packaging["id"], 100, 45.0)

    assert response.json()["stock_quantity"] == 120
    assert response.json()["unit_cost"] == 0.425


def test_purchase_quantity_must_be_positive(client, auth_headers):
    packaging = create_packaging(client, auth_headers)

    response = purchase(client, auth_headers, packaging["id"], 0, 10.0)

    assert response.status_code == 422


def test_purchase_for_an_unknown_packaging_is_rejected(client, auth_headers):
    response = purchase(client, auth_headers, 999999, 10, 10.0)

    assert response.status_code == 400


def test_uploading_and_removing_a_packaging_photo(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)
    packaging = create_packaging(client, auth_headers)

    uploaded = client.post(
        f"/packagings/{packaging['id']}/image",
        files={"image": ("photo.png", PNG, "image/png")},
        headers=auth_headers,
    )

    assert uploaded.status_code == 200
    assert uploaded.json()["image_url"].startswith("/uploads/")
    assert len(list(tmp_path.iterdir())) == 1

    removed = client.delete(f"/packagings/{packaging['id']}/image", headers=auth_headers)

    assert removed.json()["image_url"] is None
    assert list(tmp_path.iterdir()) == []


def test_deleting_a_packaging(client, auth_headers):
    packaging = create_packaging(client, auth_headers)

    response = client.delete(f"/packagings/{packaging['id']}", headers=auth_headers)

    assert response.status_code == 204
    assert client.get("/packagings/", headers=auth_headers).json() == []

def test_updating_a_packaging_can_correct_stock_and_unit_cost(client, auth_headers):
    packaging = client.post(
        "/packagings/",
        json={"name": "Bag", "quantity": 73, "total_cost": 700.0},
        headers=auth_headers,
    ).json()

    response = client.put(
        f"/packagings/{packaging['id']}",
        json={"name": "Bag", "stock_quantity": 73, "unit_cost": 0.96},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["stock_quantity"] == 73
    assert response.json()["unit_cost"] == 0.96


def test_updating_only_the_name_keeps_stock_and_cost(client, auth_headers):
    packaging = client.post(
        "/packagings/",
        json={"name": "Bag", "quantity": 10, "total_cost": 5.0},
        headers=auth_headers,
    ).json()

    response = client.put(
        f"/packagings/{packaging['id']}",
        json={"name": "Renamed"},
        headers=auth_headers,
    )

    assert response.json()["name"] == "Renamed"
    assert response.json()["stock_quantity"] == 10
    assert response.json()["unit_cost"] == 0.5