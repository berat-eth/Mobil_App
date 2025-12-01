'use client'

import { useState, useEffect } from 'react'
import { 
  Package, Upload, Search, Loader2, CheckCircle2, XCircle, 
  AlertCircle, RefreshCw, Eye, EyeOff, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface Product {
  id: number
  name: string
  description?: string
  price: number
  category: string
  image?: string
  images?: string[]
  stock: number
  brand?: string
  sku?: string
  hasVariations?: boolean
}

interface TransferResult {
  productId: number
  productName: string
  success: boolean
  message?: string
  trendyolProductId?: string
}

export default function TrendyolProductTransfer() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [transferring, setTransferring] = useState(false)
  const [transferResults, setTransferResults] = useState<TransferResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)

  useEffect(() => {
    loadProducts()
    loadTrendyolIntegration()
  }, [])

  const loadTrendyolIntegration = async () => {
    try {
      const response = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (response.success && response.data) {
        const trendyol = response.data.find((i: any) => i.provider === 'Trendyol' && i.type === 'marketplace')
        setTrendyolIntegration(trendyol)
      }
    } catch (err: any) {
      console.error('Trendyol entegrasyonu yüklenemedi:', err)
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await api.get<ApiResponse<Product[]>>('/admin/products', {
        limit: '200'
      })
      if (response.success && response.data) {
        // images alanını parse et
        const productsWithParsedImages = response.data.map(product => ({
          ...product,
          images: typeof product.images === 'string' ? JSON.parse(product.images || '[]') : (product.images || [])
        }))
        setProducts(productsWithParsedImages)
      }
    } catch (err: any) {
      setError('Ürünler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  const handleTransfer = async () => {
    if (selectedProducts.length === 0) {
      setError('Lütfen en az bir ürün seçin')
      return
    }

    if (!trendyolIntegration?.id) {
      setError('Trendyol entegrasyonu bulunamadı. Lütfen önce Trendyol Auth sayfasından entegrasyonu yapılandırın.')
      return
    }

    setTransferring(true)
    setError(null)
    setSuccess(null)
    setTransferResults([])

    try {
      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id))
      
      const response = await api.post<ApiResponse<TransferResult[]>>(
        `/admin/trendyol/transfer-products`,
        {
          integrationId: trendyolIntegration.id,
          productIds: selectedProducts
        }
      )

      if (response.success && response.data) {
        setTransferResults(response.data)
        const successCount = response.data.filter(r => r.success).length
        const failCount = response.data.filter(r => !r.success).length
        
        if (successCount > 0) {
          setSuccess(`${successCount} ürün başarıyla Trendyol'a aktarıldı${failCount > 0 ? `, ${failCount} ürün başarısız` : ''}`)
        } else {
          setError('Hiçbir ürün aktarılamadı')
        }
        
        // Başarılı transferlerden sonra seçimleri temizle
        if (failCount === 0) {
          setSelectedProducts([])
        }
      } else {
        setError(response.message || 'Ürün transferi başarısız')
      }
    } catch (err: any) {
      setError('Ürün transferi sırasında hata: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setTransferring(false)
    }
  }

  const filteredProducts = products.filter(product => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
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
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Trendyol Ürün Transferi
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Ürünlerinizi Trendyol'a aktarın
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadProducts}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <a
                href="https://developers.trendyol.com/docs/marketplace/urun-entegrasyonu/urun-aktarma-v2"
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

        {/* Search and Actions */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün adı, SKU, marka veya kategori ile ara..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {selectedProducts.length === filteredProducts.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring || selectedProducts.length === 0 || !trendyolIntegration}
              className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aktarılıyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Trendyol'a Aktar ({selectedProducts.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transfer Results */}
        {transferResults.length > 0 && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Transfer Sonuçları</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {transferResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded flex items-center justify-between ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{result.productName}</span>
                  </div>
                  {result.message && (
                    <span className="text-xs">{result.message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {filteredProducts.length} ürün bulundu
                {selectedProducts.length > 0 && (
                  <span className="ml-2 text-orange-600 dark:text-orange-400">
                    ({selectedProducts.length} seçili)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Ürün bulunamadı</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id)
                const transferResult = transferResults.find(r => r.productId === product.id)
                
                return (
                  <div
                    key={product.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                      isSelected ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectProduct(product.id)}
                        className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                      />
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
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
                              {product.name}
                            </h3>
                            <div className="mt-1 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              {product.sku && (
                                <span>SKU: <strong>{product.sku}</strong></span>
                              )}
                              {product.brand && (
                                <span>Marka: <strong>{product.brand}</strong></span>
                              )}
                              <span>Kategori: <strong>{product.category}</strong></span>
                              <span>Stok: <strong>{product.stock}</strong></span>
                            </div>
                            <div className="mt-1 text-lg font-semibold text-orange-600 dark:text-orange-400">
                              {product.price.toFixed(2)} TRY
                            </div>
                          </div>
                          {transferResult && (
                            <div className={`flex items-center gap-2 ${
                              transferResult.success
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transferResult.success ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <XCircle className="w-5 h-5" />
                              )}
                              {transferResult.message && (
                                <span className="text-xs">{transferResult.message}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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

