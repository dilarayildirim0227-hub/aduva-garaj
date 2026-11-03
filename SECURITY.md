# Güvenlik Politikası (SECURITY.md)

## Desteklenen Sürümler

| Sürüm | Güvenlik Güncellemesi Desteği |
| ------- | ------------------ |
| `1.x`   | ✅ Aktif           |
| `< 1.0` | ❌ Desteklenmiyor  |

## Güvenlik ve KVKK İlkelerimiz

1. **Parola ve Oturum Güvenliği**: Kullanıcı parolaları **Argon2id** (bellek-sert) algoritması ile özetlenir. Erişim belirteçleri (Access Token) 15 dakika ömürlüdür; Refresh Token'lar veritabanında yalnızca SHA-256 özeti (`refreshTokenHash`) olarak tutulur ve her yenilemede rotasyona uğrar.
2. **Ödeme ve Kart Güvenliği (PCI-DSS)**: Kredi kartı numarası (PAN), CVV veya son kullanma tarihi sistemimizde **asla saklanmaz** ve loglanmaz. Tüm ödemeler iyzico 3D Secure üzerinden tokenize edilerek işlenir; veritabanında yalnızca maskelenmiş son 4 hane (`5406 **** **** 1234`) tutulur.
3. **KVKK ve Kişisel Veri Koruması**:
   - e-Arşiv / e-Fatura zorunluluğu nedeniyle alınan T.C. Kimlik Numarası alanı (`tcIdentityEnc`) **AES-256-GCM / pgcrypto** ile şifrelenerek saklanır.
   - Açık rıza ve İYS ticari ileti izinleri [`UserConsent`](file:///c:/Users/dilar/Downloads/files%20%284%29/ADUVA%20GARAJ/apps/api/prisma/schema.prisma#L71-L84) tablosunda IP adresi, zaman damgası ve politika versiyonu ile kayıt altına alınır.
   - Hesabını silen kullanıcıların kimlik bilgileri anonimleştirilir (`deletedAt`), Vergi Usul Kanunu (VUK) gereği 10 yıl saklanması zorunlu olan fatura/sipariş kayıtları anonim referansla korunur.
4. **API Dayanıklılığı (OWASP API Top 10)**:
   - Tüm girdiler `.strict()` **Zod** şemalarıyla doğrulanır (Mass Assignment ve SQL Injection engellenir).
   - Sepet ve ödeme uç noktalarında `Idempotency-Key` zorunluluğu ve `SELECT ... FOR UPDATE` satır kilidi ile yarış durumu (Race Condition) önlenir.
   - IP + `cartToken` bazlı dakikada 60 istek sınırı (Rate Limiting), `helmet` güvenlik başlıkları ve sıkı CORS kuralları uygulanır.

## Güvenlik Açığı Bildirimi

Bir güvenlik açığı tespit ederseniz lütfen herkese açık bir GitHub Issue açmak yerine `security@aduvagaraj.com` adresine bildirin. Bildiriminiz 24 saat içinde incelenerek geri dönüş sağlanacaktır.
