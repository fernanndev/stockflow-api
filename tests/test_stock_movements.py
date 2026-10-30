from tests.helpers import create_category, create_product, get_product, register_movement


def test_entry_increases_and_exit_decreases_the_stock(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=10)

    assert register_movement(client, auth_headers, product["id"], "in", 5).status_code == 201
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 15

    assert register_movement(client, auth_headers, product["id"], "out", 3).status_code == 201
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 12


def test_exit_larger_than_the_balance_is_rejected_and_keeps_the_stock(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=5)

    response = register_movement(client, auth_headers, product["id"], "out", 6)

    assert response.status_code == 400
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 5


def test_exit_of_the_exact_balance_is_allowed(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=5)

    response = register_movement(client, auth_headers, product["id"], "out", 5)

    assert response.status_code == 201
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 0


def test_movement_quantity_must_be_positive(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = register_movement(client, auth_headers, product["id"], "in", 0)

    assert response.status_code == 422


def test_movement_for_an_unknown_product_is_rejected(client, auth_headers):
    response = register_movement(client, auth_headers, 999999, "in", 1)

    assert response.status_code == 400


def test_history_is_newest_first_and_can_be_filtered_by_product(client, auth_headers):
    category = create_category(client, auth_headers)
    first = create_product(client, auth_headers, category["id"], name="First")
    second = create_product(client, auth_headers, category["id"], name="Second")

    register_movement(client, auth_headers, first["id"], "in", 1)
    register_movement(client, auth_headers, second["id"], "in", 2)
    register_movement(client, auth_headers, first["id"], "out", 1)

    history = client.get("/stock-movements/", headers=auth_headers).json()
    assert [movement["quantity"] for movement in history] == [1, 2, 1]
    assert [movement["type"] for movement in history] == ["out", "in", "in"]

    only_second = client.get(
        f"/stock-movements/?product_id={second['id']}", headers=auth_headers
    ).json()
    assert len(only_second) == 1
    assert only_second[0]["product"]["name"] == "Second"