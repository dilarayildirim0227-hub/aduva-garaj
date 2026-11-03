-- ============================================================================
-- ADUVA GARAJ - ÜRETİM KALİTESİNDE POSTGRESQL DDL, KISITLAR, İNDEKSLER VE GÖRÜNÜMLER
-- Pazar: Türkiye (KVKK, TRY Kuruş Integer, %20 KDV, e-Fatura/Mesafeli Satış)
-- ============================================================================

-- 1. Eklentiler (Türkçe Tam Metin Arama, Trigram Benzerlik, Şifreleme, UUID)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Türkçe arama için aksansız (unaccent) tam metin arama konfigürasyonu
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'turkish_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION turkish_unaccent ( COPY = turkish );
    ALTER TEXT SEARCH CONFIGURATION turkish_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, turkish_stem;
  END IF;
END $$;

-- ============================================================================
-- 2. ÇEKİRDEK TABLOLAR VE CHECK / FK / UNIQUE BÜTÜNLÜK KISITLARI (A1, A2, A3)
-- ============================================================================

-- Araç Hiyerarşisi: Marka > Model > Nesil/Kasa > Yıl Aralığı > Motor (A4)
CREATE TABLE IF NOT EXISTS vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand           VARCHAR(64) NOT NULL,
  model           VARCHAR(64) NOT NULL,
  generation      VARCHAR(64) NOT NULL, -- Örn: Golf 7 (5G), Astra J (P10)
  body_type       VARCHAR(32) NOT NULL, -- Hatchback, Sedan, SUV, Station Wagon
  year_from       SMALLINT NOT NULL CHECK (year_from BETWEEN 1970 AND 2035),
  year_to         SMALLINT CHECK (year_to IS NULL OR (year_to >= year_from AND year_to <= 2035)),
  engine_code     VARCHAR(64) NOT NULL, -- Örn: 1.6 TDI 110HP CXXB
  fuel_type       VARCHAR(24) NOT NULL DEFAULT 'DIESEL',
  ktype_code      VARCHAR(32),          -- TecDoc K-Type endüstri standardı kodu
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand, model, generation, body_type, year_from, engine_code)
);

-- Ürünler Tablosu (Fiyatlar kuruş cinsinden BIGINT/INTEGER, Optimistic Locking için version)
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
  version             INTEGER NOT NULL DEFAULT 1, -- Optimistic locking (A6)
  last_synced_at      TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,                -- Soft delete (A3)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ürün Varyantları
CREATE TABLE IF NOT EXISTS product_variants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku                 VARCHAR(64) NOT NULL UNIQUE,
  name                VARCHAR(120) NOT NULL,
  attributes          JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"renk": "Kırmızı Dikişli", "materyal": "Tay Tüyü"}
  price_kurus         INTEGER NOT NULL CHECK (price_kurus >= 0),
  stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ürün - Araç Uyumluluk Tablosu (N-N, A4)
CREATE TABLE IF NOT EXISTS product_fitments (
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_id          UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  fitment_notes       VARCHAR(255), -- Örn: "Sadece elektronik el frenli paketlerle uyumludur"
  verified_by_vin     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, vehicle_id)
);

-- Siparişler Tablosu (Fatura/Teslimat Adresi Snapshot + Kuruş Tutarlar, A3)
CREATE TABLE IF NOT EXISTS orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              VARCHAR(32) NOT NULL UNIQUE,
  user_id                   UUID, -- ON DELETE SET NULL (kullanıcı silinse bile mali kayıt 10 yıl saklanır)
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
  shipping_address_snapshot JSONB NOT NULL, -- Sipariş anındaki teslimat adresi kopyası
  billing_address_snapshot  JSONB NOT NULL, -- e-Fatura/e-Arşiv için vergi no, TCKN, adres snapshot
  vehicle_snapshot          JSONB,          -- Siparişte seçili araç bilgisi
  distance_sales_contract   JSONB NOT NULL, -- Mesafeli satış sözleşmesi onay zamanı, IP ve metin versiyonu
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sipariş Satırları (Ürün Adı, SKU, OEM ve Birim Fiyat Snapshot, A3)
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

