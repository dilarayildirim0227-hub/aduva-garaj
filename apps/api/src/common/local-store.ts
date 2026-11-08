import * as bcrypt from 'bcryptjs';

// Import types from shared package
import { LocalStoreData, LocalVehicle, LocalCategory, LocalProduct, LocalBanner, LocalCoupon, LocalOrder, LocalAppointment, LocalStockMovement, LocalSettings, ProductStatus, CouponType, OrderSource, OrderStatus, PaymentMethod, AppointmentStatus, Role } from '@aduva/shared';

const now = new Date().toISOString();

// Vehicles data
const vehicles: LocalVehicle[] = [
  { id: 'veh-golf7', brand: 'Volkswagen', model: 'Golf 7', yearFrom: 2012, yearTo: 2020, body: 'hatchback', engine: '1.6 TDI', createdAt: now },
  { id: 'veh-passatb8', brand: 'Volkswagen', model: 'Passat B8', yearFrom: 2015, yearTo: 2023, body: 'Sedan', engine: '1.5 TSI', createdAt: now },
  { id: 'veh-egea', brand: 'Fiat', model: 'Egea', yearFrom: 2015, yearTo: null, body: 'Sedan', createdAt: now },
];

// Categories data
const categories: LocalCategory[] = [
  { id: 'cat-1', name: 'Fren Sistemi', slug: 'fren-sistemi', sortOrder: 1 },
  { id: 'cat-2', name: 'Süspansiyon', slug: 'susansiyon', sortOrder: 2 },
  { id: 'cat-3', name: 'Motor Parçaları', slug: 'motor-parcalari', sortOrder: 3 },
  { id: 'cat-4', name: 'Elektrik', slug: 'elektrik', sortOrder: 4 },
  { id: 'cat-5', name: 'Karoseri', slug: 'karoseri', sortOrder: 5 },
  { id: 'cat-6', name: 'Yağ ve Filtre', slug: 'yag-ve-filtre', sortOrder: 6 },
];

