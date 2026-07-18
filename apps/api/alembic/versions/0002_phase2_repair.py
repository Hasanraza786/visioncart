"""phase2 repair incomplete neon schema

Revision ID: 0002_phase2_repair
Revises: 0001_phase2
Create Date: 2026-07-18
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0002_phase2_repair"
down_revision: Union[str, Sequence[str], None] = "0001_phase2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent repair for environments where 0001 partially applied via create_all.
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE")
    op.execute(
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_url VARCHAR(1024) NOT NULL DEFAULT ''"
    )
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS width_mm FLOAT NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS height_mm FLOAT NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS depth_mm FLOAT NOT NULL DEFAULT 0")
    op.execute(
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE "
        "NOT NULL DEFAULT CURRENT_TIMESTAMP"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS guest_identities (
            id SERIAL PRIMARY KEY,
            guest_key VARCHAR(64) NOT NULL,
            merged_user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            merged_at TIMESTAMP WITH TIME ZONE
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_guest_identities_guest_key "
        "ON guest_identities (guest_key)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS product_variants (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id),
            sku VARCHAR(64) NOT NULL,
            label VARCHAR(120) NOT NULL DEFAULT 'Default',
            is_default BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_product_sku UNIQUE (product_id, sku)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_product_variants_product_id ON product_variants (product_id)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS asset_versions (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id),
            platform VARCHAR(20) NOT NULL,
            version VARCHAR(32) NOT NULL,
            status VARCHAR(32) NOT NULL,
            uri VARCHAR(1024) NOT NULL,
            checksum_sha256 VARCHAR(64) NOT NULL,
            content_type VARCHAR(64) NOT NULL DEFAULT 'model/gltf-binary',
            byte_size INTEGER NOT NULL DEFAULT 0,
            root_node VARCHAR(120) NOT NULL DEFAULT 'root',
            default_scale FLOAT NOT NULL DEFAULT 1.0,
            anchor_json TEXT NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_asset_product_platform_ver UNIQUE (product_id, platform, version)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_asset_versions_product_id ON asset_versions (product_id)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            product_id INTEGER NOT NULL REFERENCES products(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_user_favorite UNIQUE (user_id, product_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_favorites_user_id ON favorites (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_favorites_product_id ON favorites (product_id)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tryon_sessions (
            id SERIAL PRIMARY KEY,
            session_key VARCHAR(64) NOT NULL,
            user_id INTEGER REFERENCES users(id),
            guest_key VARCHAR(64),
            product_id INTEGER NOT NULL REFERENCES products(id),
            category VARCHAR(32) NOT NULL,
            outcome VARCHAR(32) NOT NULL DEFAULT 'cancelled',
            duration_ms INTEGER NOT NULL DEFAULT 0,
            engine VARCHAR(64) NOT NULL DEFAULT '',
            device_tier VARCHAR(32) NOT NULL DEFAULT '',
            error_code VARCHAR(64),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_tryon_sessions_session_key "
        "ON tryon_sessions (session_key)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_tryon_sessions_user_id ON tryon_sessions (user_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_tryon_sessions_guest_key ON tryon_sessions (guest_key)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_tryon_sessions_product_id ON tryon_sessions (product_id)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            actor_user_id INTEGER REFERENCES users(id),
            action VARCHAR(80) NOT NULL,
            entity_type VARCHAR(80) NOT NULL,
            entity_id VARCHAR(80) NOT NULL DEFAULT '',
            details TEXT NOT NULL DEFAULT '',
            request_id VARCHAR(64) NOT NULL DEFAULT '',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def downgrade() -> None:
    pass
