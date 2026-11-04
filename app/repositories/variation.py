from sqlalchemy.orm import Session

from app.models.variation import Variation

class VariationRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, variation_id: int) -> Variation | None:
        return self.db.query(Variation).filter(Variation.id == variation_id).first()