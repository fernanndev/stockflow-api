"""add card settings to stores

Revision ID: f8c5d1b4e6a2
Revises: e7b4c0a3d5f9
Create Date: 2026-11-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8c5d1b4e6a2'
down_revision: Union[str, Sequence[str], None] = 'e7b4c0a3d5f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default fills the rows that already exist (the current store)
    op.add_column('stores', sa.Column('card_surcharge_percent', sa.Numeric(precision=5, scale=2), server_default='0', nullable=False))
    op.add_column('stores', sa.Column('interest_free_installments', sa.Integer(), server_default='3', nullable=False))


def downgrade() -> None:
    op.drop_column('stores', 'interest_free_installments')
    op.drop_column('stores', 'card_surcharge_percent')