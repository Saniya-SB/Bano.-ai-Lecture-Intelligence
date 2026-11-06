"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-07 01:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. lectures
    op.create_table(
        'lectures',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=True),
        sa.Column('source_type', sa.String(length=32), nullable=False),
        sa.Column('source_url', sa.String(length=1024), nullable=True),
        sa.Column('audio_storage_path', sa.String(length=1024), nullable=True),
        sa.Column('mime_type', sa.String(length=64), nullable=True),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'sha256', name='uq_user_lecture_sha256')
    )
    op.create_index(op.f('ix_lectures_status'), 'lectures', ['status'], unique=False)
    op.create_index(op.f('ix_lectures_user_id'), 'lectures', ['user_id'], unique=False)

    # 3. transcription_jobs
    op.create_table(
        'transcription_jobs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('lecture_id', sa.String(length=64), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False),
        sa.Column('provider_job_id', sa.String(length=128), nullable=True),
        sa.Column('stage', sa.String(length=32), nullable=False),
        sa.Column('progress_percent', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(length=64), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lecture_id')
    )
    op.create_index(op.f('ix_transcription_jobs_lecture_id'), 'transcription_jobs', ['lecture_id'], unique=True)
    op.create_index(op.f('ix_transcription_jobs_stage'), 'transcription_jobs', ['stage'], unique=False)

    # 4. transcripts
    op.create_table(
        'transcripts',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('lecture_id', sa.String(length=64), nullable=False),
        sa.Column('version_type', sa.String(length=32), nullable=False),
        sa.Column('full_text', sa.Text(), nullable=False),
        sa.Column('language_code', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lecture_id', 'version_type', name='uq_lecture_transcript_version')
    )
    op.create_index(op.f('ix_transcripts_lecture_id'), 'transcripts', ['lecture_id'], unique=False)
    op.create_index('idx_transcripts_lecture_version', 'transcripts', ['lecture_id', 'version_type'], unique=False)

    # 5. transcript_segments
    op.create_table(
        'transcript_segments',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('transcript_id', sa.String(length=64), nullable=False),
        sa.Column('segment_index', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('segment_type', sa.String(length=32), nullable=False),
        sa.Column('speaker_label', sa.String(length=64), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['transcript_id'], ['transcripts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transcript_segments_segment_type'), 'transcript_segments', ['segment_type'], unique=False)
    op.create_index(op.f('ix_transcript_segments_transcript_id'), 'transcript_segments', ['transcript_id'], unique=False)
    op.create_index('idx_segments_transcript_time', 'transcript_segments', ['transcript_id', 'start_time'], unique=False)

    # 6. generated_outputs
    op.create_table(
        'generated_outputs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('lecture_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('output_type', sa.String(length=32), nullable=False),
        sa.Column('prompt_version', sa.String(length=32), nullable=False),
        sa.Column('cache_key', sa.String(length=128), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('token_usage', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'cache_key', name='uq_user_output_cache_key')
    )
    op.create_index(op.f('ix_generated_outputs_cache_key'), 'generated_outputs', ['cache_key'], unique=False)
    op.create_index(op.f('ix_generated_outputs_lecture_id'), 'generated_outputs', ['lecture_id'], unique=False)
    op.create_index(op.f('ix_generated_outputs_user_id'), 'generated_outputs', ['user_id'], unique=False)
    op.create_index('idx_outputs_lecture_user', 'generated_outputs', ['lecture_id', 'user_id'], unique=False)

    # 7. usage_events
    op.create_table(
        'usage_events',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('lecture_id', sa.String(length=64), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('estimated_cost_usd', sa.Numeric(precision=10, scale=6), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['lecture_id'], ['lectures.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usage_events_created_at'), 'usage_events', ['created_at'], unique=False)
    op.create_index(op.f('ix_usage_events_user_id'), 'usage_events', ['user_id'], unique=False)

    # 8. reference_transcripts
    op.create_table(
        'reference_transcripts',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('dataset_name', sa.String(length=128), nullable=False),
        sa.Column('sample_name', sa.String(length=128), nullable=False),
        sa.Column('audio_path', sa.String(length=1024), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        sa.Column('ground_truth_devanagari', sa.Text(), nullable=False),
        sa.Column('ground_truth_roman', sa.Text(), nullable=False),
        sa.Column('technical_terms', sa.JSON(), nullable=False),
        sa.Column('consent_for_benchmark', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('dataset_name', 'sample_name', name='uq_dataset_sample')
    )

    # 9. benchmark_runs
    op.create_table(
        'benchmark_runs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('reference_id', sa.String(length=64), nullable=False),
        sa.Column('model_id', sa.String(length=64), nullable=False),
        sa.Column('model_name', sa.String(length=128), nullable=False),
        sa.Column('provider_version', sa.String(length=64), nullable=True),
        sa.Column('hypothesis_transcript', sa.Text(), nullable=False),
        sa.Column('wer', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('cer', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('technical_term_accuracy', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('code_switch_score', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('hindi_accuracy', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('english_accuracy', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('processing_time_sec', sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column('estimated_cost_usd', sa.Numeric(precision=8, scale=4), nullable=False),
        sa.Column('is_estimated', sa.Boolean(), nullable=False),
        sa.Column('run_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['reference_id'], ['reference_transcripts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_benchmark_runs_model_id'), 'benchmark_runs', ['model_id'], unique=False)
    op.create_index(op.f('ix_benchmark_runs_reference_id'), 'benchmark_runs', ['reference_id'], unique=False)


def downgrade() -> None:
    op.drop_table('benchmark_runs')
    op.drop_table('reference_transcripts')
    op.drop_table('usage_events')
    op.drop_table('generated_outputs')
    op.drop_table('transcript_segments')
    op.drop_table('transcripts')
    op.drop_table('transcription_jobs')
    op.drop_table('lectures')
    op.drop_table('users')

