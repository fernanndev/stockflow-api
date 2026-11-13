from sqlalchemy.orm import Session

from app.models.variation import Variation

from app.repositories.product import ProductRepository
from app.repositories.variation import VariationRepository

from app.schemas.variation import VariationCreate, VariationUpdate


class VariationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = VariationRepository(db)
        self.product_repository = ProductRepository(db)

    def create(self, product_id: int, data: VariationCreate) -> Variation:
        product = self.product_repository.get_by_id(product_id)

        if not product:
            raise ValueError("Product not found.")

        self._ensure_name_is_free(product_id, data.name)
        self.ensure_barcode_is_free(data.barcode)

        variation = self.repository.create(
            Variation(product_id=product_id, name=data.name, barcode=data.barcode)
        )

        self.db.commit()
        self.db.refresh(variation)

        return variation

    def update(self, variation_id: int, data: VariationUpdate) -> Variation:
        variation = self._get(variation_id)
        # omitted = keep the current barcode; null clears it
        if "barcode" in data.model_fields_set:
            self.ensure_barcode_is_free(data.barcode, ignore_id=variation_id)
            variation.barcode = data.barcode

        self._ensure_name_is_free(variation.product_id, data.name, ignore_id=variation_id)

        variation.name = data.name
        self.db.commit()
        self.db.refresh(variation)

        return variation

    def delete(self, variation_id: int) -> None:
        variation = self._get(variation_id)

        if len(variation.product.variations) == 1:
            raise ValueError("A products needs at least one variation.")

        if variation.stock_quantity > 0:
            raise ValueError("This variation still has stock.")

        if self.repository.count_movements(variation.id) > 0:
            raise ValueError("This variation has movement history and cannot be deleted.")

        self.repository.delete(variation)
        self.db.commit()

    def _get(self, variation_id: int) -> Variation:
        variation = self.repository.get_by_id(variation_id)

        if not variation:
            raise ValueError("Variation not found.")

        return variation

    def _ensure_name_is_free(self, product_id: int, name: str, ignore_id: int | None = None) -> None:
        existing = self.repository.get_by_name(product_id, name)

        if existing and existing.id != ignore_id:
            raise ValueError("This product already has a variation with that name.")

    def ensure_barcode_is_free(self, barcode: str | None, ignore_id: int | None = None) -> None:
        if barcode is None:
            return

        existing = self.repository.get_by_barcode(barcode)

        if existing and existing.id != ignore_id:
            raise ValueError(
                f'This barcode already belongs to "{existing.product.name}" ({existing.name}).'
            )