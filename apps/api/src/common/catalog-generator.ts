/**
 * ADUVA GARAJ - GERÇEKÇİ DEMO VERİ ÜRETİCİSİ (A10)
 * - 32 Araç Modeli (Marka > Model > Nesil/Kasa > Yıl Aralığı > Motor + TecDoc K-Type)
 * - 105 Oto Aksesuar & Yedek Parça Ürünü (Kuruş integer fiyat, OEM kodu, teknik özellikler)
 * - 55 Geçmiş Sipariş (Snapshot adres, mesafeli satış sözleşmesi, %20 KDV kırılımı)
 * - Kuponlar, Kampanyalar, Müşteri Yorumları, Fiyat/Stok Geçmişi ve KVKK Rıza Kayıtları
 */

export interface GeneratedVehicle {
  id: string;
  brand: string;
  model: string;
  generation: string;
  yearFrom: number;
  yearTo: number | null;
  body: string;
  engine: string;
  ktypeCode: string;
}

export function generateVehicles32(): GeneratedVehicle[] {
  return [
    { id: 'veh-01', brand: 'Opel', model: 'Astra J', generation: 'P10', yearFrom: 2009, yearTo: 2016, body: 'Hatchback', engine: '1.6 CDTI 136HP B16DTH', ktypeCode: 'KT-34812' },
    { id: 'veh-02', brand: 'Opel', model: 'Astra J Sedan', generation: 'P10', yearFrom: 2012, yearTo: 2018, body: 'Sedan', engine: '1.4 Turbo 140HP A14NET', ktypeCode: 'KT-34819' },
    { id: 'veh-03', brand: 'Opel', model: 'Astra K', generation: 'B16', yearFrom: 2015, yearTo: 2021, body: 'Hatchback', engine: '1.6 CDTI 136HP', ktypeCode: 'KT-51204' },
    { id: 'veh-04', brand: 'Opel', model: 'Insignia A', generation: 'G09', yearFrom: 2008, yearTo: 2017, body: 'Sedan', engine: '1.6 SIDI Turbo 170HP', ktypeCode: 'KT-29910' },
    { id: 'veh-05', brand: 'Opel', model: 'Insignia B Grand Sport', generation: 'Z18', yearFrom: 2017, yearTo: 2022, body: 'Liftback', engine: '1.6 D 136HP', ktypeCode: 'KT-58901' },
    { id: 'veh-06', brand: 'Opel', model: 'Corsa E', generation: 'X15', yearFrom: 2014, yearTo: 2019, body: 'Hatchback', engine: '1.4 90HP B14XEJ', ktypeCode: 'KT-44102' },
    { id: 'veh-07', brand: 'Opel', model: 'Corsa F', generation: 'P2JO', yearFrom: 2019, yearTo: null, body: 'Hatchback', engine: '1.2 PureTech 100HP', ktypeCode: 'KT-70115' },
    { id: 'veh-08', brand: 'Opel', model: 'Mokka X', generation: 'J13', yearFrom: 2016, yearTo: 2020, body: 'SUV', engine: '1.6 CDTI 136HP 4x4', ktypeCode: 'KT-54012' },
    { id: 'veh-09', brand: 'Volkswagen', model: 'Golf 7', generation: '5G1', yearFrom: 2012, yearTo: 2020, body: 'Hatchback', engine: '1.6 TDI 110HP CXXB', ktypeCode: 'KT-40911' },
    { id: 'veh-10', brand: 'Volkswagen', model: 'Golf 8', generation: 'CD1', yearFrom: 2020, yearTo: null, body: 'Hatchback', engine: '1.5 eTSI 150HP', ktypeCode: 'KT-78104' },
    { id: 'veh-11', brand: 'Volkswagen', model: 'Passat B8', generation: '3G2', yearFrom: 2014, yearTo: 2023, body: 'Sedan', engine: '1.6 TDI 120HP DCXA', ktypeCode: 'KT-47190' },
    { id: 'veh-12', brand: 'Volkswagen', model: 'Polo', generation: 'AW1', yearFrom: 2017, yearTo: null, body: 'Hatchback', engine: '1.0 TSI 95HP', ktypeCode: 'KT-60218' },
    { id: 'veh-13', brand: 'Volkswagen', model: 'Tiguan', generation: 'AD1', yearFrom: 2016, yearTo: 2023, body: 'SUV', engine: '1.5 TSI 150HP ACT', ktypeCode: 'KT-55901' },
    { id: 'veh-14', brand: 'Fiat', model: 'Egea Sedan', generation: '356', yearFrom: 2015, yearTo: null, body: 'Sedan', engine: '1.3 MultiJet 95HP', ktypeCode: 'KT-51908' },
    { id: 'veh-15', brand: 'Fiat', model: 'Egea Cross', generation: '357', yearFrom: 2020, yearTo: null, body: 'Crossover', engine: '1.6 MultiJet 130HP DCT', ktypeCode: 'KT-79012' },
    { id: 'veh-16', brand: 'Renault', model: 'Clio 5', generation: 'BJA', yearFrom: 2019, yearTo: null, body: 'Hatchback', engine: '1.0 TCe 100HP', ktypeCode: 'KT-69814' },
    { id: 'veh-17', brand: 'Renault', model: 'Megane 4 Sedan', generation: 'LFF', yearFrom: 2016, yearTo: null, body: 'Sedan', engine: '1.5 Blue dCi 115HP', ktypeCode: 'KT-57201' },
    { id: 'veh-18', brand: 'Renault', model: 'Austral', generation: 'HHN', yearFrom: 2022, yearTo: null, body: 'SUV', engine: '1.3 Mild Hybrid 160HP', ktypeCode: 'KT-89102' },
    { id: 'veh-19', brand: 'Toyota', model: 'Corolla Sedan', generation: 'E210', yearFrom: 2019, yearTo: null, body: 'Sedan', engine: '1.8 Hybrid 140HP', ktypeCode: 'KT-68400' },
    { id: 'veh-20', brand: 'Toyota', model: 'C-HR', generation: 'AX10', yearFrom: 2016, yearTo: 2023, body: 'SUV', engine: '1.8 Hybrid 122HP', ktypeCode: 'KT-56411' },
    { id: 'veh-21', brand: 'Honda', model: 'Civic FC5', generation: 'FC', yearFrom: 2016, yearTo: 2021, body: 'Sedan', engine: '1.5 VTEC Turbo 182HP', ktypeCode: 'KT-56992' },
    { id: 'veh-22', brand: 'Honda', model: 'Civic FE1', generation: 'FE', yearFrom: 2021, yearTo: null, body: 'Sedan', engine: '1.5 VTEC Turbo ECO', ktypeCode: 'KT-83400' },
    { id: 'veh-23', brand: 'Ford', model: 'Focus 4', generation: 'HN', yearFrom: 2018, yearTo: null, body: 'Sedan', engine: '1.5 EcoBlue 120HP', ktypeCode: 'KT-64120' },
    { id: 'veh-24', brand: 'Ford', model: 'Puma', generation: 'J2K', yearFrom: 2019, yearTo: null, body: 'SUV', engine: '1.0 EcoBoost Hybrid', ktypeCode: 'KT-71209' },
    { id: 'veh-25', brand: 'Peugeot', model: '3008 II', generation: 'P84', yearFrom: 2016, yearTo: 2024, body: 'SUV', engine: '1.5 BlueHDi 130HP EAT8', ktypeCode: 'KT-59004' },
    { id: 'veh-26', brand: 'Peugeot', model: '2008 II', generation: 'P24', yearFrom: 2019, yearTo: null, body: 'SUV', engine: '1.2 PureTech 130HP', ktypeCode: 'KT-70981' },
    { id: 'veh-27', brand: 'BMW', model: '3 Serisi F30', generation: 'F30', yearFrom: 2012, yearTo: 2019, body: 'Sedan', engine: '320i ED 170HP N13B16', ktypeCode: 'KT-41008' },
    { id: 'veh-28', brand: 'BMW', model: '3 Serisi G20', generation: 'G20', yearFrom: 2019, yearTo: null, body: 'Sedan', engine: '320i 1.6 170HP B48', ktypeCode: 'KT-69055' },
    { id: 'veh-29', brand: 'Mercedes-Benz', model: 'C-Serisi W205', generation: 'W205', yearFrom: 2014, yearTo: 2021, body: 'Sedan', engine: 'C200d 1.6 160HP', ktypeCode: 'KT-48810' },
    { id: 'veh-30', brand: 'Audi', model: 'A3 Sedan', generation: '8V', yearFrom: 2013, yearTo: 2020, body: 'Sedan', engine: '1.6 TDI 116HP', ktypeCode: 'KT-43219' },
    { id: 'veh-31', brand: 'Hyundai', model: 'Tucson NX4', generation: 'NX4', yearFrom: 2021, yearTo: null, body: 'SUV', engine: '1.6 CRDi 136HP 4x4', ktypeCode: 'KT-81203' },
    { id: 'veh-32', brand: 'Togg', model: 'T10X', generation: 'V2', yearFrom: 2023, yearTo: null, body: 'SUV', engine: '160 kW RWD Uzun Menzil', ktypeCode: 'KT-95001' },
  ];
}

