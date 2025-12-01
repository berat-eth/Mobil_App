'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { productsApi } from '@/utils/api'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  brand?: string;
  category?: string;
  stock?: number;
  rating?: number;
  reviewCount?: number;
}

export default function Urunler() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const limit = 12 // Sayfa başına ürün sayısı

  useEffect(() => {
    loadProducts()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      setLoading(true)
      console.log('🔄 Ürünler yükleniyor...', { page, limit, tekstilOnly: true })
      
      // Backend'den sadece tekstil ürünleri çek (Camp Ürünleri ve Silah Aksesuarları hariç)
      // Sayfalama ile birlikte
      const response = await productsApi.getProducts(page, limit, undefined, true)
      
      console.log('📦 Ürünler API Response:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        message: response.message,
        fullResponse: response
      })
      
      if (response.success && response.data) {
        const data = response.data as { products: Product[]; total: number; hasMore: boolean }
        
        console.log('📊 Response Data Detayları:', {
          hasProducts: !!data.products,
          productsIsArray: Array.isArray(data.products),
          productsLength: Array.isArray(data.products) ? data.products.length : 'N/A',
          total: data.total,
          hasMore: data.hasMore,
          fullData: data
        })
        
        if (data && Array.isArray(data.products)) {
          console.log('✅ Ürünler başarıyla yüklendi:', data.products.length, 'ürün')
          // Rating'i sayıya dönüştür ve normalize et
          const normalizedProducts = data.products.map((product: Product) => ({
            ...product,
            rating: product.rating ? Number(product.rating) : 0,
            reviewCount: product.reviewCount ? Number(product.reviewCount) : 0
          }))
          setProducts(normalizedProducts)
          setTotal(data.total || 0)
          setHasMore(data.hasMore || false)
          setTotalPages(Math.ceil((data.total || 0) / limit))
        } else {
          console.warn('⚠️ Ürünler yükleme: Geçersiz veri formatı', {
            data,
            productsType: typeof data?.products,
            productsIsArray: Array.isArray(data?.products)
          })
          setProducts([])
          setTotal(0)
          setHasMore(false)
          setTotalPages(1)
        }
      } else {
        console.warn('⚠️ Ürünler yüklenemedi:', {
          success: response.success,
          message: response.message || 'Bilinmeyen hata',
          response
        })
        setProducts([])
        setTotal(0)
        setHasMore(false)
        setTotalPages(1)
      }
    } catch (error: any) {
      console.error('❌ Ürünler yükleme hatası:', {
        error,
        message: error?.message,
        stack: error?.stack
      })
      setProducts([])
      setTotal(0)
      setHasMore(false)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Debounce için timer (useRef kullanarak)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(async (query: string) => {
    const trimmedQuery = query.trim()
    
    if (!trimmedQuery) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // Minimum 2 karakter kontrolü (backend ile uyumlu)
    if (trimmedQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    try {
      setIsSearching(true)
      console.log('🔍 Arama yapılıyor:', trimmedQuery)
      const response = await productsApi.searchProducts(trimmedQuery)
      
      console.log('📦 Arama API Response:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        message: response.message
      })

      if (response.success && response.data && Array.isArray(response.data)) {
        // Arama sonuçlarını frontend'de tekstil kategorilerine göre filtrele
        // Alternatif kategori isimleri de kontrol ediliyor
        const tekstilKategoriler = [
          'Tişört', 'T-Shirt', 'Tshirt', 'tişört', 'T-SHIRT', 'TSHIRT',
          'Gömlek', 'gömlek', 'GOMLEK',
          'Pantolon', 'pantolon', 'PANTOLON',
          'Mont', 'mont', 'MONT',
          'Hırka', 'hırka', 'HIRKA',
          'Polar Bere', 'polar bere', 'POLAR BERE', 'Polar', 'polar',
          'Şapka', 'şapka', 'SAPKA',
          'Eşofman', 'eşofman', 'ESOFMAN',
          'Hoodie', 'hoodie', 'HOODIE',
          'Bandana', 'bandana', 'BANDANA',
          'Aplike', 'aplike', 'APLIKE',
          'Battaniye', 'battaniye', 'BATTANIYE',
          'Waistcoat', 'waistcoat', 'WAISTCOAT',
          'Yağmurluk', 'yağmurluk', 'YAGMURLUK',
          'Rüzgarlık', 'rüzgarlık', 'RUZGARLIK'
        ]
        
        const filtered = response.data.filter((product: Product) => {
          if (!product.category) return false
          const categoryLower = product.category.toLowerCase()
          return tekstilKategoriler.some(kat => 
            categoryLower.includes(kat.toLowerCase())
          )
        })
        
        // Rating'i sayıya dönüştür ve normalize et
        const normalizedResults = filtered.map((product: Product) => ({
          ...product,
          rating: product.rating ? Number(product.rating) : 0,
          reviewCount: product.reviewCount ? Number(product.reviewCount) : 0
        }))
        
        console.log('✅ Filtrelenmiş sonuçlar:', normalizedResults.length, 'ürün')
        setSearchResults(normalizedResults)
      } else {
        console.warn('⚠️ Arama sonucu beklenmeyen format:', response)
        setSearchResults([])
      }
    } catch (error: any) {
      console.error('❌ Arama hatası:', {
        error,
        message: error?.message,
        stack: error?.stack
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    
    // Önceki timer'ı temizle
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      setPage(1) // Arama temizlendiğinde sayfa 1'e dön
      return
    }

    // Debounce: 800ms bekle (daha uzun süre, daha az istek)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 800)
  }, [performSearch])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const displayedProducts = searchQuery ? searchResults : products

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16">
        <div className="max-w-[1400px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">inventory_2</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Ürün Kataloğu</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Ürün Kataloğumuz
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              İşinize özel, kaliteli iş kıyafetleri ve ekipmanlarımızı detaylı inceleyin
            </p>
          </div>

          {/* Products Section */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Ürün ara..."
                    className="w-full px-4 py-3 pl-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  />
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    search
                  </span>
                  {isSearching && (
                    <span className="material-symbols-outlined animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400">
                      sync
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
                <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
                  sync
                </span>
                <p className="text-gray-600 dark:text-gray-400">Ürünler yükleniyor...</p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
                  inventory_2
                </span>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz ürün bulunmuyor'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Aramayı temizle
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-xl transition-all group"
                    >
                      {/* Product Image */}
                      <Link href={`/urunler/${product.id}`} className="block relative aspect-square overflow-hidden">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-6xl text-gray-400">image</span>
                          </div>
                        )}
                        {product.stock !== undefined && product.stock === 0 && (
                          <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                            Stokta Yok
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="p-4">
                        {product.brand && (
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                            {product.brand}
                          </p>
                        )}
                        <Link href={`/urunler/${product.id}`}>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {!searchQuery && totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (page <= 3) {
                          pageNum = i + 1
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = page - 2 + i
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                              page === pageNum
                                ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg'
                                : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                    
                    <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                      Sayfa {page} / {totalPages} (Toplam {total} ürün)
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">verified</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Kaliteli Ürünler</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tüm ürünlerimiz kalite standartlarına uygun üretilmektedir</p>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">palette</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Özel Tasarım</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Markanıza özel renk ve logo baskısı yapılabilir</p>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">local_shipping</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Hızlı Teslimat</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Siparişleriniz en kısa sürede teslim edilir</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
