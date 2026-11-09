from datetime import date

from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.product import Product
from app.models.sale import Sale
from app.models.stock_movement import MovementAllocation, MovementReason, MovementType, StockMovement
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
            raise ValueError("Product not found")

        if data.type == MovementType.IN and data.lot_id is not None:
            raise ValueError("A lot can only be chosen for exits.")

        lot = self._find_lot(product, data.lot_id)
        variation = self.find_variation(product, data.variation_id, lot)

        movement = self.register(
            product=product,
            variation=variation,
            type=data.type,
            quantity=data.quantity,
            lot=lot,
            expiration_date=data.expiration_date,
        )

        self.db.commit()
        self.db.refresh(movement)

        return movement

    def register(
            self,
            *,
            product: Product,
            variation: Variation,
            type: MovementType,
            quantity: int,
            lot: Lot | None = None,
            expiration_date: date | None = None,
            reason: MovementReason | None = None,
            unit_price=None,
            unit_cost=None,
            sale: Sale | None = None,
    ) -> StockMovement:
        """Changes the lots and adds the movement to the session.
        
        It does NOT commit: the caller decides when the whole operation is saved,
        so a sale with many items either happens completely or not at all.
        """
        if type == MovementType.IN:
            allocations = self._add_to_lot(variation, quantity, expiration_date)
        else:
            allocations = self._take_from_lots(variation, quantity, lot)

        movement = StockMovement(
            product_id=product.id,
            variation_id=variation.id,
            type=type,
            quantity=quantity,
            reason=reason,
            unit_price=unit_price,
            unit_cost=unit_cost,
            sale=sale,
            allocations=allocations,
        )

        self.repository.create(movement)
        self.db.flush()

        return movement

    def reverse(
            self, movement: StockMovement, reason: MovementReason, sale: Sale | None = None
    ) -> StockMovement:
        """Undoes an exit: the units go to the lots they came from."""
        if not movement.allocations:
            raise ValueError("This movement cannot be reversed.")

        allocations: list[MovementAllocation] = []

        for used in movement.allocations:
            allocations.extend(
                self._add_to_lot(movement.variation, used.quantity, used.expiration_date)
            )

        reversal = StockMovement(
            product_id=movement.product_id,
            variation=movement.variation_id,
            type=MovementType.IN,
            quantity=movement.quantity,
            reason=reason,
            unit_price=movement.unit_price,
            unit_cost=movement.unit_cost,
            sale=sale,
            allocations=allocations,
        )

        self.repository.create(reversal)
        self.db.flush()

        return reversal

    def list_all(self, product_id: int | None = None) -> list[StockMovement]:
        return self.repository.list_all(product_id)

    def find_variation(
            self, product: Product, variation_id: int | None, lot: Lot | None
    ) -> Variation:
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

    def _find_lot(self, product: Product, lot_id: int | None) -> Lot | None:
        if lot_id is None:
            return None

        lot = self.lot_repository.get_by_id(lot_id)

        if not lot or lot.variation.product_id != product.id:
            raise ValueError("Lot not found.")

        return lot

    def _add_to_lot(
            self, variation: Variation, quantity: int, expiration_date: date | None
    ) -> list[MovementAllocation]:
        lot = self.lot_repository.find_by_expiration(variation.id, expiration_date)

        if lot:
            lot.quantity += quantity
        else:
            self.lot_repository.create(
                Lot(
                    variation_id=variation.id,
                    quantity=quantity,
                    expiration_date=expiration_date,
                )
            )
            # saved right away so a second entry with the same date finds this lot
            self.db.flush()

        return [MovementAllocation(quantity=quantity, expiration_date=expiration_date)]

    def _take_from_lots(
            self, variation: Variation, quantity: int, lot: Lot | None
    ) -> list[MovementAllocation]:
        if lot is not None:
            if quantity > lot.quantity:
                raise ValueError("Insufficient stock in this lot.")

            lot.quantity -= quantity
            return [MovementAllocation(quantity=quantity, expiration_date=lot.expiration_date)]

        lots = self.lot_repository.list_available(variation.id)

        if quantity > sum(available.quantity for available in lots):
            raise ValueError("Insufficient stock for this shipment.")

        allocations: list[MovementAllocation] = []
        remaining = quantity

        for available in lots:
            taken = min(available.quantity, remaining)

            if taken == 0:
                continue

            available.quantity -= taken
            remaining -= taken
            allocations.append(MovementAllocation(quantity=taken, expiration_date=available.expiration_date)
            )

        return allocations


