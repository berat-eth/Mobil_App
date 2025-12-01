'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Image from 'next/image'

interface GalleryImage {
  id: number
  src: string
  alt: string
  category: string
  title?: string
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'wide'
}

const galleryImages: GalleryImage[] = [
  // Atölye Görselleri
  { id: 1, src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80', alt: 'Atölye İçi', category: 'Atölye', title: 'Modern Üretim Hattı', aspectRatio: 'wide' },
  { id: 2, src: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80', alt: 'Dikim Atölyesi', category: 'Atölye', title: 'Profesyonel Dikim', aspectRatio: 'portrait' },
  { id: 3, src: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', alt: 'Kesim Masası', category: 'Atölye', title: 'Hassas Kesim', aspectRatio: 'square' },
  { id: 4, src: 'https://images.unsplash.com/photo-1558769132-cb1aea1f1c85?w=800&q=80', alt: 'Tasarım Masası', category: 'Atölye', title: 'Yaratıcı Tasarım', aspectRatio: 'landscape' },
  
  // Ürün Görselleri
  { id: 5, src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', alt: 'İş Kıyafetleri', category: 'Ürünler', title: 'Kurumsal Koleksiyon', aspectRatio: 'portrait' },
  { id: 6, src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', alt: 'Tişört Üretimi', category: 'Ürünler', title: 'Kaliteli Tişörtler', aspectRatio: 'square' },
  { id: 7, src: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', alt: 'Polo Yaka', category: 'Ürünler', title: 'Şık Polo Yaka', aspectRatio: 'portrait' },
  { id: 8, src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', alt: 'Gömlek', category: 'Ürünler', title: 'Klasik Gömlekler', aspectRatio: 'landscape' },
  
  // Ekipman
  { id: 9, src: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', alt: 'Kalite Kontrol', category: 'Ekipman', title: 'Kalite Kontrol', aspectRatio: 'wide' },
  { id: 10, src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', alt: 'Modern Makineler', category: 'Ekipman', title: 'Teknolojik Makineler', aspectRatio: 'square' },
  { id: 11, src: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80', alt: 'Üretim Hattı', category: 'Ekipman', title: 'Otomatik Üretim', aspectRatio: 'landscape' },
  { id: 12, src: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80', alt: 'Baskı Makinesi', category: 'Ekipman', title: 'Dijital Baskı', aspectRatio: 'portrait' },
  
  // Ekip
  { id: 13, src: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80', alt: 'Ekip Çalışması', category: 'Ekip', title: 'Profesyonel Ekip', aspectRatio: 'wide' },
  { id: 14, src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80', alt: 'Takım Çalışması', category: 'Ekip', title: 'Uyumlu Takım', aspectRatio: 'square' },
  { id: 15, src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', alt: 'Müşteri Görüşmesi', category: 'Ekip', title: 'Müşteri Odaklı', aspectRatio: 'portrait' },
  { id: 16, src: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', alt: 'Toplantı', category: 'Ekip', title: 'İnovatif Çözümler', aspectRatio: 'landscape' },
]

const categories = ['Tümü', 'Atölye', 'Ürünler', 'Ekipman', 'Ekip']

const getAspectRatioClass = (aspectRatio?: string) => {
  switch (aspectRatio) {
    case 'portrait':
      return 'aspect-[3/4]'
    case 'landscape':
      return 'aspect-[4/3]'
    case 'wide':
      return 'aspect-[16/9]'
    default:
      return 'aspect-square'
  }
}

export default function Galeri() {
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const filteredImages = useMemo(() => {
    return selectedCategory === 'Tümü' 
      ? galleryImages 
      : galleryImages.filter(img => img.category === selectedCategory)
  }, [selectedCategory])

  // Lightbox navigation
  const currentImageIndex = useMemo(() => {
    if (!selectedImage) return -1
    return filteredImages.findIndex(img => img.id === selectedImage.id)
  }, [selectedImage, filteredImages])

  const goToNext = useCallback(() => {
    if (currentImageIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentImageIndex + 1])
      setLightboxIndex(currentImageIndex + 1)
    } else {
      setSelectedImage(filteredImages[0])
      setLightboxIndex(0)
    }
  }, [currentImageIndex, filteredImages])

  const goToPrev = useCallback(() => {
    if (currentImageIndex > 0) {
      setSelectedImage(filteredImages[currentImageIndex - 1])
      setLightboxIndex(currentImageIndex - 1)
    } else {
      setSelectedImage(filteredImages[filteredImages.length - 1])
      setLightboxIndex(filteredImages.length - 1)
    }
  }, [currentImageIndex, filteredImages])

  // Keyboard navigation
  useEffect(() => {
    if (!selectedImage) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null)
      } else if (e.key === 'ArrowRight') {
        goToNext()
      } else if (e.key === 'ArrowLeft') {
        goToPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, goToNext, goToPrev])

  // Simulate loading
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [selectedCategory])

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image)
    const index = filteredImages.findIndex(img => img.id === image.id)
    setLightboxIndex(index)
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16 pt-24">
        <div className="max-w-[1600px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-full border border-white/20 dark:border-blue-500/30 mb-6 shadow-lg">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">photo_library</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wide">FOTOĞRAF GALERİSİ</span>
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 leading-tight">
              Galeri
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Atölyemizden, ürünlerimizden ve ekibimizden kareler
            </p>
          </div>

          {/* Modern Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`group relative px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 overflow-hidden ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-purple-500/50 scale-105'
                    : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:scale-105 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {selectedCategory === category && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
                <span className="relative z-10">{category}</span>
                {selectedCategory === category && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Modern Masonry Gallery Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image, index) => (
                <div
                  key={image.id}
                  onClick={() => handleImageClick(image)}
                  className={`group relative ${getAspectRatioClass(image.aspectRatio)} rounded-3xl overflow-hidden cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-purple-500 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover group-hover:scale-125 transition-transform duration-700 ease-out"
                    unoptimized
                    loading="lazy"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      {image.title && (
                        <h3 className="text-white font-black text-xl mb-2 drop-shadow-lg">{image.title}</h3>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm rounded-full text-white text-xs font-bold">
                          {image.category}
                        </span>
                        <span className="material-symbols-outlined text-white/80 text-sm">zoom_in</span>
                      </div>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-4 right-4 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/20 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    <span className="text-white text-xs font-bold">{image.category}</span>
                  </div>

                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-pink-500/20 transition-all duration-500 blur-xl -z-10"></div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Section */}
          <div className="mt-20 grid md:grid-cols-3 gap-6">
            <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-gray-200/50 dark:border-gray-700/50 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:shadow-blue-500/50 transition-all duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">camera_enhance</span>
                </div>
                <h3 className="font-black text-gray-900 dark:text-white text-xl">Profesyonel Çekim</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed relative z-10">
                Tüm fotoğraflarımız profesyonel ekipmanlarla çekilmektedir
              </p>
            </div>
            <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-gray-200/50 dark:border-gray-700/50 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:shadow-purple-500/50 transition-all duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">update</span>
                </div>
                <h3 className="font-black text-gray-900 dark:text-white text-xl">Güncel İçerik</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed relative z-10">
                Galerimiz düzenli olarak yeni fotoğraflarla güncellenmektedir
              </p>
            </div>
            <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-gray-200/50 dark:border-gray-700/50 hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg shadow-pink-500/30 group-hover:scale-110 group-hover:shadow-pink-500/50 transition-all duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">visibility</span>
                </div>
                <h3 className="font-black text-gray-900 dark:text-white text-xl">360° Görünüm</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed relative z-10">
                Atölyemizi ve ürünlerimizi her açıdan görebilirsiniz
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 z-50 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110 shadow-xl"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          {/* Navigation Buttons */}
          {filteredImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrev()
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110 shadow-xl group"
                aria-label="Önceki"
              >
                <span className="material-symbols-outlined text-3xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 border border-white/20 transition-all duration-300 hover:scale-110 shadow-xl group"
                aria-label="Sonraki"
              >
                <span className="material-symbols-outlined text-3xl group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
            </>
          )}

          {/* Image Container */}
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                width={1200}
                height={800}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                unoptimized
                priority
              />
            </div>
            
            {/* Image Info */}
            <div className="mt-6 text-center">
              {selectedImage.title && (
                <h3 className="text-white text-3xl md:text-4xl font-black mb-3 drop-shadow-lg">
                  {selectedImage.title}
                </h3>
              )}
              <div className="flex items-center justify-center gap-4">
                <span className="px-4 py-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm rounded-full text-white text-sm font-bold">
                  {selectedImage.category}
                </span>
                <span className="text-white/60 text-sm">
                  {currentImageIndex + 1} / {filteredImages.length}
                </span>
              </div>
            </div>
          </div>

          {/* Keyboard Hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
            <span className="text-white/60 text-xs">
              ← → tuşları ile gezin • ESC ile kapat
            </span>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  )
}
