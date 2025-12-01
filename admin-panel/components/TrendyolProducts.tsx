'use client'

import { useState, useEffect } from 'react'
import { 
  Package, Loader2, RefreshCw, AlertCircle, Search, List, X, ExternalLink, Image as ImageIcon, Code, Copy, Check, Edit2, Save, ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

export default function TrendyolProducts() {
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [productsPage, setProductsPage] = useState(0)
  const [productsTotalPages, setProductsTotalPages] = useState(0)
  const [productsTotalElements, setProductsTotalElements] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showJsonView, setShowJsonView] = useState(false)
  const [jsonCopied, setJsonCopied] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ quantity?: number; listPrice?: number; salePrice?: number }>({})
  const [updating, setUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string; batchId?: string } | null>(null)
  const [syncingProducts, setSyncingProducts] = useState(false)
  const [useDatabase, setUseDatabase] = useState(false) // Veritabanından mı yoksa API'den mi çekilecek
  const [productsFilters, setProductsFilters] = useState({
    approved: '',
    onSale: '',
    rejected: '',
    blacklisted: '',
    archived: '',
    barcode: '',
    stockCode: '',
    productMainId: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(true) // Filtreler başlangıçta açık

  useEffect(() => {
    loadTrendyolIntegration()
  }, [])

  useEffect(() => {
    if (trendyolIntegration?.id) {
      loadProducts()
    }
  }, [trendyolIntegration, productsPage, productsFilters, searchQuery])

  // Cache bypass için refresh butonu ile manuel yenileme
  const handleForceRefresh = () => {
    setProductsPage(0)
    if (trendyolIntegration?.id) {
      loadProducts()
    }
  }

  const loadTrendyolIntegration = async () => {
    try {
      const response = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (response.success && response.data) {
        const trendyol = response.data.find((i: any) => i.provider === 'Trendyol' && i.type === 'marketplace')
        setTrendyolIntegration(trendyol)
      }
    } catch (err: any) {
      console.error('Trendyol entegrasyonu yüklenemedi:', err)
      setProductsError('Trendyol entegrasyonu yüklenemedi')
    }
  }

  // Ürünleri veritabanına senkronize et
  const handleSyncProducts = async () => {
    if (!trendyolIntegration?.id) return
    
    setSyncingProducts(true)
    setProductsError(null)
    setError(null)
    try {
      const response = await api.post<ApiResponse<any>>('/admin/trendyol/sync-products', {
        integrationId: trendyolIntegration.id.toString()
      })
      
      if (response.success) {
        setSuccess(`✅ ${response.data?.totalSynced || 0} ürün senkronize edildi (${response.data?.totalCreated || 0} yeni, ${response.data?.totalUpdated || 0} güncellendi)`)
        setTimeout(() => setSuccess(null), 5000)
        // Senkronizasyon sonrası ürünleri yükle
        setTimeout(() => {
          loadProducts()
        }, 1000)
      } else {
        setProductsError(response.message || 'Senkronizasyon başarısız')
      }
    } catch (err: any) {
      console.error('Senkronizasyon hatası:', err)
      const errorMessage = err.message || 'Bilinmeyen hata'
      // 404 hatası için özel mesaj
      if (err.status === 404 || errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        setProductsError('Endpoint bulunamadı. Lütfen sunucu yapılandırmasını kontrol edin.')
      } else {
        setProductsError('Senkronizasyon hatası: ' + errorMessage)
      }
    } finally {
      setSyncingProducts(false)
    }
  }

  // Ürün listesi yükleme fonksiyonu
  const loadProducts = async () => {
    if (!trendyolIntegration?.id) return
    
    setProductsLoading(true)
    setProductsError(null)
    
    try {
      if (useDatabase) {
        // Veritabanından çek
        const params: Record<string, string> = {
          page: productsPage.toString(),
          size: '10'
        }
        
        if (productsFilters.approved !== '') {
          params.approved = productsFilters.approved
        }
        if (productsFilters.onSale !== '') {
          params.onSale = productsFilters.onSale
        }
        if (searchQuery) {
          params.search = searchQuery
        }
        
        const response = await api.get<ApiResponse<any>>('/admin/trendyol/products-db', params)
        
        if (response.success && response.data) {
          setProducts(response.data.content || [])
          setProductsTotalPages(response.data.totalPages || 0)
          setProductsTotalElements(response.data.totalElements || 0)
        } else {
          setProductsError(response.message || 'Ürünler yüklenemedi')
        }
      } else {
        // API'den çek
        // Cache bypass için timestamp ekle
        const params: Record<string, string> = {
          integrationId: trendyolIntegration.id.toString(),
          page: productsPage.toString(),
          size: '10',
          _t: Date.now().toString() // Cache bypass için timestamp
        }
      
      if (productsFilters.approved !== '') {
        params.approved = productsFilters.approved
      }
      if (productsFilters.onSale !== '') {
        params.onSale = productsFilters.onSale
      }
      if (productsFilters.rejected !== '') {
        params.rejected = productsFilters.rejected
      }
      if (productsFilters.blacklisted !== '') {
        params.blacklisted = productsFilters.blacklisted
      }
      if (productsFilters.archived !== '') {
        params.archived = productsFilters.archived
      }
      if (productsFilters.barcode) {
        params.barcode = productsFilters.barcode
      }
      if (productsFilters.stockCode) {
        params.stockCode = productsFilters.stockCode
      }
        if (productsFilters.productMainId) {
          params.productMainId = productsFilters.productMainId
        }
        if (searchQuery) {
          params.search = searchQuery
        }
        
        const response = await api.get<ApiResponse<any>>('/admin/trendyol/products', params)
        
        if (response.success && response.data) {
          setProducts(response.data.content || [])
          setProductsTotalPages(response.data.totalPages || 0)
          setProductsTotalElements(response.data.totalElements || 0)
        } else {
          setProductsError(response.message || 'Ürünler yüklenemedi')
        }
      }
    } catch (err: any) {
      setProductsError('Ürünler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setProductsLoading(false)
    }
  }

  const handleEditProduct = (product: any) => {
    setEditingProduct(product.barcode)
    setEditForm({
      quantity: product.quantity || 0,
      listPrice: product.listPrice || 0,
      salePrice: product.salePrice || product.listPrice || 0
    })
    setUpdateMessage(null)
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setEditForm({})
    setUpdateMessage(null)
  }

  const handleUpdateProduct = async (product: any) => {
    if (!trendyolIntegration?.id) {
      setUpdateMessage({ type: 'error', message: 'Trendyol entegrasyonu bulunamadı' })
      return
    }

    // Validasyon
    if (editForm.quantity !== undefined && (editForm.quantity < 0 || editForm.quantity > 20000)) {
      setUpdateMessage({ type: 'error', message: 'Stok miktarı 0-20000 arasında olmalıdır' })
      return
    }

    setUpdating(true)
    setUpdateMessage(null)

    try {
      const items = [{
        barcode: product.barcode,
        ...(editForm.quantity !== undefined && { quantity: editForm.quantity }),
        ...(editForm.listPrice !== undefined && { listPrice: editForm.listPrice }),
        ...(editForm.salePrice !== undefined && { salePrice: editForm.salePrice })
      }]

      const response = await api.post<ApiResponse<any>>('/admin/trendyol/update-price-inventory', {
        integrationId: trendyolIntegration.id,
        items
      })

      if (response.success) {
        setUpdateMessage({ 
          type: 'success', 
          message: 'Güncelleme başlatıldı',
          batchId: response.data?.batchRequestId
        })
        setEditingProduct(null)
        setEditForm({})
        // Ürünleri yeniden yükle
        setTimeout(() => {
          loadProducts()
        }, 2000)
      } else {
        setUpdateMessage({ type: 'error', message: response.message || 'Güncelleme başarısız' })
      }
    } catch (err: any) {
      setUpdateMessage({ type: 'error', message: err.message || 'Güncelleme hatası' })
    } finally {
      setUpdating(false)
    }
  }

  if (productsLoading && products.length === 0) {
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
                  <List className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Trendyol Ürün Listesi
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-gray-400">
                    Trendyol mağazanızdaki ürünleri görüntüleyin ve filtreleyin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncProducts}
                  disabled={syncingProducts || !trendyolIntegration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {syncingProducts ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  {syncingProducts ? 'Senkronize Ediliyor...' : 'Veritabanına Kaydet'}
                </button>
                <button
                  onClick={loadProducts}
                  disabled={productsLoading || !trendyolIntegration}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              </div>
            </div>

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}

          {productsError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {productsError}
            </motion.div>
          )}

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

        {/* Search and Filters */}
        <div className="mb-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Arama ve Filtreler</h3>
            </div>
            <div className="flex items-center gap-2">
              {filtersExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
            </div>
          </button>
          
          <AnimatePresence>
            {filtersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  {/* Search Bar */}
                  <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
              Ürün İsmi ile Ara
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setProductsPage(0)
                }}
                placeholder="Ürün adı ile ara..."
                className="w-full pl-12 pr-12 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm hover:shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Onay Durumu
              </label>
              <select
                value={productsFilters.approved}
                onChange={(e) => {
                  setProductsFilters({ ...productsFilters, approved: e.target.value })
                  setProductsPage(0)
                }}
                className="w-full px-3 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              >
                <option value="">Tümü</option>
                <option value="true">Onaylı</option>
                <option value="false">Onaysız</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Satışta
              </label>
              <select
                value={productsFilters.onSale}
                onChange={(e) => {
                  setProductsFilters({ ...productsFilters, onSale: e.target.value })
                  setProductsPage(0)
                }}
                className="w-full px-3 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              >
                <option value="">Tümü</option>
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Barcode
              </label>
              <input
                type="text"
                value={productsFilters.barcode}
                onChange={(e) => {
                  setProductsFilters({ ...productsFilters, barcode: e.target.value })
                  setProductsPage(0)
                }}
                placeholder="Barcode ara..."
                className="w-full px-3 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Stock Code
              </label>
              <input
                type="text"
                value={productsFilters.stockCode}
                onChange={(e) => {
                  setProductsFilters({ ...productsFilters, stockCode: e.target.value })
                  setProductsPage(0)
                }}
                placeholder="Stock code ara..."
                className="w-full px-3 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
            </div>
          </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Products List */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {searchQuery ? (
                      <>
                        <span className="text-orange-600 dark:text-orange-400 font-bold">"{searchQuery}"</span> için{' '}
                        <span className="font-bold">{products.length}</span> ürün bulundu
                        {' '}<span className="text-slate-500 dark:text-slate-400">(Toplam: {productsTotalElements})</span>
                      </>
                    ) : (
                      <>
                        Toplam <span className="font-bold text-orange-600 dark:text-orange-400">{productsTotalElements}</span> ürün bulundu
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : productsError ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {productsError}
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[600px] overflow-y-auto p-4">
                {(() => {
                  if (products.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-500">
                        {searchQuery ? `"${searchQuery}" için ürün bulunamadı` : 'Ürün bulunamadı'}
                      </div>
                    )
                  }

                  return products.map((product, index) => (
                    <div
                      key={product.id || index}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-start gap-4">
                        {product.images && product.images.length > 0 && (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 
                              className="font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex-1"
                              onClick={() => {
                                setSelectedProduct(product)
                                setShowProductModal(true)
                              }}
                            >
                              {product.title}
                            </h4>
                            {editingProduct !== product.barcode && (
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded text-orange-600 dark:text-orange-400 transition-colors"
                                title="Stok ve Fiyat Güncelle"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          {editingProduct === product.barcode ? (
                            <div className="space-y-3 mt-2 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                              {updateMessage && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`p-2.5 rounded-lg text-xs font-medium ${
                                    updateMessage.type === 'success'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}
                                >
                                  {updateMessage.message}
                                  {updateMessage.batchId && (
                                    <div className="text-xs mt-1.5 font-mono bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded">
                                      Batch: {updateMessage.batchId.substring(0, 20)}...
                                    </div>
                                  )}
                                </motion.div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Stok Miktarı
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20000"
                                    value={editForm.quantity ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Liste Fiyatı (TRY)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.listPrice ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, listPrice: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Satış Fiyatı (TRY)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.salePrice ?? ''}
                                    onChange={(e) => setEditForm({ ...editForm, salePrice: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={() => handleUpdateProduct(product)}
                                  disabled={updating}
                                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg text-sm font-semibold hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                                >
                                  {updating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                  Kaydet
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={updating}
                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                  İptal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                                <span>Barcode: <strong>{product.barcode}</strong></span>
                                {product.stockCode && (
                                  <span>Stock Code: <strong>{product.stockCode}</strong></span>
                                )}
                                {(product.size || (product.attributes && Array.isArray(product.attributes) && product.attributes.find((attr: any) => attr.attributeName === 'Beden' || attr.attributeName === 'Boy / Ölçü'))) && (
                                  <span>Beden: <strong className="text-slate-900 dark:text-white">
                                    {product.size || 
                                     (product.attributes && Array.isArray(product.attributes) && 
                                      (product.attributes.find((attr: any) => attr.attributeName === 'Beden')?.attributeValue ||
                                       product.attributes.find((attr: any) => attr.attributeName === 'Boy / Ölçü')?.attributeValue ||
                                       product.attributes.find((attr: any) => attr.attributeName === 'Beden')?.customAttributeValue ||
                                       product.attributes.find((attr: any) => attr.attributeName === 'Boy / Ölçü')?.customAttributeValue))}
                                  </strong></span>
                                )}
                                <span>Stok: <strong>{product.quantity || 0}</strong></span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  product.approved
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {product.approved ? 'Onaylı' : 'Onaysız'}
                                </span>
                              </div>
                              <div className="mt-2 text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Liste Fiyatı: <strong className="text-slate-900 dark:text-white">{product.listPrice?.toFixed(2) || '0.00'} TRY</strong>
                                </span>
                                {product.salePrice && product.salePrice !== product.listPrice && (
                                  <span className="ml-4 text-orange-600 dark:text-orange-400 font-semibold">
                                    Satış Fiyatı: {product.salePrice.toFixed(2)} TRY
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>

              {/* Pagination */}
              {productsTotalPages > 1 && (
                <div className="mt-6 p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setProductsPage(p => Math.max(0, p - 1))}
                    disabled={productsPage === 0 || productsLoading}
                    className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Sayfa {productsPage + 1} / {productsTotalPages}
                  </span>
                  <button
                    onClick={() => setProductsPage(p => p + 1)}
                    disabled={productsPage >= productsTotalPages - 1 || productsLoading}
                    className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Product Detail Modal */}
        <AnimatePresence>
          {showProductModal && selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Ürün Detayları
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedProduct.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowJsonView(!showJsonView)
                        setJsonCopied(false)
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        showJsonView
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Code className="w-4 h-4" />
                      {showJsonView ? 'Detay Görünümü' : 'JSON Görünümü'}
                    </button>
                    <button
                      onClick={() => {
                        setShowProductModal(false)
                        setSelectedProduct(null)
                        setShowJsonView(false)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {showJsonView ? (
                    /* JSON View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Ürün JSON Verisi
                        </h3>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(JSON.stringify(selectedProduct, null, 2))
                              setJsonCopied(true)
                              setTimeout(() => setJsonCopied(false), 2000)
                            } catch (err) {
                              console.error('Kopyalama hatası:', err)
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                        >
                          {jsonCopied ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span>Kopyalandı!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <pre className="p-4 bg-slate-900 dark:bg-slate-950 rounded-lg overflow-x-auto text-sm text-slate-100 font-mono border border-slate-700">
                          <code>{JSON.stringify(selectedProduct, null, 2)}</code>
                        </pre>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          <strong>İpucu:</strong> JSON verisini kopyalamak için yukarıdaki "Kopyala" butonunu kullanabilirsiniz.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Detail View */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sol Taraf - Görseller */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Görseller
                      </h3>
                      {selectedProduct.images && selectedProduct.images.length > 0 ? (
                        <div className="space-y-4">
                          <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                            <img
                              src={selectedProduct.images[0].url}
                              alt={selectedProduct.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {selectedProduct.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                              {selectedProduct.images.slice(1, 9).map((img: any, index: number) => (
                                <div
                                  key={index}
                                  className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-500 transition-colors"
                                >
                                  <img
                                    src={img.url}
                                    alt={`${selectedProduct.title} - ${index + 2}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center aspect-square rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                          <ImageIcon className="w-12 h-12 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Sağ Taraf - Detaylar */}
                    <div className="space-y-6">
                      {/* Temel Bilgiler */}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                          Temel Bilgiler
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Ürün Adı:</span>
                            <span className="font-medium text-slate-900 dark:text-white">{selectedProduct.title}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Barcode:</span>
                            <span className="font-mono text-sm text-slate-900 dark:text-white">{selectedProduct.barcode}</span>
                          </div>
                          {selectedProduct.stockCode && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Stock Code:</span>
                              <span className="font-mono text-sm text-slate-900 dark:text-white">{selectedProduct.stockCode}</span>
                          </div>
                          )}
                          {selectedProduct.productMainId && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Product Main ID:</span>
                              <span className="font-mono text-sm text-slate-900 dark:text-white">{selectedProduct.productMainId}</span>
                            </div>
                          )}
                          {selectedProduct.productCode && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Product Code:</span>
                              <span className="font-mono text-sm text-slate-900 dark:text-white">{selectedProduct.productCode}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Durum Bilgileri */}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                          Durum
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Onay Durumu:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              selectedProduct.approved
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {selectedProduct.approved ? 'Onaylı' : 'Onaysız'}
                            </span>
                          </div>
                          {selectedProduct.onSale !== undefined && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Satışta:</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selectedProduct.onSale
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {selectedProduct.onSale ? 'Evet' : 'Hayır'}
                              </span>
                            </div>
                          )}
                          {selectedProduct.archived !== undefined && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Arşivlenmiş:</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selectedProduct.archived
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {selectedProduct.archived ? 'Evet' : 'Hayır'}
                              </span>
                            </div>
                          )}
                          {selectedProduct.locked !== undefined && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Kilitli:</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                selectedProduct.locked
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {selectedProduct.locked ? 'Evet' : 'Hayır'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fiyat ve Stok */}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                          Fiyat ve Stok
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Liste Fiyatı:</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {selectedProduct.listPrice?.toFixed(2) || '0.00'} TRY
                            </span>
                          </div>
                          {selectedProduct.salePrice !== undefined && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Satış Fiyatı:</span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {selectedProduct.salePrice.toFixed(2)} TRY
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">KDV Oranı:</span>
                            <span className="text-slate-900 dark:text-white">%{selectedProduct.vatRate || 0}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-slate-600 dark:text-slate-400">Stok Miktarı:</span>
                            <span className={`font-semibold ${
                              (selectedProduct.quantity || 0) > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {selectedProduct.quantity || 0} {selectedProduct.stockUnitType || 'Adet'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Kategori ve Marka */}
                      {(selectedProduct.categoryName || selectedProduct.brand || selectedProduct.brandId || selectedProduct.categoryId) && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Kategori ve Marka
                          </h3>
                          <div className="space-y-3">
                            {selectedProduct.categoryName && (
                              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Kategori:</span>
                                <span className="text-slate-900 dark:text-white">{selectedProduct.categoryName}</span>
                              </div>
                            )}
                            {selectedProduct.categoryId && (
                              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Kategori ID:</span>
                                <span className="font-mono text-sm text-slate-900 dark:text-white">{selectedProduct.categoryId}</span>
                              </div>
                            )}
                            {selectedProduct.brand && (
                              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Marka:</span>
                                <span className="text-slate-900 dark:text-white">{selectedProduct.brand}</span>
                              </div>
                            )}
                            {selectedProduct.brandId && (
                              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Marka ID:</span>
                                <span className="font-mono text-sm text-slate-900 dark:text-white">{selectedProduct.brandId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Açıklama */}
                      {selectedProduct.description && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Açıklama
                          </h3>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {selectedProduct.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Özellikler */}
                      {selectedProduct.attributes && Array.isArray(selectedProduct.attributes) && selectedProduct.attributes.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Özellikler
                          </h3>
                          <div className="space-y-2">
                            {selectedProduct.attributes.map((attr: any, index: number) => (
                              <div
                                key={index}
                                className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                              >
                                <span className="text-slate-600 dark:text-slate-400">
                                  {attr.attributeName || `Özellik ${index + 1}`}:
                                </span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                  {attr.attributeValue || attr.customAttributeValue || '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Diğer Bilgiler */}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                          Diğer Bilgiler
                        </h3>
                        <div className="space-y-3">
                          {selectedProduct.gender && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Cinsiyet:</span>
                              <span className="text-slate-900 dark:text-white">{selectedProduct.gender}</span>
                            </div>
                          )}
                          {selectedProduct.color && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Renk:</span>
                              <span className="text-slate-900 dark:text-white">{selectedProduct.color}</span>
                            </div>
                          )}
                          {selectedProduct.size && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Beden:</span>
                              <span className="text-slate-900 dark:text-white">{selectedProduct.size}</span>
                            </div>
                          )}
                          {selectedProduct.dimensionalWeight && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Dimensional Weight:</span>
                              <span className="text-slate-900 dark:text-white">{selectedProduct.dimensionalWeight}</span>
                            </div>
                          )}
                          {selectedProduct.createDateTime && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Oluşturulma:</span>
                              <span className="text-slate-900 dark:text-white">
                                {new Date(selectedProduct.createDateTime).toLocaleString('tr-TR')}
                              </span>
                            </div>
                          )}
                          {selectedProduct.lastUpdateDate && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Son Güncelleme:</span>
                              <span className="text-slate-900 dark:text-white">
                                {new Date(selectedProduct.lastUpdateDate).toLocaleString('tr-TR')}
                              </span>
                            </div>
                          )}
                          {selectedProduct.productUrl && (
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-slate-600 dark:text-slate-400">Ürün URL:</span>
                              <a
                                href={selectedProduct.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                              >
                                Görüntüle <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowProductModal(false)
                      setSelectedProduct(null)
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

