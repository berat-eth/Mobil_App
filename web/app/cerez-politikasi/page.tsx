'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function CerezPolitikasi() {
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
                Çerez Politikası
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Son Güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Çerezler Hakkında</h2>
                <p>
                  Bu web sitesi, kullanıcı deneyimini iyileştirmek, site performansını analiz etmek ve kişiselleştirilmiş içerik sunmak için çerezler kullanmaktadır.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Çerez Nedir?</h2>
                <p>
                  Çerezler, web sitelerini ziyaret ettiğinizde tarayıcınızda saklanan küçük metin dosyalarıdır. Bu dosyalar, web sitesinin çalışması için gerekli bilgileri saklar ve kullanıcı deneyimini iyileştirir.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Kullandığımız Çerez Türleri</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">1. Zorunlu Çerezler</h3>
                    <p>Bu çerezler web sitesinin temel işlevlerini yerine getirmesi için gereklidir:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                      <li>Oturum yönetimi</li>
                      <li>Güvenlik</li>
                      <li>Kullanıcı kimlik doğrulama</li>
                      <li>Sepet yönetimi</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2. Performans Çerezleri</h3>
                    <p>Web sitesinin performansını analiz etmek için kullanılır:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                      <li>Sayfa görüntüleme sayıları</li>
                      <li>Kullanıcı davranış analizi</li>
                      <li>Hata takibi</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3. İşlevsellik Çerezleri</h3>
                    <p>Kullanıcı tercihlerini hatırlamak için kullanılır:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                      <li>Dil tercihi</li>
                      <li>Tema tercihi (açık/koyu mod)</li>
                      <li>Kullanıcı ayarları</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">4. Pazarlama Çerezleri</h3>
                    <p>Kişiselleştirilmiş reklamlar ve pazarlama içeriği sunmak için kullanılır (izin gerektirir):</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                      <li>İlgi alanı bazlı reklamlar</li>
                      <li>Kampanya takibi</li>
                      <li>Dönüşüm ölçümü</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Çerez Yönetimi</h2>
                <p>
                  Tarayıcınızın ayarlarından çerezleri yönetebilirsiniz. Ancak, zorunlu çerezleri devre dışı bırakmanız durumunda web sitesinin bazı özellikleri çalışmayabilir.
                </p>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Not:</strong> Çerezleri tarayıcı ayarlarınızdan silmek veya engellemek mümkündür, ancak bu durumda site deneyiminiz olumsuz etkilenebilir.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Üçüncü Taraf Çerezler</h2>
                <p>
                  Web sitemiz, analitik ve pazarlama hizmetleri sunan üçüncü taraf servisler kullanabilir. Bu servisler kendi çerez politikalarına sahiptir.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">İletişim</h2>
                <p>Çerezler hakkında sorularınız için:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>E-posta: privacy@huglu.com</li>
                  <li>Telefon: +90 (212) 555 0123</li>
                  <li>Adres: HUGLU Outdoor, İstanbul, Türkiye</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}


























