/**
 * Marka sabitleri — TEK KAYNAK.
 * Aduva Garaj 3D Metalik Krom & Koyu Antrasit / Şampanya Altın Işıltılı Tema
 */
export const BRAND = {
  name: 'Aduva Garaj',
  slogan: 'Aracına özel aksesuar & multimedya',
  logoUrl: '/logo.png',
  colors: {
    primary: '#D4AF37', // Sıcak Şampanya / Altın Backlight vurgu
    primaryDark: '#AA8620',
    chrome: '#E2E8F0', // Metalik Gümüş / Krom
    chromeMuted: '#94A3B8',
    background: '#0D0E11', // Koyu Asfalt / Antrasit
    surface: '#15171C', // Füme Metalik Yüzey
    surfaceAlt: '#1E2128',
    border: '#2B303B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  contact: {
    phone: '+90 850 000 00 00',
    whatsapp: '905000000000',
    address: 'İstanbul, Türkiye',
    workingHours: 'Pzt–Cmt 09:00–19:00',
    n11StoreUrl: 'https://www.n11.com/magaza/aduvagaraj',
  },
  shipping: {
    carrier: 'Yurtiçi Kargo',
    freeShippingThreshold: 750,
    flatRate: 79.9,
    estimatedDays: 'Aynı Gün Kargo (1-3 iş günü teslimat)',
  },
} as const;
