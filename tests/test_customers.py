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

def pay(amount):
    return {"amount": amount, "method": "pix"}


def list_customers(client, headers):
    return client.get("/customers/", headers=headers).json()


def ana_with_history(client, headers):
    """Ana: 1 paid purchase, 1 purchase with 70 still open, 1 canceled, 1 gift-only sale."""
    product = make_product(client, headers)
    ana = {"customer_name": "Ana", "customer_phone": "11912345678"}

    sell(client, headers, product, payments=[pay(100.0)], **ana)
    sell(client, headers, product, payments=[pay(30.0)], **ana)

    canceled = sell(client, headers, product, **ana).json()
    client.post(f"/sales/{canceled['id']}/cancel", headers=headers)

    post_sale(
        client, headers, [{"product_id": product["id"], "quantity": 1, "is_gift": True}], **ana
    )

    return list_customers(client, headers)[0]["id"]


def test_customers_require_login(client):
    assert client.get("/customers/").status_code == 401


def test_a_customer_can_be_registered_by_hand(client, auth_headers):
    response = client.post(
        "/customers/",
        json={"name": " Bia ", "phone": "(11) 91234-5678", "notes": "Prefere Pix"},
        headers=auth_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Bia"
    assert body["phone"] == "11912345678"
    assert body["notes"] == "Prefere Pix"
    assert body["purchases"] == 0
    assert body["total_spent"] == 0.0
    assert body["last_purchase_at"] is None
    assert body["open_balance"] == 0.0


def test_a_phone_cannot_be_registered_twice(client, auth_headers):
    payload = {"name": "Bia", "phone": "11912345678"}

    client.post("/customers/", json=payload, headers=auth_headers)
    again = client.post("/customers/", json={**payload, "name": "Outra"}, headers=auth_headers)
    invalid = client.post(
        "/customers/", json={"name": "Caio", "phone": "123"}, headers=auth_headers
    )

    assert again.status_code == 400
    assert invalid.status_code == 422


def test_the_list_shows_the_numbers_of_each_customer(client, auth_headers):
    ana_with_history(client, auth_headers)

    [ana] = list_customers(client, auth_headers)

    # the canceled sale and the gift-only sale are not purchases
    assert ana["purchases"] == 2
    assert ana["total_spent"] == 200.0
    assert ana["open_balance"] == 70.0
    assert ana["last_purchase_at"] is not None


def test_the_detail_lists_every_sale_newest_first(client, auth_headers):
    customer_id = ana_with_history(client, auth_headers)

    response = client.get(f"/customers/{customer_id}", headers=auth_headers)

    body = response.json()
    assert response.status_code == 200
    assert len(body["sales"]) == 4
    assert body["sales"][0]["total"] == 0.0
    assert [sale["status"] for sale in body["sales"]].count("canceled") == 1
    assert client.get("/customers/9999", headers=auth_headers).status_code == 404


def test_editing_a_customer_changes_it_in_every_sale(client, auth_headers):
    customer_id = ana_with_history(client, auth_headers)

    response = client.put(
        f"/customers/{customer_id}",
        json={"name": "Ana Souza", "phone": "11912345678"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert {sale["customer_name"] for sale in response.json()["sales"]} == {"Ana Souza"}


def test_a_customer_with_sales_cannot_be_deleted(client, auth_headers):
    customer_id = ana_with_history(client, auth_headers)

    response = client.delete(f"/customers/{customer_id}", headers=auth_headers)

    assert response.status_code == 400
    assert len(list_customers(client, auth_headers)) == 1


def test_a_customer_without_sales_can_be_deleted(client, auth_headers):
    created = client.post("/customers/", json={"name": "Bia"}, headers=auth_headers).json()

    response = client.delete(f"/customers/{created['id']}", headers=auth_headers)

    assert response.status_code == 204
    assert list_customers(client, auth_headers) == []