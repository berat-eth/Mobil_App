'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/utils/api'
import type { Order } from '@/lib/types'

export default function PaymentHistoryPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadOrders()
    }
  }, [user])

  const loadOrders = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await ordersApi.getUserOrders(user.id)
      if (response.success && response.data) {
        setOrders(response.data as Order[])
      }
    } catch (error) {
      console.error('Ödeme geçmişi yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentStatus = (order: Order) => {
    if (order.status === 'completed' || order.status === 'delivered') {
      return { text: 'Ödendi', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' }
    }
    if (order.status === 'cancelled') {
      return { text: 'İptal Edildi', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
    }
    return { text: 'Beklemede', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
        Ödeme Geçmişi
      </h1>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Ödeme geçmişi yükleniyor...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            receipt_long
          </span>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz ödeme geçmişi yok</p>
          <a
            href="/urunler"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Ürünleri Keşfet
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map((order) => {
              const paymentStatus = getPaymentStatus(order)
              return (
                <div key={order.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">Sipariş #{order.id}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentStatus.color}`}>
                          {paymentStatus.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {order.paymentMethod && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Ödeme Yöntemi: {order.paymentMethod}
                        </p>
                      )}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Toplam Ödeme:</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {orders
                  .filter((o) => o.status === 'completed' || o.status === 'delivered')
                  .reduce((sum, o) => sum + o.totalAmount, 0)
                  .toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

