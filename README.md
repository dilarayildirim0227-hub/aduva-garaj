# ADUVA GARAJ - Oto Aksesuar, Multimedya & OEM Yedek Parça E-ticaret

Modern, Türkçe arayüzlü, tam donanımlı e-ticaret uygulaması. FastAPI (Python) backend + Vanilla JS (ES2022) frontend.

## 🚀 Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0, SQLite (`aduva.db`), Pydantic v2, JWT (python-jose), bcrypt (passlib), Uvicorn |
| **Frontend** | HTML5, CSS3 (CSS Variables), ES2022 Modules, Fetch API - **Framework yok** |
| **Dev Server** | Express + http-proxy-middleware (port 3000) → FastAPI (port 8000) |
| **Build** | esbuild (JS), lightningcss (CSS) |
| **Veritabanı** | SQLite (dosya tabanlı, `backend/aduva.db`) |

## 📁 Klasör Yapısı

```
aduva-garaj/
├── package.json              # npm scripts (dev, build, seed)
├── server.js                 # Express dev server + API proxy
├── README.md
├── backend/
│   ├── main.py              # FastAPI app, CORS, router kayıtları
│   ├── database.py          # SQLAlchemy engine, session
│   ├── models.py            # User, Category, Brand, Product, Cart, Wishlist, Order, Vehicle
│   ├── schemas.py           # Pydantic v2 şemaları
│   ├── auth.py              # JWT, bcrypt, dependency injection
│   ├── seed.py              # 105 ürün + 3 demo kullanıcı + araç verileri
│   ├── requirements.txt     # Python bağımlılıkları
│   └── routers/
│       ├── products.py      # Ürün listeleme, arama, filtre, sihirbaz
│       ├── cart.py          # Sepet CRUD, misafir birleştirme
│       ├── auth.py          # Register, login, admin-login, me
│       ├── wishlist.py      # Favori listesi
│       ├── vin.py           # VIN lookup (17 karakter doğrulama)
│       └── admin.py         # Sipariş, n11 sync, fiyat/stok, CSV export
├── public/
│   ├── index.html           # SPA entry point
│   ├── css/
│   │   ├── tokens.css       # CSS variables (light/dark theme)
│   │   ├── base.css         # Reset, fonts, base styles
│   │   ├── layout.css       # Top bar, header, cat bar, brand bar, grid
│   │   ├── components.css   # Sidebar, product cards, buttons, skeletons
│   │   └── modal.css        # Login modal, admin panel
│   ├── js/
│   │   ├── main.js          # App entry, event delegation, wizard flow
│   │   ├── api.js           # Centralized fetch wrapper + error handling
│   │   ├── state.js         # Reactive state, localStorage, toasts, countdown
│   │   ├── render.js        # All render functions (products, cart, modal)
│   │   ├── cart.js          # Guest/user cart, drawer, merge logic
│   │   ├── auth.js          # Login/register/admin, wishlist, quick accounts
│   │   ├── filters.js       # Brand checkboxes, price inputs, URL hash sync
│   │   ├── theme.js         # Theme toggle, localStorage, prefers-color-scheme
│   │   ├── toast.js         # Toast notifications (slide-in, auto-dismiss)
│   │   └── countdown.js     # 16:00 cutoff countdown (gold mono font)
│   └── img/
│       ├── logo.svg         # Metallic "AG" logo
│       ├── placeholder.svg  # Generic product placeholder
│       └── products/        # Product images (run fetch-images.js)
└── scripts/
    └── fetch-images.js      # Unsplash'tan 105 ürün görseli indir / SVG fallback
```

## 🎨 Tasarım Sistemi

### Açık Tema
- Sayfa zemini: `#f1f3f8` (gri-lavanta)
- Kartlar: Beyaz (`#fff`), 1px kenarlık, yumuşak gölge
- Ana metin: `#1b2236` (koyu lacivert)
- Altın gradyan: `linear-gradient(135deg, #f7e08a, #d9a820, #b8860b)`
- Başarı yeşili: `#16a34a`, KDV DAHİL: `#d9f7e8` arka plan