export function generateProducts105(vehicles: GeneratedVehicle[]) {
  const templates = [
    {
      catId: 'cat-multimedya',
      prefix: 'MM',
      brand: 'Aduva Pro',
      basePriceTl: 7899,
      maxPerOrder: 5,
      requiresMontage: true,
      img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      titleFn: (v: GeneratedVehicle) => `${v.brand} ${v.model} (${v.yearFrom}-${v.yearTo || '2026'}) Kablosuz CarPlay & Android Auto 9" QLED Multimedya`,
      attrs: { RAM: '4 GB DDR4', Hafiza: '64 GB', Ekran: '9 inç IPS QLED', Baglanti: 'Kablosuz CarPlay + DSP' },
    },
    {
      catId: 'cat-paspas',
      prefix: 'PSP',
      brand: 'Aduva Fit',
      basePriceTl: 1299,
      maxPerOrder: 10,
      requiresMontage: false,
      img: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
      titleFn: (v: GeneratedVehicle) => `${v.brand} ${v.model} ${v.generation} Lazer Kesim 4D Havuzlu TPE Kauçuk Paspas + Bagaj Havuzu`,
      attrs: { Materyal: '%100 Kokusuz TPE', Kenar_Bariyeri: '4.5 cm Yüksek Havuz', Klips: 'Orijinal Sabitleme Klipsli' },
    },
    {
      catId: 'cat-kilif',
      prefix: 'KLF',
      brand: 'Aduva Design',
      basePriceTl: 3199,
      maxPerOrder: 6,
      requiresMontage: true,
      img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
      titleFn: (v: GeneratedVehicle) => `${v.brand} ${v.model} Özel Dikim Airbag Uyumlu Tay Tüyü & Deri Ortopedik Koltuk Kılıfı Seti`,
      attrs: { kumasi: 'Terletmez Tay Tüyü + Nappa Deri', Airbag: 'TÜV Sertifikalı Airbag Dikişi', Parca: 'Ön + Arka Tam Set' },
    },
  ];

  const items: any[] = [];
  let seq = 1;

  // 32 araç x 3 kategori = 96 araca özel ürün
  for (const v of vehicles) {
    for (const tpl of templates) {
      const id = `prd-${seq}`;
      const priceTl = tpl.basePriceTl + ((seq * 50) % 700);
      const listPriceTl = Math.round(priceTl * 1.18);
      const oemCode = `${v.brand.slice(0, 3).toUpperCase()}-${tpl.prefix}-${1000 + seq}`;
      items.push({
        id,
        sellerCode: `ADV-${tpl.prefix}-${String(seq).padStart(3, '0')}`,
        oemCode,
        slug: `${v.brand}-${v.model}-${tpl.prefix}-${seq}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
        title: tpl.titleFn(v),
        description: `${v.brand} ${v.model} (${v.generation} kasa, ${v.engine}) araçlarla %100 birebir uyumlu, 2 yıl Aduva Garaj garantili ${tpl.brand} ürünü.`,
        brand: tpl.brand,
        price: priceTl,
        priceKurus: priceTl * 100,
        listPrice: listPriceTl,
        listPriceKurus: listPriceTl * 100,
        vatRate: 20,
        stock: 6 + (seq % 25),
        reservedStock: 0,
        maxPerOrder: tpl.maxPerOrder,
        status: 'ACTIVE',
        categoryId: tpl.catId,
        isUniversal: false,
        isFeatured: seq <= 18,
        requiresMontage: tpl.requiresMontage,
        ratingAvg: Number((4.6 + (seq % 4) * 0.1).toFixed(1)),
        ratingCount: 15 + (seq % 80),
        soldCount: 35 + (seq * 7) % 240,
        image: tpl.img,
        fitmentVehicleIds: [v.id],
        attributes: { ...tpl.attrs, Uyumlu_Kasa: `${v.brand} ${v.model} (${v.generation})`, KType: v.ktypeCode },
        version: 1,
      });
      seq++;
    }
  }

  // +9 Üniversal Ürün = Toplam 105 Ürün
  const universalExtras = [
    { title: '64 Renk Bluetooth Uygulama Kontrollü Fiber Optik Torpido & Kapı Ambiyans LED Seti', cat: 'cat-led', brand: 'Aduva Light', price: 949, oem: 'LED-64RGB-PRO', montage: true },
    { title: 'H7 CSP 12.000 Lümen Mini Boy CANBUS Şimşek Etkili LED Xenon Far Ampulü 6000K', cat: 'cat-led', brand: 'Aduva Light', price: 799, oem: 'H7-CANBUS-12K', montage: false },
    { title: 'Pioneer 16cm 300W Koaksiyel Kapı Hoparlör Takımı + 170° AHD Gece Görüş Kamerası', cat: 'cat-ses', brand: 'Pioneer', price: 1949, oem: 'PIO-TSG1620F', montage: true },
    { title: '70mai Dash Cam Pro Plus+ A500S Çift Kameralı GPS’li 2.7K Araç İçi Kamera Seti', cat: 'cat-ses', brand: '70mai', price: 3899, oem: '70MAI-A500S-RC', montage: true },
    { title: 'Koltuk Altı Aktif Slim Subwoofer 8 İnç 600W Dahili Amfili Bas Sistemi', cat: 'cat-ses', brand: 'Aduva Sound', price: 4299, oem: 'ADV-SUB-800W', montage: true },
    { title: '304 Paslanmaz Çelik Çift Çıkışlı Akrapovic Karbon Görünümlü Egzoz Ucu', cat: 'cat-krom', brand: 'Aduva Chrome', price: 1149, oem: 'CHR-EXH-DUAL', montage: true },
    { title: 'Piano Black Parlak Siyah Ön Tampon Ek Lip (3 Parça Ayarlanabilir Üniversal)', cat: 'cat-krom', brand: 'Aduva Chrome', price: 699, oem: 'PB-FRONT-LIP3', montage: false },
    { title: 'MagSafe Uyumlu 15W Hızlı Kablosuz Şarjlı Havalandırma Tipi Araç Telefon Tutucu', cat: 'cat-multimedya', brand: 'Aduva Pro', price: 649, oem: 'ADV-MAGSAFE-15W', montage: false },
    { title: 'OBD2 ELM327 v1.5 Bluetooth Araç Arıza Tespit ve Canlı Sensör Okuma Cihazı', cat: 'cat-bakim', brand: 'Bosch OEM', price: 499, oem: 'OBD2-PIC18F25K80', montage: false },
  ];

  for (const u of universalExtras) {
    const id = `prd-${seq}`;
    items.push({
      id,
      sellerCode: `ADV-UNI-${String(seq).padStart(3, '0')}`,
      oemCode: u.oem,
      slug: `universal-${u.oem.toLowerCase()}-${seq}`,
      title: u.title,
      description: 'Tüm binek ve SUV araçlarla uyumlu, 2 yıl garantili premium oto aksesuar ürünü.',
      brand: u.brand,
      price: u.price,
      priceKurus: u.price * 100,
      listPrice: Math.round(u.price * 1.2),
      listPriceKurus: Math.round(u.price * 120),
      vatRate: 20,
      stock: 40,
      reservedStock: 0,
      maxPerOrder: 10,
      status: 'ACTIVE',
      categoryId: u.cat,
      isUniversal: true,
      isFeatured: true,
      requiresMontage: u.montage,
      ratingAvg: 4.9,
      ratingCount: 94,
      soldCount: 310,
      image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
      fitmentVehicleIds: vehicles.map((v) => v.id),
      attributes: { Uyumluluk: 'Tüm Araçlar (Üniversal)', Garanti: '2 Yıl' },
      version: 1,
    });
    seq++;
  }

  return items;
}

export function generateOrders55(products: any[], vehicles: GeneratedVehicle[]) {
  const cities = ['İstanbul / Ümraniye', 'Ankara / Çankaya', 'İzmir / Bornova', 'Bursa / Nilüfer', 'Kocaeli / İzmit', 'Antalya / Muratpaşa'];
  const names = ['Ahmet Yılmaz', 'Mehmet Kaya', 'Burak Demir', 'Caner Şahin', 'Emre Çelik', 'Serkan Aydın', 'Murat Özkan', 'Tolga Yıldız'];
  const sources = ['WEB', 'APP'] as const;
  const statuses = ['DELIVERED', 'SHIPPED', 'PREPARING', 'PAID'] as const;

  const orders: any[] = [];
  const now = Date.now();

  for (let i = 1; i <= 55; i++) {
    const p = products[(i * 3) % products.length];
    const veh = vehicles[i % vehicles.length];
    const qty = (i % 2) + 1;
    const subtotalKurus = p.priceKurus * qty;
    const discountKurus = i % 5 === 0 ? Math.round(subtotalKurus * 0.1) : 0;
    const shippingKurus = subtotalKurus - discountKurus >= 75000 ? 0 : 7990;
    const grandTotalKurus = subtotalKurus - discountKurus + shippingKurus;
    const vatTotalKurus = Math.round((grandTotalKurus * 20) / 120);
    const createdAt = new Date(now - (i * 11 * 3600 * 1000)).toISOString();
    const customerName = names[i % names.length];
    const city = cities[i % cities.length];

    orders.push({
      id: `ord-${100 + i}`,
      orderNumber: `ADV-2026-${1000 + i}`,
      source: sources[i % sources.length],
      customerName,
      city,
      status: statuses[i % statuses.length],
      paymentMethod: i % 4 === 0 ? 'CASH_ON_DELIVERY' : 'CARD',
      subtotalKurus,
      discountKurus,
      shippingKurus,
      vatTotalKurus,
      grandTotalKurus,
      total: Number((grandTotalKurus / 100).toFixed(2)),
      trackingCode: statuses[i % statuses.length] === 'PREPARING' ? null : `YK-90844${1000 + i}`,
      carrier: 'Yurtiçi Kargo',
      createdAt,
      vehicleBrand: veh.brand,
      vehicleModel: veh.model,
      shippingAddressSnapshot: {
        fullName: customerName,
        city,
        line: 'Atatürk Mah. Oto Sanayi Cad. No: 42',
      },
      billingAddressSnapshot: {
        fullName: customerName,
        taxType: 'INDIVIDUAL',
        eArchiveReady: true,
      },
      distanceSalesContract: {
        version: 'v2026.1',
        acceptedAt: createdAt,
        ipAddress: '176.88.12.' + (10 + (i % 200)),
      },
      items: [
        {
          productId: p.id,
          title: p.title,
          skuSnapshot: p.sellerCode,
          oemCodeSnapshot: p.oemCode,
          quantity: qty,
          unitPrice: p.price,
          unitPriceKurus: p.priceKurus,
          lineTotalKurus: subtotalKurus,
        },
      ],
    });
  }

  return orders;
}

export function normalizeTurkishSearch(text?: string | null): string {
  if (!text) return '';
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .trim();
}

