import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function Hakkimizda() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16">
        <div className="max-w-[1400px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">info</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Hakkımızda</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Zanaat ve Teknolojinin Buluştuğu Yer
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Yılların deneyimiyle, iş kıyafetlerini kalite ve estetikle buluşturarak markanıza değer katıyoruz
            </p>
          </div>

          {/* Hero Image */}
          <section className="rounded-3xl overflow-hidden mb-16 shadow-2xl">
            <div className="relative h-[400px] md:h-[500px]">
              <img
                src="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1600"
                alt="Atölye"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            </div>
          </section>

          {/* Hikayemiz & Değerler */}
          <section className="grid lg:grid-cols-2 gap-10 mb-20">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <span className="material-symbols-outlined text-white text-2xl">history_edu</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Hikayemiz</h2>
              </div>
              <div className="space-y-6">
                {[
                  { year: '1990', title: 'Kuruluş', desc: 'Küçük bir atölyede, büyük bir vizyonla yola çıktık.', gradient: 'from-blue-500 to-cyan-500' },
                  { year: '2005', title: 'İlk Büyük Proje', desc: 'Ulusal bir markayla çalışarak kapasitemizi kanıtladık.', gradient: 'from-purple-500 to-pink-500' },
                  { year: '2015', title: 'Teknolojik Yatırım', desc: 'Modern makinelerle üretim parkurumuzu yeniledik.', gradient: 'from-orange-500 to-red-500' },
                  { year: '2023', title: 'Yeni Atölye', desc: 'Daha büyük ve modern tesisimize taşındık.', gradient: 'from-green-500 to-emerald-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-white font-black text-lg">{item.year}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <span className="material-symbols-outlined text-white text-2xl">workspace_premium</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Değerlerimiz</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Bizi biz yapan, işimize olan tutkumuz ve sarsılmaz değerlerimizdir.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: 'star', title: 'Kalite', desc: 'En kaliteli malzemeler, kusursuz işçilik.', gradient: 'from-yellow-500 to-orange-500' },
                  { icon: 'eco', title: 'Sürdürülebilirlik', desc: 'Çevreye duyarlı üretim süreçleri.', gradient: 'from-green-500 to-emerald-500' },
                  { icon: 'favorite', title: 'Müşteri Memnuniyeti', desc: 'İhtiyaca özel çözümler üretiyoruz.', gradient: 'from-pink-500 to-red-500' },
                  { icon: 'palette', title: 'Özelleştirme', desc: 'Markaya uygun özel tasarımlar.', gradient: 'from-blue-500 to-purple-500' },
                ].map((card, i) => (
                  <div key={i} className="group rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-5 hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <span className="material-symbols-outlined text-white text-xl">{card.icon}</span>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{card.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Üretim Sürecimiz */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Üretim Sürecimiz
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Her aşamada kalite ve titizlikle çalışıyoruz
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { title: 'Tasarım', img: 'https://images.unsplash.com/photo-1558769132-cb1aea1f1c85?w=800&q=80', icon: 'draw', gradient: 'from-blue-500 to-cyan-500' },
                { title: 'Kesim', img: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', icon: 'content_cut', gradient: 'from-purple-500 to-pink-500' },
                { title: 'Dikim', img: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80', icon: 'checkroom', gradient: 'from-orange-500 to-red-500' },
                { title: 'Kalite Kontrol', img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', icon: 'verified', gradient: 'from-green-500 to-emerald-500' },
              ].map((s, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="relative h-64">
                    <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-6">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                        <span className="material-symbols-outlined text-white text-2xl">{s.icon}</span>
                      </div>
                      <span className="text-white font-black text-xl">{s.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center shadow-2xl">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-4xl font-black text-white mb-4">
                Projenizi Birlikte Hayata Geçirelim
              </h3>
              <p className="text-white/90 text-lg mb-8">
                Size özel kurumsal giyim çözümleri için bizimle iletişime geçin
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/teklif-al" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-600 font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined">request_quote</span>
                  <span>Teklif Al</span>
                </a>
                <a 
                  href="/iletisim" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-xl text-white font-bold rounded-xl border-2 border-white/30 hover:bg-white/20 hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined">mail</span>
                  <span>İletişime Geç</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
