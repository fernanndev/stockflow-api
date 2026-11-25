"""remove card settings from stores

The card price will live in the public catalog only, so the store no longer keeps
the machine percentage or the interest free installments.

Revision ID: g9d6e2c5f7b3
Revises: f8c5d1b4e6a2
Create Date: 2026-11-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g9d6e2c5f7b3'
down_revision: Union[str, Sequence[str], None] = 'f8c5d1b4e6a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('stores', 'interest_free_installments')
    op.drop_column('stores', 'card_surcharge_percent')


def downgrade() -> None:
    op.add_column('stores', sa.Column('card_surcharge_percent', sa.Numeric(precision=5, scale=2), server_default='0', nullable=False))
    op.add_column('stores', sa.Column('interest_free_installments', sa.Integer(), server_default='3', nullable=False))
