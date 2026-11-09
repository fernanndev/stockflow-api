from sqlalchemy.orm import sessionmaker

from app.models.stock_movement import MovementReason, StockMovement
from tests.helpers import (
    create_category,
    create_product,
    create_variation,
    get_product,
    post_sale,
    register_movement,
)


def paid(amount, method="pix"):
    return [{"amount": amount, "method": method}]


def lot_quantities(product):
    return {
        lot["expiration_date"]: lot["quantity"]
        for variation in product["variations"]
        for lot in variation["lots"]
    }


def test_a_sale_takes_the_stock_from_the_lot_that_expires_first(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2031-01-01")

    response = post_sale(
        client, auth_headers, [{"product_id": product["id"], "quantity": 7}], payments=paid(700.0)
    )

    assert response.status_code == 201
    updated = get_product(client, auth_headers, product["id"])
    assert updated["stock_quantity"] == 3
    assert lot_quantities(updated) == {"2030-01-01": 0, "2031-01-01": 3}


def test_a_sale_keeps_the_prices_of_the_day(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], price=100.0, cost_price=60.0
    )

    sale = post_sale(
        client, auth_headers, [{"product_id": product["id"], "quantity": 2}], payments=paid(200.0)
    ).json()
    client.put(
        f"/products/{product['id']}",
        json={
            "name": "Whey",
            "price": 150.0,
            "cost_price": 80.0,
            "minimum_stock": 2,
            "size": None,
            "category_id": category["id"],
        },
        headers=auth_headers,
    )
    again = client.get(f"/sales/{sale['id']}", headers=auth_headers).json()

    assert sale["total"] == 200.0
    assert again["items"][0]["product_name"] == "Whey"
    assert again["items"][0]["unit_price"] == 100.0
    assert again["items"][0]["unit_cost"] == 60.0


def test_a_sale_item_can_have_a_discount(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)

    response = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 2, "unit_price": 80.0}],
        payments=paid(160.0),
    )

    assert response.status_code == 201
    assert response.json()["total"] == 160.0
    assert response.json()["items"][0]["unit_price"] == 80.0


def test_a_gift_is_not_charged_and_keeps_the_list_price(client, auth_headers):
    category = create_category(client, auth_headers)
    main = create_product(
        client, auth_headers, category["id"], name="Whey", price=100.0, cost_price=60.0
    )
    gift = create_product(
        client, auth_headers, category["id"], name="Shaker", price=30.0, cost_price=10.0
    )

    response = post_sale(
        client,
        auth_headers,
        [
            {"product_id": main["id"], "quantity": 1},
            {"product_id": gift["id"], "quantity": 1, "is_gift": True, "unit_price": 0},
        ],
        payments=paid(100.0),
    )

    body = response.json()
    gift_item = next(item for item in body["items"] if item["is_gift"])
    assert response.status_code == 201
    assert body["total"] == 100.0
    assert gift_item["unit_price"] == 30.0
    assert gift_item["unit_cost"] == 10.0
    assert get_product(client, auth_headers, gift["id"])["stock_quantity"] == 9


def test_a_sale_with_only_gifts_needs_no_payment(client, auth_headers):
    category = create_category(client, auth_headers)
    gift = create_product(client, auth_headers, category["id"], price=30.0)

    response = post_sale(
        client, auth_headers, [{"product_id": gift["id"], "quantity": 1, "is_gift": True}]
    )

    assert response.status_code == 201
    assert response.json()["total"] == 0.0
    assert response.json()["balance"] == 0.0


def test_a_sale_without_enough_stock_changes_nothing(client, auth_headers):
    category = create_category(client, auth_headers)
    first = create_product(client, auth_headers, category["id"], name="First", stock_quantity=10)
    second = create_product(client, auth_headers, category["id"], name="Second", stock_quantity=1)

    response = post_sale(
        client,
        auth_headers,
        [
            {"product_id": first["id"], "quantity": 2},
            {"product_id": second["id"], "quantity": 5},
        ],
        customer_name="Ana",
    )

    assert response.status_code == 400
    assert get_product(client, auth_headers, first["id"])["stock_quantity"] == 10
    assert get_product(client, auth_headers, second["id"])["stock_quantity"] == 1


def test_packagings_leave_the_stock_and_keep_their_cost(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    packaging = client.post(
        "/packagings/",
        json={"name": "Small bag", "quantity": 10, "total_cost": 5.0},
        headers=auth_headers,
    ).json()

    response = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 1}],
        packagings=[{"packaging_id": packaging["id"], "quantity": 2}],
        payments=paid(100.0),
    )

    used = response.json()["packagings"][0]
    packagings = client.get("/packagings/", headers=auth_headers).json()
    left = next(item for item in packagings if item["id"] == packaging["id"])
    assert response.status_code == 201
    assert used["packaging_name"] == "Small bag"
    assert used["quantity"] == 2
    assert used["unit_cost"] == 0.5
    assert left["stock_quantity"] == 8


