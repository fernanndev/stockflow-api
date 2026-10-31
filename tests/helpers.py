def create_category(client, headers, name="Supplements"):
    response = client.post("/categories/", json={"name": name}, headers=headers)
    assert response.status_code == 201

    return response.json()

def create_product(client, headers, category_id, **overrides):
    payload = {
        "name": "Whey",
        "price": 100.0,
        "stock_quantity": 10,
        "minimum_stock": 2,
        "category_id": category_id,
    }
    payload.update(overrides)

    response = client.post("/products/", json=payload, headers=headers)
    assert response.status_code == 201

    return response.json()

def register_movement(client, headers, product_id, movement_type, quantity):
    return client.post(
        "/stock-movements/",
        json={"product_id": product_id, "type": movement_type, "quantity": quantity},
        headers=headers,
    )

def get_product(client, headers, product_id):
    products = client.get("/products/", headers=headers).json()

    return next(product for product in products if product["id"] == product_id)

def create_packaging(client, headers, name="Small bag"):
    response = client.post("/packagings/", json={"name": name}, headers=headers)
    assert response.status_code == 201

    return response.json()