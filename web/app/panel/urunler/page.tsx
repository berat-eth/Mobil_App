'use client'

import { useEffect, useState } from 'react'
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

export default function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadProducts()
    }
  }, [user, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      setLoading(true)
      // Backend'den sadece tekstil ürünleri çek (Camp Ürünleri ve Silah Aksesuarları hariç)
      const response = await productsApi.filterProducts({
        tekstilOnly: true // Sadece tekstil ürünleri (kullanıcı paneli için)
      })
      console.log('Ürünler yükleme response:', response)
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setProducts(response.data)
        } else {
          console.warn('Ürünler yükleme: Geçersiz veri formatı', response.data)
          setProducts([])
        }
      } else {
        console.warn('Ürünler yüklenemedi:', response.message || 'Bilinmeyen hata')
        setProducts([])
      }
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    try {
      setIsSearching(true)
      const response = await productsApi.searchProducts(query)
      if (response.success && response.data) {
        // Backend'den gelen arama sonuçları zaten tekstil ürünlerini içeriyor
        // Ekstra filtreleme yapmaya gerek yok, backend tenant bazlı filtreliyor
        setSearchResults(response.data)
      }
    } catch (error) {
      console.error('Arama başarısız:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const displayedProducts = searchQuery ? searchResults : products

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Ürünlerimiz
        </h1>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full px-4 py-3 pl-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Ürünler yükleniyor...</p>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {displayedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all group"
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
          {!searchQuery && hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPage(page + 1)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Daha Fazla Yükle
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

