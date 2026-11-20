"""snapshot selected_element_ids

Stores which inspected elements the tester picked for testing.

Revision ID: 8b2d4e6f1a23
Revises: 3f1a9c2b7d10
Create Date: 2026-11-20 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8b2d4e6f1a23'
down_revision: Union[str, Sequence[str], None] = '3f1a9c2b7d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('Snapshot', schema=None) as batch_op:
        batch_op.add_column(sa.Column('selected_element_ids', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('Snapshot', schema=None) as batch_op:
        batch_op.drop_column('selected_element_ids')
