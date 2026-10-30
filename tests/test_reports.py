from tests.helpers import create_category, create_product


def test_dashboard_totals(client, auth_headers):
    category = create_category(client, auth_headers)
    create_product(client, auth_headers, category["id"], name="A", price=10.0, stock_quantity=3)
    create_product(client, auth_headers, category["id"], name="B", price=5.5, stock_quantity=2)

    dashboard = client.get("/reports/dashboard", headers=auth_headers).json()

    assert dashboard["total_products"] == 2
    assert dashboard["total_categories"] == 1
    assert dashboard["total_stock_value"] == 41.0


def test_low_stock_report_lists_products_at_or_below_the_minimum(client, auth_headers):
    category = create_category(client, auth_headers)
    create_product(client, auth_headers, category["id"], name="Low", stock_quantity=2, minimum_stock=5)
    create_product(client, auth_headers, category["id"], name="Edge", stock_quantity=5, minimum_stock=5)
    create_product(client, auth_headers, category["id"], name="Fine", stock_quantity=10, minimum_stock=5)

    low_stock = client.get("/reports/low_stock", headers=auth_headers).json()
    dashboard = client.get("/reports/dashboard", headers=auth_headers).json()

    assert sorted(product["name"] for product in low_stock) == ["Edge", "Low"]
    assert dashboard["low_stock_count"] == 2


def test_expiring_report_includes_expired_products_and_skips_the_rest(client, auth_headers):
    category = create_category(client, auth_headers)
    create_product(client, auth_headers, category["id"], name="Expired", expiration_date="2000-01-01")
    create_product(client, auth_headers, category["id"], name="Far away", expiration_date="2999-01-01")
    create_product(client, auth_headers, category["id"], name="No date")

    expiring = client.get("/reports/expiring?days=30", headers=auth_headers).json()
    dashboard = client.get("/reports/dashboard", headers=auth_headers).json()

    assert [product["name"] for product in expiring] == ["Expired"]
    assert dashboard["expiring_count"] == 1