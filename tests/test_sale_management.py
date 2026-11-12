from sqlalchemy.orm import sessionmaker

from app.models.stock_movement import MovementReason, MovementType, StockMovement
from tests.helpers import (
    create_category,
    create_product,
    get_product,
    post_sale,
    register_movement,
)


def pay(amount, method="pix"):
    return {"amount": amount, "method": method}


def sell(client, headers, product, quantity=1, **extra):
    return post_sale(
        client, headers, [{"product_id": product["id"], "quantity": quantity}], **extra
    )


def cancel(client, headers, sale_id):
    return client.post(f"/sales/{sale_id}/cancel", headers=headers)


def lot_quantities(product):
    return {
        lot["expiration_date"]: lot["quantity"]
        for variation in product["variations"]
        for lot in variation["lots"]
    }


def test_canceling_a_sale_returns_the_units_to_the_lots_they_came_from(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0, stock_quantity=0)
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2030-01-01")
    register_movement(client, auth_headers, product["id"], "in", 5, expiration_date="2031-01-01")
    sale = sell(client, auth_headers, product, 7, payments=[pay(700.0)]).json()

    response = cancel(client, auth_headers, sale["id"])

    assert response.status_code == 200
    assert response.json()["status"] == "canceled"
    assert response.json()["canceled_at"] is not None
    updated = get_product(client, auth_headers, product["id"])
    assert updated["stock_quantity"] == 10
    assert lot_quantities(updated) == {"2030-01-01": 5, "2031-01-01": 5}


def test_canceling_a_sale_returns_the_packagings_and_the_gifts(client, auth_headers):
    category = create_category(client, auth_headers)
    main = create_product(client, auth_headers, category["id"], name="Whey", price=100.0)
    gift = create_product(
        client, auth_headers, category["id"], name="Shaker", price=30.0, stock_quantity=5
    )
    packaging = client.post(
        "/packagings/",
        json={"name": "Small bag", "quantity": 10, "total_cost": 5.0},
        headers=auth_headers,
    ).json()
    sale = post_sale(
        client,
        auth_headers,
        [
            {"product_id": main["id"], "quantity": 1},
            {"product_id": gift["id"], "quantity": 1, "is_gift": True},
        ],
        packagings=[{"packaging_id": packaging["id"], "quantity": 2}],
        payments=[pay(100.0)],
    ).json()

    cancel(client, auth_headers, sale["id"])

    packagings = client.get("/packagings/", headers=auth_headers).json()
    left = next(item for item in packagings if item["id"] == packaging["id"])
    assert get_product(client, auth_headers, main["id"])["stock_quantity"] == 10
    assert get_product(client, auth_headers, gift["id"])["stock_quantity"] == 5
    assert left["stock_quantity"] == 10


def test_canceling_keeps_the_history_with_compensating_movements(client, auth_headers, engine):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, 2, payments=[pay(200.0)]).json()

    cancel(client, auth_headers, sale["id"])

    with sessionmaker(bind=engine)() as session:
        movements = (
            session.query(StockMovement)
            .filter(StockMovement.sale_id == sale["id"])
            .order_by(StockMovement.id)
            .all()
        )

        assert [(m.type, m.reason, m.quantity) for m in movements] == [
            (MovementType.OUT, MovementReason.SALE, 2),
            (MovementType.IN, MovementReason.SALE_CANCELED, 2),
        ]


def test_a_sale_cannot_be_canceled_twice(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, 2, payments=[pay(200.0)]).json()

    first = cancel(client, auth_headers, sale["id"])
    second = cancel(client, auth_headers, sale["id"])

    assert first.status_code == 200
    assert second.status_code == 400
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 10


def test_canceling_an_unknown_sale_returns_404(client, auth_headers):
    assert cancel(client, auth_headers, 999999).status_code == 404


def test_payments_settle_a_credit_sale_step_by_step(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, customer_name="Ana").json()

    first = client.post(f"/sales/{sale['id']}/payments", json=pay(40.0), headers=auth_headers)
    second = client.post(
        f"/sales/{sale['id']}/payments", json=pay(60.0, "cash"), headers=auth_headers
    )

    assert first.status_code == 201
    assert first.json()["paid_amount"] == 40.0
    assert first.json()["balance"] == 60.0
    assert second.json()["balance"] == 0.0
    assert [payment["method"] for payment in second.json()["payments"]] == ["pix", "cash"]


