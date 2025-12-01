'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { slidersApi, productsApi } from '@/utils/api'

const Header = dynamic(() => import('@/components/Header'), { ssr: false })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false })

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=75&auto=format&fit=crop',
    title: 'İşletmeniz İçin',
    highlight: 'Özel Tasarım Çözümler',
    description: 'İşletmeniz için özel tasarlanmış outdoor giyim çözümleri. Softshell ve polar montlarımızla her mevsim koruma sağlıyoruz.'
  },
  {
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=75&auto=format&fit=crop',
    title: 'Markanızı Öne Çıkarın',
    highlight: 'Logo Baskılı Ürünler',
    description: 'Markanızı yansıtan logo baskılı ürünlerimizle kurumsal kimliğinizi güçlendirin. Özel tasarım outdoor mont üretiminde uzmanız.'
  },
  {
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&q=75&auto=format&fit=crop',
    title: 'Her Hava Koşuluna',
    highlight: 'Dayanıklı ve Konforlu',
    description: 'Su geçirmez teknoloji ve termal koruma özellikli ürünlerimizle zorlu hava koşullarına hazır olun. Dayanıklılık ve konfor bir arada.'
  },
  {
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=75&auto=format&fit=crop',
    title: 'İhtiyacınıza Özel',
    highlight: 'Esnek Üretim Seçenekleri',
    description: 'Kamp, trekking ve avcılık için özel tasarlanmış kıyafetler. Az adet üretim seçeneğiyle ihtiyacınıza özel çözümler sunuyoruz.'
  }
] as const

const REFERENCES = [
  { 
    name: 'Türkiye Futbol Federasyonu', 
    color: 'from-blue-500 to-blue-600',
    logo: '/assets/references/tff-logo.png'
  },
  { 
    name: 'Nükte Treyler', 
    color: 'from-purple-500 to-purple-600',
    logo: '/assets/references/nukte-logo.png'
  },
  { 
    name: 'Konya Büyükşehir Belediyesi', 
    color: 'from-pink-500 to-pink-600',
    logo: '/assets/references/konya-logo.png'
  }
] as const

const STATS = [
  { label: 'Mutlu Müşteri', value: 500, suffix: '+', icon: 'groups', color: 'from-blue-500 to-blue-600' },
  { label: 'Yıllık Deneyim', value: 15, suffix: '+', icon: 'calendar_today', color: 'from-purple-500 to-purple-600' },
  { label: 'Tamamlanan Proje', value: 1000, suffix: '+', icon: 'check_circle', color: 'from-pink-500 to-pink-600' },
  { label: 'Üretim Kapasitesi', value: 50000, suffix: '+', icon: 'factory', color: 'from-orange-500 to-orange-600' }
]

