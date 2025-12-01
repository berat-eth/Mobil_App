'use client'

import { useState, useEffect } from 'react'
import { 
  Package, Search, Loader2, Edit, Save, X, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, ExternalLink, Eye, EyeOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface TrendyolProduct {
  barcode: string
  title: string
  productMainId: string
  brandId?: number
  categoryId?: number
  quantity: number
  stockCode: string
  dimensionalWeight?: number
  description?: string
  currencyType: string
  listPrice: number
  salePrice: number
  images?: Array<{ url: string }>
  vatRate: number
  cargoCompanyId?: number
  deliveryOption?: {
    deliveryDuration: number
    fastDeliveryType: string
  }
  [key: string]: any // Diğer Trendyol alanları için
}

export default function TrendyolProductList() {
  const [products, setProducts] = useState<TrendyolProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<TrendyolProduct | null>(null)
  const [editedProduct, setEditedProduct] = useState<TrendyolProduct | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState({
    approved: '',
    onSale: '',
    active: '',
    rejected: '',
    blacklisted: '',
    barcode: '',
    stockCode: '',
    productMainId: ''
  })

  useEffect(() => {
    loadTrendyolIntegration()
  }, [])

  useEffect(() => {
    if (trendyolIntegration?.id) {
      // Debounce: Filtre değişikliklerinde 500ms bekle
      const timeoutId = setTimeout(() => {
        loadProducts()
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }, [trendyolIntegration, page, filters, searchQuery])

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

  const loadProducts = async () => {
    if (!trendyolIntegration?.id) {
      setError('Trendyol entegrasyonu bulunamadı')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const params: Record<string, string> = {
        integrationId: trendyolIntegration.id.toString(),
        page: page.toString(),
        size: '50'
      }

      // Filtreleme parametrelerini ekle
      if (filters.approved !== '') {
        params.approved = filters.approved
      }
      if (filters.onSale !== '') {
        params.onSale = filters.onSale
      }
      if (filters.active !== '') {
        params.active = filters.active
      }
      if (filters.rejected !== '') {
        params.rejected = filters.rejected
      }
      if (filters.blacklisted !== '') {
        params.blacklisted = filters.blacklisted
      }
      if (filters.barcode) {
        params.barcode = filters.barcode
      }
      if (filters.stockCode) {
        params.stockCode = filters.stockCode
      }
      if (filters.productMainId) {
        params.productMainId = filters.productMainId
      }
      if (searchQuery) {
        params.search = searchQuery
      }

      const response = await api.get<ApiResponse<any>>('/admin/trendyol/products', params)

      if (response.success && response.data) {
        const content = response.data.content || response.data.products || response.data || []
        setProducts(Array.isArray(content) ? content : [])
        
        if (response.data.totalPages !== undefined) {
          setTotalPages(response.data.totalPages)
        }
        if (response.data.totalElements !== undefined) {
          setTotalElements(response.data.totalElements)
        }
      } else {
        setError(response.message || 'Ürünler yüklenemedi')
      }
    } catch (err: any) {
      setError('Ürünler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: TrendyolProduct) => {
    setEditingProduct(product)
    setEditedProduct({ ...product })
    setError(null)
    setSuccess(null)
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setEditedProduct(null)
  }

  const handleSave = async () => {
    if (!editedProduct || !trendyolIntegration?.id) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.put<ApiResponse<any>>(
        `/admin/trendyol/products/${editedProduct.barcode}`,
        {
          integrationId: trendyolIntegration.id,
          productData: editedProduct
        }
      )

      if (response.success) {
        setSuccess('Ürün başarıyla güncellendi')
        setEditingProduct(null)
        setEditedProduct(null)
        // Ürünleri yeniden yükle
        await loadProducts()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Ürün güncellenemedi')
      }
    } catch (err: any) {
      setError('Ürün güncellenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    if (!editedProduct) return
    
    setEditedProduct({
      ...editedProduct,
      [field]: value
    })
  }

  // Artık API'den arama yapıldığı için client-side filtreleme gerekmiyor
  const filteredProducts = products

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Trendyol Ürün Listesi
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Trendyol'daki ürünlerinizi görüntüleyin ve güncelleyin
                  {totalElements > 0 && (
                    <span className="ml-2 font-semibold text-orange-600 dark:text-orange-400">
                      (Toplam: {totalElements} ürün)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPage(0)
                  loadProducts()
                }}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <button
                onClick={async () => {
                  setSyncing(true)
                  try {
                    const params: Record<string, string> = {
                      integrationId: trendyolIntegration.id.toString(),
                      page: '0',
                      size: '200',
                      sync: 'true'
                    }
                    await api.get<ApiResponse<any>>('/admin/trendyol/products', params)
                    await loadProducts()
                    setSuccess('Ürünler Trendyol\'dan başarıyla senkronize edildi')
                    setTimeout(() => setSuccess(null), 3000)
                  } catch (err: any) {
                    setError('Senkronizasyon hatası: ' + (err.message || 'Bilinmeyen hata'))
                  } finally {
                    setSyncing(false)
                  }
                }}
                disabled={syncing || !trendyolIntegration}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Senkronize Ediliyor...' : 'Trendyol\'dan Çek'}
              </button>
              <a
                href="https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/trendyol-urun-bilgisi-guncelleme"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                API Dokümantasyonu
              </a>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}

          {/* Info */}
          {!trendyolIntegration && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Trendyol entegrasyonu bulunamadı. Lütfen önce <strong>Trendyol Auth</strong> sayfasından entegrasyonu yapılandırın.
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Ürün adı, barcode, stock code veya product main ID ile ara..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Filtreleme Alanı */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Onay Durumu
              </label>
              <select
                value={filters.approved}
                onChange={(e) => setFilters({ ...filters, approved: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Tümü</option>
                <option value="true">Onaylı</option>
                <option value="false">Onaysız</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Satışta
              </label>
              <select
                value={filters.onSale}
                onChange={(e) => setFilters({ ...filters, onSale: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Tümü</option>
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Aktif
              </label>
              <select
                value={filters.active}
                onChange={(e) => setFilters({ ...filters, active: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Tümü</option>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reddedilmiş
              </label>
              <select
                value={filters.rejected}
                onChange={(e) => setFilters({ ...filters, rejected: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Tümü</option>
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={filters.barcode}
                onChange={(e) => setFilters({ ...filters, barcode: e.target.value })}
                placeholder="Barcode ile filtrele..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stock Code
              </label>
              <input
                type="text"
                value={filters.stockCode}
                onChange={(e) => setFilters({ ...filters, stockCode: e.target.value })}
                placeholder="Stock code ile filtrele..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Product Main ID
              </label>
              <input
                type="text"
                value={filters.productMainId}
                onChange={(e) => setFilters({ ...filters, productMainId: e.target.value })}
                placeholder="Product main ID ile filtrele..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    approved: '',
                    onSale: '',
                    active: '',
                    rejected: '',
                    blacklisted: '',
                    barcode: '',
                    stockCode: '',
                    productMainId: ''
                  })
                  setPage(0)
                }}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {filteredProducts.length} ürün bulundu
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Sayfa {page + 1} / {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (totalPages - 1) || loading}
                    className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  {loading ? 'Yükleniyor...' : 'Ürün bulunamadı'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product, index) => {
                const isEditing = editingProduct?.barcode === product.barcode
                const currentProduct = isEditing ? editedProduct : product

                return (
                  <div
                    key={product.barcode || index}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                      isEditing ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            Ürün Düzenleme
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Kaydet
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              İptal
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Ürün Adı
                            </label>
                            <input
                              type="text"
                              value={currentProduct?.title || ''}
                              onChange={(e) => handleFieldChange('title', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Barcode
                            </label>
                            <input
                              type="text"
                              value={currentProduct?.barcode || ''}
                              disabled
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Stock Code
                            </label>
                            <input
                              type="text"
                              value={currentProduct?.stockCode || ''}
                              onChange={(e) => handleFieldChange('stockCode', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Stok (Quantity)
                            </label>
                            <input
                              type="number"
                              value={currentProduct?.quantity || 0}
                              onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Liste Fiyatı (List Price)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentProduct?.listPrice || 0}
                              onChange={(e) => handleFieldChange('listPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Satış Fiyatı (Sale Price)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentProduct?.salePrice || 0}
                              onChange={(e) => handleFieldChange('salePrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              KDV Oranı (%)
                            </label>
                            <input
                              type="number"
                              value={currentProduct?.vatRate || 18}
                              onChange={(e) => handleFieldChange('vatRate', parseInt(e.target.value) || 18)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Para Birimi
                            </label>
                            <input
                              type="text"
                              value={currentProduct?.currencyType || 'TRY'}
                              onChange={(e) => handleFieldChange('currencyType', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Açıklama
                            </label>
                            <textarea
                              value={currentProduct?.description || ''}
                              onChange={(e) => handleFieldChange('description', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {product.images && product.images.length > 0 && (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.png'
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-slate-900 dark:text-white">
                                {product.title}
                              </h3>
                              <div className="mt-1 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                <span>Barcode: <strong>{product.barcode}</strong></span>
                                {product.stockCode && (
                                  <span>Stock Code: <strong>{product.stockCode}</strong></span>
                                )}
                                <span>Stok: <strong>{product.quantity || 0}</strong></span>
                              </div>
                              <div className="mt-1 flex items-center gap-4 text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Liste Fiyatı: <strong className="text-slate-900 dark:text-white">{product.listPrice?.toFixed(2) || '0.00'} {product.currencyType || 'TRY'}</strong>
                                </span>
                                <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                  Satış Fiyatı: {product.salePrice?.toFixed(2) || '0.00'} {product.currencyType || 'TRY'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleEdit(product)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Düzenle
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