### Koyu Tema (`html[data-theme="dark"]`)
- Sayfa zemini: `#0a0a0f`
- Kartlar: `#12121a`, kenarlık `rgba(255,255,255,.08)`
- Metin: `#f2f2f5`, ikincil `#9aa0b4`
- Altın vurgular aynı, daha parlak
- Geçişler: `transition: .3s ease` (bg, color, border)

### Tipografi
- Gövde: **Plus Jakarta Sans** (fallback: Inter)
- Logo/Başlık: **Montserrat 900 italic**, geniş harf aralığı
- Google Fonts ile yüklenir

## ⚡ Hızlı Başlangıç

### 1. Bağımlılıkları Kur
```bash
# Python backend
pip install -r backend/requirements.txt

# Node.js frontend tooling
npm install
```
**Veya tek komutla:**
```bash
npm run install:all
```

### 2. Veritabanını Oluştur ve Seed Verilerini Yükle
```bash
npm run seed
```
Bu komut:
- `backend/aduva.db` SQLite dosyasını oluşturur
- 7 kategori, 10 marka, 50+ araç varyantı ekler
- **105 ürün** ekler (5 özel + 100 otomatik)
- 3 demo kullanıcı oluşturur

### 3. Geliştirme Sunucularını Başlat
```bash
npm run dev
```
Bu komut **eşzamanlı** başlatır:
- **Backend**: `http://localhost:8000` (FastAPI + Uvicorn reload)
- **Frontend**: `http://localhost:3000` (Express + proxy + live reload)

Tarayıcıda `http://localhost:3000` açın.

### 4. Production Build
```bash
npm run build
```
- `public/js/main.min.js` (esbuild, minified, ES2022)
- `public/css/base.min.css` (lightningcss, minified)

## 🗄️ Demo Hesaplar (Seed Sonrası)

| Rol | E-posta | Şifre | Not |
|-----|---------|-------|-----|
| **Üye 1** | `ahmet@aduvagaraj.com` | `123456` | Golf 7 kaydı, kişisel sepet |
| **Üye 2** | `mehmet@aduvagaraj.com` | `123456` | Astra J kaydı, kişisel sepet |
| **Admin** | `admin@aduvagaraj.com` | `admin123` | Yönetim paneli erişimi |

> **Not**: Her üyenin **bağımsız sepeti** vardır. Giriş yapınca "Misafir sepetini birleştir" seçeneğiyle misafir sepeti üye sepetine eklenir.

## 🔧 API Endpoints (Özet)

Tüm endpointler `/api` prefixli.

### Ürünler
- `GET /products?q=&category=&min=&max=&brand=&sort=&vehicle=` - Liste + toplam + kategori sayıları
- `GET /products/{id}` - Tek ürün detayı
- `GET /products/categories` - Kategoriler (ürün sayılarıyla)
- `GET /products/brands` - Markalar (ürün sayılarıyla)

### Araç Sihirbazı
- `GET /products/vehicles/makes` - Markalar
- `GET /products/vehicles/models?make=` - Modeller
- `GET /products/vehicles/years?make=&model=` - Yıllar
- `GET /products/vehicles/engines?make=&model=&year=` - Motorlar
- `GET /products/vehicles/wizard?...` - Tek endpoint (adım adım)

### Kimlik Doğrulama
- `POST /auth/register` - Yeni üye
- `POST /auth/login` - Üye girişi
- `POST /auth/admin-login` - Yetkili girişi
- `GET /auth/me` - Mevcut kullanıcı

### Sepet (JWT gerekli)
- `GET /cart` - Sepeti getir
- `POST /cart` - Ürün ekle
- `PATCH /cart/{id}` - Adet güncelle
- `DELETE /cart/{id}` - Çıkar
- `DELETE /cart` - Temizle
- `POST /cart/merge` - Misafir sepetini birleştir

### Favoriler (JWT gerekli)
- `GET /wishlist` - Liste
- `POST /wishlist` - Ekle
- `DELETE /wishlist/{product_id}` - Çıkar

### VIN
- `POST /vin/lookup` - 17 karakter VIN doğrulama + uyumlu ürünler

### Admin (role=admin gerekli)
- `GET /admin/orders` - Sipariş listesi
- `PATCH /admin/orders/{id}/shipment` - Durum + kargo takip no
- `PATCH /admin/products/{id}` - Fiyat/stok güncelle
- `POST /admin/n11/sync` - n11 Delta senkron simülasyonu
- `GET /admin/reports/orders.csv` - CSV rapor indir

