from tests.helpers import create_category, create_product, get_product, register_movement


def lots_of(client, headers, product_id):
    lots = get_product(client, headers, product_id)["variations"][0]["lots"]

    return [(lot["expiration_date"], lot["quantity"]) for lot in lots]


def test_a_lot_expiration_can_be_corrected(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2030-01-01")
    lot = get_product(client, auth_headers, product["id"])["variations"][0]["lots"][0]

    response = client.put(
        f"/lots/{lot['id']}",
        json={"expiration_date": "2030-06-01", "quantity": 5},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["expiration_date"] == "2030-06-01"
    assert response.json()["quantity"] == 5
    assert get_product(client, auth_headers, product["id"])["expiration_date"] == "2030-06-01"


def test_a_lot_quantity_can_be_corrected_without_registering_a_movement(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 700, expiration_date="2030-01-01")
    lot = get_product(client, auth_headers, product["id"])["variations"][0]["lots"][0]

    response = client.put(
        f"/lots/{lot['id']}",
        json={"expiration_date": "2030-01-01", "quantity": 70},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 70
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 70
    history = client.get(
        f"/stock-movements/?product_id={product['id']}", headers=auth_headers
    ).json()
    assert [(movement["type"], movement["quantity"]) for movement in history] == [("in", 700)]


def test_correcting_a_lot_to_an_existing_expiration_merges_them(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 3, expiration_date="2031-01-01")
    lots = get_product(client, auth_headers, product["id"])["variations"][0]["lots"]
    earlier = next(lot for lot in lots if lot["expiration_date"] == "2030-01-01")

    response = client.put(
        f"/lots/{earlier['id']}",
        json={"expiration_date": "2031-01-01", "quantity": 5},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 8
    assert lots_of(client, auth_headers, product["id"]) == [("2031-01-01", 8)]


def test_a_lot_expiration_can_be_cleared(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], stock_quantity=5, expiration_date="2030-01-01"
    )
    lot = product["variations"][0]["lots"][0]

    response = client.put(
        f"/lots/{lot['id']}",
        json={"expiration_date": None, "quantity": 5},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["expiration_date"] is None
    assert get_product(client, auth_headers, product["id"])["expiration_date"] is None


def test_correcting_an_unknown_lot_is_rejected(client, auth_headers):
    response = client.put(
        "/lots/999999",
        json={"expiration_date": "2030-01-01", "quantity": 1},
        headers=auth_headers,
    )

    assert response.status_code == 400


def test_a_lot_correction_requires_a_valid_quantity(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    lot = product["variations"][0]["lots"][0]

    negative = client.put(
        f"/lots/{lot['id']}",
        json={"expiration_date": None, "quantity": -1},
        headers=auth_headers,
    )
    missing = client.put(
        f"/lots/{lot['id']}", json={"expiration_date": None}, headers=auth_headers
    )

    assert negative.status_code == 422
    assert missing.status_code == 422