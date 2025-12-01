'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi, customProductionApi } from '@/utils/api'
import type { Order } from '@/lib/types'
import Image from 'next/image'

export default function OrdersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [customRequests, setCustomRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reorderingOrderId, setReorderingOrderId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadOrders()
      loadCustomRequests()
    }
  }, [user])

  const loadOrders = async () => {
    if (!user?.id) return
    try {
      const response = await ordersApi.getUserOrders(user.id)
      if (response.success && response.data) {
        setOrders(response.data as Order[])
      }
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error)
    }
  }

  const loadCustomRequests = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await customProductionApi.getUserRequests(user.id)
      if (response.success && response.data) {
        setCustomRequests(response.data as any[])
      }
    } catch (error) {
      console.error('Özel üretim talepleri yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi',
    }
    return statusMap[status.toLowerCase()] || status
  }

  const handleReorder = async (order: Order) => {
    if (!order.items || order.items.length === 0) {
      alert('Bu siparişte ürün bulunamadı')
      return
    }

    setReorderingOrderId(order.id)
    
    try {
      // Sipariş ürünlerini localStorage'a kaydet (sepet sayfasında kullanılacak)
      const orderItems = order.items.map(item => ({
        productId: (item as any).productId || (item as any).id,
        quantity: item.quantity,
        price: item.price,
        productName: item.productName,
        productImage: item.productImage
      }))

      // Sepet verisini localStorage'a kaydet
      localStorage.setItem('reorderItems', JSON.stringify({
        orderId: order.id,
        items: orderItems,
        createdAt: new Date().toISOString()
      }))

      // Sepet sayfasına yönlendir
      router.push('/sepet?reorder=true')
    } catch (error) {
      console.error('Sipariş tekrarı hatası:', error)
      alert('Sipariş tekrarı sırasında bir hata oluştu')
    } finally {
      setReorderingOrderId(null)
    }
  }

  // Sık sipariş edilen ürünleri hesapla
  const getFrequentlyOrderedProducts = () => {
    const productCounts: Record<number, { count: number; lastOrdered: Date; product: any }> = {}
    
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const productId = (item as any).productId || (item as any).id
          if (productId) {
            if (!productCounts[productId]) {
              productCounts[productId] = {
                count: 0,
                lastOrdered: new Date(order.createdAt),
                product: item
              }
            }
            productCounts[productId].count += item.quantity
            const orderDate = new Date(order.createdAt)
            if (orderDate > productCounts[productId].lastOrdered) {
              productCounts[productId].lastOrdered = orderDate
            }
          }
        })
      }
    })

    // En çok sipariş edilen 5 ürünü döndür
    return Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const frequentlyOrdered = getFrequentlyOrderedProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Siparişlerim
        </h1>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Siparişler yükleniyor...</p>
        </div>
      ) : orders.length === 0 && customRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            shopping_bag
          </span>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz siparişiniz yok</p>
          <a
            href="/urunler"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Ürünleri Keşfet
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sık Sipariş Edilenler */}
          {frequentlyOrdered.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">star</span>
                Sık Sipariş Edilenler
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {frequentlyOrdered.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => {
                      const productId = (item.product as any).productId || (item.product as any).id
                      if (productId) {
                        router.push(`/panel/urunler/${productId}`)
                      }
                    }}
                  >
                    {item.product.productImage ? (
                      <Image
                        src={item.product.productImage}
                        alt={item.product.productName || 'Ürün'}
                        width={50}
                        height={50}
                        className="rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400">image</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {item.product.productName || 'Ürün'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.count} kez sipariş edildi
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const productId = (item.product as any).productId || (item.product as any).id
                        if (productId) {
                          localStorage.setItem('reorderItems', JSON.stringify({
                            items: [{
                              productId,
                              quantity: 1,
                              price: item.product.price,
                              productName: item.product.productName,
                              productImage: item.product.productImage
                            }]
                          }))
                          router.push('/sepet?reorder=true')
                        }
                      }}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Sepete Ekle"
                    >
                      <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Production Requests */}
          <div className="space-y-4">
          {customRequests.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Özel Üretim Talepleri</h2>
              {customRequests.map((request) => (
                <div
                  key={`request-${request.id}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {request.requestNumber || `Talep #${request.id}`}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.quoteStatus === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            request.quoteStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            request.quoteStatus === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {request.quoteStatus === 'accepted' ? 'Teklif Onaylandı' :
                             request.quoteStatus === 'rejected' ? 'Teklif Reddedildi' :
                             request.quoteStatus === 'sent' ? 'Teklif Bekleniyor' :
                             request.status === 'completed' ? 'Tamamlandı' :
                             request.status === 'cancelled' ? 'İptal Edildi' :
                             'Beklemede'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      {request.quoteAmount && (
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            ₺{Number(request.quoteAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Teklif Tutarı
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.items && request.items.length > 0 && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Ürünler</h4>
                      <div className="space-y-3">
                        {request.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-start gap-4">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName || 'Ürün'}
                                width={60}
                                height={60}
                                className="rounded-lg object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-15 h-15 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-400">image</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.productName || `Ürün #${item.productId}`}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Adet: {item.quantity}
                              </p>
                              {item.customizations && (() => {
                                try {
                                  const customizations = typeof item.customizations === 'string' 
                                    ? JSON.parse(item.customizations) 
                                    : item.customizations;
                                  if (customizations?.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
                                    return (
                                      <div className="mt-2">
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Beden Dağılımı:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {customizations.sizes.map((sizeItem: any, sizeIdx: number) => (
                                            <span 
                                              key={sizeIdx}
                                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                                            >
                                              {sizeItem.size}: {sizeItem.quantity}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  }
                                } catch {}
                                return null
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Regular Orders */}
          {orders.length > 0 && (
            <>
              {customRequests.length > 0 && <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 mt-6">Siparişlerim</h2>}
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sipariş #{order.id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {order.shippingAddress && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            <span className="material-symbols-outlined text-sm align-middle">location_on</span>
                            {' '}
                            {order.city && `${order.city}, `}
                            {order.district && `${order.district}, `}
                            {order.shippingAddress}
                          </p>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                          {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                        {order.paymentMethod && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Ödeme: {order.paymentMethod}
                          </p>
                        )}
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={reorderingOrderId === order.id}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-base">
                            {reorderingOrderId === order.id ? 'sync' : 'refresh'}
                          </span>
                          {reorderingOrderId === order.id ? 'Ekleniyor...' : 'Siparişi Tekrarla'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sipariş Detayları</h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-4">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName || 'Ürün'}
                                width={60}
                                height={60}
                                className="rounded-lg object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-15 h-15 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-400">image</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.productName || 'Ürün'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Adet: {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

