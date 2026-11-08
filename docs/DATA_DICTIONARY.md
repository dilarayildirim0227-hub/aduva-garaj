# Aduva Garaj — Veritabanı Veri Sözlüğü (Data Dictionary) ve KVKK Sınıflandırması

Bu belge, Aduva Garaj platformundaki **28 PostgreSQL tablosunun** görevlerini, birincil/yabancı anahtar stratejilerini, indekslerini ve **6698 sayılı KVKK / VUK** kapsamındaki saklama politikalarını tanımlar.

---

## 1. Kimlik, Oturum ve KVKK Tabloları

| Tablo Adı | Birincil Anahtar | Kritik Kolonlar ve Veri Tipleri | KVKK Sınıfı & Saklama Süresi |
| :--- | :--- | :--- | :--- |
| `users` | `id (UUIDv7)` | `email (UNIQUE)`, `phone (UNIQUE)`, `password_hash (Argon2id)`, `tc_identity_enc (AES-256-GCM)`, `role`, `deleted_at (TIMESTAMPTZ)` | **Kişisel / Hassas Veri** — Hesap silindiğinde kimlik kolonları derhal anonimleştirilir (`deleted_at` işaretlenir). |
| `user_sessions` | `id (UUIDv7)` | `user_id (FK -> users CASCADE)`, `refresh_token_hash (SHA-256 UNIQUE)`, `ip_address`, `expires_at`, `revoked_at` | **Siber Güvenlik Kaydı** — 5651 sayılı Kanun gereği oturum/IP izleri 2 yıl saklanır. |
| `user_consents` | `id (UUIDv7)` | `user_id (FK)`, `consent_type (KVKK_AYDINLATMA, IYS_SMS, IYS_EMAIL)`, `policy_version`, `granted (BOOL)`, `ip_address (INET)` | **Hukuki İspat Kaydı** — İYS mevzuatı gereği rıza geri çekildikten sonra 3 yıl saklanır. |
| `addresses` | `id (UUIDv7)` | `user_id (FK CASCADE)`, `city`, `district`, `line`, `is_corporate`, `tax_office`, `tax_number`, `deleted_at` | **İletişim Verisi** — Kullanıcı sildiğinde kaldırılır; geçmiş siparişlerdeki snapshot etkilenmez. |

---

## 2. Araç Hiyerarşisi ve Uyumluluk Motoru Tabloları (A4)

| Tablo Adı | Birincil Anahtar | Kritik Kolonlar ve İndeksler | Açıklama |
| :--- | :--- | :--- | :--- |
| `vehicles` | `id (UUIDv7)` | `brand`, `model`, `generation`, `body_type`, `year_from (SMALLINT)`, `year_to`, `engine_code`, `ktype_code` | 5 katmanlı araç tanımı ve TecDoc K-Type endüstri standardı referansı. |
| `product_fitments` | `(product_id, vehicle_id)` | `notes`, `verified_by_vin (BOOL)` — İndeks: `idx_fitments_vehicle_product (vehicle_id, product_id)` | N-N ürün-araç uyumluluk matrisi. Ters örtücü indeks ile `<10 ms` Index-Only Scan sağlar. |
| `user_vehicles` | `id (UUIDv7)` | `user_id (FK)`, `vehicle_id (FK)`, `vin_code (CHAR(17))`, `is_primary` | Kullanıcının "Garajım" özelliğinde kayıtlı araçları. |

---

## 3. Ürün Kataloğu, Varyant ve Arama Tabloları (A1, A5)

| Tablo Adı | Birincil Anahtar | Kritik Kolonlar ve Kısıtlar | Açıklama |
| :--- | :--- | :--- | :--- |
| `categories` | `id (UUIDv7)` | `name`, `slug (UNIQUE)`, `parent_id (Self-FK)` | Çok seviyeli kategori ağacı. |
| `products` | `id (UUIDv7)` | `seller_code (UNIQUE)`, `oem_code`, `price_kurus (INT >= 0)`, `stock (INT >= 0)`, `reserved_stock`, `max_per_order`, `is_universal`, `attributes (JSONB)`, `search_vector (TSVECTOR)`, `version (INT)` | Ana ürün tablosu. `turkish_unaccent` FTS + `pg_trgm` GIN indeksleriyle aranır. |
| `product_variants` | `id (UUIDv7)` | `product_id (FK CASCADE)`, `sku (UNIQUE)`, `attributes (JSONB)`, `price_kurus (INT >= 0)`, `stock (INT >= 0)`, `version` | Renk/dikiş/boyut varyantları ve bağımsız stok/fiyat takibi. |
| `product_images` | `id (UUIDv7)` | `product_id (FK CASCADE)`, `url`, `sort_order` | Sıralı ürün görselleri. |

