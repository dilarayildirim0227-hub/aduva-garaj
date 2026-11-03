# Aduva Garaj — E-Ticaret & Sepet Modülü (Backend API + Next.js Web + Mobil)

Aduva Garaj oto aksesuar mağazası için istemciden bağımsız (Web + Mobil uyumlu) **Sepet Modülü REST API**, **Prisma/PostgreSQL veri katmanı**, **n11 stok senkron soyutlaması (`N11StockProvider`)** ve **Next.js (App Router) Koyu/Açık Tema Web Mağazası**.

---

## 1. Mimari Özet ve Klasör Yapısı

```text
ADUVA GARAJ/
├── apps/
│   ├── api/                                # NestJS + Fastify + Prisma + BullMQ Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma               # Cart, CartItem, Coupon, Product, ProductVariant şeması
│   │   │   └── seed.ts                     # 20 araç + 22 oto aksesuar ürünü + 3 kupon seed verisi
│   │   ├── src/
│   │   │   ├── modules/cart/
│   │   │   │   ├── cart.types.ts           # Zod şemaları, N11StockProvider arayüzü, hata kodları
│   │   │   │   ├── cart.repository.ts      # SELECT ... FOR UPDATE / Mutex kilidi & veri erişimi
│   │   │   │   ├── cart.service.ts         # Kuruş (int) hesaplama motoru ve 10 iş kuralı
│   │   │   │   ├── cart.controller.ts      # 9 REST uç noktası, Cookie/Bearer, Idempotency, Rate Limit
│   │   │   │   └── cart.module.ts          # Modül ve günlük süresi dolmuş sepet temizleme işçisi
│   │   │   └── preview/preview.html        # Canlı vitrin ve /sepet arayüzü
│   │   └── test/
│   │       └── cart.spec.ts                # 7 zorunlu test kriterini doğrulayan test paketi
│   ├── web/                                # Next.js 14 (App Router) + Tailwind Web Arayüzü
│   │   ├── app/
│   │   │   ├── layout.tsx                  # Koyu tema varsayılan üst bar + CartDrawer
│   │   │   ├── page.tsx                    # Araç uyumluluk seçicili ürün vitrini
│   │   │   └── sepet/page.tsx              # /sepet tam sepet sayfası (kupon, kargo çubuğu, uyarılar)
│   │   ├── components/
│   │   │   ├── add-to-cart-button.tsx      # Varyant & miktar seçicili, optimistic update'li buton
│   │   │   └── cart-drawer.tsx             # Sağdan açılan mini sepet çekmecesi + aria-live
│   │   └── lib/
│   │       └── cart-api.ts                 # İstemciden bağımsız REST istemcisi ve kuruş formatlayıcı
│   └── mobile/                             # Expo (React Native) Mobil Uygulama
├── packages/
│   └── shared/                             # Ortak marka, tema ve Zod şemaları
├── docker-compose.yml                      # Tek komutla api, web, postgres, redis
├── .env.example                            # Ortam değişkenleri şablonu
└── server.mjs                              # Docker olmadan anında çalışan yerel sunucu (Port 4000)
```

---

## 2. Kurulum ve Çalıştırma

### Seçenek A: Docker Compose ile Tek Komutla Çalıştırma
```bash
cp .env.example .env
docker compose up --build
```
- **API**: `http://localhost:4000`
- **Next.js Web**: `http://localhost:3000` (veya `http://localhost:4000/sepet`)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### Seçenek B: Docker Olmadan Yerelde Anında Çalıştırma
```bash
node server.mjs
```
- Canlı Mağaza & Mini Sepet: `http://localhost:4000`
- Tam Sepet Sayfası: `http://localhost:4000/sepet`
- Sepet REST API: `http://localhost:4000/api/cart`

### Testleri Çalıştırma
```bash
pnpm --filter @aduva/api test
```

---

## 3. Örnek `curl` İstekleri (Sepet API Uç Noktaları)

### 1) Sepete Ürün Ekle (`POST /api/cart/items`) — Idempotency ve Araç Uyumluluk Kontrolü İle
```bash
curl -i -X POST http://localhost:4000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "X-Cart-Token: gst_ornek_token_123" \
  -H "Idempotency-Key: idem-req-001" \
  -d '{
    "productId": "prd-2",
    "quantity": 1,
    "vehicleId": "veh-clio5"
  }'
```

### 2) Sepeti Getir (`GET /api/cart`)
```bash
curl -s http://localhost:4000/api/cart \
  -H "X-Cart-Token: gst_ornek_token_123"
```

### 3) Header Rozeti İçin Sepet Özeti (`GET /api/cart/summary`)
```bash
curl -s http://localhost:4000/api/cart/summary \
  -H "X-Cart-Token: gst_ornek_token_123"
```

### 4) Satır Miktarını Güncelle (`PATCH /api/cart/items/:itemId`)
```bash
curl -s -X PATCH http://localhost:4000/api/cart/items/ITEM_ID_BURAYA \
  -H "Content-Type: application/json" \
  -H "X-Cart-Token: gst_ornek_token_123" \
  -d '{ "quantity": 3 }'
```

### 5) Kupon Kodu Uygula (`POST /api/cart/coupon`)
Aktif kuponlar:
- `HOSGELDIN` (%10 indirim, alt limit 500 TL = `50000` kuruş)
- `GARAJ150` (150 TL sabit indirim, alt limit 1500 TL = `150000` kuruş)
- `SURESIDOLMUS` (Süresi dolmuş test kuponu -> `COUPON_EXPIRED` döner)

```bash
curl -s -X POST http://localhost:4000/api/cart/coupon \
  -H "Content-Type: application/json" \
  -H "X-Cart-Token: gst_ornek_token_123" \
  -d '{ "code": "HOSGELDIN" }'
```

### 6) Kuponu Kaldır (`DELETE /api/cart/coupon`)
```bash
curl -s -X DELETE http://localhost:4000/api/cart/coupon \
  -H "X-Cart-Token: gst_ornek_token_123"
```

### 7) Giriş Sonrası Misafir Sepetini Kullanıcı Sepetiyle Birleştir (`POST /api/cart/merge`)
```bash
curl -s -X POST http://localhost:4000/api/cart/merge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer usr_musteri_01" \
  -H "X-Cart-Token: gst_ornek_token_123" \
  -d '{
    "userId": "usr_musteri_01",
    "guestToken": "gst_ornek_token_123"
  }'
```

### 8) Tek Satır Sil (`DELETE /api/cart/items/:itemId`)
```bash
curl -s -X DELETE http://localhost:4000/api/cart/items/ITEM_ID_BURAYA \
  -H "X-Cart-Token: gst_ornek_token_123"
```

### 9) Sepeti Boşalt (`DELETE /api/cart`)
```bash
curl -s -X DELETE http://localhost:4000/api/cart \
  -H "X-Cart-Token: gst_ornek_token_123"
```
