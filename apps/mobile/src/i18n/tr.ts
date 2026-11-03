/** Türkçe metinler — yeni dil eklemek için aynı anahtarlarla en.ts oluşturun */
export const tr = {
  common: {
    continue: 'Devam',
    skip: 'Atla',
    start: 'Hemen Başla',
    retry: 'Tekrar Dene',
    loading: 'Yükleniyor…',
    networkError: 'Bağlantı sorunu. İnternetinizi kontrol edin.',
    seeAll: 'Tümü',
  },
  onboarding: [
    { title: 'Aracına özel aksesuar', text: 'Garajına aracını ekle, sadece ona uyumlu ürünleri gör.' },
    { title: 'Multimedya & ses sistemleri', text: 'Android Auto, CarPlay ekranlar ve güçlü ses sistemleri tek uygulamada.' },
    { title: 'Hızlı kargo, kapıda ödeme', text: 'Güvenli ödeme, kapıda ödeme seçeneği ve hızlı teslimat.' },
  ],
  tabs: { home: 'Ana Sayfa', categories: 'Kategoriler', garage: 'Garajım', cart: 'Sepetim', profile: 'Hesabım' },
  home: {
    greeting: 'Hoş geldin',
    pickVehicle: 'Aracını seç, uyumlu ürünleri gör',
    newArrivals: 'Yeni Gelenler',
    empty: 'Henüz ürün yok. Senkronizasyon tamamlanınca ürünler burada görünecek.',
  },
  auth: {
    title: 'Giriş Yap / Üye Ol',
    phone: 'Cep telefonu',
    sendCode: 'Doğrulama Kodu Gönder',
    code: '6 haneli kod',
    verify: 'Doğrula',
    codeSent: 'Kod {{phone}} numarasına gönderildi',
    kvkk: 'KVKK Aydınlatma Metni’ni okudum, kişisel verilerimin işlenmesini kabul ediyorum.',
    logout: 'Çıkış Yap',
  },
  soon: 'Bu bölüm bir sonraki aşamada aktif olacak.',
  stock: { out: 'Tükendi', low: 'Son {{count}} ürün' },
};
export type Dict = typeof tr;
