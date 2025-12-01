'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function KullanimKosullari() {
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
                Kullanım Koşulları
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Son Güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. GENEL HÜKÜMLER</h2>
                <p>
                  Bu sözleşme, HUGLU Outdoor uygulamasının kullanımı ile ilgili hak ve yükümlülükleri düzenler. Uygulamayı kullanarak bu sözleşmeyi kabul etmiş sayılırsınız.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. HİZMET TANIMI</h2>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2.1 Uygulama Kapsamı:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Outdoor ürün satışı</li>
                    <li>Kişiselleştirilmiş ürün üretimi</li>
                    <li>Kampanya ve indirim sunumu</li>
                    <li>Müşteri hizmetleri</li>
                    <li>Sipariş takibi</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. KULLANICI YÜKÜMLÜLÜKLERİ</h2>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3.1 Kayıt Bilgileri:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Doğru ve güncel bilgi verme</li>
                    <li>18 yaş üstü olma</li>
                    <li>Geçerli iletişim bilgileri</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3.2 Yasak Kullanımlar:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Sahte hesap oluşturma</li>
                    <li>Dolandırıcılık</li>
                    <li>Spam gönderme</li>
                    <li>Telif hakkı ihlali</li>
                    <li>Zararlı içerik paylaşma</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. SİPARİŞ VE ÖDEME</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5.1 Sipariş Süreci:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Ürün seçimi</li>
                      <li>Sepete ekleme</li>
                      <li>Ödeme bilgileri</li>
                      <li>Onay ve teslimat</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5.2 Ödeme Yöntemleri:</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Kredi kartı</li>
                      <li>Banka kartı</li>
                      <li>Sanitik POS</li>
                      <li>Kapıda ödeme</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. TESLİMAT VE İADE</h2>
                <p>14 gün içinde iade hakkınız bulunmaktadır. Ürünün orijinal durumunda ve ambalajında olması gerekmektedir.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. FİKRİ MÜLKİYET</h2>
                <p>Uygulama içeriği, tasarımlar, markalar ve yazılım HUGLU Outdoor'a aittir. İzinsiz kullanım yasaktır.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. UYUŞMAZLIK ÇÖZÜMÜ</h2>
                <p>Öncelikle müzakere ile çözüm aranacak, gerekirse İstanbul Mahkemeleri yetkilidir. Bu sözleşme Türk Hukuku'na tabidir.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">13. İLETİŞİM</h2>
                <p>Sorularınız için:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>E-posta: info@huglu.com</li>
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


