const CATEGORIES = [
  { name: 'Outdoor Giyim', description: 'Softshell, polar ve teknik montlar', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=75', slug: 'outdoor-giyim' },
  { name: 'Kamp Malzemeleri', description: 'Kamp ve doğa aktiviteleri için ekipmanlar', image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&q=75', slug: 'kamp-malzemeleri' },
  { name: 'Ayakkabı', description: 'Trekking ve outdoor ayakkabıları', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=75', slug: 'ayakkabi' },
  { name: 'Aksesuar', description: 'Çanta, şapka ve diğer aksesuarlar', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=75', slug: 'aksesuar' }
]

const PROCESS_STEPS = [
  { step: 1, title: 'İhtiyaç Analizi', description: 'Müşteri ihtiyaçlarını detaylı şekilde analiz ediyor, ürün özelliklerini belirliyoruz.', icon: 'analytics' },
  { step: 2, title: 'Tasarım & Planlama', description: 'Uzman ekibimizle özel tasarım oluşturuyor, üretim planını hazırlıyoruz.', icon: 'design_services' },
  { step: 3, title: 'Üretim', description: 'Yüksek kaliteli kumaşlar ve teknoloji ile üretim sürecini başlatıyoruz.', icon: 'precision_manufacturing' },
  { step: 4, title: 'Kalite Kontrol', description: 'Her ürünü titizlikle kontrol ediyor, kalite standartlarımıza uygunluğunu sağlıyoruz.', icon: 'verified' },
  { step: 5, title: 'Teslimat', description: 'Ürünlerinizi zamanında ve güvenli şekilde teslim ediyoruz.', icon: 'local_shipping' }
]

const TESTIMONIALS = [
  { name: 'Ahmet Yılmaz', position: 'Satın Alma Müdürü', company: 'ABC Spor', rating: 5, text: 'Huğlu Tekstil ile çalışmak harika bir deneyim. Ürün kalitesi ve müşteri hizmetleri mükemmel. Özellikle logo baskılı ürünlerimiz çok profesyonel görünüyor.', avatar: null },
  { name: 'Zeynep Kaya', position: 'İşletme Sahibi', company: 'Doğa Mağazası', rating: 5, text: 'Toptan fiyatları çok uygun ve ürün çeşitliliği geniş. Kamp malzemeleri için ideal bir tedarikçi. Kesinlikle tavsiye ederim.', avatar: null },
  { name: 'Mehmet Demir', position: 'Kurumsal Satın Alma', company: 'XYZ A.Ş.', rating: 5, text: 'Kurumsal üniforma ihtiyacımızı karşıladılar. Özel tasarım ve üretim süreci çok profesyonel. Zamanında teslimat yaptılar.', avatar: null }
]

interface SliderItem {
  id: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  highlight?: string;
  isActive: boolean;
  order: number;
  autoPlay: boolean;
  duration: number;
  clickAction?: {
    type: 'product' | 'category' | 'url' | 'none';
    value?: string;
  };
  buttonText?: string;
  buttonColor?: string;
  textColor?: string;
  overlayOpacity?: number;
}

// Count-up animation hook
function useCountUp(end: number, duration: number = 2000, start: number = 0, triggerRef?: React.RefObject<HTMLElement>): number {
  const [count, setCount] = useState(start)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (hasAnimated) return

    const element = triggerRef?.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true)
          const startTime = Date.now()
          const range = end - start

          const updateCount = () => {
            const now = Date.now()
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            setCount(Math.floor(start + range * easeOutQuart))

            if (progress < 1) {
              requestAnimationFrame(updateCount)
            } else {
              setCount(end)
            }
          }

          requestAnimationFrame(updateCount)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [end, duration, start, hasAnimated, triggerRef])

  return count
}

// Stats Card Component
function StatsCard({ stat, index }: { stat: typeof STATS[0], index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const count = useCountUp(stat.value, 2000, 0, cardRef)

  return (
    <div
      ref={cardRef}
      className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 dark:border-gray-700"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`}></div>
      <div className="relative z-10">
        <div className={`inline-flex p-4 bg-gradient-to-br ${stat.color} rounded-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <span className="material-symbols-outlined text-white text-3xl">{stat.icon}</span>
        </div>
        <div className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-2">
          {count.toLocaleString('tr-TR')}{stat.suffix}
        </div>
        <div className="text-gray-600 dark:text-gray-300 font-semibold text-lg">
          {stat.label}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const pathname = usePathname()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [slides, setSlides] = useState<SliderItem[]>([])
  const [loadingSliders, setLoadingSliders] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [categories, setCategories] = useState(CATEGORIES)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (pathname === '/') {
      setShowPopup(true)
    } else {
      setShowPopup(false)
    }
  }, [pathname])

  useEffect(() => {
    const loadSliders = async () => {
      try {
        setLoadingSliders(true)
        const response = await slidersApi.getSliders(10)
        
        if (response.success && response.data && response.data.length > 0) {
          const apiSlides = response.data.map((slider: any) => ({
            id: slider.id,
            title: slider.title || '',
            description: slider.description || '',
            imageUrl: slider.imageUrl || '',
            thumbnailUrl: slider.thumbnailUrl,
            videoUrl: slider.videoUrl,
            highlight: slider.highlight || slider.title,
            isActive: slider.isActive,
            order: slider.order || 0,
            autoPlay: slider.autoPlay !== undefined ? slider.autoPlay : true,
            duration: slider.duration || 5,
            clickAction: slider.clickAction,
            buttonText: slider.buttonText,
            buttonColor: slider.buttonColor,
            textColor: slider.textColor,
            overlayOpacity: slider.overlayOpacity,
          }))
          setSlides(apiSlides)
        } else {
          const hardcodedSlides = SLIDES.map((slide, index) => ({
            id: index + 1,
            title: slide.title,
            description: slide.description,
            imageUrl: slide.image,
            highlight: slide.highlight,
            isActive: true,
            order: index + 1,
            autoPlay: true,
            duration: 5,
          }))
          setSlides(hardcodedSlides as SliderItem[])
        }
      } catch (error) {
        console.error('Slider yükleme hatası:', error)
        const hardcodedSlides = SLIDES.map((slide, index) => ({
          id: index + 1,
          title: slide.title,
          description: slide.description,
          imageUrl: slide.image,
          highlight: slide.highlight,
          isActive: true,
          order: index + 1,
          autoPlay: true,
          duration: 5,
        }))
        setSlides(hardcodedSlides as SliderItem[])
      } finally {
        setLoadingSliders(false)
      }
    }
    
    loadSliders()
  }, [])

  // Load categories from API if available
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productsApi.getProducts(1, 100)
        if (response.success && response.data?.products) {
          const uniqueCategories = new Set<string>()
          response.data.products.forEach((p: any) => {
            if (p.category) uniqueCategories.add(p.category)
          })
          // Update categories with real data if available
        }
      } catch (error) {
        console.error('Kategori yükleme hatası:', error)
      }
    }
    loadCategories()
  }, [])

  const handleRetailClick = useCallback(() => {
    window.location.href = 'https://hugluoutdoor.com'
  }, [])

  const handleCustomClick = useCallback(() => {
    setShowPopup(false)
  }, [])

  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const handleScrollDown = useCallback(() => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    })
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="relative w-full flex flex-col group/design-root overflow-x-hidden bg-white dark:bg-gray-900">
      <h1 className="sr-only">Outdoor Giyim Toptan | Özel Üretim Outdoor Mont & Teknik Giyim Üreticisi - Huğlu Tekstil</h1>
      
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-scaleIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex flex-col gap-6 text-center">
              <div className="flex justify-center mb-2">
                <Image
                  src="/assets/logo.png"
                  alt="Huğlu Tekstil Logo - Outdoor Giyim Toptan"
                  width={140}
                  height={56}
                  className="h-14 w-auto object-contain"
                  quality={90}
                  priority
                />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Hoş Geldiniz!</h2>
              <p className="text-gray-600 dark:text-gray-300 text-base">
                Huğlu Tekstil olarak işletmeniz için özel tasarlanmış outdoor giyim çözümleri sunuyoruz. Toptan satış ve özel üretim seçeneklerimizle yanınızdayız.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetailClick}
                  className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-base hover:from-blue-700 hover:to-purple-700 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <span className="material-symbols-outlined text-xl">storefront</span>
                  Perakende Mağazamız
                </button>
                <button
                  onClick={handleCustomClick}
                  className="group flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-xl">engineering</span>
                  Özel Üretim & Toptan
                </button>
              </div>
            </div>
            <button
              onClick={handleCustomClick}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>
      )}

      <Header />

      <main className="flex-grow relative">
        {/* Hero Slider Section - Improved */}
        {!loadingSliders && slides.length > 0 && (
          <section className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" style={{ height: '100vh', minHeight: '100vh' }}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.3),transparent_50%)] animate-pulse"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.3),transparent_50%)]"></div>
            </div>

            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentSlide 
                    ? 'opacity-100 z-10' 
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <div className="relative w-full h-full">
                  {slide.imageUrl ? (
                    <Image
                      src={slide.imageUrl}
                      alt={`${slide.title} - ${slide.highlight} - Outdoor Giyim Toptan`}
                      fill
                      className={`object-cover transition-all duration-[10000ms] ease-out ${
                        index === currentSlide ? 'scale-100 brightness-90' : 'scale-110 brightness-50'
                      }`}
                      priority={index === 0}
                      quality={90}
                      sizes="100vw"
                      unoptimized={slide.imageUrl.includes('ticimax.cloud') || slide.imageUrl.includes('huglutekstil.com') || slide.imageUrl.includes('zerodaysoftware.tr')}
                      onError={(e) => {
                        console.error('Slider görseli yüklenemedi:', slide.imageUrl)
                        const target = e.target as HTMLImageElement
                        if (target.parentElement) {
                          target.style.display = 'none'
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
                      <span className="text-white/50 text-4xl">🎬</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-4 md:px-10 lg:px-20 w-full max-w-7xl">
                      <div className={`transform transition-all duration-1000 delay-200 ${
                        index === currentSlide 
                          ? 'translate-y-0 opacity-100 scale-100' 
                          : 'translate-y-12 opacity-0 scale-95'
                      }`}>
                        <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-8 md:p-12 shadow-2xl">
                          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl opacity-30 blur-xl -z-10"></div>
                          
                          <div className="relative space-y-6">
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                              <span className="text-sm font-bold text-white tracking-wide">OUTDOOR GIYIM TOPTAN</span>
                            </div>
                            
                            <div className="space-y-3">
                              <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight">
                                <span className="text-white drop-shadow-2xl">
                                  {slide.title}
                                </span>
                                <br />
                                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                  {slide.highlight}
                                </span>
                              </h2>
                            </div>
                            
                            {slide.description && (
                              <p className="text-lg md:text-xl lg:text-2xl text-gray-100 max-w-3xl leading-relaxed font-medium drop-shadow-lg">
                                {slide.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-4 pt-6">
                              <Link 
                                href="/urunler"
                                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-base overflow-hidden shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
                              >
                                <span className="relative z-10">Ürünleri İncele</span>
                                <span className="material-symbols-outlined text-xl relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </Link>
                              <Link 
                                href="/teklif-al"
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-white/20 backdrop-blur-md text-white rounded-xl font-bold text-base border-2 border-white/40 hover:bg-white/30 hover:border-white/60 transition-all duration-300 hover:scale-105 shadow-xl"
                              >
                                <span>Teklif Al</span>
                                <span className="material-symbols-outlined text-xl">request_quote</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`relative rounded-full transition-all duration-500 ${
                    index === currentSlide
                      ? 'bg-white w-12 h-3 shadow-lg shadow-white/50'
                      : 'bg-white/30 hover:bg-white/50 w-3 h-3 backdrop-blur-sm'
                  }`}
                  aria-label={`Slide ${index + 1}'e geç`}
                >
                  {index === currentSlide && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 group p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110 shadow-xl"
              aria-label="Önceki slide"
            >
              <span className="material-symbols-outlined text-3xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 group p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110 shadow-xl"
              aria-label="Sonraki slide"
            >
              <span className="material-symbols-outlined text-3xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 z-20">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-5000 ease-linear"
                style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
              ></div>
            </div>
            
            <button
              onClick={handleScrollDown}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center gap-2 group cursor-pointer hover:scale-110 transition-transform duration-300"
              aria-label="Aşağı kaydır"
            >
              <span className="text-white/80 text-sm font-semibold mb-2 group-hover:text-white transition-colors">Aşağı Kaydır</span>
              <div className="w-10 h-16 rounded-full border-2 border-white/40 backdrop-blur-sm flex items-start justify-center p-2 group-hover:border-white/60 transition-colors">
                <span className="material-symbols-outlined text-white text-2xl animate-bounce">keyboard_arrow_down</span>
              </div>
            </button>
          </section>
        )}

        {/* Stats Section - New */}
        <section className="relative py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">trending_up</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Rakamlarla Huğlu Tekstil</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
                Güvenilir <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Ortaklık</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Yılların deneyimi ve binlerce mutlu müşteri ile outdoor giyim sektöründe öncüyüz
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {STATS.map((stat, index) => (
                <StatsCard key={index} stat={stat} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* About Section - New */}
        <section className="relative py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=75"
                    alt="Huğlu Tekstil Hakkında"
                    width={800}
                    height={600}
                    className="w-full h-auto object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl opacity-20 blur-2xl"></div>
              </div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">info</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Hakkımızda</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                  Outdoor Giyimde <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Uzman Çözümler</span>
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  Huğlu Tekstil olarak 15 yılı aşkın deneyimimizle outdoor giyim sektöründe öncü bir konumdayız. İşletmeniz için özel tasarlanmış çözümler sunarak, markanızı en iyi şekilde yansıtan ürünler üretiyoruz.
                </p>
                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white">verified</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">Kalite Odaklı</h3>
                      <p className="text-gray-600 dark:text-gray-300">Yüksek kaliteli kumaşlar ve teknoloji ile üretim yapıyoruz</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white">handshake</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">Güvenilir Ortaklık</h3>
                      <p className="text-gray-600 dark:text-gray-300">Müşteri memnuniyeti ve güvenilirlik önceliğimizdir</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-white">lightbulb</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">İnovatif Çözümler</h3>
                      <p className="text-gray-600 dark:text-gray-300">Sürekli gelişen teknoloji ve tasarım anlayışımız</p>
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <Link
                    href="/hakkimizda"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <span>Daha Fazla Bilgi</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section - New */}
        <section className="relative py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">category</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Ürün Kategorileri</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
                Geniş <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Ürün Yelpazesi</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                İhtiyacınıza uygun outdoor giyim çözümlerini keşfedin
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category, index) => (
                <Link
                  key={index}
                  href={`/urunler?kategori=${category.slug}`}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 dark:border-gray-700"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-black text-white mb-1">{category.name}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{category.description}</p>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-3 transition-all">
                      <span>Keşfet</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                href="/urunler"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <span>Tüm Kategorileri Gör</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Advantages Section - Improved */}
        <section className="relative py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">star</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Avantajlarımız</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
                Neden <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Huğlu Tekstil?</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                İşletmeniz için özel tasarlanmış outdoor giyim çözümleri sunuyoruz. Softshell, polar ve teknik mont üretiminde uzman ekibimizle, kamp kıyafetlerinden kurumsal üniformalara kadar geniş bir yelpazede hizmet veriyoruz.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-white text-3xl">verified</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Yüksek Kalite</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Teknik kumaşlardan üretilen su geçirmez, polar ve softshell montlarımız uzun ömürlü ve dayanıklıdır. Her mevsim koruma sağlayan ürünlerimizle işletmenizin ihtiyaçlarını karşılıyoruz.
                  </p>
                </div>
              </div>
              <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-white text-3xl">design_services</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Özel Üretim</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Markanıza özel tasarım ve logo baskılı ürünlerimizle kurumsal kimliğinizi yansıtın. Az adet üretim seçeneğiyle ihtiyacınıza uygun çözümler sunuyoruz.
                  </p>
                </div>
              </div>
              <div className="group relative bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-2xl p-8 border border-pink-200 dark:border-pink-800 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-white text-3xl">local_shipping</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Toptan Tedarik</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Butiklerden spor mağazalarına, işletmelerden kurumlara kadar geniş bir müşteri portföyüne hizmet veriyoruz. Kamp giyiminden termal içliğe kadar tüm ihtiyaçlarınızı karşılıyoruz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section - New */}
        <section className="relative py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">timeline</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Üretim Süreci</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
                Nasıl <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Çalışıyoruz?</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Profesyonel ekibimizle adım adım üretim sürecimiz
              </p>
            </div>
            <div className="relative">
              {/* Timeline Line */}
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform -translate-y-1/2"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-4">
                {PROCESS_STEPS.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col items-center text-center">
                        <div className={`relative w-20 h-20 bg-gradient-to-br ${index === 0 ? 'from-blue-500 to-blue-600' : index === 1 ? 'from-purple-500 to-purple-600' : index === 2 ? 'from-pink-500 to-pink-600' : index === 3 ? 'from-orange-500 to-orange-600' : 'from-green-500 to-green-600'} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                          <span className="material-symbols-outlined text-white text-3xl">{step.icon}</span>
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 shadow-md">
                            <span className="text-xs font-black text-gray-900 dark:text-white">{step.step}</span>
                          </div>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                    {index < PROCESS_STEPS.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-4 border-white dark:border-gray-800 shadow-lg transform -translate-y-1/2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - New */}
        <section className="relative py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">format_quote</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Müşteri Yorumları</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
                Müşterilerimiz <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Ne Diyor?</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Binlerce mutlu müşterimizin deneyimlerini keşfedin
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-100 dark:border-gray-700">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(TESTIMONIALS[currentTestimonial].rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-2xl">★</span>
                    ))}
                  </div>
                  <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 leading-relaxed mb-8 italic">
                    "{TESTIMONIALS[currentTestimonial].text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg">
                      {TESTIMONIALS[currentTestimonial].name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-gray-900 dark:text-white text-lg">{TESTIMONIALS[currentTestimonial].name}</div>
                      <div className="text-gray-600 dark:text-gray-300">{TESTIMONIALS[currentTestimonial].position} • {TESTIMONIALS[currentTestimonial].company}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 mt-8">
                {TESTIMONIALS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentTestimonial
                        ? 'bg-blue-600 w-12'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                    aria-label={`Testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* References Section - Improved */}
        <section className="relative py-20 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4 md:px-10 lg:px-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">business</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Referanslarımız</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
                Bize <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Güvenenler</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Bize güvenen ve kalitemizi tercih eden değerli kurumlarımız
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {REFERENCES.map((ref, i) => (
                <div key={i} className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="flex flex-col items-center justify-center gap-6">
                    <div className="w-32 h-32 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 p-4">
                      {ref.logo ? (
                        <Image
                          src={ref.logo}
                          alt={`${ref.name} Logo`}
                          width={128}
                          height={128}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `<span class="material-symbols-outlined text-gray-600 dark:text-gray-300 text-5xl">business</span>`
                            }
                          }}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-5xl">business</span>
                      )}
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white text-xl text-center">
                      {ref.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - New */}
        <section className="relative py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.3),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.2),transparent_50%)]"></div>
          </div>
          <div className="container mx-auto px-4 md:px-10 lg:px-20 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
                İşletmeniz İçin <br />
                <span className="bg-gradient-to-r from-yellow-300 to-white bg-clip-text text-transparent">Özel Çözümler</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-2xl mx-auto">
                Outdoor giyim ihtiyaçlarınız için profesyonel ekibimizle iletişime geçin. Size özel teklif hazırlayalım.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/teklif-al"
                  className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 rounded-xl font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-white/50 hover:scale-105"
                >
                  <span>Teklif Al</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <Link
                  href="/iletisim"
                  className="group inline-flex items-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 rounded-xl font-black text-lg hover:bg-white/20 hover:border-white/50 transition-all duration-300 shadow-xl hover:scale-105"
                >
                  <span>İletişime Geç</span>
                  <span className="material-symbols-outlined">phone</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
