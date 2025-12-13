'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, Search, Loader2, X, User, Mail, Phone, 
  Calendar, DollarSign, Package, MapPin, Code, FileJson, 
  Receipt, FileText, Download, ExternalLink, Printer, RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface MarketplaceOrder {
  id: number
  provider: string
  externalOrderId: string
  totalAmount: number
  status: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  city?: string
  district?: string
  fullAddress?: string
  syncedAt: string
  createdAt: string
  orderData?: any // JSON data from marketplace API
  cargoSlipPrintedAt?: string
  items?: Array<{
    id: number
    productName: string
    quantity: number
    price: number
    productImage?: string
    productSku?: string
    itemData?: any // JSON data from item
    productSize?: string
    merchantSku?: string
    productColor?: string
  }>
}

export default function TrendyolOrders() {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [showInvoicesModal, setShowInvoicesModal] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [invoiceLink, setInvoiceLink] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  // cargoSlipGenerated state'ini kaldırdık, artık backend'den gelecek

  useEffect(() => {
    // Debounce: Filtre değişikliklerinde 500ms bekle
    const timeoutId = setTimeout(() => {
      loadOrders()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [statusFilter, startDate, endDate])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {
        provider: 'trendyol'
      }
      if (statusFilter) params.status = statusFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      
      const response = await api.get<ApiResponse<MarketplaceOrder[]>>('/admin/marketplace-orders', params)
      if (response.success && response.data) {
        setOrders(response.data)
        // Toplam sipariş sayısını ve tutarını al
        const responseWithTotal = response as any
        if (responseWithTotal.total !== undefined) {
          setTotalOrders(responseWithTotal.total)
        } else {
          setTotalOrders(response.data.length)
        }
        if (responseWithTotal.totalAmount !== undefined) {
          setTotalAmount(responseWithTotal.totalAmount)
        } else {
          // Fallback: Frontend'de hesapla
          const calculatedTotal = response.data.reduce((sum, order) => {
            return sum + (parseFloat(String(order.totalAmount || 0)))
          }, 0)
          setTotalAmount(calculatedTotal)
        }
      }
    } catch (err: any) {
      setError('Siparişler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setRefreshMessage(null)
      setError(null)
      
      // Önce Trendyol entegrasyonunu bul
      const integrationsResponse = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (!integrationsResponse.success || !integrationsResponse.data) {
        throw new Error('Entegrasyonlar yüklenemedi')
      }
      
      const trendyolIntegration = integrationsResponse.data.find(
        (int: any) => int.provider === 'Trendyol' && int.type === 'marketplace'
      )
      
      if (!trendyolIntegration || !trendyolIntegration.id) {
        throw new Error('Trendyol entegrasyonu bulunamadı. Lütfen önce entegrasyonu yapılandırın.')
      }
      
      // Siparişleri Trendyol'dan çek
      const syncResponse = await api.post<ApiResponse<{ synced: number; skipped: number; total: number; errors?: any[] }>>(
        `/admin/integrations/${trendyolIntegration.id}/sync-orders`,
        {}
      )
      
      if (syncResponse.success && syncResponse.data) {
        const { synced, skipped, total } = syncResponse.data
        setRefreshMessage(`${synced} sipariş senkronize edildi, ${skipped} sipariş atlandı (Toplam: ${total})`)
        
        // Siparişleri yeniden yükle
        await loadOrders()
        
        // Mesajı 5 saniye sonra temizle
        setTimeout(() => setRefreshMessage(null), 5000)
      } else {
        throw new Error(syncResponse.message || 'Sipariş çekme başarısız')
      }
    } catch (err: any) {
      setError('Siparişler yenilenemedi: ' + (err.message || 'Bilinmeyen hata'))
      setRefreshMessage(null)
    } finally {
      setRefreshing(false)
    }
  }

  const handleOrderClick = async (order: MarketplaceOrder) => {
    setSelectedOrder(order)
    setShowOrderDetailModal(true)
    setSelectedInvoiceId(null)
    setInvoiceLink('')
    
    // Faturaları yükle
    try {
      const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
      if (response.success && response.data && response.data.length > 0) {
        setInvoices(response.data)
        // İlk faturayı varsayılan olarak seç
        setSelectedInvoiceId(response.data[0].id)
      }
    } catch (err: any) {
      console.error('Faturalar yüklenemedi:', err)
    }
  }

  const handleShowInvoices = async () => {
    try {
      setInvoicesLoading(true)
      const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
      if (response.success && response.data) {
        setInvoices(response.data)
        setShowInvoicesModal(true)
      }
    } catch (err: any) {
      console.error('Faturalar yüklenemedi:', err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  const handleGenerateCargoSlip = async () => {
    if (!selectedOrder) return
    
    // API base URL'i fonksiyonun başında tanımla
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
    
    try {
      
      // Fatura linki veya seçili fatura kontrolü
      let invoiceUrl = ''
      
      if (invoiceLink && invoiceLink.trim()) {
        // Fatura linki girilmişse onu kullan
        invoiceUrl = invoiceLink.trim()
      } else if (selectedInvoiceId) {
        // Seçili faturayı bul
        const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId)
        if (!selectedInvoice) {
          alert('Seçili fatura bulunamadı.')
          return
        }
        
        // Direkt PDF dosyasına erişim için download URL'i oluştur
        if (selectedInvoice.id) {
          // Admin endpoint ile direkt dosya indirme
          invoiceUrl = `${API_BASE_URL}/admin/invoices/${selectedInvoice.id}/download`
        } else if (selectedInvoice.shareUrl) {
          // Share URL varsa download endpoint'ine yönlendir
          // shareUrl formatı: https://api.huglutekstil.com/api/invoices/share/TOKEN
          // download formatı: https://api.huglutekstil.com/api/invoices/share/TOKEN/download
          invoiceUrl = `${selectedInvoice.shareUrl}/download`
        }
      } else {
        alert('Lütfen bir fatura seçin veya fatura linki girin.')
        return
      }

      // Kargo bilgilerini al
      const orderData = selectedOrder.orderData 
        ? (typeof selectedOrder.orderData === 'string' 
            ? JSON.parse(selectedOrder.orderData)
            : selectedOrder.orderData)
        : null
      
      const cargoTrackingNumber = orderData?.cargoTrackingNumber || ''
      const cargoProviderName = orderData?.cargoProviderName || ''

      // Backend'e istek gönder (blob response için doğrudan fetch)
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      const token = sessionStorage.getItem('authToken') || ''
      
      const response = await fetch(`${API_BASE_URL}/admin/generate-cargo-slip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          invoiceUrl: invoiceUrl,
          cargoTrackingNumber: cargoTrackingNumber,
          cargoProviderName: cargoProviderName,
          customerName: selectedOrder.customerName,
          customerEmail: selectedOrder.customerEmail,
          customerPhone: selectedOrder.customerPhone,
          customerAddress: selectedOrder.shippingAddress || selectedOrder.fullAddress,
          city: selectedOrder.city,
          district: selectedOrder.district,
          // Ürün bilgilerini gönder (productSize, merchantSku, productColor, quantity dahil)
          items: (selectedOrder.items || []).map(item => {
            // itemData'yı parse et (JSON string ise)
            let itemData = null;
            try {
              if (item.itemData) {
                itemData = typeof item.itemData === 'string' ? JSON.parse(item.itemData) : item.itemData;
              }
            } catch (e) {
              console.warn('itemData parse hatası:', e);
            }
            
            // Trendyol için fiyat: itemData'dan totalPrice veya item.price
            const itemPrice = itemData?.totalPrice || item.price || 0;
            
            return {
              productName: item.productName || '',
              productSku: item.productSku || '',
              productSize: itemData?.productSize || itemData?.size || item.productSize || '',
              merchantSku: itemData?.merchantSku || item.merchantSku || item.productSku || '',
              productColor: itemData?.productColor || itemData?.color || item.productColor || '',
              quantity: item.quantity || 1,
              price: itemPrice
            };
          })
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kargo-fisi-${selectedOrder.externalOrderId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Kargo fişi başarıyla indirildi, siparişleri yeniden yükle (veritabanından cargoSlipPrintedAt bilgisi gelecek)
        await loadOrders()
      } else {
        const errorText = await response.text()
        let errorMessage = 'Bilinmeyen hata'
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        alert('Kargo fişi oluşturulamadı: ' + errorMessage)
      }
    } catch (error: any) {
      console.error('Kargo fişi oluşturma hatası:', error)
      alert('Kargo fişi oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      processing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      completed: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
    }
    return labels[status] || status
  }

  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.externalOrderId.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Trendyol Siparişleri
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Trendyol'dan gelen siparişleri görüntüleyin ve yönetin
                  {totalOrders > 0 && (
                    <span className="ml-2 font-semibold text-orange-600 dark:text-orange-400">
                      (Toplam: {totalOrders} sipariş • {totalAmount.toFixed(2)} TRY)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-colors font-medium"
              title="Siparişleri Trendyol'dan Yeniden Çek"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Yenileniyor...' : 'Yenile'}
            </button>
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
          {refreshMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {refreshMessage}
            </motion.div>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sipariş numarası, müşteri adı veya e-posta ile ara..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="processing">İşleniyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>
            </div>
            {/* Tarih Filtresi */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Başlangıç:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Bitiş:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">Henüz Trendyol siparişi bulunmuyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleOrderClick(order)}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        🛒 {order.externalOrderId}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                        Trendyol
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.cargoSlipPrintedAt && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 flex items-center gap-1">
                          <Printer className="w-3 h-3" />
                          Kargo Gişi Yazıldı
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {order.customerName && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                          <span>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerEmail && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{order.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(order.syncedAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>{Number(order.totalAmount || 0).toFixed(2)} TRY</span>
                      </div>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Sipariş Öğeleri ({order.items.length})
                        </p>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span>{item.productName}</span>
                              <span className="text-slate-400">x{item.quantity}</span>
                              <span className="ml-auto font-medium">{Number(item.price || 0).toFixed(2)} TRY</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              +{order.items.length - 3} ürün daha
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        <AnimatePresence>
          {showOrderDetailModal && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowOrderDetailModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Sipariş Detayı
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        🛒 Trendyol - {selectedOrder.externalOrderId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleShowInvoices}
                        className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Faturaları Görüntüle"
                      >
                        <Receipt className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleGenerateCargoSlip}
                        className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        title="Kargo Fişi Oluştur"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowJsonModal(true)
                        }}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="JSON Verisini Görüntüle"
                      >
                        <FileJson className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowOrderDetailModal(false)
                          setSelectedOrder(null)
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Fatura Seçimi */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Fatura Bilgileri</h3>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                      {/* Fatura Linki */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Fatura Linki (Opsiyonel)
                        </label>
                        <input
                          type="text"
                          value={invoiceLink}
                          onChange={(e) => {
                            setInvoiceLink(e.target.value)
                            if (e.target.value.trim()) {
                              setSelectedInvoiceId(null)
                            }
                          }}
                          placeholder="https://api.huglutekstil.com/api/invoices/share/..."
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {invoiceLink && invoiceLink.trim() && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Fatura linki girildi. Bu link QR kodda kullanılacak.
                          </p>
                        )}
                      </div>
                      
                      {/* Fatura Seçimi - Link girildiğinde devre dışı */}
                      {invoices.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Kargo Fişi için Fatura Seçimi
                          </label>
                          <select
                            value={selectedInvoiceId || ''}
                            onChange={(e) => {
                              setSelectedInvoiceId(Number(e.target.value))
                              if (e.target.value) {
                                setInvoiceLink('')
                              }
                            }}
                            disabled={!!(invoiceLink && invoiceLink.trim())}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              invoiceLink && invoiceLink.trim() 
                                ? 'opacity-50 cursor-not-allowed' 
                                : ''
                            }`}
                          >
                            <option value="">Fatura Seçiniz</option>
                            {invoices.map((invoice) => (
                              <option key={invoice.id} value={invoice.id}>
                                {invoice.invoiceNumber || `Fatura #${invoice.id}`} 
                                {invoice.fileName && ` - ${invoice.fileName}`}
                                {invoice.totalAmount && ` (${Number(invoice.totalAmount).toFixed(2)} ${invoice.currency || 'TRY'})`}
                              </option>
                            ))}
                          </select>
                          {selectedInvoiceId && !invoiceLink && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                              Seçili fatura kargo fişindeki QR kodda kullanılacak
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Müşteri Bilgileri */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Müşteri Bilgileri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.customerName && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Ad Soyad</label>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedOrder.customerName}</p>
                        </div>
                      )}
                      {selectedOrder.customerEmail && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">E-posta</label>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedOrder.customerEmail}</p>
                        </div>
                      )}
                      {selectedOrder.customerPhone && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Telefon</label>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedOrder.customerPhone}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm text-slate-600 dark:text-slate-400">Durum</label>
                        <p className="text-slate-900 dark:text-white font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                            {getStatusLabel(selectedOrder.status)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Adres Bilgileri */}
                  {(selectedOrder.shippingAddress || selectedOrder.city || selectedOrder.district) && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Teslimat Adresi</h3>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                        <p className="text-slate-900 dark:text-white">
                          {selectedOrder.shippingAddress || selectedOrder.fullAddress}
                        </p>
                        {(selectedOrder.city || selectedOrder.district) && (
                          <p className="text-slate-600 dark:text-slate-400 mt-2">
                            {selectedOrder.district && `${selectedOrder.district}, `}{selectedOrder.city}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sipariş Öğeleri */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Sipariş Öğeleri ({selectedOrder.items.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            {item.productImage && (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                              {item.productSku && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">SKU: {item.productSku}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-600 dark:text-slate-400">Adet: {item.quantity}</p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {Number(item.price || 0).toFixed(2)} TRY
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Toplam: {(Number(item.price || 0) * item.quantity).toFixed(2)} TRY
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toplam Tutar */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">Toplam Tutar</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {Number(selectedOrder.totalAmount || 0).toFixed(2)} TRY
                      </span>
                    </div>
                  </div>

                  {/* Kargo Bilgileri */}
                  {(() => {
                    if (!selectedOrder.orderData) return null
                    try {
                      const orderData = typeof selectedOrder.orderData === 'string' 
                        ? JSON.parse(selectedOrder.orderData)
                        : selectedOrder.orderData
                      const cargoTrackingNumber = orderData?.cargoTrackingNumber
                      const cargoProviderName = orderData?.cargoProviderName
                      
                      if (!cargoTrackingNumber && !cargoProviderName) return null
                      
                      return (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Kargo Bilgileri</h3>
                          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                            {cargoProviderName && (
                              <div>
                                <label className="text-sm text-slate-600 dark:text-slate-400">Kargo Firması</label>
                                <p className="text-slate-900 dark:text-white font-medium">
                                  {cargoProviderName}
                                </p>
                              </div>
                            )}
                            {cargoTrackingNumber && (
                              <div>
                                <label className="text-sm text-slate-600 dark:text-slate-400">Kargo Kodu</label>
                                <p className="text-slate-900 dark:text-white font-medium">
                                  {cargoTrackingNumber}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    } catch (error) {
                      return null
                    }
                  })()}

                  {/* Sipariş Tarihleri */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400">Senkronize Tarihi</label>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {new Date(selectedOrder.syncedAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400">Oluşturulma Tarihi</label>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* JSON Data Modal */}
        <AnimatePresence>
          {showJsonModal && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowJsonModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Code className="w-6 h-6" />
                        JSON Verisi
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Sipariş: {selectedOrder.externalOrderId}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowJsonModal(false)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap break-words">
                      {(() => {
                        try {
                          const jsonData = selectedOrder.orderData 
                            ? (typeof selectedOrder.orderData === 'string' 
                                ? JSON.parse(selectedOrder.orderData)
                                : selectedOrder.orderData)
                            : null
                          
                          if (!jsonData) {
                            return 'JSON verisi bulunamadı'
                          }
                          
                          return JSON.stringify(jsonData, null, 2)
                        } catch (error) {
                          return `JSON parse hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                        }
                      })()}
                    </pre>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        try {
                          const jsonData = selectedOrder.orderData 
                            ? (typeof selectedOrder.orderData === 'string' 
                                ? JSON.parse(selectedOrder.orderData)
                                : selectedOrder.orderData)
                            : null
                          
                          if (jsonData) {
                            const jsonString = JSON.stringify(jsonData, null, 2)
                            navigator.clipboard.writeText(jsonString)
                            alert('JSON verisi panoya kopyalandı!')
                          }
                        } catch (error) {
                          alert('Kopyalama hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FileJson className="w-4 h-4" />
                      Kopyala
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Invoices Modal */}
        <AnimatePresence>
          {showInvoicesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowInvoicesModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6" />
                        PDF Faturalar
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Sisteme yüklenmiş tüm faturalar
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowInvoicesModal(false)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {invoicesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">Henüz fatura yüklenmemiş</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {invoice.invoiceNumber || `Fatura #${invoice.id}`}
                                </h3>
                                {invoice.fileName && (
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {invoice.fileName}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {invoice.customerName && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Müşteri</label>
                                    <p className="text-slate-900 dark:text-white">{invoice.customerName}</p>
                                  </div>
                                )}
                                {invoice.totalAmount && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Tutar</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {Number(invoice.totalAmount).toFixed(2)} {invoice.currency || 'TRY'}
                                    </p>
                                  </div>
                                )}
                                {invoice.invoiceDate && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Tarih</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}
                                    </p>
                                  </div>
                                )}
                                {invoice.fileSize && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Boyut</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {(invoice.fileSize / 1024).toFixed(2)} KB
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {(() => {
                                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
                                const token = sessionStorage.getItem('authToken') || ''
                                const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                                const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
                                
                                // Admin endpoint ile direkt PDF erişimi
                                const viewUrl = invoice.id 
                                  ? `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                                  : invoice.shareUrl 
                                    ? `${invoice.shareUrl}/download`
                                    : null
                                
                                const downloadUrl = invoice.id
                                  ? `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                                  : invoice.shareUrl
                                    ? `${invoice.shareUrl}/download`
                                    : null

                                if (!viewUrl || !downloadUrl) return null

                                return (
                                  <>
                                    <button
                                      onClick={() => {
                                        // PDF'i yeni sekmede aç
                                        const link = document.createElement('a')
                                        link.href = viewUrl
                                        link.target = '_blank'
                                        link.rel = 'noopener noreferrer'
                                        // Auth headers için fetch kullan
                                        fetch(viewUrl, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'X-API-Key': API_KEY,
                                            'X-Admin-Key': ADMIN_KEY
                                          }
                                        })
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob)
                                            window.open(url, '_blank')
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100)
                                          })
                                          .catch(err => {
                                            console.error('PDF görüntüleme hatası:', err)
                                            alert('PDF görüntülenemedi')
                                          })
                                      }}
                                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      title="Görüntüle"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        // PDF'i indir
                                        fetch(downloadUrl, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'X-API-Key': API_KEY,
                                            'X-Admin-Key': ADMIN_KEY
                                          }
                                        })
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = invoice.fileName || `fatura-${invoice.id}.pdf`
                                            document.body.appendChild(a)
                                            a.click()
                                            window.URL.revokeObjectURL(url)
                                            document.body.removeChild(a)
                                          })
                                          .catch(err => {
                                            console.error('PDF indirme hatası:', err)
                                            alert('PDF indirilemedi')
                                          })
                                      }}
                                      className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                      title="İndir"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

