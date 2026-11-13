"""add barcode to variations

Revision ID: c5f2a8d7b9e1
Revises: b3e9d1c4a6f7
Create Date: 2026-11-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5f2a8d7b9e1'
down_revision: Union[str, Sequence[str], None] = 'b3e9d1c4a6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('variations', sa.Column('barcode', sa.String(length=50), nullable=True))
    op.create_unique_constraint('uq_variations_barcode', 'variations', ['barcode'])


def downgrade() -> None:
    op.drop_constraint('uq_variations_barcode', 'variations', type_='unique')
    op.drop_column('variations', 'barcode')