def test_a_payment_cannot_be_higher_than_the_balance(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, customer_name="Ana", payments=[pay(30.0)]).json()

    response = client.post(f"/sales/{sale['id']}/payments", json=pay(80.0), headers=auth_headers)

    assert response.status_code == 400
    current = client.get(f"/sales/{sale['id']}", headers=auth_headers).json()
    assert current["balance"] == 70.0


def test_a_sale_paid_in_full_does_not_receive_more_payments(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, payments=[pay(100.0)]).json()

    response = client.post(f"/sales/{sale['id']}/payments", json=pay(10.0), headers=auth_headers)

    assert response.status_code == 400


def test_a_canceled_sale_does_not_receive_payments(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, customer_name="Ana").json()
    cancel(client, auth_headers, sale["id"])

    response = client.post(f"/sales/{sale['id']}/payments", json=pay(10.0), headers=auth_headers)

    assert response.status_code == 400


def test_a_payment_needs_a_known_sale_and_a_positive_amount(client, auth_headers):
    unknown = client.post("/sales/999999/payments", json=pay(10.0), headers=auth_headers)
    invalid = client.post("/sales/999999/payments", json=pay(0), headers=auth_headers)

    assert unknown.status_code == 404
    assert invalid.status_code == 422


def test_the_list_totals_ignore_canceled_sales_and_can_filter_by_status(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    first = sell(client, auth_headers, product, 2, payments=[pay(200.0)]).json()
    second = sell(client, auth_headers, product, customer_name="Ana", payments=[pay(30.0)]).json()
    third = sell(client, auth_headers, product, payments=[pay(100.0)]).json()
    cancel(client, auth_headers, third["id"])

    everything = client.get("/sales/", headers=auth_headers).json()
    canceled = client.get("/sales/", params={"status": "canceled"}, headers=auth_headers).json()

    assert [sale["id"] for sale in everything["sales"]] == [
        third["id"],
        second["id"],
        first["id"],
    ]
    assert everything["total_sold"] == 300.0
    assert everything["total_paid"] == 230.0
    assert everything["total_open"] == 70.0
    assert [sale["id"] for sale in canceled["sales"]] == [third["id"]]
    assert canceled["total_sold"] == 0.0


def test_the_list_can_be_filtered_by_period(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sell(client, auth_headers, product, payments=[pay(100.0)])

    inside = client.get(
        "/sales/",
        params={"start_date": "2000-01-01", "end_date": "2100-01-01"},
        headers=auth_headers,
    ).json()
    outside = client.get(
        "/sales/",
        params={"start_date": "2000-01-01", "end_date": "2000-01-31"},
        headers=auth_headers,
    ).json()
    reversed_range = client.get(
        "/sales/",
        params={"start_date": "2100-01-01", "end_date": "2000-01-01"},
        headers=auth_headers,
    )

    assert len(inside["sales"]) == 1
    assert inside["total_sold"] == 100.0
    assert outside["sales"] == []
    assert outside["total_sold"] == 0.0
    assert reversed_range.status_code == 400


def test_open_credits_are_grouped_by_customer(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], price=100.0, stock_quantity=20
    )
    sell(client, auth_headers, product, customer_name="Ana", customer_phone="11912345678")
    sell(
        client,
        auth_headers,
        product,
        customer_name="Ana Silva",
        customer_phone="(11) 91234-5678",
        payments=[pay(20.0)],
    )
    sell(client, auth_headers, product, customer_name="Bruno")
    sell(client, auth_headers, product, customer_name="Carla", payments=[pay(100.0)])
    canceled = sell(client, auth_headers, product, customer_name="Dani").json()
    cancel(client, auth_headers, canceled["id"])

    response = client.get("/sales/open-credit", headers=auth_headers)

    body = response.json()
    assert response.status_code == 200
    assert [(debt["customer_name"], debt["balance"]) for debt in body] == [
        ("Ana", 180.0),
        ("Bruno", 100.0),
    ]
    assert body[0]["customer_phone"] == "11912345678"
    assert len(body[0]["sales"]) == 2


def test_a_customer_leaves_the_open_credits_after_paying_everything(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = sell(client, auth_headers, product, customer_name="Ana").json()

    client.post(f"/sales/{sale['id']}/payments", json=pay(100.0), headers=auth_headers)
    response = client.get("/sales/open-credit", headers=auth_headers)

    assert response.json() == []