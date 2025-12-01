'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function GizlilikPolitikasi() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 md:p-12">
            {/* Header */}
            <div className="mb-8">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Ana Sayfaya Dön</span>
              </Link>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                Gizlilik Politikası
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Son Güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. GENEL BİLGİLER</h2>
                <p>
                  Bu Gizlilik Sözleşmesi, HUGLU Outdoor uygulaması tarafından toplanan kişisel verilerin işlenmesi, saklanması ve korunması ile ilgili bilgileri içermektedir. Uygulamayı kullanarak bu sözleşmeyi kabul etmiş sayılırsınız.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. TOPLANAN KİŞİSEL VERİLER</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2.1 Kimlik Bilgileri:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Ad ve soyad</li>
                      <li>E-posta adresi</li>
                      <li>Telefon numarası</li>
                      <li>Doğum tarihi (18 yaş kontrolü için)</li>
                      <li>Adres bilgileri</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2.2 Kullanım Verileri:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Uygulama içi aktiviteler (sayfa görüntüleme, ürün inceleme)</li>
                      <li>Alışveriş geçmişi ve sipariş bilgileri</li>
                      <li>Favori ürünler ve tercihler</li>
                      <li>Arama geçmişi</li>
                      <li>Cihaz bilgileri (IP adresi, tarayıcı türü)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2.3 Pazarlama İzinleri:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>E-posta pazarlama iletişimleri</li>
                      <li>SMS pazarlama iletişimleri</li>
                      <li>Telefon pazarlama iletişimleri</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. VERİ TOPLAMA AMAÇLARI</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3.1 Hizmet Sunumu:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Hesap oluşturma ve yönetimi</li>
                      <li>Sipariş işleme ve teslimat</li>
                      <li>Müşteri hizmetleri sunumu</li>
                      <li>Güvenlik ve kimlik doğrulama</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3.2 Kişiselleştirme:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Ürün önerileri sunma</li>
                      <li>Kişiselleştirilmiş kampanyalar</li>
                      <li>Kullanıcı deneyimini iyileştirme</li>
                      <li>İçerik özelleştirme</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. VERİ SAKLAMA SÜRELERİ</h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Hesap Verileri:</strong> Hesap aktif olduğu sürece</li>
                  <li><strong>Sipariş Verileri:</strong> 10 yıl (muhasebe yükümlülükleri)</li>
                  <li><strong>Aktivite Logları:</strong> 2 yıl</li>
                  <li><strong>Pazarlama İzinleri:</strong> İptal edilene kadar</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. VERİ PAYLAŞIMI</h2>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5.1 Üçüncü Taraflarla Paylaşım:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Kargo şirketleri (teslimat için)</li>
                    <li>Ödeme işlemcileri (güvenli ödeme için)</li>
                    <li>Analitik servisleri (anonim veriler)</li>
                    <li>Yasal zorunluluklar (mahkeme kararı)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. VERİ GÜVENLİĞİ</h2>
                <p>SSL/TLS şifreleme, güvenli veri saklama ve erişim kontrolü gibi teknik önlemlerle verileriniz korunmaktadır.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. KULLANICI HAKLARI</h2>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Bilgi alma hakkı</li>
                  <li>Düzeltme hakkı</li>
                  <li>Silme hakkı</li>
                  <li>Taşınabilirlik hakkı</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. ÇEREZLER VE TAKİP</h2>
                <p>Uygulamamız oturum yönetimi, güvenlik ve temel işlevsellik için zorunlu çerezler kullanmaktadır. Analitik ve pazarlama çerezleri için izniniz gereklidir.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">12. İLETİŞİM</h2>
                <p>Gizlilik ile ilgili sorularınız için:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>E-posta: privacy@huglu.com</li>
                  <li>Telefon: +90 (212) 555 0123</li>
                  <li>Adres: HUGLU Outdoor, İstanbul, Türkiye</li>
                </ul>
                <p className="mt-4">Bu sözleşme Türkiye Cumhuriyeti mevzuatına tabidir.</p>
              </section>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}


























