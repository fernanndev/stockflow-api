"""create store settings

Revision ID: d6a3b9e2f4c8
Revises: c5f2a8d7b9e1
Create Date: 2026-11-13 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6a3b9e2f4c8'
down_revision: Union[str, Sequence[str], None] = 'c5f2a8d7b9e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('store_settings',
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('primary_color', sa.String(length=7), nullable=False),
    sa.Column('background_color', sa.String(length=7), nullable=False),
    sa.Column('surface_color', sa.String(length=7), nullable=False),
    sa.Column('logo_path', sa.String(length=255), nullable=True),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('store_settings')