def test_a_missing_packaging_stock_cancels_the_whole_sale(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], stock_quantity=10)
    packaging = client.post(
        "/packagings/",
        json={"name": "Small bag", "quantity": 1, "total_cost": 0.5},
        headers=auth_headers,
    ).json()

    response = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 2}],
        packagings=[{"packaging_id": packaging["id"], "quantity": 2}],
        customer_name="Ana",
    )

    assert response.status_code == 400
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 10


def test_a_sale_that_is_not_fully_paid_needs_a_customer(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    items = [{"product_id": product["id"], "quantity": 1}]

    without_customer = post_sale(client, auth_headers, items)
    with_customer = post_sale(client, auth_headers, items, customer_name="Ana")

    assert without_customer.status_code == 400
    assert with_customer.status_code == 201
    assert with_customer.json()["customer_name"] == "Ana"
    assert with_customer.json()["paid_amount"] == 0.0
    assert with_customer.json()["balance"] == 100.0
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 9


def test_a_sale_paid_in_full_has_no_balance(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)

    response = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 1}],
        payments=paid(100.0, "cash"),
    )

    body = response.json()
    assert response.status_code == 201
    assert body["balance"] == 0.0
    assert body["payments"][0]["method"] == "cash"
    assert body["status"] == "completed"


def test_a_partial_payment_leaves_the_rest_open(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)

    response = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 2}],
        customer_name="Ana",
        payments=paid(40.0),
    )

    assert response.status_code == 201
    assert response.json()["total"] == 200.0
    assert response.json()["paid_amount"] == 40.0
    assert response.json()["balance"] == 160.0


def test_payments_cannot_be_higher_than_the_total(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)

    response = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 1}],
        payments=paid(150.0),
    )

    assert response.status_code == 400
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 10


def test_a_sale_of_a_product_with_variations_needs_the_variation(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0, stock_quantity=10)
    blue = create_variation(client, auth_headers, product["id"], "Blue")
    register_movement(client, auth_headers, product["id"], "in", 5, variation_id=blue["id"])

    without_choice = post_sale(
        client, auth_headers, [{"product_id": product["id"], "quantity": 2}], payments=paid(200.0)
    )
    with_choice = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "variation_id": blue["id"], "quantity": 2}],
        payments=paid(200.0),
    )

    assert without_choice.status_code == 400
    assert with_choice.status_code == 201
    assert with_choice.json()["items"][0]["variation_name"] == "Blue"
    variations = get_product(client, auth_headers, product["id"])["variations"]
    assert {v["name"]: v["stock_quantity"] for v in variations} == {"Padrão": 10, "Blue": 3}


def test_a_sale_needs_items_and_known_products(client, auth_headers):
    empty = post_sale(client, auth_headers, [])
    unknown = post_sale(client, auth_headers, [{"product_id": 999999, "quantity": 1}])

    assert empty.status_code == 422
    assert unknown.status_code == 400


def test_each_item_leaves_a_movement_with_its_reason_and_lots(client, auth_headers, engine):
    category = create_category(client, auth_headers)
    main = create_product(
        client, auth_headers, category["id"], name="Whey", price=100.0, cost_price=60.0,
        stock_quantity=0,
    )
    gift = create_product(
        client, auth_headers, category["id"], name="Shaker", price=30.0, stock_quantity=5
    )
    register_movement(client, auth_headers, main["id"], "in", 5, expiration_date="2030-01-01")
    register_movement(client, auth_headers, main["id"], "in", 5, expiration_date="2031-01-01")

    response = post_sale(
        client,
        auth_headers,
        [
            {"product_id": main["id"], "quantity": 7},
            {"product_id": gift["id"], "quantity": 1, "is_gift": True},
        ],
        payments=paid(700.0),
    )

    assert response.status_code == 201

    with sessionmaker(bind=engine)() as session:
        movements = (
            session.query(StockMovement)
            .filter(StockMovement.sale_id == response.json()["id"])
            .order_by(StockMovement.id)
            .all()
        )

        assert [(m.reason, m.quantity) for m in movements] == [
            (MovementReason.SALE, 7),
            (MovementReason.GIFT, 1),
        ]
        assert float(movements[0].unit_price) == 100.0
        assert float(movements[0].unit_cost) == 60.0
        used = sorted(
            (a.expiration_date.isoformat(), a.quantity) for a in movements[0].allocations
        )
        assert used == [("2030-01-01", 5), ("2031-01-01", 2)]