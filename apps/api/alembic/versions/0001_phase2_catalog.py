"""phase2 catalog extensions

Revision ID: 0001_phase2
Revises:
Create Date: 2026-07-18
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_phase2"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Additive columns on existing tables (safe for Neon commerce data).
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("products") as batch:
        batch.add_column(
            sa.Column("seller_url", sa.String(length=1024), nullable=False, server_default="")
        )
        batch.add_column(
            sa.Column("width_mm", sa.Float(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("height_mm", sa.Float(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("depth_mm", sa.Float(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )
        )

    op.create_table(
        "guest_identities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("guest_key", sa.String(length=64), nullable=False),
        sa.Column("merged_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("merged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_guest_identities_guest_key", "guest_identities", ["guest_key"], unique=True)

    op.create_table(
        "product_variants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("product_id", "sku", name="uq_product_sku"),
    )
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])

    op.create_table(
        "asset_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("uri", sa.String(length=1024), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("content_type", sa.String(length=64), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("root_node", sa.String(length=120), nullable=False),
        sa.Column("default_scale", sa.Float(), nullable=False),
        sa.Column("anchor_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "product_id", "platform", "version", name="uq_asset_product_platform_ver"
        ),
    )
    op.create_index("ix_asset_versions_product_id", "asset_versions", ["product_id"])

    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "product_id", name="uq_user_favorite"),
    )
    op.create_index("ix_favorites_user_id", "favorites", ["user_id"])
    op.create_index("ix_favorites_product_id", "favorites", ["product_id"])

    op.create_table(
        "tryon_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_key", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("guest_key", sa.String(length=64), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("engine", sa.String(length=64), nullable=False),
        sa.Column("device_tier", sa.String(length=32), nullable=False),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tryon_sessions_session_key", "tryon_sessions", ["session_key"], unique=True)
    op.create_index("ix_tryon_sessions_user_id", "tryon_sessions", ["user_id"])
    op.create_index("ix_tryon_sessions_guest_key", "tryon_sessions", ["guest_key"])
    op.create_index("ix_tryon_sessions_product_id", "tryon_sessions", ["product_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("tryon_sessions")
    op.drop_table("favorites")
    op.drop_table("asset_versions")
    op.drop_table("product_variants")
    op.drop_table("guest_identities")
    with op.batch_alter_table("products") as batch:
        batch.drop_column("updated_at")
        batch.drop_column("depth_mm")
        batch.drop_column("height_mm")
        batch.drop_column("width_mm")
        batch.drop_column("seller_url")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("deleted_at")
