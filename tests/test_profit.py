from tests.helpers import create_category, create_product

def test_unit_profit_is_price_minus_cost(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(
        client, auth_headers, category["id"], price=100.0, cost_price=60.0
    )

    assert product["unit_profit"] == 40.0

def test_unit_profit_is_unknown_without_a_cost(client, auth_headers):
    category = create_category(client, auth_headers)

    product = create_product(client, auth_headers, category["id"])

    assert product["cost_price"] is None
    assert product["unit_profit"] is None

def test_projected_profit_only_counts_products_with_a_cost(client, auth_headers):
    category = create_category(client, auth_headers)
    create_product(
        client, auth_headers, category["id"], name="With cost",
        price=100.0, cost_price=60.0, stock_quantity=2,
    )
    create_product(
        client, auth_headers, category["id"], name="No cost",
        price=50.0, stock_quantity=10
    )

    dashboard = client.get("/reports/dashboard", headers=auth_headers).json()

    assert dashboard["projected_profit"] == 80.0
    