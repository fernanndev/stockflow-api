"""add store to packagings and stock movements

Revision ID: j2a9b5f8c0e6
Revises: i1f8a4e7b9d5
Create Date: 2026-11-25 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j2a9b5f8c0e6'
down_revision: Union[str, Sequence[str], None] = 'i1f8a4e7b9d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # packagings: everything that exists today belongs to the first store
    op.add_column('packagings', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute("UPDATE packagings SET store_id = (SELECT MIN(id) FROM stores)")
    op.alter_column('packagings', 'store_id', nullable=False)
    op.create_index(op.f('ix_packagings_store_id'), 'packagings', ['store_id'], unique=False)
    op.create_foreign_key('fk_packagings_store_id', 'packagings', 'stores', ['store_id'], ['id'])

    # the name was unique in the whole table; now it is unique per store
    op.drop_constraint('packagings_name_key', 'packagings', type_='unique')
    op.create_unique_constraint('uq_packagings_store_name', 'packagings', ['store_id', 'name'])

    # stock movements: the store of their product
    op.add_column('stock_movements', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE stock_movements SET store_id = "
        "(SELECT products.store_id FROM products WHERE products.id = stock_movements.product_id)"
    )
    op.alter_column('stock_movements', 'store_id', nullable=False)
    op.create_index(op.f('ix_stock_movements_store_id'), 'stock_movements', ['store_id'], unique=False)
    op.create_foreign_key('fk_stock_movements_store_id', 'stock_movements', 'stores', ['store_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_stock_movements_store_id', 'stock_movements', type_='foreignkey')
    op.drop_index(op.f('ix_stock_movements_store_id'), table_name='stock_movements')
    op.drop_column('stock_movements', 'store_id')

    op.drop_constraint('uq_packagings_store_name', 'packagings', type_='unique')
    op.create_unique_constraint('packagings_name_key', 'packagings', ['name'])
    op.drop_constraint('fk_packagings_store_id', 'packagings', type_='foreignkey')
    op.drop_index(op.f('ix_packagings_store_id'), table_name='packagings')
    op.drop_column('packagings', 'store_id')
