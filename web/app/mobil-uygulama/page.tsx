'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'

const Header = dynamic(() => import('@/components/Header'), { ssr: true })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: true })

export default function MobilUygulamaPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const handleStoreClick = (storeName: string) => {
    alert(`${storeName} uygulaması çok yakında yayınlanacak! Şimdilik APK dosyasını indirerek uygulamayı kullanabilirsiniz.`)
  }

  const features = [
    {
      icon: 'shopping_bag',
      title: 'Kolay Alışveriş',
      description: 'Binlerce ürün arasından kolayca arama yapın ve sepetinize ekleyin',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: 'notifications_active',
      title: 'Anlık Bildirimler',
      description: 'Kampanyalar ve yeni ürünlerden anında haberdar olun',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: 'local_shipping',
      title: 'Hızlı Kargo',
      description: 'Siparişlerinizi takip edin ve hızlı teslimat alın',
      color: 'from-pink-500 to-pink-600'
    },
    {
      icon: 'payment',
      title: 'Güvenli Ödeme',
      description: 'Tüm ödeme yöntemleriyle güvenli alışveriş yapın',
      color: 'from-green-500 to-green-600'
    }
  ]

  const screenshots = [
    { image: '/assets/anasayfa.jpeg', title: 'Ana Sayfa' },
    { image: '/assets/ürünler.jpeg', title: 'Ürünler' },
    { image: '/assets/sepet.jpeg', title: 'Sepet' },
    { image: '/assets/profil.jpeg', title: 'Profil' }
  ]

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="layout-container flex h-full grow flex-col">
        <Header />

        <main className="flex-grow">
          {/* Hero Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div className="flex flex-col gap-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 w-fit">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">smartphone</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Yakında</span>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                      <span className="text-[#0d141b] dark:text-slate-50">Alışverişi</span>
                      <br />
                      <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Yeniden Keşfedin
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">
                      Mobil uygulamamızla her yerden, her zaman alışveriş yapın. Özel kampanyalar ve indirimlerden ilk siz haberdar olun.
                    </p>
                  </div>

                  {/* Download Buttons */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => handleStoreClick('App Store')}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-xl"
                      >
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        <div className="flex flex-col items-start">
                          <span className="text-xs opacity-80">App Store'dan</span>
                          <span className="text-base">İndir</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => handleStoreClick('Google Play')}
                        className="group flex items-center justify-center gap-3 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-xl"
                      >
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                        </svg>
                        <div className="flex flex-col items-start">
                          <span className="text-xs opacity-80">Google Play'den</span>
                          <span className="text-base">İndir</span>
                        </div>
                      </button>
                    </div>

                    {/* APK Download Button */}
                    <a 
                      href="https://app.beratsimsek.com.tr/1.apk"
                      download
                      className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-xl"
                    >
                      <span className="material-symbols-outlined text-2xl">android</span>
                      <div className="flex flex-col items-start">
                        <span className="text-xs opacity-90">Doğrudan İndir</span>
                        <span className="text-base">APK Dosyası</span>
                      </div>
                      <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">download</span>
                    </a>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-8 pt-4">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">50K+</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">İndirme</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">4.8</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Puan</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-black bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">10K+</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Yorum</span>
                    </div>
                  </div>
                </div>

                {/* Right Content - Phone Mockup */}
                <div className="relative flex justify-center items-center">
                  <div className="relative w-[300px] h-[600px] md:w-[350px] md:h-[700px]">
                    {/* Phone Frame */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3rem] shadow-2xl p-3">
                      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden relative">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-800 rounded-b-3xl z-10"></div>
                        
                        {/* Screen Content - Real Screenshot */}
                        <div className="w-full h-full relative">
                          <Image
                            src="/assets/anasayfa.jpeg"
                            alt="Ana Sayfa"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Floating Elements */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl flex items-center justify-center animate-bounce">
                      <span className="material-symbols-outlined text-white text-3xl">notifications</span>
                    </div>
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-2xl flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined text-white text-3xl">favorite</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-10 lg:px-20 py-8">
            <div className="layout-content-container flex flex-col max-w-[1200px] mx-auto flex-1">
              {/* Features Section */}
              <div className="flex flex-col gap-10 px-4 py-16">
                <div className="flex flex-col gap-6 items-center text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">star</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Özellikler</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black leading-tight">
                    <span className="text-[#0d141b] dark:text-slate-50">Neden </span>
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Mobil Uygulamamız?
                    </span>
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                    Alışveriş deneyiminizi bir üst seviyeye taşıyacak özelliklerle dolu
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      onMouseEnter={() => setActiveFeature(index)}
                      className={`group flex flex-col gap-4 p-8 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        activeFeature === index
                          ? 'bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600 shadow-2xl scale-105'
                          : 'bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <span className="material-symbols-outlined text-white text-3xl">{feature.icon}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold text-[#0d141b] dark:text-slate-50">{feature.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshots Section */}
              <div className="flex flex-col gap-10 px-4 py-16">
                <div className="flex flex-col gap-6 items-center text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full border border-purple-200/50 dark:border-purple-500/30">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-sm">photo_library</span>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Ekran Görüntüleri</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black leading-tight">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Uygulamayı Keşfedin
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {screenshots.map((screenshot, index) => (
                    <div key={index} className="group relative">
                      <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 dark:border-gray-700 group-hover:scale-105 transition-transform duration-300">
                        <Image
                          src={screenshot.image}
                          alt={screenshot.title}
                          width={400}
                          height={800}
                          className="w-full h-auto"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="font-bold">{screenshot.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonials */}
              <div className="flex flex-col gap-10 px-4 py-16">
                <div className="flex flex-col gap-6 items-center text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full border border-green-200/50 dark:border-green-500/30">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">reviews</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">Kullanıcı Yorumları</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black leading-tight">
                    <span className="text-[#0d141b] dark:text-slate-50">Kullanıcılarımız </span>
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Ne Diyor?
                    </span>
                  </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { name: 'Zeynep K.', rating: 5, comment: 'Harika bir uygulama! Kullanımı çok kolay ve hızlı. Artık tüm alışverişlerimi buradan yapıyorum.' },
                    { name: 'Mehmet A.', rating: 5, comment: 'Kampanyalardan anında haberdar olmak çok güzel. Uygulama çok akıcı çalışıyor.' },
                    { name: 'Ayşe Y.', rating: 5, comment: 'Ödeme sistemi çok güvenli. Siparişlerimi kolayca takip edebiliyorum. Kesinlikle tavsiye ederim!' }
                  ].map((review, index) => (
                    <div key={index} className="group flex flex-col gap-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                      <div className="flex gap-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-yellow-400 text-xl">star</span>
                        ))}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">&quot;{review.comment}&quot;</p>
                      <div className="flex items-center gap-3 pt-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                          {review.name.charAt(0)}
                        </div>
                        <p className="font-bold text-[#0d141b] dark:text-slate-50">{review.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Notes Section */}
              <div className="flex flex-col gap-10 px-4 py-16">
                <div className="flex flex-col gap-6 items-center text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full border border-orange-200/50 dark:border-orange-500/30">
                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm">update</span>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Güncelleme Notları</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black leading-tight">
                    <span className="text-[#0d141b] dark:text-slate-50">Son </span>
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Güncellemeler
                    </span>
                  </h2>
                </div>

                <div className="max-w-4xl mx-auto w-full space-y-6">
                  {[
                    {
                      version: 'v3.0.0',
                      date: '10 Kasım 2025',
                      badge: 'Büyük Güncelleme',
                      badgeColor: 'from-orange-500 to-red-600',
                      updates: [
                        'Yenilenen kullanıcı arayüzü - daha modern ve kullanıcı dostu tasarım',
                        'Gelişmiş arama özellikleri - daha hızlı ve akıllı ürün arama',
                        'Yeni ödeme yöntemleri - taksit seçenekleri ve cüzdan entegrasyonu',
                        'Gelişmiş favoriler sistemi - kategorilere göre organize edilmiş listeler',
                        'Yeni bildirim merkezi - tüm bildirimleri tek yerden yönetme',
                        'Performans iyileştirmeleri - uygulama açılış hızı %50 iyileştirildi',
                        'Gelişmiş filtreleme seçenekleri - fiyat, renk, beden, marka filtreleri',
                        'Yeni ürün değerlendirme sistemi - fotoğraf ile detaylı yorumlar',
                        'Geliştirilmiş sepet yönetimi - kaydedilmiş sepetler ve hızlı sipariş',
                        'Geliştirilmiş hesap yönetimi - detaylı sipariş geçmişi',
                        'Ürün hatırlatıcıları - stokta olmayan ürünler için bildirim',
                        'Geliştirilmiş ödeme güvenliği - güvenli ödeme altyapısı',
                        'Hızlı sipariş özelliği - tek tıkla tekrar sipariş verme',
                        'Çoklu adres yönetimi - sınırsız adres ekleme ve düzenleme',
                        'Görsel yükleme optimizasyonu - daha hızlı görsel yükleme',
                        'Geliştirilmiş kullanıcı deneyimi - daha akıcı navigasyon'
                      ]
                    },
                    {
                      version: 'v2.6.0',
                      date: '23 Ekim 2025',
                      badge: 'Yeni',
                      badgeColor: 'from-green-500 to-emerald-600',
                      updates: [
                        'Uygulama açılış hızı %40 iyileştirildi',
                        'Görsel yükleme süreleri optimize edildi',
                        'Bellek kullanımı azaltıldı',
                        'Arka plan işlemleri optimize edildi',
                        'Genel performans iyileştirmeleri'
                      ]
                    },
                    {
                      version: 'v2.5.0',
                      date: '27 Eylül 2025',
                      updates: [
                        'Yeni ödeme yöntemleri eklendi',
                        'Sepet sayfası yenilendi',
                        'Performans iyileştirmeleri',
                        'Hata düzeltmeleri'
                      ]
                    },
                    {
                      version: 'v2.4.0',
                      date: '15 Ağustos 2025',
                      updates: [
                        'Karanlık mod desteği',
                        'Favori ürünler özelliği',
                        'Bildirim ayarları güncellendi',
                        'Arayüz iyileştirmeleri'
                      ]
                    },
                    {
                      version: 'v2.3.0',
                      date: '27 Temmuz 2025',
                      updates: [
                        'Sipariş takip sistemi yenilendi',
                        'Ürün filtreleme seçenekleri eklendi',
                        'Hızlı ödeme özelliği',
                        'Güvenlik güncellemeleri'
                      ]
                    }
                  ].map((update, index) => (
                    <div key={index} className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-2xl">new_releases</span>
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-[#0d141b] dark:text-slate-50">{update.version}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{update.date}</p>
                          </div>
                        </div>
                        {update.badge && (
                          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${update.badgeColor} rounded-full shadow-lg`}>
                            <span className="material-symbols-outlined text-white text-sm">star</span>
                            <span className="text-sm font-bold text-white">{update.badge}</span>
                          </div>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {update.updates.map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl mt-0.5">check_circle</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="@container px-4 py-16">
                <div className="relative overflow-hidden flex flex-col justify-center items-center gap-8 px-6 py-20 rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-2xl">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full -ml-36 -mb-36"></div>

                  <div className="relative z-10 flex flex-col gap-6 text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 mx-auto">
                      <span className="material-symbols-outlined text-white text-sm">download</span>
                      <span className="text-sm font-semibold text-white">Hemen İndirin</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
                      Alışverişe Başlamaya Hazır mısınız?
                    </h2>
                    <p className="text-white/90 text-lg leading-relaxed">
                      Mobil uygulamamızı indirin ve özel kampanyalardan yararlanmaya başlayın. İlk siparişinizde %20 indirim!
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => handleStoreClick('App Store')}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
                      >
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        <div className="flex flex-col items-start">
                          <span className="text-xs opacity-80">App Store</span>
                          <span className="text-base">İndir</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => handleStoreClick('Google Play')}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
                      >
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                        </svg>
                        <div className="flex flex-col items-start">
                          <span className="text-xs opacity-80">Google Play</span>
                          <span className="text-base">İndir</span>
                        </div>
                      </button>
                    </div>

                    <a 
                      href="https://app.beratsimsek.com.tr/1.apk"
                      download
                      className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-2xl"
                    >
                      <span className="material-symbols-outlined text-2xl">android</span>
                      <div className="flex flex-col items-start">
                        <span className="text-xs opacity-90">Doğrudan İndir</span>
                        <span className="text-base">APK Dosyası</span>
                      </div>
                      <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">download</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
