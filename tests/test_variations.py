from tests.helpers import (
    create_category,
    create_product,
    create_variation,
    get_product,
    register_movement,
)


def stock_by_variation(product):
    return {
        variation["name"]: variation["stock_quantity"]
        for variation in product["variations"]
    }


def test_a_variation_can_be_added_to_a_product(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=10)

    variation = create_variation(client, auth_headers, product["id"], "Blue")

    assert variation["name"] == "Blue"
    assert variation["stock_quantity"] == 0
    assert variation["lots"] == []
    updated = get_product(client, auth_headers, product["id"])
    assert sorted(v["name"] for v in updated["variations"]) == ["Blue", "Padrão"]
    assert updated["stock_quantity"] == 10


def test_a_variation_name_is_unique_only_within_its_product(client, auth_headers):
    category = create_category(client, auth_headers)
    first = create_product(client, auth_headers, category["id"], name="First")
    second = create_product(client, auth_headers, category["id"], name="Second")
    create_variation(client, auth_headers, first["id"], "Blue")

    duplicated = client.post(
        f"/products/{first['id']}/variations", json={"name": "blue"}, headers=auth_headers
    )
    other_product = client.post(
        f"/products/{second['id']}/variations", json={"name": "Blue"}, headers=auth_headers
    )

    assert duplicated.status_code == 400
    assert other_product.status_code == 201


def test_a_blank_variation_name_is_rejected(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = client.post(
        f"/products/{product['id']}/variations", json={"name": "   "}, headers=auth_headers
    )

    assert response.status_code == 422


def test_adding_a_variation_to_an_unknown_product_is_rejected(client, auth_headers):
    response = client.post(
        "/products/999999/variations", json={"name": "Blue"}, headers=auth_headers
    )

    assert response.status_code == 400


def test_a_variation_can_be_renamed_but_not_to_an_existing_name(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    blue = create_variation(client, auth_headers, product["id"], "Blue")

    renamed = client.put(
        f"/variations/{blue['id']}", json={"name": "Navy"}, headers=auth_headers
    )
    clash = client.put(
        f"/variations/{blue['id']}", json={"name": "padrão"}, headers=auth_headers
    )

    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Navy"
    assert clash.status_code == 400


def test_a_product_with_several_variations_requires_choosing_one(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    blue = create_variation(client, auth_headers, product["id"], "Blue")

    without_choice = register_movement(client, auth_headers, product["id"], "in", 5)
    with_choice = register_movement(
        client, auth_headers, product["id"], "in", 5, variation_id=blue["id"]
    )

    assert without_choice.status_code == 400
    assert with_choice.status_code == 201
    updated = get_product(client, auth_headers, product["id"])
    assert updated["stock_quantity"] == 5
    assert stock_by_variation(updated) == {"Padrão": 0, "Blue": 5}


def test_stock_is_kept_separately_for_each_variation(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=10)
    blue = create_variation(client, auth_headers, product["id"], "Blue")
    register_movement(client, auth_headers, product["id"], "in", 4, variation_id=blue["id"])
    register_movement(client, auth_headers, product["id"], "out", 3, variation_id=blue["id"])

    too_much = register_movement(
        client, auth_headers, product["id"], "out", 5, variation_id=blue["id"]
    )

    assert too_much.status_code == 400
    updated = get_product(client, auth_headers, product["id"])
    assert stock_by_variation(updated) == {"Padrão": 10, "Blue": 1}


def test_a_variation_of_another_product_is_rejected(client, auth_headers):
    category = create_category(client, auth_headers)
    first = create_product(client, auth_headers, category["id"], name="First")
    second = create_product(client, auth_headers, category["id"], name="Second")
    foreign = create_variation(client, auth_headers, second["id"], "Blue")

    response = register_movement(
        client, auth_headers, first["id"], "in", 1, variation_id=foreign["id"]
    )

    assert response.status_code == 400


def test_an_unused_variation_can_be_deleted(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    extra = create_variation(client, auth_headers, product["id"], "Blue")

    response = client.delete(f"/variations/{extra['id']}", headers=auth_headers)

    assert response.status_code == 204
    assert len(get_product(client, auth_headers, product["id"])["variations"]) == 1


def test_the_only_variation_of_a_product_cannot_be_deleted(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = client.delete(
        f"/variations/{product['variations'][0]['id']}", headers=auth_headers
    )

    assert response.status_code == 400


def test_a_variation_with_stock_cannot_be_deleted(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=10)
    blue = create_variation(client, auth_headers, product["id"], "Blue")
    register_movement(client, auth_headers, product["id"], "in", 3, variation_id=blue["id"])

    with_stock = client.delete(f"/variations/{blue['id']}", headers=auth_headers)
    default_with_stock = client.delete(
        f"/variations/{product['variations'][0]['id']}", headers=auth_headers
    )

    assert with_stock.status_code == 400
    assert default_with_stock.status_code == 400


def test_a_variation_with_movement_history_cannot_be_deleted(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    blue = create_variation(client, auth_headers, product["id"], "Blue")
    register_movement(client, auth_headers, product["id"], "in", 2, variation_id=blue["id"])
    register_movement(client, auth_headers, product["id"], "out", 2, variation_id=blue["id"])

    response = client.delete(f"/variations/{blue['id']}", headers=auth_headers)

    assert response.status_code == 400