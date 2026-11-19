from tests.helpers import create_category, create_product, post_sale


def pay(amount):
    return {"amount": amount, "method": "pix"}


def get_product(client, headers, product_id):
    products = client.get("/products/", headers=headers).json()
    return next(product for product in products if product["id"] == product_id)


def test_a_product_shows_when_it_was_registered_and_has_never_sold(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], price=50.0, stock_quantity=5
    )

    listed = get_product(client, auth_headers, product["id"])

    assert listed["created_at"] is not None
    assert listed["last_sold_at"] is None


def test_the_last_sale_date_ignores_gifts_and_canceled_sales(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], price=50.0, stock_quantity=10
    )
    item = {"product_id": product["id"], "quantity": 1}

    # a gift is not a sale
    post_sale(client, auth_headers, [{**item, "is_gift": True}])

    assert get_product(client, auth_headers, product["id"])["last_sold_at"] is None

    # a canceled sale is not a sale either
    canceled = post_sale(client, auth_headers, [item], payments=[pay(50.0)]).json()
    client.post(f"/sales/{canceled['id']}/cancel", headers=auth_headers)

    assert get_product(client, auth_headers, product["id"])["last_sold_at"] is None

    # a real sale counts
    post_sale(client, auth_headers, [item], payments=[pay(50.0)])

    assert get_product(client, auth_headers, product["id"])["last_sold_at"] is not None