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
    