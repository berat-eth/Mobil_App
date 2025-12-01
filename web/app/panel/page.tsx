'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/utils/api'
import Link from 'next/link'
import type { Order } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  })

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      setOrders([])
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
      })
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await ordersApi.getUserOrders(user.id)
      
      if (response && response.success) {
        const ordersData = Array.isArray(response.data) ? response.data : []
        setOrders(ordersData)
        setStats({
          totalOrders: ordersData.length,
          pendingOrders: ordersData.filter((o) => 
            o.status === 'pending' || 
            o.status === 'processing' ||
            o.status === 'Pending' ||
            o.status === 'Processing'
          ).length,
          completedOrders: ordersData.filter((o) => 
            o.status === 'completed' || 
            o.status === 'delivered' ||
            o.status === 'Completed' ||
            o.status === 'Delivered'
          ).length,
        })
      } else {
        // Response başarısız ama data var olabilir (boş liste)
        setOrders([])
        setStats({
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
        })
        // Uyarı verme, boş liste normal olabilir
      }
    } catch (err) {
      console.error('Dashboard - Siparişler yüklenemedi:', err)
      const errorMsg = err instanceof Error ? err.message : 'Siparişler yüklenirken bir hata oluştu'
      setError(errorMsg)
      setOrders([])
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    // User undefined ise henüz yükleniyor, bekle
    if (user === undefined) {
      return
    }
    
    // User null ise giriş yapılmamış
    if (user === null) {
      setLoading(false)
      setOrders([])
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
      })
      return
    }
    
    // User var ve id varsa siparişleri yükle
    if (user?.id) {
      loadOrders()
    } else {
      setLoading(false)
    }
  }, [user, loadOrders])

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

  const handleCreateQuoteFromOrder = (order: Order) => {
    // Sipariş bilgilerini localStorage'a kaydet (teklif sayfasında kullanılacak)
    const orderData = {
      orderId: order.id,
      items: order.items || [],
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      shippingAddress: order.shippingAddress || order.fullAddress || '',
      city: order.city || '',
      district: order.district || '',
    }
    
    localStorage.setItem('quoteFromOrder', JSON.stringify(orderData))
    
    // Teklif sayfasına yönlendir
    router.push('/teklif-al?fromOrder=true')
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-2xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
          Hoş Geldiniz, {user?.name || 'Kullanıcı'}!
        </h1>
        <p className="text-blue-100 text-sm sm:text-base md:text-lg">
          Hesabınızı yönetin, siparişlerinizi takip edin ve daha fazlasını keşfedin.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Toplam Sipariş</h3>
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl md:text-2xl">shopping_bag</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{stats.totalOrders}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Bekleyen</h3>
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl md:text-2xl">pending</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{stats.pendingOrders}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Tamamlanan</h3>
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl md:text-2xl">check_circle</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{stats.completedOrders}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Son Siparişlerim</h2>
          {orders.length > 0 && (
            <Link
              href="/panel/siparisler"
              className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Tümünü Gör
              <span className="material-symbols-outlined text-base sm:text-lg">arrow_forward</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
              sync
            </span>
            <p className="text-gray-600 dark:text-gray-400">Siparişler yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 dark:text-red-500 mb-4">
              error
            </span>
            <p className="text-gray-600 dark:text-gray-400 mb-4 font-semibold">{error}</p>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              <span className="material-symbols-outlined">refresh</span>
              Tekrar Dene
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
              shopping_bag
            </span>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz siparişiniz yok</p>
            <Link
              href="/urunler"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Ürünleri Keşfet
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-4 mb-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">Sipariş #{order.id}</h3>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }) : 'Tarih bilgisi yok'}
                    </p>
                    {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {order.items.length} ürün
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 pt-2 border-t border-gray-100 dark:border-gray-700 sm:border-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                        {typeof order.totalAmount === 'number' 
                          ? order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
                          : 'Fiyat bilgisi yok'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateQuoteFromOrder(order)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                      title="Bu siparişten yeni teklif oluştur"
                    >
                      <span className="material-symbols-outlined text-base sm:text-lg">description</span>
                      <span>Teklif Oluştur</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link
          href="/panel/adresler"
          className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl text-purple-600 dark:text-purple-400 mb-2 sm:mb-3 block">
            location_on
          </span>
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1">Adreslerim</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Teslimat adresleri</p>
        </Link>

        <Link
          href="/panel/teklifler"
          className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl text-green-600 dark:text-green-400 mb-2 sm:mb-3 block">
            description
          </span>
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1">Tekliflerim</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Teklif takibi</p>
        </Link>

        <Link
          href="/panel/destek"
          className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105 sm:col-span-2 lg:col-span-1"
        >
          <span className="material-symbols-outlined text-3xl sm:text-4xl text-blue-600 dark:text-blue-400 mb-2 sm:mb-3 block">
            support_agent
          </span>
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1">Destek</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Yardım ve destek</p>
        </Link>
      </div>
    </div>
  )
}

