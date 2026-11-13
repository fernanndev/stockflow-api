from sqlalchemy.orm import Session

from app.models.store_settings import StoreSettings


class StoreSettingsRepository:

    def __init__(self, db: Session):
        self.db = db

    def get(self) -> StoreSettings | None:
        return self.db.query(StoreSettings).order_by(StoreSettings.id).first()

    def create(self, settings: StoreSettings) -> StoreSettings:
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def update(self, settings: StoreSettings) -> StoreSettings:
        self.db.commit()
        self.db.refresh(settings)
        return settings

        