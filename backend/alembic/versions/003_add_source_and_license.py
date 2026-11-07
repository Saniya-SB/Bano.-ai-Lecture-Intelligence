"""add_source_and_license_to_benchmark

Revision ID: 003_add_source_and_license
Revises: 002_add_is_test_data
Create Date: 2026-11-07 16:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_source_and_license'
down_revision: Union[str, None] = '002_add_is_test_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'reference_transcripts',
        sa.Column('source', sa.String(length=128), nullable=True)
    )
    op.add_column(
        'reference_transcripts',
        sa.Column('license', sa.String(length=128), nullable=True)
    )
    op.add_column(
        'benchmark_runs',
        sa.Column('source', sa.String(length=128), nullable=True)
    )
    op.add_column(
        'benchmark_runs',
        sa.Column('license', sa.String(length=128), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('benchmark_runs', 'license')
    op.drop_column('benchmark_runs', 'source')
    op.drop_column('reference_transcripts', 'license')
    op.drop_column('reference_transcripts', 'source')