// Products data
const products: LocalProduct[] = [
  {
    id: 'prd-1',
    sellerCode: 'FRN-001',
    oemCode: '',
    title: 'Fren Balatası Ön',
    slug: 'fren-balatası-on',
    description: 'Özellikle şehir içi kullanım için dayanıklı fren balatası.',
    brand: 'Brembo',
    price: 450,
    priceKurus: 45000,
    listPrice: 500,
    listPriceKurus: 50000,
    lowestPrice30dKurus: 45000,
    vatRate: 20,
    currency: 'TRY',
    stock: 100,
    reservedStock: 0,
    maxPerOrder: 4,
    status: ProductStatus.ACTIVE,
    categoryId: 'cat-1',
    isUniversal: false,
    isFeatured: true,
    isHidden: false,
    requiresMontage: false,
    attributes: {},
    ratingAvg: 4.5,
    ratingCount: 10,
    soldCount: 50,
    version: 1,
    createdAt: now,
    updatedAt: now,
    image: undefined,
    images: [],
    fitmentVehicleIds: ['veh-golf7', 'veh-passatb8']
  },
  {
    id: 'prd-2',
    sellerCode: 'FRN-002',
    oemCode: '',
    title: 'Fren Diski Ön',
    slug: 'fren-diski-on',
    description: 'Yüksek performanslı fren diski.',
    brand: 'Brembo',
    price: 1200,
    priceKurus: 120000,
    listPrice: 1350,
    listPriceKurus: 135000,
    lowestPrice30dKurus: 120000,
    vatRate: 20,
    currency: 'TRY',
    stock: 50,
    reservedStock: 0,
    maxPerOrder: 2,
    status: ProductStatus.ACTIVE,
    categoryId: 'cat-1',
    isUniversal: false,
    isFeatured: true,
    isHidden: false,
    requiresMontage: false,
    attributes: {},
    ratingAvg: 4.7,
    ratingCount: 5,
    soldCount: 30,
    version: 1,
    createdAt: now,
    updatedAt: now,
    image: undefined,
    images: [],
    fitmentVehicleIds: ['veh-golf7', 'veh-passatb8', 'veh-egea']
  },
  {
    id: 'prd-3',
    sellerCode: 'SUS-001',
    oemCode: '',
    title: 'Amortisör Takımı',
    slug: 'amortisor-takimi',
    description: 'Ön ve arka amortisör takımı.',
    brand: 'Monroe',
    price: 2500,
    priceKurus: 250000,
    listPrice: 2800,
    listPriceKurus: 280000,
    lowestPrice30dKurus: 250000,
    vatRate: 20,
    currency: 'TRY',
    stock: 30,
    reservedStock: 0,
    maxPerOrder: 1,
    status: ProductStatus.ACTIVE,
    categoryId: 'cat-2',
    isUniversal: false,
    isFeatured: false,
    isHidden: false,
    requiresMontage: true,
    attributes: {},
    ratingAvg: 4.3,
    ratingCount: 8,
    soldCount: 20,
    version: 1,
    createdAt: now,
    updatedAt: now,
    image: undefined,
    images: [],
    fitmentVehicleIds: ['veh-golf7']
  },
  {
    id: 'prd-4',
    sellerCode: 'FLT-001',
    oemCode: '',
    title: 'Yağ Filtresi',
    slug: 'yag-filtresi',
    description: 'Motor yağı filtresi.',
    brand: 'Mann',
    price: 150,
    priceKurus: 15000,
    listPrice: 180,
    listPriceKurus: 18000,
    lowestPrice30dKurus: 15000,
    vatRate: 20,
    currency: 'TRY',
    stock: 200,
    reservedStock: 0,
    maxPerOrder: 10,
    status: ProductStatus.ACTIVE,
    categoryId: 'cat-6',
    isUniversal: true,
    isFeatured: false,
    isHidden: false,
    requiresMontage: false,
    attributes: {},
    ratingAvg: 4.6,
    ratingCount: 25,
    soldCount: 100,
    version: 1,
    createdAt: now,
    updatedAt: now,
    image: undefined,
    images: [],
    fitmentVehicleIds: ['veh-golf7', 'veh-passatb8', 'veh-egea']
  },
  {
    id: 'prd-5',
    sellerCode: 'ELC-001',
    oemCode: '',
    title: 'Buji Seti',
    slug: 'buji-seti',
    description: 'İridyum buji seti.',
    brand: 'NGK',
    price: 800,
    priceKurus: 80000,
    listPrice: 950,
    listPriceKurus: 95000,
    lowestPrice30dKurus: 80000,
    vatRate: 20,
    currency: 'TRY',
    stock: 75,
    reservedStock: 0,
    maxPerOrder: 4,
    status: ProductStatus.ACTIVE,
    categoryId: 'cat-4',
    isUniversal: false,
    isFeatured: false,
    isHidden: false,
    requiresMontage: false,
    attributes: {},
    ratingAvg: 4.4,
    ratingCount: 12,
    soldCount: 40,
    version: 1,
    createdAt: now,
    updatedAt: now,
    image: undefined,
    images: [],
    fitmentVehicleIds: ['veh-golf7', 'veh-egea']
  },
  {
    id: 'prd-6',
    sellerCode: 'KRS-001',
    oemCode: '',
    title: 'Ön Tampon',
    slug: 'on-tampon',
    description: 'Orijinal uyumlu ön tampon.',
    brand: 'OEM',
    price: 3500,
    priceKurus: 350000,
    listPrice: 4000,
    listPriceKurus: 400000,
    lowestPrice30dKurus: 350000,
    vatRate: 20,
    currency: 'TRY',
    stock: 10,
    reservedStock: 0,
    maxPerOrder: 1,
    status: ProductStatus.ACTIVE,
    categoryId: 'cat-5',
    isUniversal: false,
    isFeatured: false,
    isHidden: false,
    requiresMontage: true,
    attributes: {},
    ratingAvg: 4.2,
    ratingCount: 3,
    soldCount: 5,
    version: 1,
    createdAt: now,
    updatedAt: now,
    image: undefined,
    images: [],
    fitmentVehicleIds: ['veh-passatb8']
  }
];