## 🖼️ Ürün Görselleri

Seed verisinde 105 ürün için görsel yolları tanımlıdır (`img/products/adv-XXXX.jpg`).

**Gerçek görselleri indirmek için:**
```bash
node scripts/fetch-images.js
```
Bu script:
- Unsplash'tan kategori bazlı 105 görsel indirir
- Ağ hatası olursa **SVG placeholder** oluşturur
- `public/img/products/` klasörüne kaydeder

> **Not**: `public/img/placeholder.svg` genel fallback olarak kullanılır. `<img loading="lazy" onerror="this.src='img/placeholder.svg'">` ile kırık görseller otomatik handle edilir.

## ♿ Erişilebilirlik & UX

- **Klavye**: Enter ile arama, ESC ile modal kapatma, odak halkaları altın
- **ARIA**: `aria-label`, `aria-live`, `role`, `aria-selected` tam destek
- **Focus Trap**: Modal içinde Tab döngüsü
- **Semantik HTML**: `header`, `nav`, `main`, `aside`, `section`, `dialog`
- **Duyarlı**: 1280px referans, 1100px/700px kırılmaları, mobil sidebar drawer
- **Skeleton Loading**: Ürün kartları için shimmer iskeletleri

## 📦 Ürün Verisi (Seed)

| Kategori | Ürün Sayısı |
|----------|-------------|
| Multimedya & CarPlay | 16 |
| 3D Havuzlu Paspas | 15 |
| Koltuk Kılıfı & Minder | 14 |
| Krom & Dış Tuning | 15 |
| LED & Ambiyans | 15 |
| Ses Sistemleri & Kamera | 14 |
| Periyodik Bakım & Fren | 16 |
| **TOPLAM** | **105** |

**Özel Ürünler (5 adet):**
1. `ADV-1000` - ADUVA PRO Android Auto & CarPlay 9" Multimedya (₺8.999 → ₺7.499, %17)
2. `ADV-1001` - ADUVA FIT VW Golf 7 3D Havuzlu Paspas (₺1.499 → ₺1.249, %17)
3. `ADV-1002` - ADUVA DESIGN Fiat Egea Koltuk Kılıfı (₺3.899 → ₺3.299, %15)
4. `ADV-OPEL-01` - Opel Astra J/K & Insignia Tesla Ekran 9.7" (₺9.499 → ₺8.299)
5. `ADV-BKM-16` - Bosch OEM Opel Astra J/K 1.6 CDTI Bakım Seti (₺2.299 → ₺1.849)

**Otomatik 100 Ürün:**
- SKU: `ADV-1003` ... `ADV-1102`
- Başlık kalıbı: `{Araç} ({Yıl}) Özel Seri OEM Uyumlu {Kategori} Paketi #{n}`
- Fiyat: Kategori bazlı taban + `n * 130` artış
- İndirim: %13-%21 arası rastgele
- Puan: 4.5-4.9, Yorum: 20-120

## 🛠️ Geliştirme Notları

### State Yönetimi (`state.js`)
- Reactive pattern: `subscribe(key, callback)` / `notify(key, value)`
- `setState('nested.key', value)` ile derin güncelleme
- localStorage: `aduvajar_token`, `aduvajar_guest_cart`, `aduvajar_theme`

### API Katmanı (`api.js`)
- Tek `ApiClient` sınıfı, singleton `api` export
- JWT `Authorization: Bearer` header otomatik
- `Failed to fetch` → Türkçe "Sunucuya ulaşılamadı..." mesajı

### Render (`render.js`)
- Tüm HTML string-based, `innerHTML` ile basılır
- `formatPrice()` → `₺7.499,00` (tr-TR, TL)
- `calculateInstallment()` → 6 taksit hesaplama

### Modüller Arası İletişim
- `main.js` merkezi entry, `initEventListeners()` delegation
- Dinamik import: `import('./cart.js').then(m => m.addToCart(id))`
- Global `window.ADUVA` debug objesi

## 📝 Lisans

MIT License - Serbest kullanım, değiştirme, dağıtım.

---

**ADUVA GARAJ** - Oto aksesuarınızın güvenilir adresi 🚗✨
