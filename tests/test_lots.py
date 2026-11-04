from tests.helpers import create_category, create_product, get_product, register_movement


def lots_by_expiration(product):
    return {
        lot["expiration_date"]: lot["quantity"]
        for lot in product["variations"][0]["lots"]
    }


def test_a_new_product_gets_a_default_variation_with_its_stock_as_a_lot(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(
        client, auth_headers, category["id"], stock_quantity=10, expiration_date="2030-05-20"
    )

    assert len(product["variations"]) == 1
    assert product["variations"][0]["name"] == "Padrão"
    assert lots_by_expiration(product) == {"2030-05-20": 10}
    assert product["stock_quantity"] == 10
    assert product["expiration_date"] == "2030-05-20"


def test_a_product_without_stock_has_no_lots(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(client, auth_headers, category["id"], stock_quantity=0)

    assert product["variations"][0]["lots"] == []
    assert product["stock_quantity"] == 0
    assert product["expiration_date"] is None


def test_entries_with_the_same_expiration_share_a_lot(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)

    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 3, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 2, expiration_date="2031-01-01")

    updated = get_product(client, auth_headers, product["id"])
    assert lots_by_expiration(updated) == {"2030-01-01": 8, "2031-01-01": 2}
    assert updated["stock_quantity"] == 10
    assert updated["expiration_date"] == "2030-01-01"


def test_exit_takes_from_the_lot_that_expires_first(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 6, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 10, expiration_date="2031-01-01")

    response = register_movement(client, auth_headers, product["id"], "out", 8)

    assert response.status_code == 201
    updated = get_product(client, auth_headers, product["id"])
    assert lots_by_expiration(updated) == {"2030-01-01": 0, "2031-01-01": 8}
    assert updated["stock_quantity"] == 8


def test_lots_without_expiration_are_used_last(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=4)
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2030-01-01")

    register_movement(client, auth_headers, product["id"], "out", 6)

    updated = get_product(client, auth_headers, product["id"])
    assert lots_by_expiration(updated) == {"2030-01-01": 0, None: 3}


def test_exit_can_take_from_a_chosen_lot(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 6, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 10, expiration_date="2031-01-01")
    later_lot = next(
        lot
        for lot in get_product(client, auth_headers, product["id"])["variations"][0]["lots"]
        if lot["expiration_date"] == "2031-01-01"
    )

    chosen = register_movement(
        client, auth_headers, product["id"], "out", 2, lot_id=later_lot["id"]
    )
    too_much = register_movement(
        client, auth_headers, product["id"], "out", 9, lot_id=later_lot["id"]
    )

    assert chosen.status_code == 201
    assert too_much.status_code == 400
    updated = get_product(client, auth_headers, product["id"])
    assert lots_by_expiration(updated) == {"2030-01-01": 6, "2031-01-01": 8}


def test_a_lot_cannot_be_chosen_on_an_entry(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])
    lot = product["variations"][0]["lots"][0]

    response = register_movement(
        client, auth_headers, product["id"], "in", 1, lot_id=lot["id"]
    )

    assert response.status_code == 400


def test_a_lot_from_another_product_is_rejected(client, auth_headers):
    category = create_category(client, auth_headers)
    first = create_product(client, auth_headers, category["id"], name="First")
    second = create_product(client, auth_headers, category["id"], name="Second")
    foreign_lot = second["variations"][0]["lots"][0]

    response = register_movement(
        client, auth_headers, first["id"], "out", 1, lot_id=foreign_lot["id"]
    )

    assert response.status_code == 400