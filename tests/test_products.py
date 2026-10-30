from app.core import storage
from tests.helpers import create_category, create_product, get_product, register_movement

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def test_updating_a_product_does_not_change_its_stock_quantity(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=10)

    response = client.put(
        f"/products/{product['id']}",
        json={
            "name": "Renamed",
            "price": 120.0,
            "minimum_stock": 4,
            "size": None,
            "category_id": category["id"],
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    updated = get_product(client, auth_headers, product["id"])
    assert updated["name"] == "Renamed"
    assert updated["minimum_stock"] == 4
    assert updated["stock_quantity"] == 10


def test_product_optional_fields_are_saved(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(
        client,
        auth_headers,
        category["id"],
        size="500g",
        expiration_date="2030-05-20",
    )

    assert product["size"] == "500g"
    assert product["expiration_date"] == "2030-05-20"
    assert product["image_url"] is None


def test_deleting_a_product_also_deletes_its_movements(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    register_movement(client, auth_headers, product["id"], "in", 1)

    response = client.delete(f"/products/{product['id']}", headers=auth_headers)

    assert response.status_code == 204
    assert client.get("/stock-movements/", headers=auth_headers).json() == []


def test_a_category_with_products_cannot_be_deleted(client, auth_headers):
    category = create_category(client, auth_headers)
    create_product(client, auth_headers, category["id"])

    response = client.delete(f"/categories/{category['id']}", headers=auth_headers)

    assert response.status_code == 400


def test_uploading_and_removing_a_product_photo(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    uploaded = client.post(
        f"/products/{product['id']}/image",
        files={"image": ("photo.png", PNG, "image/png")},
        headers=auth_headers,
    )

    assert uploaded.status_code == 200
    image_url = uploaded.json()["image_url"]
    assert image_url.startswith("/uploads/") and image_url.endswith(".png")
    assert len(list(tmp_path.iterdir())) == 1

    removed = client.delete(f"/products/{product['id']}/image", headers=auth_headers)

    assert removed.status_code == 200
    assert removed.json()["image_url"] is None
    assert list(tmp_path.iterdir()) == []


def test_uploading_a_file_that_is_not_an_image_is_rejected(
    client, auth_headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = client.post(
        f"/products/{product['id']}/image",
        files={"image": ("photo.png", b"definitely not an image", "image/png")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert list(tmp_path.iterdir()) == []