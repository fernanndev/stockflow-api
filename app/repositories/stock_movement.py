from sqlalchemy.orm import Session, joinedload

from app.models.product import Product
from app.models.stock_movement import StockMovement


class StockMovementRepository:

    def __init__(self, db: Session):
        self.db = db


    def create(self, movement: StockMovement) -> StockMovement:
        self.db.add(movement)
        return movement

    def list_all(self, product_id: int | None = None) -> list[StockMovement]:
        query = self.db.query(StockMovement).options(
            joinedload(StockMovement.product).joinedload(Product.category)
        )

        if product_id is not None:
            query = query.filter(StockMovement.product_id == product_id)

        return query.order_by(StockMovement.created_at.desc()).all()