---

## 4. Sepet, Sipariş, Ödeme, Kargo ve İade Tabloları (A2, A3, A6)

| Tablo Adı | Birincil Anahtar | Kritik Kolonlar ve Kısıtlar | Saklama Politikası |
| :--- | :--- | :--- | :--- |
| `carts` | `id (UUIDv7)` | `user_id (UNIQUE)`, `token (UNIQUE)`, `coupon_id`, `expires_at` | Misafir sepetleri 30 gün sonunda BullMQ cron işi ile temizlenir. |
| `cart_items` | `id (UUIDv7)` | `cart_id`, `product_id`, `variant_id`, `vehicle_id`, `quantity (1..100)`, `unit_price_snapshot (INT)` | `UNIQUE (cart_id, product_id, variant_id)` ile aynı ürün tek satırda toplanır. |
| `orders` | `id (UUIDv7)` | `order_number (UNIQUE)`, `user_id (ON DELETE SET NULL)`, `subtotal_kurus`, `discount_kurus`, `shipping_kurus`, `vat_total_kurus`, `grand_total_kurus`, `shipping_address_snapshot (JSONB)`, `billing_address_snapshot (JSONB)`, `distance_sales_contract (JSONB)` | **VUK Madde 253 & TTK Madde 82** gereği **10 yıl** değiştirilemez (immutable) olarak saklanır. |
| `order_items` | `id (UUIDv7)` | `order_id (FK CASCADE)`, `product_id (ON DELETE RESTRICT)`, `title`, `sku_snapshot`, `oem_code_snapshot`, `unit_price_kurus`, `vat_rate_snapshot` | Sipariş anındaki ürün adı, OEM kodu ve kuruş birim fiyat kopyası. |
| `payment_transactions` | `id (UUIDv7)` | `order_id`, `provider (IYZICO)`, `conversation_id (UNIQUE)`, `amount_kurus`, `masked_card` | **PCI-DSS:** Tam kart numarası veya CVV asla saklanmaz; sadece maskeli son 4 hane tutulur. |
| `shipments` | `id (UUIDv7)` | `order_id`, `carrier`, `tracking_number (UNIQUE)`, `status`, `shipped_at`, `delivered_at` | Yurtiçi/Aras Kargo gönderi takip kayıtları. |
| `return_requests` | `id (UUIDv7)` | `order_id`, `user_id`, `reason`, `status`, `return_cargo_code`, `refund_amount_kurus` | 6502 sayılı Kanun kapsamında 14 gün cayma hakkı ve iade yönetimi. |

---

## 5. Senkronizasyon, Denetim (Audit) ve Raporlama Tabloları (A7, A9, A12)

| Tablo Adı | Birincil Anahtar | Görevi |
| :--- | :--- | :--- |
| `idempotency_keys` | `(actor_scope, key)` | 24 saatlik TTL ile çifte sepet ekleme ve çifte sipariş/ödeme isteklerini engeller. |
| `sync_runs` & `sync_errors` | `id (UUIDv7)` | Senkron çalışmaları ve başarısız kayıtlar için üstel geri çekilmeli (exponential backoff) hata kuyruğu. |
| `price_history` | `id (BIGSERIAL)` | Ticaret Bakanlığı indirimli satış mevzuatı için son 30 günün en düşük fiyatını kanıtlayan tarihçe. |
| `stock_movements` | `id (BIGSERIAL)` | Her stok artış/azalışının (`ORDER_RESERVED`, `ADMIN_MANUAL`, `RETURN_RESTOCK`) muhasebe defteri. |
| `audit_logs` | `(id, created_at)` | Aylık `RANGE` bölümlendirmeli (partitioned), `aduva_app` rolü için `UPDATE/DELETE` yetkisi kapatılmış denetim izi tablosu. |
| `mv_daily_sales_summary` | `(sale_date, source)` | Admin paneli için 15 dakikada bir `CONCURRENTLY` yenilenen Materialized View. |
