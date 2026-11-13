from tests.helpers import create_category, create_product, create_variation


def add_variation(client, headers, product_id, **payload):
    return client.post(f"/products/{product_id}/variations", json=payload, headers=headers)


def test_a_new_product_can_have_a_barcode(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(client, auth_headers, category["id"], barcode=" 7891234567890 ")

    assert product["variations"][0]["barcode"] == "7891234567890"


def test_a_blank_barcode_means_no_barcode(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(client, auth_headers, category["id"], barcode="   ")

    assert product["variations"][0]["barcode"] is None


def test_a_variation_can_have_its_own_barcode(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = add_variation(client, auth_headers, product["id"], name="Blue", barcode="123456")

    assert response.status_code == 201
    assert response.json()["barcode"] == "123456"


def test_many_variations_can_have_no_barcode(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    first = add_variation(client, auth_headers, product["id"], name="Blue")
    second = add_variation(client, auth_headers, product["id"], name="Red")

    assert first.status_code == 201
    assert second.status_code == 201


def test_a_barcode_cannot_be_used_twice(client, auth_headers):
    category = create_category(client, auth_headers)
    create_product(client, auth_headers, category["id"], name="Whey", barcode="111")
    other = create_product(client, auth_headers, category["id"], name="Creatine")

    on_variation = add_variation(client, auth_headers, other["id"], name="Blue", barcode="111")
    on_product = client.post(
        "/products/",
        json={"name": "Bar", "price": 5.0, "category_id": category["id"], "barcode": "111"},
        headers=auth_headers,
    )

    assert on_variation.status_code == 400
    assert "Whey" in on_variation.json()["detail"]
    assert on_product.status_code == 400


def test_renaming_a_variation_keeps_its_barcode(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    variation = add_variation(
        client, auth_headers, product["id"], name="Blue", barcode="123456"
    ).json()
    url = f"/variations/{variation['id']}"

    renamed = client.put(url, json={"name": "Navy"}, headers=auth_headers)
    same_code = client.put(
        url, json={"name": "Navy", "barcode": "123456"}, headers=auth_headers
    )
    cleared = client.put(url, json={"name": "Navy", "barcode": None}, headers=auth_headers)

    assert renamed.json()["barcode"] == "123456"
    assert same_code.status_code == 200
    assert cleared.json()["barcode"] is None


def test_the_barcode_of_a_single_variation_product_is_edited_with_the_product(
    client, auth_headers
):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    payload = {
        "name": "Whey",
        "price": 100.0,
        "size": None,
        "category_id": category["id"],
        "barcode": "999",
    }

    response = client.put(f"/products/{product['id']}", json=payload, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["variations"][0]["barcode"] == "999"

    # editing the product without the field keeps the code
    payload.pop("barcode")
    kept = client.put(f"/products/{product['id']}", json=payload, headers=auth_headers)

    assert kept.json()["variations"][0]["barcode"] == "999"


def test_a_product_with_several_variations_has_no_barcode_of_its_own(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    create_variation(client, auth_headers, product["id"], "Blue")
    payload = {
        "name": "Whey",
        "price": 100.0,
        "size": None,
        "category_id": category["id"],
        "barcode": "888",
    }

    response = client.put(f"/products/{product['id']}", json=payload, headers=auth_headers)

    assert response.status_code == 400