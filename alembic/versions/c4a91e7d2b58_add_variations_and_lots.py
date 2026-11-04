"""add variations and lots

Revision ID: c4a91e7d2b58
Revises: 155f7a5fdb6a
Create Date: 2026-11-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a91e7d2b58'
down_revision: Union[str, Sequence[str], None] = '155f7a5fdb6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('variations',
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('product_id', 'name')
    )
    op.create_table('lots',
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('expiration_date', sa.Date(), nullable=True),
    sa.Column('variation_id', sa.Integer(), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['variation_id'], ['variations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # nullable at first: existing movements have no variation yet
    op.add_column('stock_movements', sa.Column('variation_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_stock_movements_variation_id', 'stock_movements', 'variations', ['variation_id'], ['id']
    )

    # data: one default variation per product, one lot with the current stock
    op.execute("""
        INSERT INTO variations (name, product_id)
        SELECT 'Padrão', id FROM products
    """)
    op.execute("""
        INSERT INTO lots (quantity, expiration_date, variation_id)
        SELECT p.stock_quantity, p.expiration_date, v.id
        FROM products p
        JOIN variations v ON v.product_id = p.id
        WHERE p.stock_quantity > 0
    """)
    op.execute("""
        UPDATE stock_movements m
        SET variation_id = v.id
        FROM variations v
        WHERE v.product_id = m.product_id
    """)

    op.alter_column('stock_movements', 'variation_id', nullable=False)

    # the stock now lives in the lots
    op.drop_column('products', 'stock_quantity')
    op.drop_column('products', 'expiration_date')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('products', sa.Column('stock_quantity', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('products', sa.Column('expiration_date', sa.Date(), nullable=True))

    op.execute("""
        UPDATE products p SET
            stock_quantity = COALESCE((
                SELECT SUM(l.quantity)
                FROM lots l JOIN variations v ON v.id = l.variation_id
                WHERE v.product_id = p.id
            ), 0),
            expiration_date = (
                SELECT MIN(l.expiration_date)
                FROM lots l JOIN variations v ON v.id = l.variation_id
                WHERE v.product_id = p.id AND l.quantity > 0
            )
    """)
    op.alter_column('products', 'stock_quantity', server_default=None)

    op.drop_constraint('fk_stock_movements_variation_id', 'stock_movements', type_='foreignkey')
    op.drop_column('stock_movements', 'variation_id')
    op.drop_table('lots')
    op.drop_table('variations')