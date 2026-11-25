from sqlalchemy.orm import sessionmaker

from app.models.store import Store
from tests.helpers import create_product


def create_store(engine, name):
    with sessionmaker(bind=engine)() as session:
        store = Store(name=name)
        session.add(store)
        session.commit()

        return store.id


def in_store(headers, store_id):
    return {**headers, "X-Store-Id": str(store_id)}


def post_category(client, headers, name="Suplementos"):
    return client.post("/categories/", json={"name": name}, headers=headers)


def test_each_store_only_sees_its_own_categories(client, auth_headers, engine):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")

    assert post_category(client, in_store(auth_headers, store_a)).status_code == 201

    in_a = client.get("/categories/", headers=in_store(auth_headers, store_a)).json()
    in_b = client.get("/categories/", headers=in_store(auth_headers, store_b)).json()
    without_header = client.get("/categories/", headers=auth_headers).json()

    assert [category["name"] for category in in_a] == ["Suplementos"]
    assert in_b == []
    # no header = the first store, which is store A
    assert [category["name"] for category in without_header] == ["Suplementos"]


def test_the_same_category_name_can_exist_in_two_stores_but_not_twice_in_one(
    client, auth_headers, engine
):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")

    assert post_category(client, in_store(auth_headers, store_a)).status_code == 201
    assert post_category(client, in_store(auth_headers, store_b)).status_code == 201

    duplicated = post_category(client, in_store(auth_headers, store_a))

    assert duplicated.status_code == 400
    assert duplicated.json()["detail"] == "Category already created."


def test_a_store_cannot_change_or_delete_a_category_of_another_store(
    client, auth_headers, engine
):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")
    category = post_category(client, in_store(auth_headers, store_a)).json()
    from_b = in_store(auth_headers, store_b)

    renamed = client.put(
        f"/categories/{category['id']}", json={"name": "Hacked"}, headers=from_b
    )
    deleted = client.delete(f"/categories/{category['id']}", headers=from_b)

    assert renamed.status_code == 400
    assert renamed.json()["detail"] == "Category not found."
    assert deleted.status_code == 400

    # it is still there, untouched
    in_a = client.get("/categories/", headers=in_store(auth_headers, store_a)).json()
    assert [item["name"] for item in in_a] == ["Suplementos"]


def test_an_unknown_store_is_rejected_and_login_is_still_required(client, auth_headers):
    unknown = client.get("/categories/", headers=in_store(auth_headers, 9999))

    assert unknown.status_code == 404
    assert unknown.json()["detail"] == "Store not found."
    assert client.get("/categories/", headers={"X-Store-Id": "1"}).status_code == 401


def test_a_product_can_only_use_a_category_of_its_own_store(client, auth_headers, engine):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")
    category = post_category(client, in_store(auth_headers, store_a)).json()

    from_b = client.post(
        "/products/",
        json={"name": "Whey", "price": 100.0, "category_id": category["id"]},
        headers=in_store(auth_headers, store_b),
    )

    assert from_b.status_code == 400
    assert from_b.json()["detail"] == "Category not found."

    # in its own store the same request works
    assert create_product(
        client, in_store(auth_headers, store_a), category["id"]
    )["name"] == "Whey"


def make_product(client, headers, store_id, name="Whey", category="Suplementos", **extra):
    """A product in the given store (its category is created there too)."""
    scoped = in_store(headers, store_id)
    category_id = post_category(client, scoped, category).json()["id"]

    return create_product(client, scoped, category_id, name=name, **extra)


def test_each_store_only_sees_its_own_products(client, auth_headers, engine):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")
    product = make_product(client, auth_headers, store_a)
    from_b = in_store(auth_headers, store_b)
    category_b = post_category(client, from_b).json()

    in_a = client.get("/products/", headers=in_store(auth_headers, store_a)).json()
    in_b = client.get("/products/", headers=from_b).json()

    assert [item["name"] for item in in_a] == ["Whey"]
    assert in_b == []

    updated = client.put(
        f"/products/{product['id']}",
        json={"name": "Hacked", "price": 1.0, "size": None, "category_id": category_b["id"]},
        headers=from_b,
    )
    deleted = client.delete(f"/products/{product['id']}", headers=from_b)

    assert updated.status_code == 400
    assert updated.json()["detail"] == "Product not found."
    assert deleted.status_code == 400

    # it is still there, untouched
    in_a = client.get("/products/", headers=in_store(auth_headers, store_a)).json()
    assert [item["name"] for item in in_a] == ["Whey"]


def test_the_same_barcode_can_be_used_in_two_stores_but_not_twice_in_one(
    client, auth_headers, engine
):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")

    first = make_product(client, auth_headers, store_a, name="A", barcode="7890001")
    make_product(client, auth_headers, store_b, name="B", barcode="7890001")

    duplicated = client.post(
        "/products/",
        json={
            "name": "C",
            "price": 1.0,
            "category_id": first["category"]["id"],
            "barcode": "7890001",
        },
        headers=in_store(auth_headers, store_a),
    )

    assert duplicated.status_code == 400
    assert duplicated.json()["detail"].startswith("This barcode already belongs to")


def test_variations_and_lots_of_another_store_are_not_reachable(client, auth_headers, engine):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")
    product = make_product(client, auth_headers, store_a, stock_quantity=5)
    variation = product["variations"][0]
    lot = variation["lots"][0]
    from_b = in_store(auth_headers, store_b)

    created = client.post(
        f"/products/{product['id']}/variations", json={"name": "Big"}, headers=from_b
    )
    renamed = client.put(f"/variations/{variation['id']}", json={"name": "Hacked"}, headers=from_b)
    deleted = client.delete(f"/variations/{variation['id']}", headers=from_b)
    lot_changed = client.put(
        f"/lots/{lot['id']}", json={"quantity": 99, "expiration_date": None}, headers=from_b
    )

    assert created.status_code == 400
    assert created.json()["detail"] == "Product not found."
    assert renamed.json()["detail"] == "Variation not found."
    assert deleted.status_code == 400
    assert lot_changed.json()["detail"] == "Lot not found."


def test_stock_movements_and_sales_only_use_products_of_the_active_store(
    client, auth_headers, engine
):
    store_a = create_store(engine, "Loja A")
    store_b = create_store(engine, "Loja B")
    product = make_product(client, auth_headers, store_a, stock_quantity=5)
    from_b = in_store(auth_headers, store_b)

    movement = client.post(
        "/stock-movements/",
        json={"product_id": product["id"], "type": "in", "quantity": 3},
        headers=from_b,
    )
    sale = client.post(
        "/sales/",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "payments": [{"amount": 100.0, "method": "pix"}],
        },
        headers=from_b,
    )

    assert movement.status_code == 400
    assert movement.json()["detail"] == "Product not found."
    assert sale.status_code == 400
    assert sale.json()["detail"] == "Product not found."

    # the stock of store A did not move
    in_a = client.get("/products/", headers=in_store(auth_headers, store_a)).json()
    assert in_a[0]["stock_quantity"] == 5
