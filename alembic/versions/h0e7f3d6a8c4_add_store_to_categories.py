"""add store to categories

Revision ID: h0e7f3d6a8c4
Revises: g9d6e2c5f7b3
Create Date: 2026-11-25 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h0e7f3d6a8c4'
down_revision: Union[str, Sequence[str], None] = 'g9d6e2c5f7b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # a brand new database has no store yet: make sure there is one to receive the data
    op.execute(
        """
        INSERT INTO stores (name, primary_color, background_color, surface_color)
        SELECT 'Minha loja', '#0f766e', '#f8fafc', '#ffffff'
        WHERE NOT EXISTS (SELECT 1 FROM stores)
        """
    )

    # nullable first, so the existing rows can be filled before the column becomes required
    op.add_column('categories', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute("UPDATE categories SET store_id = (SELECT MIN(id) FROM stores)")
    op.alter_column('categories', 'store_id', nullable=False)

    op.create_index(op.f('ix_categories_store_id'), 'categories', ['store_id'], unique=False)
    op.create_foreign_key('fk_categories_store_id', 'categories', 'stores', ['store_id'], ['id'])

    # the name was unique in the whole table; now it is unique per store
    op.drop_constraint('categories_name_key', 'categories', type_='unique')
    op.create_unique_constraint('uq_categories_store_name', 'categories', ['store_id', 'name'])


def downgrade() -> None:
    op.drop_constraint('uq_categories_store_name', 'categories', type_='unique')
    op.create_unique_constraint('categories_name_key', 'categories', ['name'])
    op.drop_constraint('fk_categories_store_id', 'categories', type_='foreignkey')
    op.drop_index(op.f('ix_categories_store_id'), table_name='categories')
    op.drop_column('categories', 'store_id')
