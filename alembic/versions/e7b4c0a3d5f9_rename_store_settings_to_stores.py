"""rename store settings to stores

Revision ID: e7b4c0a3d5f9
Revises: d6a3b9e2f4c8
Create Date: 2026-11-13 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e7b4c0a3d5f9'
down_revision: Union[str, Sequence[str], None] = 'd6a3b9e2f4c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # the existing row (name, colors and logo) simply becomes store number 1
    op.rename_table('store_settings', 'stores')
    op.execute('ALTER SEQUENCE store_settings_id_seq RENAME TO stores_id_seq')
    op.execute('ALTER INDEX store_settings_pkey RENAME TO stores_pkey')


def downgrade() -> None:
    op.execute('ALTER INDEX stores_pkey RENAME TO store_settings_pkey')
    op.execute('ALTER SEQUENCE stores_id_seq RENAME TO store_settings_id_seq')
    op.rename_table('stores', 'store_settings')