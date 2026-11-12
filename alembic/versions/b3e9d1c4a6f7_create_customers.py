"""create customers and link sales to them

Revision ID: b3e9d1c4a6f7
Revises: a7d3e5f10b92
Create Date: 2026-11-12 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3e9d1c4a6f7'
down_revision: Union[str, Sequence[str], None] = 'a7d3e5f10b92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('customers',
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('phone')
    )

    op.add_column('sales', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_sales_customer_id'), 'sales', ['customer_id'], unique=False)
    op.create_foreign_key(
        'fk_sales_customer_id', 'sales', 'customers', ['customer_id'], ['id'], ondelete='RESTRICT'
    )

    # backfill 1: one customer per phone, named after the latest sale of that phone
    op.execute(sa.text("""
        INSERT INTO customers (name, phone)
        SELECT DISTINCT ON (customer_phone) COALESCE(customer_name, customer_phone), customer_phone
        FROM sales
        WHERE customer_phone IS NOT NULL
        ORDER BY customer_phone, created_at DESC, id DESC
    """))
    op.execute(sa.text("""
        UPDATE sales SET customer_id = customers.id
        FROM customers
        WHERE sales.customer_phone IS NOT NULL AND customers.phone = sales.customer_phone
    """))

    # backfill 2: sales without phone, one customer per name (ignoring upper/lower case)
    op.execute(sa.text("""
        INSERT INTO customers (name)
        SELECT DISTINCT ON (lower(customer_name)) customer_name
        FROM sales
        WHERE customer_phone IS NULL AND customer_name IS NOT NULL
        ORDER BY lower(customer_name), created_at DESC, id DESC
    """))
    op.execute(sa.text("""
        UPDATE sales SET customer_id = customers.id
        FROM customers
        WHERE sales.customer_phone IS NULL
          AND sales.customer_name IS NOT NULL
          AND customers.phone IS NULL
          AND lower(customers.name) = lower(sales.customer_name)
    """))

    op.drop_column('sales', 'customer_name')
    op.drop_column('sales', 'customer_phone')


def downgrade() -> None:
    op.add_column('sales', sa.Column('customer_name', sa.String(length=150), nullable=True))
    op.add_column('sales', sa.Column('customer_phone', sa.String(length=20), nullable=True))

    op.execute(sa.text("""
        UPDATE sales SET customer_name = customers.name, customer_phone = customers.phone
        FROM customers
        WHERE sales.customer_id = customers.id
    """))

    op.drop_constraint('fk_sales_customer_id', 'sales', type_='foreignkey')
    op.drop_index(op.f('ix_sales_customer_id'), table_name='sales')
    op.drop_column('sales', 'customer_id')
    op.drop_table('customers')