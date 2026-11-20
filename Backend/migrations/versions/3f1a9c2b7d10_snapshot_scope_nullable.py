"""snapshot scope fields nullable

The snapshot is created when the page is inspected, but the tester only
chooses the test type, goal and requirements afterwards.

Revision ID: 3f1a9c2b7d10
Revises: e87b3780b774
Create Date: 2026-11-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3f1a9c2b7d10'
down_revision: Union[str, Sequence[str], None] = 'e87b3780b774'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('Snapshot', schema=None) as batch_op:
        batch_op.alter_column('test_type', existing_type=sa.Text(), nullable=True)
        batch_op.alter_column('test_goal', existing_type=sa.Text(), nullable=True)
        batch_op.alter_column('confirmed_requirements', existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('Snapshot', schema=None) as batch_op:
        batch_op.alter_column('confirmed_requirements', existing_type=sa.Text(), nullable=False)
        batch_op.alter_column('test_goal', existing_type=sa.Text(), nullable=False)
        batch_op.alter_column('test_type', existing_type=sa.Text(), nullable=False)
