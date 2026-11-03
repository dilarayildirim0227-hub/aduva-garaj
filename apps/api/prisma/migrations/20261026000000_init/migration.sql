-- ============================================================================
-- ADUVA GARAJ - ÜRETİM KALİTESİNDE POSTGRESQL DDL, KISITLAR, İNDEKSLER VE GÖRÜNÜMLER
-- Pazar: Türkiye (KVKK, TRY Kuruş Integer, %20 KDV, e-Fatura/Mesafeli Satış)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'turkish_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION turkish_unaccent ( COPY = turkish );
    ALTER TEXT SEARCH CONFIGURATION turkish_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, turkish_stem;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand           VARCHAR(64) NOT NULL,
  model           VARCHAR(64) NOT NULL,
  generation      VARCHAR(64) NOT NULL,
  body_type       VARCHAR(32) NOT NULL,
  year_from       SMALLINT NOT NULL CHECK (year_from BETWEEN 1970 AND 2035),
  year_to         SMALLINT CHECK (year_to IS NULL OR (year_to >= year_from AND year_to <= 2035)),
  engine_code     VARCHAR(64) NOT NULL,
  fuel_type       VARCHAR(24) NOT NULL DEFAULT 'DIESEL',
  ktype_code      VARCHAR(32),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand, model, generation, body_type, year_from, engine_code)
);

CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  n11_product_id      BIGINT UNIQUE,
  seller_code         VARCHAR(64) NOT NULL UNIQUE,
  oem_code            VARCHAR(64),
  title               VARCHAR(255) NOT NULL,
  slug                VARCHAR(280) NOT NULL UNIQUE,
  description         TEXT,
  brand               VARCHAR(80) NOT NULL,
  category_id         UUID NOT NULL,
  price_kurus         INTEGER NOT NULL CHECK (price_kurus >= 0),
  list_price_kurus    INTEGER CHECK (list_price_kurus IS NULL OR list_price_kurus >= price_kurus),
  vat_rate            SMALLINT NOT NULL DEFAULT 20 CHECK (vat_rate IN (0, 1, 10, 20)),
  stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reserved_stock      INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0 AND reserved_stock <= stock),
  max_per_order       SMALLINT NOT NULL DEFAULT 10 CHECK (max_per_order BETWEEN 1 AND 100),
  status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PASSIVE', 'DRAFT', 'OUT_OF_STOCK')),
  is_universal        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_montage    BOOLEAN NOT NULL DEFAULT FALSE,
  attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_vector       TSVECTOR,
  version             INTEGER NOT NULL DEFAULT 1,
  last_synced_at      TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku                 VARCHAR(64) NOT NULL UNIQUE,
  name                VARCHAR(120) NOT NULL,
  attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_kurus         INTEGER NOT NULL CHECK (price_kurus >= 0),
  stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_fitments (
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_id          UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  fitment_notes       VARCHAR(255),
  verified_by_vin     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              VARCHAR(32) NOT NULL UNIQUE,
  user_id                   UUID,
  source                    VARCHAR(16) NOT NULL DEFAULT 'WEB' CHECK (source IN ('WEB', 'APP', 'N11')),
  n11_order_id              BIGINT UNIQUE,
  status                    VARCHAR(24) NOT NULL CHECK (status IN (
                              'PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
                            )),
  subtotal_kurus            INTEGER NOT NULL CHECK (subtotal_kurus >= 0),
  discount_kurus            INTEGER NOT NULL DEFAULT 0 CHECK (discount_kurus >= 0),
  shipping_kurus            INTEGER NOT NULL DEFAULT 0 CHECK (shipping_kurus >= 0),
  vat_total_kurus           INTEGER NOT NULL DEFAULT 0 CHECK (vat_total_kurus >= 0),
  grand_total_kurus         INTEGER NOT NULL CHECK (grand_total_kurus >= 0),
  currency                  CHAR(3) NOT NULL DEFAULT 'TRY',
  shipping_address_snapshot JSONB NOT NULL,
  billing_address_snapshot  JSONB NOT NULL,
  vehicle_snapshot          JSONB,
  distance_sales_contract   JSONB NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id                UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id                UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_title_snapshot    VARCHAR(255) NOT NULL,
  sku_snapshot              VARCHAR(64) NOT NULL,
  oem_code_snapshot         VARCHAR(64),
  quantity                  SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price_kurus          INTEGER NOT NULL CHECK (unit_price_kurus >= 0),
  vat_rate_snapshot         SMALLINT NOT NULL DEFAULT 20,
  line_total_kurus          INTEGER NOT NULL CHECK (line_total_kurus >= 0)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key                       VARCHAR(128) NOT NULL,
  actor_scope               VARCHAR(128) NOT NULL,
  endpoint                  VARCHAR(128) NOT NULL,
  request_hash              CHAR(64) NOT NULL,
  response_status           SMALLINT,
  response_body             JSONB,
  locked_until              TIMESTAMPTZ NOT NULL,
  expires_at                TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_scope, key)
);

CREATE INDEX IF NOT EXISTS idx_fitments_vehicle_product
  ON product_fitments (vehicle_id, product_id);

CREATE INDEX IF NOT EXISTS idx_products_active_cat_price
  ON products (category_id, price_kurus ASC, created_at DESC)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL AND stock > 0;

CREATE INDEX IF NOT EXISTS idx_products_universal_active
  ON products (category_id, price_kurus ASC)
  WHERE is_universal = TRUE AND status = 'ACTIVE' AND deleted_at IS NULL AND stock > 0;

CREATE INDEX IF NOT EXISTS idx_products_search_vector_gin
  ON products USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_products_title_trgm_gin
  ON products USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_attributes_gin
  ON products USING GIN (attributes jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_products_oem_code_trgm
  ON products USING GIN (oem_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_desc
  ON orders (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
