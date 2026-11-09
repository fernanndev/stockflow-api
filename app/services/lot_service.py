from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.repositories.lot import LotRepository
from app.schemas.variation import LotUpdate

class LotService:

    def __init__(self, db: Session):
        self.db = db
        self.repository = LotRepository(db)

    def update(self, lot_id: int, data: LotUpdate) -> Lot:
        lot = self.repository.get_by_id(lot_id)

        if not lot:
            raise ValueError("Lot not found.")

        # A typo correction, not a stock movement: nothing is added to the history.
        lot.quantity = data.quantity

        same_date = self.repository.find_by_expiration(lot.variation_id, data.expiration_date)

        if same_date and same_date.id != lot.id:
            # Entries rely on "one lot per expiration date", so equal date are merged.
            same_date.quantity += lot.quantity
            self.repository.delete(lot)
            result = same_date
        else:
            lot.expiration_date = data.expiration_date
            result = lot

        self.db.commit()
        self.db.refresh(result)

        return result
