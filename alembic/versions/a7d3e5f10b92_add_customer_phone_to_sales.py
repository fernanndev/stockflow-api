"""add customer phone to sales

Revision ID: a7d3e5f10b92
Revises: f2b7c8d913a4
"""

from alembic import op
import sqlalchemy as sa

revision = "a7d3e5f10b92"
down_revision = "f2b7c8d913a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("customer_phone", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("sales", "customer_phone")