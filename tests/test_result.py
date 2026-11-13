from tests.helpers import create_category, create_product, post_sale, register_movement


def pay(amount):
    return {"amount": amount, "method": "pix"}


def get_result(client, headers, **params):
    return client.get("/reports/result", params=params, headers=headers)


def test_the_result_adds_the_revenue_and_subtracts_every_cost(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], price=100.0, cost_price=40.0, stock_quantity=20
    )
    bag = client.post(
        "/packagings/",
        json={"name": "Bag", "quantity": 10, "total_cost": 20.0},
        headers=auth_headers,
    ).json()
    item = {"product_id": product["id"]}

    # 2 x 100, paid in full, with 2 bags (2.00 each)
    post_sale(
        client,
        auth_headers,
        [{**item, "quantity": 2}],
        payments=[pay(200.0)],
        packagings=[{"packaging_id": bag["id"], "quantity": 2}],
    )
    # 1 x 90 (discount), only 30 paid: 60 still open
    post_sale(
        client,
        auth_headers,
        [{**item, "quantity": 1, "unit_price": 90.0}],
        payments=[pay(30.0)],
        customer_name="Ana",
    )
    # a gift: not charged, costs 40, and 100 of revenue is forgone
    post_sale(client, auth_headers, [{**item, "quantity": 1, "is_gift": True}])
    # one expired unit thrown away (cost 40)
    register_movement(client, auth_headers, product["id"], "out", 1, reason="expired")
    # a canceled sale counts for nothing
    canceled = post_sale(
        client, auth_headers, [{**item, "quantity": 5}], payments=[pay(500.0)]
    ).json()
    client.post(f"/sales/{canceled['id']}/cancel", headers=auth_headers)

    response = get_result(client, auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "sales_count": 2,
        "revenue": 290.0,
        "received": 230.0,
        "open_balance": 60.0,
        "products_cost": 120.0,
        "packagings_cost": 4.0,
        "gifts_cost": 40.0,
        "losses_cost": 40.0,
        "profit": 86.0,
        "gifts_forgone_revenue": 100.0,
        "items_without_cost": 0,
    }


def test_items_without_a_cost_are_counted_so_the_profit_is_not_trusted(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)

    post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 1}],
        payments=[pay(100.0)],
    )

    result = get_result(client, auth_headers).json()

    assert result["revenue"] == 100.0
    assert result["products_cost"] == 0.0
    assert result["profit"] == 100.0
    assert result["items_without_cost"] == 1


def test_the_result_only_counts_the_chosen_period(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0, cost_price=40.0)
    post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 1}],
        payments=[pay(100.0)],
    )

    inside = get_result(
        client, auth_headers, start_date="2000-01-01", end_date="2999-12-31"
    ).json()
    outside = get_result(client, auth_headers, start_date="2999-01-01").json()

    assert inside["revenue"] == 100.0
    assert inside["profit"] == 60.0
    assert outside["sales_count"] == 0
    assert outside["revenue"] == 0.0
    assert outside["profit"] == 0.0


def test_a_start_date_after_the_end_date_is_rejected(client, auth_headers):
    response = get_result(
        client, auth_headers, start_date="2026-12-31", end_date="2026-01-01"
    )

    assert response.status_code == 400