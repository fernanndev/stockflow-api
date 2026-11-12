from sqlalchemy.orm import sessionmaker

from app.models.stock_movement import MovementReason, StockMovement
from tests.helpers import (
    create_category,
    create_product,
    get_product,
    post_sale,
    register_movement,
)


def test_a_manual_exit_needs_a_reason(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = client.post(
        "/stock-movements/",
        json={"product_id": product["id"], "type": "out", "quantity": 1},
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 10


def test_expired_loss_and_other_are_accepted_as_exit_reasons(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    for reason in ["expired", "loss", "other"]:
        response = register_movement(
            client, auth_headers, product["id"], "out", 1, reason=reason
        )

        assert response.status_code == 201
        assert response.json()["reason"] == reason

    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 7


def test_sale_and_gift_cannot_be_chosen_by_hand(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    for reason in ["sale", "gift", "sale_canceled"]:
        response = register_movement(
            client, auth_headers, product["id"], "out", 1, reason=reason
        )

        assert response.status_code == 400

    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 10


def test_an_entry_does_not_accept_a_reason(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"])

    response = register_movement(client, auth_headers, product["id"], "in", 5, reason="loss")

    assert response.status_code == 400
    assert get_product(client, auth_headers, product["id"])["stock_quantity"] == 10


def test_a_manual_exit_keeps_the_prices_of_the_day(client, auth_headers, engine):
    category = create_category(client, auth_headers)
    product = create_product(
        client, auth_headers, category["id"], price=100.0, cost_price=60.0
    )

    register_movement(client, auth_headers, product["id"], "out", 2, reason="loss")

    with sessionmaker(bind=engine)() as session:
        movement = (
            session.query(StockMovement)
            .filter(StockMovement.reason == MovementReason.LOSS)
            .one()
        )

        assert float(movement.unit_price) == 100.0
        assert float(movement.unit_cost) == 60.0


def test_the_history_shows_the_reason_and_the_sale_of_each_exit(client, auth_headers):
    category = create_category(client, auth_headers)
    product = create_product(client, auth_headers, category["id"], price=100.0)
    sale = post_sale(
        client,
        auth_headers,
        [{"product_id": product["id"], "quantity": 1}],
        payments=[{"amount": 100.0, "method": "pix"}],
    ).json()
    register_movement(client, auth_headers, product["id"], "out", 1, reason="loss")

    history = client.get(
        "/stock-movements/", params={"product_id": product["id"]}, headers=auth_headers
    ).json()

    from_sale = [item for item in history if item["sale_id"] == sale["id"]]
    manual = [item for item in history if item["reason"] == "loss"]
    assert len(from_sale) == 1
    assert from_sale[0]["reason"] == "sale"
    assert len(manual) == 1
    assert manual[0]["sale_id"] is None