-- Idempotency Anahtarları Tablosu (Çifte Sepet/Sipariş/Ödeme Önleme, A6)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key                       VARCHAR(128) NOT NULL,
  actor_scope               VARCHAR(128) NOT NULL, -- user_id veya cart_token
  endpoint                  VARCHAR(128) NOT NULL,
  request_hash              CHAR(64) NOT NULL,
  response_status           SMALLINT,
  response_body             JSONB,
  locked_until              TIMESTAMPTZ NOT NULL,
  expires_at                TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_scope, key)
);

-- n11 Senkronizasyon ve Hata/Olay Tabloları (A7)
CREATE TABLE IF NOT EXISTS n11_sync_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type                 VARCHAR(24) NOT NULL CHECK (sync_type IN ('PRODUCTS', 'STOCK_PRICE', 'ORDERS', 'CLAIMS')),
  trigger_source            VARCHAR(16) NOT NULL CHECK (trigger_source IN ('CRON', 'WEBHOOK', 'MANUAL_ADMIN')),
  status                    VARCHAR(16) NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED')),
  processed_count           INTEGER NOT NULL DEFAULT 0,
  created_count             INTEGER NOT NULL DEFAULT 0,
  updated_count             INTEGER NOT NULL DEFAULT 0,
  failed_count              INTEGER NOT NULL DEFAULT 0,
  cursor_timestamp          TIMESTAMPTZ,
  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at               TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS n11_sync_errors (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id               UUID NOT NULL REFERENCES n11_sync_runs(id) ON DELETE CASCADE,
  external_entity_id        VARCHAR(64) NOT NULL,
  error_code                VARCHAR(64) NOT NULL,
  error_message             TEXT NOT NULL,
  raw_payload               JSONB,
  retry_count               SMALLINT NOT NULL DEFAULT 0,
  next_retry_at             TIMESTAMPTZ,
  resolved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KVKK Açık Rıza ve Ticari İleti Kayıtları (A8)
CREATE TABLE IF NOT EXISTS user_consents (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL,
  consent_type              VARCHAR(32) NOT NULL CHECK (consent_type IN (
                              'KVKK_AYDINLATMA', 'EXPLICIT_CONSENT', 'IYS_SMS', 'IYS_EMAIL', 'COOKIE_ANALYTICS'
                            )),
  policy_version            VARCHAR(16) NOT NULL,
  granted                   BOOLEAN NOT NULL,
  ip_address                INET NOT NULL,
  user_agent                TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Denetim, Fiyat ve Stok Geçmişi Tabloları (A9)
CREATE TABLE IF NOT EXISTS audit_logs (
  id                        BIGSERIAL,
  actor_id                  UUID,
  actor_role                VARCHAR(24) NOT NULL,
  action                    VARCHAR(64) NOT NULL, -- 'PRODUCT_PRICE_UPDATE', 'ORDER_STATUS_CHANGE'
  entity_type               VARCHAR(48) NOT NULL,
  entity_id                 VARCHAR(64) NOT NULL,
  old_values                JSONB,
  new_values                JSONB,
  ip_address                INET,
  request_id                VARCHAR(64),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS price_history (
  id                        BIGSERIAL PRIMARY KEY,
  product_id                UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id                UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  old_price_kurus           INTEGER NOT NULL,
  new_price_kurus           INTEGER NOT NULL,
  source                    VARCHAR(24) NOT NULL CHECK (source IN ('N11_SYNC', 'ADMIN_MANUAL', 'CAMPAIGN')),
  changed_by                UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id                        BIGSERIAL PRIMARY KEY,
  product_id                UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id                UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  delta                     INTEGER NOT NULL, -- +10 veya -2
  previous_stock            INTEGER NOT NULL,
  new_stock                 INTEGER NOT NULL CHECK (new_stock >= 0),
  reason                    VARCHAR(32) NOT NULL CHECK (reason IN ('ORDER_RESERVED', 'ORDER_CANCELLED', 'N11_SYNC', 'MANUAL_ADJUST', 'RETURN_RESTOCK')),
  reference_id              VARCHAR(64),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PERFORMANS İNDEKSLERİ (Bileşik, Kısmi, GIN JSONB, Türkçe FTS + Trigram, A5)
-- ============================================================================

-- 3.1. Araç Uyumluluk Sorgusu İçin Ters Çevrilmiş Örtücü (Covering) İndeks
-- "Bu araca (vehicle_id) uyumlu tüm ürün kimliklerini getir" sorgusunu Index-Only Scan yapar
CREATE INDEX IF NOT EXISTS idx_fitments_vehicle_product
  ON product_fitments (vehicle_id, product_id);

-- 3.2. Aktif ve Silinmemiş Ürünlerin Kategori + Fiyat Filtrelemesi (Kısmi + Bileşik İndeks)
CREATE INDEX IF NOT EXISTS idx_products_active_cat_price
  ON products (category_id, price_kurus ASC, created_at DESC)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL AND stock > 0;

-- 3.3. Üniversal Ürünlerin Hızlı Erişimi İçin Kısmi İndeks
CREATE INDEX IF NOT EXISTS idx_products_universal_active
  ON products (category_id, price_kurus ASC)
  WHERE is_universal = TRUE AND status = 'ACTIVE' AND deleted_at IS NULL AND stock > 0;

-- 3.4. Türkçe Tam Metin Arama (tsvector) GIN İndeksi + Otomatik Trigger
CREATE INDEX IF NOT EXISTS idx_products_search_vector_gin
  ON products USING GIN (search_vector);

-- Yazım hatası toleransı ("multimdya", "pasps") için pg_trgm GIN indeksi
CREATE INDEX IF NOT EXISTS idx_products_title_trgm_gin
  ON products USING GIN (title gin_trgm_ops);

-- Ürün teknik özellikleri (JSONB) filtrelemesi için GIN jsonb_path_ops indeksi
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin
  ON products USING GIN (attributes jsonb_path_ops);

-- OEM ve Satıcı Kodu Hızlı Arama İndeksi
CREATE INDEX IF NOT EXISTS idx_products_oem_code_trgm
  ON products USING GIN (oem_code gin_trgm_ops);

-- Kullanıcının Sipariş Geçmişi Bileşik İndeksi
CREATE INDEX IF NOT EXISTS idx_orders_user_created_desc
  ON orders (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Türkçe search_vector güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION trg_products_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('turkish_unaccent', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('turkish_unaccent', coalesce(NEW.brand, '') || ' ' || coalesce(NEW.oem_code, '') || ' ' || coalesce(NEW.seller_code, '')), 'B') ||
    setweight(to_tsvector('turkish_unaccent', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_update ON products;
CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE OF title, brand, oem_code, seller_code, description
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION trg_products_update_search_vector();

-- ============================================================================
-- 4. ADMIN DASHBOARD RAPORLAMA MATERIALIZED VIEW'LARI (A12)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales_summary AS
SELECT
  date_trunc('day', o.created_at AT TIME ZONE 'Europe/Istanbul')::date AS sale_date,
  o.source,
  COUNT(DISTINCT o.id)                                                 AS order_count,
  SUM(o.subtotal_kurus)                                                AS gross_revenue_kurus,
  SUM(o.discount_kurus)                                                AS total_discount_kurus,
  SUM(o.vat_total_kurus)                                               AS total_vat_kurus,
  SUM(o.grand_total_kurus)                                             AS net_revenue_kurus,
  ROUND(AVG(o.grand_total_kurus))::integer                             AS avg_order_value_kurus
FROM orders o
WHERE o.status NOT IN ('CANCELLED', 'REFUNDED', 'PENDING_PAYMENT')
GROUP BY 1, 2
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales_unique
  ON mv_daily_sales_summary (sale_date, source);
