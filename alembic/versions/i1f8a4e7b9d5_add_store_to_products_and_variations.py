"""add store to products and variations

Revision ID: i1f8a4e7b9d5
Revises: h0e7f3d6a8c4
Create Date: 2026-11-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i1f8a4e7b9d5'
down_revision: Union[str, Sequence[str], None] = 'h0e7f3d6a8c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # products: everything that exists today belongs to the first store
    op.add_column('products', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute("UPDATE products SET store_id = (SELECT MIN(id) FROM stores)")
    op.alter_column('products', 'store_id', nullable=False)
    op.create_index(op.f('ix_products_store_id'), 'products', ['store_id'], unique=False)
    op.create_foreign_key('fk_products_store_id', 'products', 'stores', ['store_id'], ['id'])

    # variations: the store of their product
    op.add_column('variations', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE variations SET store_id = "
        "(SELECT products.store_id FROM products WHERE products.id = variations.product_id)"
    )
    op.alter_column('variations', 'store_id', nullable=False)
    op.create_index(op.f('ix_variations_store_id'), 'variations', ['store_id'], unique=False)
    op.create_foreign_key('fk_variations_store_id', 'variations', 'stores', ['store_id'], ['id'])

    # the barcode was unique in the whole table; now it is unique per store
    op.drop_constraint('uq_variations_barcode', 'variations', type_='unique')
    op.create_unique_constraint('uq_variations_store_barcode', 'variations', ['store_id', 'barcode'])


def downgrade() -> None:
    op.drop_constraint('uq_variations_store_barcode', 'variations', type_='unique')
    op.create_unique_constraint('uq_variations_barcode', 'variations', ['barcode'])

    op.drop_constraint('fk_variations_store_id', 'variations', type_='foreignkey')
    op.drop_index(op.f('ix_variations_store_id'), table_name='variations')
    op.drop_column('variations', 'store_id')

    op.drop_constraint('fk_products_store_id', 'products', type_='foreignkey')
    op.drop_index(op.f('ix_products_store_id'), table_name='products')
    op.drop_column('products', 'store_id')
