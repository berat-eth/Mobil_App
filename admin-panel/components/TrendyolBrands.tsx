'use client'

import { useState, useEffect } from 'react'
import { Package, Loader2, RefreshCw, AlertCircle, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface TrendyolBrand {
  id: number
  name: string
  [key: string]: any
}

export default function TrendyolBrands() {
  const [brands, setBrands] = useState<TrendyolBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTrendyolIntegration()
  }, [])

  useEffect(() => {
    if (trendyolIntegration?.id) {
      loadBrands()
    }
  }, [trendyolIntegration])

  const loadTrendyolIntegration = async () => {
    try {
      const response = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (response.success && response.data) {
        const trendyol = response.data.find((i: any) => i.provider === 'Trendyol' && i.type === 'marketplace')
        setTrendyolIntegration(trendyol)
      }
    } catch (err: any) {
      console.error('Trendyol entegrasyonu yüklenemedi:', err)
      setError('Trendyol entegrasyonu yüklenemedi')
    }
  }

  const loadBrands = async () => {
    if (!trendyolIntegration?.id) {
      setError('Trendyol entegrasyonu bulunamadı')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get<ApiResponse<any>>('/admin/trendyol/brands', {
        integrationId: trendyolIntegration.id.toString()
      })

      if (response.success && response.data) {
        const brandsList = Array.isArray(response.data) ? response.data : (response.data.brands || response.data.content || [])
        setBrands(brandsList)
      } else {
        setError(response.message || 'Markalar yüklenemedi')
      }
    } catch (err: any) {
      setError('Markalar yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const filteredBrands = brands.filter(brand => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        brand.name?.toLowerCase().includes(query) ||
        brand.id?.toString().includes(query)
      )
    }
    return true
  })

  if (loading && brands.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Trendyol Markalar
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Trendyol'daki marka listesi
                </p>
              </div>
            </div>
            <button
              onClick={loadBrands}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {!trendyolIntegration && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Trendyol entegrasyonu bulunamadı. Lütfen önce <strong>Trendyol Auth</strong> sayfasından entegrasyonu yapılandırın.
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Marka adı veya ID ile ara..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {filteredBrands.length} marka bulundu
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredBrands.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  {loading ? 'Yükleniyor...' : 'Marka bulunamadı'}
                </p>
              </div>
            ) : (
              filteredBrands.map((brand, index) => (
                <div
                  key={brand.id || index}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {brand.name || 'İsimsiz Marka'}
                      </h3>
                      {brand.id && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          ID: {brand.id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