// Banners data
const banners: LocalBanner[] = [
  { id: 'bnr-1', title: 'Yaz Bakım Kampanyası', subtitle: '%20 indirimli yağ-filtre değişimi', badge: 'Kampanya', categoryId: 'cat-6', imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80', linkType: 'CATEGORY', linkTarget: 'cat-6', sortOrder: 1, isActive: true },
  { id: 'bnr-2', title: 'Fren Kontrolü Bedava', subtitle: 'Güvenliğiniz için ücretsiz fren muayenesi', badge: 'Servis', categoryId: 'cat-1', imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', linkType: 'APPOINTMENT', linkTarget: 'brake-check', sortOrder: 2, isActive: true },
  { id: 'bnr-3', title: 'Yeni Ürünler', subtitle: 'Bu ay eklenen 50+ yeni parça', badge: 'Yeni', categoryId: undefined, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80', linkType: 'CATEGORY', linkTarget: undefined, sortOrder: 3, isActive: true },
];

// Coupons data
const coupons: LocalCoupon[] = [
  { id: 'cpn-1', code: 'WELCOME10', type: CouponType.PERCENT, value: 10, minTotal: 20000, minCartTotal: 200, maxUses: 1000, perUserLimit: 1, categoryId: undefined, usedCount: 12, startsAt: undefined, endsAt: undefined, active: true, isActive: true, description: 'İlk siparişinizde %10 indirim', createdAt: now },
  { id: 'cpn-2', code: 'FREESHIP', type: CouponType.FREE_SHIPPING, value: 0, minTotal: 75000, minCartTotal: 750, maxUses: 500, perUserLimit: 2, categoryId: undefined, usedCount: 45, startsAt: undefined, endsAt: undefined, active: true, isActive: true, description: '750 TL üzeri ücretsiz kargo', createdAt: now },
  { id: 'cpn-3', code: 'BRAKE50', type: CouponType.FIXED, value: 5000, minTotal: 50000, minCartTotal: 500, maxUses: 200, perUserLimit: 1, categoryId: 'cat-1', usedCount: 8, startsAt: undefined, endsAt: undefined, active: true, isActive: true, description: 'Fren sistemine 50 TL indirim', createdAt: now },
];

// Orders data
const orders: LocalOrder[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-202611-0001',
    source: OrderSource.APP,
    customerName: 'Ahmet Yılmaz',
    phone: '+905551234567',
    city: 'İstanbul',
    status: OrderStatus.DELIVERED,
    paymentMethod: PaymentMethod.CARD,
    total: 45000,
    subtotalKurus: 45000,
    discountKurus: 0,
    shippingKurus: 7990,
    vatTotalKurus: 8832,
    grandTotalKurus: 52990,
    trackingCode: 'YK123456789TR',
    carrier: 'Yurtiçi Kargo',
    createdAt: '2026-11-01T10:30:00Z',
    items: [
      { title: 'Fren Balatası Ön', quantity: 1, unitPrice: 45000, skuSnapshot: 'FRN-001' },
    ],
    userId: 'usr-1'
  },
  {
    id: 'ord-2',
    orderNumber: 'ORD-202611-0002',
    source: OrderSource.WEB,
    customerName: 'Mehmet Demir',
    phone: '+905329876543',
    city: 'Ankara',
    status: OrderStatus.SHIPPED,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    total: 135000,
    subtotalKurus: 120000,
    discountKurus: 0,
    shippingKurus: 7990,
    vatTotalKurus: 21332,
    grandTotalKurus: 142990,
    trackingCode: 'ARAS987654321',
    carrier: 'Aras Kargo',
    createdAt: '2026-11-02T14:15:00Z',
    items: [
      { title: 'Fren Diski Ön', quantity: 1, unitPrice: 120000, skuSnapshot: 'FRN-002' },
    ],
    userId: 'usr-2'
  },
  {
    id: 'ord-3',
    orderNumber: 'ORD-202611-0003',
    source: OrderSource.APP,
    customerName: 'Ayşe Kaya',
    phone: '+905443322110',
    city: 'İzmir',
    status: OrderStatus.PREPARING,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    total: 250000,
    subtotalKurus: 250000,
    discountKurus: 0,
    shippingKurus: 7990,
    vatTotalKurus: 42998,
    grandTotalKurus: 297990,
    trackingCode: undefined,
    carrier: undefined,
    createdAt: '2026-11-03T09:00:00Z',
    items: [
      { title: 'Amortisör Takımı', quantity: 1, unitPrice: 250000, skuSnapshot: 'SUS-001' },
    ],
    userId: 'usr-3'
  }
];

// Appointments data
const appointments: LocalAppointment[] = [
  { id: 'apt-1', userId: 'usr-1', customerName: 'Ahmet Yılmaz', phone: '+905551234567', vehicleInfo: 'Volkswagen Golf 7 1.6 TDI', vehicleId: 'veh-golf7', productId: 'prd-1', orderId: 'ord-1', serviceType: 'FREN_BAKIM', scheduledAt: '2026-11-05T10:00:00Z', status: AppointmentStatus.CONFIRMED, bayNumber: 1, notes: 'Fren balatası ve disk kontrolü', createdAt: '2026-11-01T11:00:00Z' },
  { id: 'apt-2', userId: 'usr-2', customerName: 'Mehmet Demir', phone: '+905329876543', vehicleInfo: 'Fiat Egea 1.3 MJET', vehicleId: 'veh-egea', productId: 'prd-4', orderId: 'ord-2', serviceType: 'YAG_FILTRE_DEGISIM', scheduledAt: '2026-11-06T14:00:00Z', status: AppointmentStatus.REQUESTED, bayNumber: 2, notes: 'Yağ ve filtre değişimi', createdAt: '2026-11-02T15:00:00Z' },
];

// Stock movements data
const stockMovements: LocalStockMovement[] = [
  { id: 'stm-1', productId: 'prd-1', delta: -2, previousStock: 102, newStock: 100, reason: 'ORDER_RESERVED', referenceId: 'ord-1', createdAt: '2026-11-01T10:30:00Z' },
  { id: 'stm-2', productId: 'prd-2', delta: -1, previousStock: 51, newStock: 50, reason: 'ORDER_RESERVED', referenceId: 'ord-2', createdAt: '2026-11-02T14:15:00Z' },
  { id: 'stm-3', productId: 'prd-3', delta: -1, previousStock: 31, newStock: 30, reason: 'ORDER_RESERVED', referenceId: 'ord-3', createdAt: '2026-11-03T09:00:00Z' },
];

// Settings data
const settings: LocalSettings = {
  order_mode: 'DIRECT_CHECKOUT',
  free_shipping_threshold: 75000,
  shipping_flat_rate: 7990,
  cod_fee: 4990,
};

// Export the complete local store
export const localStore: LocalStoreData = {
  settings,
  vehicles,
  categories,
  products,
  banners,
  coupons,
  orders,
  appointments,
  stockMovements,
};

// Default user for development
export const defaultUser = {
  id: 'usr-dev-1',
  email: 'dev@aduvagaraj.com',
  phone: '+905551112233',
  firstName: 'Geliştirici',
  lastName: 'Kullanıcısı',
  role: Role.ADMIN,
  passwordHash: '$2a$10$DevHashForLocalTestingOnlyNotForProductionUse',
  createdAt: now,
  updatedAt: now,
};

// Hash a password for local development
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify a password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}