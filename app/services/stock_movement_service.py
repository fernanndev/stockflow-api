from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.product import Product
from app.models.stock_movement import MovementType, StockMovement
from app.models.variation import Variation

from app.repositories.lot import LotRepository
from app.repositories.product import ProductRepository
from app.repositories.stock_movement import StockMovementRepository
from app.repositories.variation import VariationRepository

from app.schemas.stock_movement import StockMovementCreate


class StockMovementService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = StockMovementRepository(db)
        self.product_repository = ProductRepository(db)
        self.variation_repository = VariationRepository(db)
        self.lot_repository = LotRepository(db)

    def create(self, data: StockMovementCreate) -> StockMovement:
        product = self.product_repository.get_by_id(data.product_id)

        if not product:
            raise ValueError("Product not found.")

        if data.type == MovementType.IN and data.lot_id is not None:
            raise ValueError("A lot can only be chosen for exits.")

        lot = self._find_lot(product, data.lot_id)
        variation = self._find_variation(product, data.variation_id, lot)

        if data.type == MovementType.IN:
            self._add_to_lot(variation, data)
        else:
            self._take_from_lots(variation, data.quantity, lot)

        movement = StockMovement(
            product_id=data.product_id,
            variation_id=variation.id,
            type=data.type,
            quantity=data.quantity,
        )

        self.repository.create(movement)
        self.db.commit()
        self.db.refresh(movement)

        return movement

    def list_all(self, product_id: int | None = None) -> list[StockMovement]:
        return self.repository.list_all(product_id)

    def _find_lot(self, product: Product, lot_id: int | None) -> Lot | None:
        if lot_id is None:
            return None

        lot = self.lot_repository.get_by_id(lot_id)

        if not lot or lot.variation.product_id != product.id:
            raise ValueError("Lot not found.")

        return lot

    def _find_variation(self, product: Product, variation_id: int | None, lot: Lot | None) -> Variation:
        if lot is not None:
            if variation_id is not None and variation_id != lot.variation_id:
                raise ValueError("The lot does not belong to this variation.")

            return lot.variation

        if variation_id is not None:
            variation = self.variation_repository.get_by_id(variation_id)

            if not variation or variation.product_id != product.id:
                raise ValueError("Variation not found.")

            return variation

        if len(product.variations) == 1:
            return product.variations[0]

        raise ValueError("Choose a variation for this product.")

    def _add_to_lot(self, variation: Variation, data: StockMovementCreate) -> None:
        lot = self.lot_repository.find_by_expiration(variation.id, data.expiration_date)

        if lot:
            lot.quantity += data.quantity
        else:
            self.lot_repository.create(
                Lot(
                    variation_id=variation.id,
                    quantity=data.quantity,
                    expiration_date=data.expiration_date,
                )
            )

    def _take_from_lots(self, variation: Variation, quantity: int, lot: Lot | None) -> None:
        if lot is not None:
            if quantity > lot.quantity:
                raise ValueError("Insufficient stock in this lot.")

            lot.quantity -= quantity
            return

        lots = self.lot_repository.list_available(variation.id)

        if quantity > sum(available.quantity for available in lots):
            raise ValueError("Insufficient stock for this shipment.")

        remaining = quantity

        for available in lots:
            taken = min(available.quantity, remaining)
            available.quantity -= taken
            remaining -= taken