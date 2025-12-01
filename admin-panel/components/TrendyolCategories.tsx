'use client'

import { useState, useEffect } from 'react'
import { FolderTree, Loader2, RefreshCw, AlertCircle, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface TrendyolCategory {
  id: number
  name: string
  parentId?: number
  subCategories?: TrendyolCategory[]
  [key: string]: any
}

export default function TrendyolCategories() {
  const [categories, setCategories] = useState<TrendyolCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [categoryAttributes, setCategoryAttributes] = useState<any>(null)
  const [loadingAttributes, setLoadingAttributes] = useState(false)

  useEffect(() => {
    loadTrendyolIntegration()
  }, [])

  useEffect(() => {
    if (trendyolIntegration?.id) {
      loadCategories()
    }
  }, [trendyolIntegration])

  useEffect(() => {
    if (selectedCategoryId && trendyolIntegration?.id) {
      loadCategoryAttributes(selectedCategoryId)
    }
  }, [selectedCategoryId, trendyolIntegration])

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

  const loadCategories = async () => {
    if (!trendyolIntegration?.id) {
      setError('Trendyol entegrasyonu bulunamadı')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get<ApiResponse<any>>('/admin/trendyol/categories', {
        integrationId: trendyolIntegration.id.toString()
      })

      if (response.success && response.data) {
        const categoriesList = Array.isArray(response.data) ? response.data : (response.data.categories || response.data.content || [])
        setCategories(categoriesList)
      } else {
        setError(response.message || 'Kategoriler yüklenemedi')
      }
    } catch (err: any) {
      setError('Kategoriler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const loadCategoryAttributes = async (categoryId: number) => {
    if (!trendyolIntegration?.id) return

    setLoadingAttributes(true)
    try {
      const response = await api.get<ApiResponse<any>>('/admin/trendyol/category-attributes', {
        integrationId: trendyolIntegration.id.toString(),
        categoryId: categoryId.toString()
      })

      if (response.success && response.data) {
        setCategoryAttributes(response.data)
      }
    } catch (err: any) {
      console.error('Kategori özellikleri yüklenemedi:', err)
    } finally {
      setLoadingAttributes(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredCategories = categories.filter(category => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        category.name?.toLowerCase().includes(query) ||
        category.id?.toString().includes(query)
      )
    }
    return true
  })

  if (loading && categories.length === 0) {
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
                <FolderTree className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Trendyol Kategoriler
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Trendyol kategori ağacı ve özellikleri
                </p>
              </div>
            </div>
            <button
              onClick={loadCategories}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kategori Listesi */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kategori adı veya ID ile ara..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {filteredCategories.length} kategori bulundu
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderTree className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {loading ? 'Yükleniyor...' : 'Kategori bulunamadı'}
                  </p>
                </div>
              ) : (
                filteredCategories.map((category, index) => (
                  <div
                    key={category.id || index}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer ${
                      selectedCategoryId === category.id ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500' : ''
                    }`}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {category.name || 'İsimsiz Kategori'}
                        </h3>
                        {category.id && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            ID: {category.id}
                          </p>
                        )}
                      </div>
                      {category.subCategories && category.subCategories.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCategory(category.id)
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {expandedCategories.has(category.id) && category.subCategories && (
                      <div className="mt-2 ml-4 space-y-2">
                        {category.subCategories.map((subCat: any) => (
                          <div
                            key={subCat.id}
                            className="p-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCategoryId(subCat.id)
                            }}
                          >
                            {subCat.name} (ID: {subCat.id})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kategori Özellikleri */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Kategori Özellikleri
              </h3>
              {selectedCategoryId && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Kategori ID: {selectedCategoryId}
                </p>
              )}
            </div>

            <div className="p-4">
              {!selectedCategoryId ? (
                <div className="text-center py-12 text-slate-500">
                  Bir kategori seçin
                </div>
              ) : loadingAttributes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                </div>
              ) : categoryAttributes ? (
                <div className="space-y-3">
                  {Array.isArray(categoryAttributes) ? (
                    categoryAttributes.map((attr: any, index: number) => (
                      <div key={index} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {attr.name || attr.attributeName || `Özellik ${index + 1}`}
                        </div>
                        {attr.id && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            ID: {attr.id}
                          </div>
                        )}
                        {attr.values && Array.isArray(attr.values) && attr.values.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Değerler:</div>
                            <div className="flex flex-wrap gap-2">
                              {attr.values.map((val: any, valIndex: number) => (
                                <span key={valIndex} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                                  {val.name || val}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {JSON.stringify(categoryAttributes, null, 2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Özellik bilgisi bulunamadı
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

