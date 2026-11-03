# Mimari Karar Kayıtları (ADR) — Aduva Garaj

## ADR-001: Veritabanı Olarak PostgreSQL 16 Seçimi
- **Durum**: Kabul Edildi
- **Bağlam**: Oto aksesuar e-ticaretinde hem katı ilişkisel bütünlük (sipariş, stok, kuruş muhasebesi, araç-ürün N-N uyumluluk matrisi) hem de kategoriye göre değişen esnek teknik özellikler (multimedya için RAM/Ekran boyutu, paspas için materyal/parça sayısı) bir arada yönetilmelidir.
- **Karar**: **PostgreSQL 16** tercih edildi.
- **Gerekçe**:
  1. Eşzamanlı stok düşümünde `SELECT ... FOR UPDATE` ve `pg_advisory_xact_lock` ile tam ACID garantisi.
  2. Esnek ürün özelliklerinde `JSONB` + `GIN (jsonb_path_ops)` indeks desteği.
  3. Türkçe kök bulma (`turkish` + `unaccent` + `tsvector`) ve yazım hatası toleransı (`pg_trgm`) eklentilerinin yerleşik olması.

## ADR-002: ORM Olarak Prisma + Kritik Sorgularda `$queryRaw` Hibrit Yaklaşımı
- **Durum**: Kabul Edildi
- **Bağlam**: TypeScript monorepo (`apps/api`, `apps/web`, `apps/mobile`) genelinde uçtan uca tip güvenliği ve süratli şema evrimi gerekiyor.
- **Karar**: Standart CRUD, ilişkisel okuma ve şema göçleri için **Prisma ORM**, Türkçe tam metin arama (`tsvector` + `pg_trgm`) ve satır kilitli (`FOR UPDATE`) stok güncellemeleri için parametreli `$queryRaw` kullanılmasına karar verildi.

## ADR-003: n11 Senkronizasyonu ve Asenkron İşler İçin BullMQ + Redis
- **Durum**: Kabul Edildi
- **Bağlam**: n11 SOAP/REST Satıcı API'sinden gelen ürün, stok, fiyat ve sipariş güncellemeleri ağ gecikmelerine ve hız sınırlarına (rate limit) tabidir; HTTP istek döngüsünü bloklamamalıdır.
- **Karar**: **Redis 7 + BullMQ** kuyruk mimarisi seçildi. Başarısız senkron satırları üstel geri çekilme (exponential backoff) ile [`N11SyncError`](file:///c:/Users/dilar/Downloads/files%20%284%29/ADUVA%20GARAJ/apps/api/prisma/schema.prisma#L483-L498) tablosuna kaydedilir.
