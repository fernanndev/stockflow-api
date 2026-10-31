from decimal import Decimal
from typing import BinaryIO

from sqlalchemy.orm import Session

from app.core.storage import delete_image, save_image
from app.models.packaging import Packaging
from app.repositories.packaging import PackagingRepository
from app.schemas.packaging import PackagingCreate, PackagingPurchase, PackagingUpdate


class PackagingService:

    def __init__(self, db: Session):
        self.repository = PackagingRepository(db)

    def create(self, data: PackagingCreate) -> Packaging:
        if self.repository.get_by_name(data.name):
            raise ValueError("Packaging already registered.")

        if (data.quantity is None) != (data.total_cost is None):
            raise ValueError("Quantity and total cost must be informed together.")

        packaging = Packaging(name=data.name)

        if data.quantity is not None:
            packaging.stock_quantity = data.quantity
            packaging.unit_cost = Decimal(str(data.total_cost)) / data.quantity

        return self.repository.create(packaging)

    def list_all(self) -> list[Packaging]:
        return self.repository.list_all()

    def update(self, packaging_id: int, data: PackagingUpdate) -> Packaging:
        packaging = self._get(packaging_id)

        existing = self.repository.get_by_name(data.name)

        if existing and existing.id != packaging_id:
            raise ValueError("Packaging already registered.")

        packaging.name = data.name

        if data.stock_quantity is not None:
            packaging.stock_quantity = data.stock_quantity

        if data.unit_cost is not None:
            packaging.unit_cost = Decimal(str(data.unit_cost))

        return self.repository.update(packaging)

    def register_purchase(self, packaging_id: int, data: PackagingPurchase) -> Packaging:
        packaging = self._get(packaging_id)

        current_value = packaging.unit_cost * packaging.stock_quantity
        new_quantity = packaging.stock_quantity + data.quantity

        packaging.unit_cost = (current_value + Decimal(str(data.total_cost))) / new_quantity
        packaging.stock_quantity = new_quantity

        return self.repository.update(packaging)

    def delete(self, packaging_id: int) -> None:
        packaging = self._get(packaging_id)

        image_filename = packaging.image_path
        self.repository.delete(packaging)
        delete_image(image_filename)

    def set_image(self, packaging_id: int, file: BinaryIO) -> Packaging:
        packaging = self._get(packaging_id)

        new_filename = save_image(file)
        old_filename = packaging.image_path

        packaging.image_path = new_filename
        updated = self.repository.update(packaging)

        delete_image(old_filename)

        return updated

    def remove_image(self, packaging_id: int) -> Packaging:
        Packaging = self._get(packaging_id)

        old_filename = Packaging.image_path
        Packaging.image_path = None
        updated = self.repository.update(Packaging)

        delete_image(old_filename)

        return updated

    def _get(self, packaging_id: int) -> Packaging:
        packaging = self.repository.get_by_id(packaging_id)

        if not packaging:
            raise ValueError("Packaging not found.")

        return packaging