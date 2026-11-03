# Değişiklik Günlüğü (CHANGELOG.md)

Tüm önemli değişiklikler [Conventional Commits](https://www.conventionalcommits.org/) ve [Semantic Versioning](https://semver.org/) standartlarına göre bu dosyada belgelenir.

## [1.2.0] - 2026-10-26
### Eklendi (Added)
- **A1-A12 Kurumsal Veritabanı Mimarisi:** 28 tabloluk [schema.prisma](file:///c:/Users/dilar/Downloads/files%20%284%29/ADUVA%20GARAJ/apps/api/prisma/schema.prisma) ve [001_production_schema_and_indexes.sql](file:///c:/Users/dilar/Downloads/files%20%284%29/ADUVA%20GARAJ/apps/api/prisma/migrations/001_production_schema_and_indexes.sql) eklendi.
- **Araç Uyumluluk Motoru (A4):** 32 araç modeli (Marka > Model > Kasa > Yıl > Motor + TecDoc K-Type), 105 oto aksesuar ürünü, 55 gerçekçi geçmiş sipariş ve CSV toplu içe aktarma modülü ([import-fitments-csv.ts](file:///c:/Users/dilar/Downloads/files%20%284%29/ADUVA%20GARAJ/apps/api/prisma/import-fitments-csv.ts)) eklendi.
- **Türkçe Tam Metin Arama (A5):** `turkish_unaccent` + `pg_trgm` trigram benzerlik motoru (`/api/search`) eklendi.
- **KVKK, Denetim ve Raporlama (A8, A9, A12):** AES-256-GCM TCKN şifreleme, VUK 10 yıl fatura korumalı unutulma hakkı (`/api/kvkk/forget-me/:userId`), `PriceHistory`, `StockMovement`, `AuditLog` ve `mv_daily_sales_summary` dashboard analitiği (`/api/reports/dashboard`) eklendi.

## [1.1.0] - 2026-10-26
### Eklendi (Added)
- **Sepet Modülü (Backend + Next.js Web):** Kuruş (`integer`) hassasiyetli 9 REST uç noktası (`/api/cart/*`), `SELECT ... FOR UPDATE` eşzamanlı stok koruması, `Idempotency-Key` önbelleği, misafir sepet birleştirme (`merge`) ve `/sepet` Next.js arayüzü eklendi.
