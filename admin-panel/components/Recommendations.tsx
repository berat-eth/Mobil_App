'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Search, Filter, RefreshCw, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

interface RecommendationProduct {
  productId: number
  name?: string
  score?: number
}

interface Recommendation {
  id: number
  userId: number
  userName?: string
  recommendedProducts: RecommendationProduct[]
  generatedAt: string
}

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Önerileri yükle
  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>('/admin/recommendations', { limit: 100, offset: 0 })
      
      if (response.success && response.data) {
        // Her öneri için kullanıcı adını ve ürün detaylarını al
        const enrichedRecommendations = await Promise.all(
          response.data.map(async (rec: any) => {
            try {
              // Kullanıcı bilgisini al
              const userResponse = await api.get<any>(`/users/${rec.userId}`).catch(() => null)
              const userName = userResponse?.data?.name || userResponse?.data?.email || `Kullanıcı #${rec.userId}`

              // Önerilen ürün ID'lerini ve score'ları parse et
              let productIds: number[] = []
              let scores: number[] = []
              
              if (rec.recommendedProducts) {
                if (Array.isArray(rec.recommendedProducts)) {
                  productIds = rec.recommendedProducts
                } else if (typeof rec.recommendedProducts === 'string') {
                  productIds = JSON.parse(rec.recommendedProducts)
                }
              }

              // Score'ları al
              if (rec.scores && Array.isArray(rec.scores)) {
                scores = rec.scores
              }

              // Ürün detaylarını al
              const products = await Promise.all(
                productIds.slice(0, 10).map(async (productId: number, index: number) => {
                  try {
                    const productResponse = await api.get<any>(`/products/${productId}`).catch(() => null)
                    return {
                      productId,
                      name: productResponse?.data?.name || `Ürün #${productId}`,
                      score: scores[index] !== undefined ? scores[index] : 0.7 // Backend'den gelen score veya varsayılan
                    }
                  } catch {
                    return {
                      productId,
                      name: `Ürün #${productId}`,
                      score: scores[index] !== undefined ? scores[index] : 0.7
                    }
                  }
                })
              )

              return {
                id: rec.id,
                userId: rec.userId,
                userName,
                recommendedProducts: products,
                generatedAt: rec.generatedAt ? new Date(rec.generatedAt).toLocaleString('tr-TR') : 'Bilinmiyor'
              }
            } catch (error) {
              console.error('❌ Öneri zenginleştirme hatası:', error)
              return {
                id: rec.id,
                userId: rec.userId,
                userName: `Kullanıcı #${rec.userId}`,
                recommendedProducts: [],
                generatedAt: rec.generatedAt ? new Date(rec.generatedAt).toLocaleString('tr-TR') : 'Bilinmiyor'
              }
            }
          })
        )

        setRecommendations(enrichedRecommendations)
      }
    } catch (error) {
      console.error('❌ Öneriler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  // Yenile
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadRecommendations()
    setRefreshing(false)
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  // Arama filtresi
  const filteredRecommendations = recommendations.filter(rec => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      rec.userName?.toLowerCase().includes(searchLower) ||
      rec.recommendedProducts.some(p => p.name?.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Ürün Önerileri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">AI destekli kişiselleştirilmiş ürün önerileri</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Yükleniyor...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Yenile</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Öneri ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-300 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600 dark:text-slate-400">Öneriler yükleniyor...</span>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz öneri bulunmuyor'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{rec.userName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Oluşturulma: {rec.generatedAt}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Önerilen Ürünler:</p>
                {rec.recommendedProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{product.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          style={{ width: `${(product.score || 0.85) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {((product.score || 0.85) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
