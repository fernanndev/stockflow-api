"""add sales and movement reasons

Revision ID: f2b7c8d913a4
Revises: c4a91e7d2b58
Create Date: 2026-11-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b7c8d913a4'
down_revision: Union[str, Sequence[str], None] = 'c4a91e7d2b58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('sales',
    sa.Column('customer_name', sa.String(length=150), nullable=True),
    sa.Column('status', sa.Enum('COMPLETED', 'CANCELED', name='salestatus', native_enum=False, length=20), nullable=False),
    sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sale_items',
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('unit_cost', sa.Numeric(precision=10, scale=4), nullable=True),
    sa.Column('is_gift', sa.Boolean(), nullable=False),
    sa.Column('product_name', sa.String(length=150), nullable=False),
    sa.Column('variation_name', sa.String(length=100), nullable=False),
    sa.Column('sale_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('variation_id', sa.Integer(), nullable=True),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['variation_id'], ['variations.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sale_packagings',
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_cost', sa.Numeric(precision=10, scale=4), nullable=False),
    sa.Column('packaging_name', sa.String(length=100), nullable=False),
    sa.Column('sale_id', sa.Integer(), nullable=False),
    sa.Column('packaging_id', sa.Integer(), nullable=True),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['packaging_id'], ['packagings.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sale_payments',
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('method', sa.Enum('PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER', name='paymentmethod', native_enum=False, length=20), nullable=False),
    sa.Column('sale_id', sa.Integer(), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    op.add_column('stock_movements', sa.Column('reason', sa.Enum('SALE', 'GIFT', 'EXPIRED', 'LOSS', 'OTHER', 'SALE_CANCELED', name='movementreason', native_enum=False, length=20), nullable=True))
    op.add_column('stock_movements', sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('stock_movements', sa.Column('unit_cost', sa.Numeric(precision=10, scale=4), nullable=True))
    op.add_column('stock_movements', sa.Column('sale_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_stock_movements_sale_id', 'stock_movements', 'sales', ['sale_id'], ['id'], ondelete='SET NULL'
    )

    op.create_table('movement_allocations',
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('expiration_date', sa.Date(), nullable=True),
    sa.Column('movement_id', sa.Integer(), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['movement_id'], ['stock_movements.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('movement_allocations')
    op.drop_constraint('fk_stock_movements_sale_id', 'stock_movements', type_='foreignkey')
    op.drop_column('stock_movements', 'sale_id')
    op.drop_column('stock_movements', 'unit_cost')
    op.drop_column('stock_movements', 'unit_price')
    op.drop_column('stock_movements', 'reason')
    op.drop_table('sale_payments')
    op.drop_table('sale_packagings')
    op.drop_table('sale_items')
    op.drop_table('sales')