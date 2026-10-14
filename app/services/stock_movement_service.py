from sqlalchemy.orm import Session

from app.models.stock_movement import MovementType, StockMovement
from app.repositories.product import ProductRepository
from app.repositories.stock_movement import StockMovementRepository
from app.schemas.stock_movement import StockMovementCreate


class StockMovementService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = StockMovementRepository(db)
        self.product_repository = ProductRepository(db)

    def create(self, data: StockMovementCreate) -> StockMovement:
        product = self.product_repository.get_by_id(data.product_id)

        if not product:
            raise ValueError("Product not found.")

        if data.type == MovementType.OUT and data.quantity > product.stock_quantity:
            raise ValueError("Insufficient stock for this shipment.")

        if data.type == MovementType.IN:
            product.stock_quantity += data.quantity
        else:
            product.stock_quantity -= data.quantity

        movement = StockMovement(
            product_id=data.product_id,
            type=data.type,
            quantity=data.quantity,
        )

        self.repository.create(movement)
        self.db.commit()
        self.db.refresh(movement)

        return movement

    def list_all(self, product_id: int | None = None) -> list[StockMovement]:
        return self.repository.list_all(product_id)