from sqlalchemy.orm import sessionmaker

from app.models.customer import Customer
from tests.helpers import create_category, create_product, post_sale


def sell(client, headers, product, quantity=1, **extra):
    return post_sale(
        client, headers, [{"product_id": product["id"], "quantity": quantity}], **extra
    )


def all_customers(engine):
    with sessionmaker(bind=engine)() as session:
        return [
            (customer.name, customer.phone)
            for customer in session.query(Customer).order_by(Customer.id).all()
        ]


def make_product(client, headers):
    category = create_category(client, headers)
    return create_product(client, headers, category["id"], price=100.0, stock_quantity=20)


def test_a_sale_with_customer_creates_it(client, auth_headers, engine):
    product = make_product(client, auth_headers)

    response = sell(
        client, auth_headers, product, customer_name="Ana", customer_phone="(11) 91234-5678"
    )

    assert response.status_code == 201
    assert response.json()["customer_name"] == "Ana"
    assert response.json()["customer_phone"] == "11912345678"
    assert all_customers(engine) == [("Ana", "11912345678")]


def test_the_same_phone_reuses_the_customer_and_keeps_its_name(client, auth_headers, engine):
    product = make_product(client, auth_headers)

    sell(client, auth_headers, product, customer_name="Ana", customer_phone="11912345678")
    second = sell(
        client, auth_headers, product, customer_name="Ana Silva", customer_phone="11912345678"
    )

    assert second.json()["customer_name"] == "Ana"
    assert all_customers(engine) == [("Ana", "11912345678")]


def test_the_same_name_without_phone_reuses_the_customer(client, auth_headers, engine):
    product = make_product(client, auth_headers)

    sell(client, auth_headers, product, customer_name="Bruno")
    sell(client, auth_headers, product, customer_name="bruno")

    assert all_customers(engine) == [("Bruno", None)]


def test_an_anonymous_sale_creates_no_customer(client, auth_headers, engine):
    product = make_product(client, auth_headers)

    response = sell(client, auth_headers, product, payments=[{"amount": 100.0, "method": "pix"}])

    assert response.status_code == 201
    assert response.json()["customer_name"] is None
    assert all_customers(engine) == []


def test_a_failed_sale_does_not_leave_a_customer_behind(client, auth_headers, engine):
    product = make_product(client, auth_headers)

    response = sell(client, auth_headers, product, quantity=999, customer_name="Carla")

    assert response.status_code == 400
    assert all_customers(engine) == []