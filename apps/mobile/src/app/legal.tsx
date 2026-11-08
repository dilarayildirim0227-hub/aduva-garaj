'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { router } from 'expo-router';

const legalDocuments = [
  { id: 'privacy', title: 'legal.privacyPolicy', icon: 'document-text-outline' },
  { id: 'terms', title: 'legal.termsOfService', icon: 'shield-outline' },
  { id: 'kvkk', title: 'legal.kvkk', icon: 'lock-closed-outline' },
  { id: 'cookies', title: 'legal.cookies', icon: 'cookie-outline' },
  { id: 'returns', title: 'legal.returns', icon: 'refresh-outline' },
  { id: 'warranty', title: 'legal.warranty', icon: 'shield-checkmark-outline' },
];

const documentContent: Record<string, string> = {
  privacy: `
    <h2>Gizlilik Politikası</h2>
    <p>Son güncelleme: 2026-01-15</p>
    <p>ADUVA GARAJ olarak, kullanıcılarımızın gizliliğini korumakta en üst düzey özeni gösteririz. Bu Gizlilik Politikası, web sitemizi ve mobil uygulamamızı kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.</p>

    <h3>1. Toplanan Veriler</h3>
    <ul>
      <li>Kimlik bilgileri (ad, soyad, e-posta, telefon)</li>
      <li>Adres bilgileri (teslimat ve fatura adresleri)</li>
      <li>TC Kimlik No (faturalandırma için, KVKK kapsamında şifrelenerek)</li>
      <li>Sipariş geçmişi ve tercihler</li>
      <li>Araç bilgileri (marka, model, yıl, motor)</li>
      <li>Cihaz ve kullanım verileri (IP, tarayıcı, push token)</li>
    </ul>

    <h3>2. Veri Kullanım Amacı</h3>
    <ul>
      <li>Sipariş işleme ve teslimat</li>
      <li>Müşteri hizmetleri ve destek</li>
      <li>Yasal yükümlülükler (faturalandırma, KVKK)</li>
      <li>Pazarlama (onayınızla)</li>
      <li>Güvenlik ve dolandırıcılık önleme</li>
    </ul>

    <h3>3. Veri Paylaşımı</h3>
    <p>Verileriniz; kargo firmaları, ödeme sağlayıcılar, yasal kurumlar (gerektiğinde) ile paylaşılabilir. Hiçbir durumda verileriniz üçüncü şahıslara satılmaz.</p>

    <h3>4. KVKK Kapsamında Haklarınız</h3>
    <p>KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, talep etme, düzeltme, silme, itiraz etme ve tahliye haklarınız vardır. Bu haklarınızı <strong>kvkk@aduvagaraj.com</strong> adresine yazdırarak kullanabilirsiniz.</p>

    <h3>5. Veri Saklama Süresi</h3>
    <p>Verileriniz, yasal süreler (faturalar için 10 yıl, sözleşme verileri için 10 yıl) ve işlem amacı devam süresince saklanır.</p>

    <h3>6. Güvenlik</h3>
    <p>TCKN ve hassas veriler AES-256-GCM ile şifrelenir. Tüm iletişim TLS 1.3 ile korunur.</p>
  `,
  terms: `
    <h2>Kullanım Şartları</h2>
    <p>Son güncelleme: 2026-01-15</p>
    <p>ADUVA GARAJ platformunu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.</p>

    <h3>1. Hizmet Tanımı</h3>
    <p>Platform, oto yedek parça satışı ve randevu sistemi sunar.</p>

    <h3>2. Kullanıcı Yükümlülükleri</h3>
    <ul>
      <li>Doğru ve güncel bilgi verme</li>
      <li>Hesap güvenliğini sağlama</li>
      <li>Yasalara uygun kullanım</li>
      <li>Telif haklarına saygı</li>
    </ul>

    <h3>3. Sipariş ve Ödeme</h3>
    <p>Siparişler onaylandıktan sonra işleme alınır. Fiyatlar kuruş cinsinden tam sayı olarak saklanır. Kargo ücreti 1500 TL üzeri siparişlerde ücretsizdir.</p>

    <h3>4. İade ve Değişim</h3>
    <p>14 gün içinde iade hakkınız vardır. Montaj yapılmış ürünlerde iade kabul edilmez.</p>

    <h3>5. Sorumluluk Sınırlaması</h3>
    <p>Platform, araç uyumluluğu konusunda danışma hizmeti verir; nihai sorumluluk kullanıcıya aittir.</p>

    <h3>6. Fikri Mülkiyet</h3>
    <p>Tüm içerik, marka ve yazılım ADUVA GARAJ'a aittir.</p>
  `,
  kvkk: `
    <h2>KVKK Aydınlatma Metni</h2>
    <p>6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca;</p>

    <h3>Veri Sorumlusu</h3>
    <p><strong>ADUVA GARAJ Otomotiv Tic. Ltd. Şti.</strong><br>
    Adres: [Şirket Adresi]<br>
    E-posta: kvkk@aduvagaraj.com</p>

    <h3>İşlenen Veri Kategorileri</h3>
    <ul>
      <li>Kimlik verileri</li>
      <li>İletişim verileri</li>
      <li>Müşteri işlem verileri</li>
      <li>Özel nitelikli veri: T.C. Kimlik No (AES-256-GCM şifreli)</li>
    </ul>

    <h3>İşleme Amaçları</h3>
    <ul>
      <li>Sözleşme ifası (Madde 5/2-c)</li>
      <li>Yasal yükümlülük (Madde 5/2-ç)</li>
      <li>Meşru menfaat (Madde 5/2-f)</li>
      <li>Açık riza (Pazarlama için - Madde 5/1)</li>
    </ul>

    <h3>Veri Aktarımı</h3>
    <p>Yurt içinde: Kargo, ödeme, muhasebe.<br>
    Yurt dışına: Aktarım yoktur.</p>

    <h3>Haklarınız (Madde 11)</h3>
    <ol>
      <li>İşlenip işlenmediğini öğrenme</li>
      <li>Bilgi talep etme</li>
      <li>Amaç dışı kullanım varsa bildirme</li>
      <li>Düzeltme/silme talep etme</li>
      <li>Tahliye talep etme</li>
      <li>Otomatik kararlara itiraz</li>
      <li>Zarar giderme</li>
    </ol>

    <h3>Başvuru Yöntemi</h3>
    <p>KVKK Başvuru Formu: <a href="https://aduvagaraj.com/kvkk-basvuru">aduvagaraj.com/kvkk-basvuru</a><br>
    E-posta: kvkk@aduvagaraj.com<br>
    Cevap süresi: 30 gün</p>
  `,
  cookies: `
    <h2>Çerez Politikası</h2>
    <p>Son güncelleme: 2026-01-15</p>

    <h3>Kullanılan Çerezler</h3>
    <table>
      <tr><th>Ad</th><th>Tür</th><th>Süre</th><th>Amaç</th></tr>
      <tr><td>session_id</td><td>Oturum</td><td>Oturum</td><td>Giriş durumu</td></tr>
      <tr><td>csrf_token</td><td>Güvenlik</td><td>Oturum</td><td>CSRF koruması</td></tr>
      <tr><td>cart_token</td><td>İşlevsel</td><td>30 gün</td><td>Misafir sepeti</td></tr>
      <tr><td>consent</td><td>Tercih</td><td>1 yıl</td><td>Çerez onayı</td></tr>
      <tr><td>_ga</td><td>Analitik</td><td>2 yıl</td><td>Google Analytics</td></tr>
    </table>

    <h3>Yönetim</h3>
    <p>Tarayıcı ayarlarından çerezleri yönetebilir/engelleyebilirsiniz. Temel çerezler engellendiğinde site çalışmayabilir.</p>
  `,
  returns: `
    <h2>İade ve Değişim Koşulları</h2>
    <p>Son güncelleme: 2026-01-15</p>

    <h3>İade Süresi</h3>
    <p>Teslim tarihten itibaren 14 gün içinde iade hakkınız vardır.</p>

    <h3>İade Koşulları</h3>
    <ul>
      <li>Ürün orijinal pakette, kullanılmamış, etiketli olmalı</li>
      <li>Montaj yapılmış, yağ/kimyasal temaslı ürünlerde iade yok</li>
      <li>Özel üretim ürünlerde iade yok</li>
      <li>Araç uyumsuzluğu kullanıcı hatasıysa iade kabul edilmez</li>
    </ul>

    <h3>Süreç</h3>
    <ol>
      <li>Hesabım > Siparişlerim > İade Talebi</li>
      <li>Onay sonrası kargo kodu gönderilir</li>
      <li>Ürün teslim alındıktan 5 iş gününde iade işlenir</li>
      <li>Ödeme yöntemine göre 5-10 iş gününde iade</li>
    </ol>
  `,
  warranty: `
    <h2>Garanti Koşulları</h2>
    <p>Son güncelleme: 2026-01-15</p>

    <h3>Kapsam</h3>
    <p>Tüm ürünlerimiz 2 yıl yasal garantili satılır (Tüketicinin Korunması Hakkında Kanun Madde 9).</p>

    <h3>Garanti Dışı Durumlar</h3>
    <ul>
      <li>Yanlış montaj/uygulama</li>
      <li>Kaza, doğal afet, su baskını</li>
      <li>Yetkisi servis dışında müdahale</li>
      <li>Normal aşınma (fren balatası, filtre vb.)</li>
    </ul>

    <h3>Başvuru</h3>
    <p>Garanti formu: <a href="https://aduvagaraj.com/garanti">aduvagaraj.com/garanti</a></p>
  `,
};

export default function LegalScreen() {
  const { t } = useTranslation();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  if (selectedDoc) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.docHeader}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.docTitle}>{t(legalDocuments.find(d => d.id === selectedDoc)?.title || '')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.docContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.docText}>{documentContent[selectedDoc]}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('legal.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <FlatList
          data={legalDocuments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.docCard}
              onPress={() => setSelectedDoc(item.id)}
              activeOpacity={0.9}
            >
              <View style={styles.docIcon}>
                <Ionicons name={item.icon} size={24} color="#E10600" />
              </View>
              <Text style={styles.docCardTitle}>{t(item.title)}</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContentInner}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  listContent: { paddingBottom: 24 },
  listContentInner: { paddingHorizontal: 16, paddingTop: 16 },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155' },
  docIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#7f1d1d', justifyContent: 'center', alignItems: 'center' },
  docCardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  separator: { height: 10 },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  docTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  docContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40 },
  docText: { fontSize: 14, color: '#e2e8f0', lineHeight: 22 },
});