"""add store to customers and sales

Revision ID: k3b0c6a9d1f7
Revises: j2a9b5f8c0e6
Create Date: 2026-11-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k3b0c6a9d1f7'
down_revision: Union[str, Sequence[str], None] = 'j2a9b5f8c0e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # customers: everything that exists today belongs to the first store
    op.add_column('customers', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute("UPDATE customers SET store_id = (SELECT MIN(id) FROM stores)")
    op.alter_column('customers', 'store_id', nullable=False)
    op.create_index(op.f('ix_customers_store_id'), 'customers', ['store_id'], unique=False)
    op.create_foreign_key('fk_customers_store_id', 'customers', 'stores', ['store_id'], ['id'])

    # the phone was unique in the whole table; now it is unique per store
    op.drop_constraint('customers_phone_key', 'customers', type_='unique')
    op.create_unique_constraint('uq_customers_store_phone', 'customers', ['store_id', 'phone'])

    # sales: the same, the first store
    op.add_column('sales', sa.Column('store_id', sa.Integer(), nullable=True))
    op.execute("UPDATE sales SET store_id = (SELECT MIN(id) FROM stores)")
    op.alter_column('sales', 'store_id', nullable=False)
    op.create_index(op.f('ix_sales_store_id'), 'sales', ['store_id'], unique=False)
    op.create_foreign_key('fk_sales_store_id', 'sales', 'stores', ['store_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_sales_store_id', 'sales', type_='foreignkey')
    op.drop_index(op.f('ix_sales_store_id'), table_name='sales')
    op.drop_column('sales', 'store_id')

    op.drop_constraint('uq_customers_store_phone', 'customers', type_='unique')
    op.create_unique_constraint('customers_phone_key', 'customers', ['phone'])
    op.drop_constraint('fk_customers_store_id', 'customers', type_='foreignkey')
    op.drop_index(op.f('ix_customers_store_id'), table_name='customers')
    op.drop_column('customers', 'store_id')
