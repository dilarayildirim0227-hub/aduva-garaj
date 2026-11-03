import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateOrders55, generateProducts105, generateVehicles32 } from '../src/common/catalog-generator';

const prisma = new PrismaClient();

/**
 * ADUVA GARAJ - ZENGİN SEED BETİĞİ (A10)
 * - 32 Araç Modeli (Marka > Model > Kasa/Nesil > Yıl > Motor + K-Type)
 * - 105 Oto Aksesuar Ürünü (Kuruş integer fiyat, OEM kodu, varyant ve uyumluluk ilişkileri)
 * - 55 Gerçekçi Sipariş (Fatura/Adres/Mesafeli Satış Sözleşmesi Snapshot ile)
 * - Kuponlar, Kampanyalar, Yorumlar, Fiyat/Stok Geçmişi ve KVKK Rıza Kayıtları
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@aduvagaraj.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Degistir123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN' },
    create: { email, passwordHash, name: 'Aduva Garaj Admin', role: 'ADMIN' },
  });

  // KVKK Açık Rıza Kaydı (A8)
  await prisma.userConsent.create({
    data: {
      userId: admin.id,
      consentType: 'KVKK_AYDINLATMA',
      policyVersion: 'v2026.1',
      granted: true,
      ipAddress: '127.0.0.1',
      userAgent: 'AduvaSeedRunner/1.0',
    },
  });

  const categories = [
    { id: 'cat-multimedya', n11Id: 'cat-Multimedya', name: 'Multimedya & CarPlay', slug: 'multimedya-carplay', icon: '📺' },
    { id: 'cat-paspas', n11Id: 'cat-Paspas', name: '3D Havuzlu Paspas', slug: '3d-paspas', icon: '🛡️' },
    { id: 'cat-kilif', n11Id: 'cat-Koltuk Kılıfı', name: 'Koltuk Kılıfı & Minder', slug: 'koltuk-kilifi', icon: '💺' },
    { id: 'cat-krom', n11Id: 'cat-Krom Aksesuar', name: 'Krom & Dış Tuning', slug: 'krom-dis-tuning', icon: '✨' },
    { id: 'cat-led', n11Id: 'cat-LED Aydınlatma', name: 'LED & Ambiyans', slug: 'led-ambiyans', icon: '💡' },
    { id: 'cat-ses', n11Id: 'cat-Ses Sistemi', name: 'Ses Sistemleri & Kamera', slug: 'ses-kamera', icon: '🔊' },
    { id: 'cat-bakim', n11Id: 'cat-Bakim', name: 'Periyodik Bakım & Fren', slug: 'periyodik-bakim-fren', icon: '🔧' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon },
      create: c,
    });
  }

  // 1) 32 Araç Modeli (A4, A10)
  const vehicles = generateVehicles32();
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: v,
      create: v,
    });
  }

  // 2) 105 Oto Aksesuar Ürünü + Araç Uyumlulukları + Fiyat/Stok Geçmişi (A1, A4, A9, A10)
  const products = generateProducts105(vehicles);
  for (const p of products) {
    await prisma.product.upsert({
      where: { n11Id: p.n11Id },
      update: {
        title: p.title,
        price: p.price,
        priceKurus: p.priceKurus,
        listPrice: p.listPrice,
        listPriceKurus: p.listPriceKurus,
        stock: p.stock,
        maxPerOrder: p.maxPerOrder,
        oemCode: p.oemCode,
        isUniversal: p.isUniversal,
      },
      create: {
        id: p.id,
        n11Id: p.n11Id,
        sellerCode: p.sellerCode,
        oemCode: p.oemCode,
        slug: p.slug,
        title: p.title,
        description: p.description,
        brand: p.brand,
        price: p.price,
        priceKurus: p.priceKurus,
        listPrice: p.listPrice,
        listPriceKurus: p.listPriceKurus,
        vatRate: 20,
        stock: p.stock,
        maxPerOrder: p.maxPerOrder,
        status: 'ACTIVE',
        categoryId: p.categoryId,
        isUniversal: p.isUniversal,
        isFeatured: p.isFeatured,
        requiresMontage: p.requiresMontage,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        soldCount: p.soldCount,
        n11Url: p.n11Url,
        attributes: p.attributes,
        images: { create: [{ url: p.image, sortOrder: 0 }] },
      },
    });

    for (const vehicleId of p.fitmentVehicleIds.slice(0, 6)) {
      await prisma.productFitment.upsert({
        where: { productId_vehicleId: { productId: p.id, vehicleId } },
        update: {},
        create: { productId: p.id, vehicleId, verifiedByVin: true },
      });
    }
  }

  // 3) Kuponlar & Kampanyalar
  const coupons = [
    { code: 'HOSGELDIN', type: 'PERCENT' as const, value: 10, minTotal: 50000, minCartTotal: 500, maxUses: 1000, active: true, isActive: true },
    { code: 'GARAJ150', type: 'FIXED' as const, value: 15000, minTotal: 150000, minCartTotal: 1500, maxUses: 500, active: true, isActive: true },
    { code: 'SURESIDOLMUS', type: 'PERCENT' as const, value: 20, minTotal: 0, minCartTotal: 0, endsAt: new Date('2024-01-01T00:00:00Z'), active: true, isActive: true },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({ where: { code: c.code }, update: c, create: c });
  }

  // 4) 55 Gerçekçi Sipariş (A3, A10)
  const orders = generateOrders55(products, vehicles);
  for (const o of orders) {
    await prisma.order.upsert({
      where: { orderNumber: o.orderNumber },
      update: {},
      create: {
        id: o.id,
        orderNumber: o.orderNumber,
        source: o.source,
        status: o.status,
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotalKurus / 100,
        discount: o.discountKurus / 100,
        shippingFee: o.shippingKurus / 100,
        total: o.grandTotalKurus / 100,
        subtotalKurus: o.subtotalKurus,
        discountKurus: o.discountKurus,
        shippingKurus: o.shippingKurus,
        vatTotalKurus: o.vatTotalKurus,
        grandTotalKurus: o.grandTotalKurus,
        shippingAddress: o.shippingAddressSnapshot,
        billingAddress: o.billingAddressSnapshot,
        distanceSalesContract: o.distanceSalesContract,
        carrier: o.carrier,
        trackingCode: o.trackingCode,
        createdAt: new Date(o.createdAt),
        items: {
          create: o.items.map((it: any) => ({
            productId: it.productId,
            title: it.title,
            skuSnapshot: it.skuSnapshot,
            oemCodeSnapshot: it.oemCodeSnapshot,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            unitPriceKurus: it.unitPriceKurus,
            lineTotalKurus: it.lineTotalKurus,
          })),
        },
      },
    });
  }

  console.log(`Seed tamamlandı -> ${vehicles.length} araç, ${products.length} ürün, ${orders.length} sipariş.`);
}

main().finally(() => prisma.$disconnect());
