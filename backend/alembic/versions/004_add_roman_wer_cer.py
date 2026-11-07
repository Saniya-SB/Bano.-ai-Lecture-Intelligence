"""Add roman wer, cer, and hypothesis to benchmark_runs

Revision ID: 004_add_roman_wer_cer
Revises: 003_add_source_and_license
Create Date: 2026-11-08 00:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_add_roman_wer_cer'
down_revision: Union[str, None] = '003_add_source_and_license'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('benchmark_runs', sa.Column('wer_roman', sa.Numeric(precision=6, scale=2), nullable=True))
    op.add_column('benchmark_runs', sa.Column('cer_roman', sa.Numeric(precision=6, scale=2), nullable=True))
    op.add_column('benchmark_runs', sa.Column('hypothesis_roman', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('benchmark_runs', 'hypothesis_roman')
    op.drop_column('benchmark_runs', 'cer_roman')
    op.drop_column('benchmark_runs', 'wer_roman')

