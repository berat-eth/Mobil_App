'use client'

import { useState, useEffect, useMemo } from 'react'
import { Radio, Users, ShoppingCart, Eye, TrendingUp, Clock, MousePointer, MapPin, Smartphone, Monitor, Tablet, Globe, Search, Heart, Share2, Filter, ArrowRight, Activity, Zap, Target, BarChart3, TrendingDown, RefreshCw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '@/lib/api'

interface UserSession {
  id: number
  user: string
  sessionId: string
  device: 'desktop' | 'mobile' | 'tablet'
  location: string
  currentPage: string
  timeOnSite: number
  pagesViewed: number
  productsViewed: string[]
  timePerProduct: { product: string; time: number; price: number }[]
  cartItems: number
  cartValue: number
  status: 'browsing' | 'cart' | 'checkout' | 'purchased'
  lastAction: string
  timestamp: string
}

interface ProductView {
  product: string
  productId?: number
  productName?: string
  productImage?: string
  views: number
  avgTime: number
  addToCart: number
  purchases: number
  conversionRate: number
}

export default function LiveData() {
  const [selectedUser, setSelectedUser] = useState<UserSession | null>(null)
  const [filterDevice, setFilterDevice] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [productViews, setProductViews] = useState<ProductView[]>([])

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return Monitor
      case 'mobile': return Smartphone
      case 'tablet': return Tablet
      default: return Monitor
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'browsing': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'cart': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'checkout': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'purchased': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
    }
  }

  // Fetch live users and product views
  const fetchLiveData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [liveUsersRes, liveViewsRes] = await Promise.all([
        api.get<any>('/admin/live-users'),
        api.get<any>('/admin/live-views')
      ])

      // Transform live users to UserSession format
      if (liveUsersRes?.success && Array.isArray(liveUsersRes.data)) {
        const sessions: UserSession[] = liveUsersRes.data.map((user: any, index: number) => {
          // Calculate time on site from duration or last activity
          const lastActivity = new Date(user.lastActivity)
          const now = new Date()
          const timeOnSiteSeconds = user.duration || Math.floor((now.getTime() - lastActivity.getTime()) / 1000)

          // Determine status based on page
          let status: 'browsing' | 'cart' | 'checkout' | 'purchased' = 'browsing'
          if (user.page?.toLowerCase().includes('cart') || user.page?.toLowerCase().includes('sepet')) {
            status = 'cart'
          } else if (user.page?.toLowerCase().includes('checkout') || user.page?.toLowerCase().includes('ödeme')) {
            status = 'checkout'
          }

          return {
            id: user.id || index,
            user: user.userName || user.userId || 'Misafir Kullanıcı',
            sessionId: user.sessionId || `session-${index}`,
            device: (user.device?.toLowerCase().includes('mobile') ? 'mobile' : 
                     user.device?.toLowerCase().includes('tablet') ? 'tablet' : 'desktop') as 'desktop' | 'mobile' | 'tablet',
            location: `${user.city || 'Bilinmiyor'}, ${user.country || 'Bilinmiyor'}`,
            currentPage: user.page || 'Ana Sayfa',
            timeOnSite: timeOnSiteSeconds,
            pagesViewed: 1, // Could be enhanced with page view tracking
            productsViewed: [], // Will be populated from product views
            timePerProduct: [],
            cartItems: 0,
            cartValue: 0,
            status,
            lastAction: 'Sayfa görüntüleme',
            timestamp: new Date(user.lastActivity).toLocaleString('tr-TR')
          }
        })
        setUserSessions(sessions)
      } else {
        setUserSessions([])
      }

      // Transform product views
      if (liveViewsRes?.success && Array.isArray(liveViewsRes.data)) {
        // Group by product and calculate stats
        const productMap = new Map<string | number, {
          productName: string
          productId?: number
          productImage?: string
          views: number
          totalTime: number
          addToCart: number
          purchases: number
        }>()

        liveViewsRes.data.forEach((view: any) => {
          const productId = view.productId
          const productName = view.productName || 'Bilinmeyen Ürün'
          const key = productId || productName
          
          const existing = productMap.get(key) || {
            productName,
            productId,
            productImage: view.productImage,
            views: 0,
            totalTime: 0,
            addToCart: 0,
            purchases: 0
          }

          existing.views++
          existing.totalTime += view.dwellSeconds || 0
          if (view.addedToCart) existing.addToCart++
          if (view.purchased) existing.purchases++
          // İlk kayıttan productId ve productImage'i al
          if (!existing.productId && productId) existing.productId = productId
          if (!existing.productImage && view.productImage) existing.productImage = view.productImage

          productMap.set(key, existing)
        })

        const views: ProductView[] = Array.from(productMap.values())
          .map((stats) => ({
            product: stats.productName,
            productId: stats.productId,
            productName: stats.productName,
            productImage: stats.productImage,
            views: stats.views,
            avgTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
            addToCart: stats.addToCart,
            purchases: stats.purchases,
            conversionRate: stats.views > 0 ? Math.round((stats.purchases / stats.views) * 100) / 100 : 0
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10) // Top 10

        // Ürün bilgilerini çek (productId varsa) - paralel olarak
        const productIds = views.filter(v => v.productId).map(v => v.productId!)
        if (productIds.length > 0) {
          try {
            // Paralel olarak tüm ürünleri çek
            const productPromises = productIds.map(id => 
              api.get<any>(`/products/${id}`).catch(() => null)
            )
            const productResults = await Promise.allSettled(productPromises)
            
            const productsMap = new Map<number, any>()
            productResults.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value?.success && result.value?.data) {
                const product = result.value.data
                productsMap.set(productIds[index], product)
              }
            })
            
            // Ürün bilgilerini güncelle
            views.forEach(view => {
              if (view.productId) {
                const product = productsMap.get(view.productId)
                if (product) {
                  view.productName = product.name || view.productName
                  view.productImage = product.image || product.image1 || product.image2 || view.productImage
                  view.product = product.name || view.product
                }
              }
            })
          } catch (err) {
            console.error('Ürün bilgileri yüklenemedi:', err)
          }
        }

        setProductViews(views)
      } else {
        setProductViews([])
      }
    } catch (err: any) {
      console.error('❌ Canlı veriler yüklenemedi:', err)
      setError(err?.message || 'Canlı veriler yüklenemedi')
      setUserSessions([])
      setProductViews([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveData()
    // 30 saniyede bir otomatik yenile
    const interval = setInterval(fetchLiveData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate device distribution
  const deviceData = useMemo(() => {
    const deviceCounts = {
      desktop: 0,
      mobile: 0,
      tablet: 0
    }

    userSessions.forEach(session => {
      if (session.device === 'desktop') deviceCounts.desktop++
      else if (session.device === 'mobile') deviceCounts.mobile++
      else if (session.device === 'tablet') deviceCounts.tablet++
    })

    const total = deviceCounts.desktop + deviceCounts.mobile + deviceCounts.tablet
    if (total === 0) return []

    const colors = ['#6366f1', '#10b981', '#f59e0b']
    return [
      { name: 'Desktop', value: Math.round((deviceCounts.desktop / total) * 100), color: colors[0] },
      { name: 'Mobile', value: Math.round((deviceCounts.mobile / total) * 100), color: colors[1] },
      { name: 'Tablet', value: Math.round((deviceCounts.tablet / total) * 100), color: colors[2] }
    ]
  }, [userSessions])

  // Calculate hourly activity
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const activityMap = new Map<number, { users: number; views: number }>()

    hours.forEach(hour => {
      activityMap.set(hour, { users: 0, views: 0 })
    })

    // Count active users by hour (simplified - using current hour for now)
    const now = new Date()
    const currentHour = now.getHours()
    activityMap.set(currentHour, {
      users: userSessions.length,
      views: productViews.reduce((sum, p) => sum + p.views, 0)
    })

    return Array.from(activityMap.entries())
      .map(([hour, stats]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        users: stats.users,
        views: stats.views
      }))
      .slice(Math.max(0, currentHour - 11), currentHour + 1) // Son 12 saat
  }, [userSessions, productViews])

  const filteredSessions = filterDevice === 'all'
    ? userSessions
    : userSessions.filter(s => s.device === filterDevice)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Canlı Kullanıcı Davranışları</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerçek zamanlı detaylı kullanıcı takibi ve analizi</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">CANLI</span>
          </div>
          <button
            onClick={fetchLiveData}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && userSessions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          <span className="ml-3 text-slate-600 dark:text-slate-400">Veriler yükleniyor...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Ana İstatistikler */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Aktif Kullanıcı</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{userSessions.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Toplam Görüntüleme</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {productViews.reduce((sum, p) => sum + p.views, 0).toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 rounded-xl p-6 border border-orange-200 dark:border-orange-800"
          >
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Sepete Eklenen</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {productViews.reduce((sum, p) => sum + p.addToCart, 0)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-xl p-6 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Dönüşüm Oranı</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {productViews.length > 0
                ? `${(productViews.reduce((sum, p) => sum + p.conversionRate, 0) / productViews.length).toFixed(1)}%`
                : '0%'}
            </p>
          </motion.div>
        </div>
      )}

      {/* Cihaz Dağılımı ve Saatlik Aktivite */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Cihaz Dağılımı</h3>
          <ResponsiveContainer width="100%" height={200}>
            {deviceData && deviceData.length > 0 ? (
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {deviceData.map((device) => (
              <div key={device.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{device.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{device.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Saatlik Aktivite</h3>
          <ResponsiveContainer width="100%" height={200}>
            {hourlyActivity && hourlyActivity.length > 0 ? (
            <LineChart data={hourlyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="hour" stroke="#94a3b8" className="dark:stroke-slate-400" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" className="dark:stroke-slate-400" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Kullanıcılar" />
              <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} name="Görüntüleme" />
            </LineChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* En Çok Görüntülenen Ürünler */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">En Çok Görüntülenen Ürünler</h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">Tümünü Gör</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Görüntüleme</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ort. Süre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Sepete Eklenme</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Satış</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Dönüşüm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {productViews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    Henüz ürün görüntüleme verisi yok
                  </td>
                </tr>
              ) : (
                productViews.map((product, index) => (
                <motion.tr
                  key={product.product}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      {product.productImage ? (
                        <img 
                          src={product.productImage} 
                          alt={product.productName || product.product}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {product.productName || product.product}
                        </p>
                        {product.productId && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: {product.productId}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{product.views.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-slate-600 dark:text-slate-300">{product.avgTime}s</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-slate-600 dark:text-slate-300">{product.addToCart}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-green-600 dark:text-green-400">{product.purchases}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 max-w-[100px]">
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                            style={{ width: `${product.conversionRate * 10}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">{product.conversionRate}%</span>
                    </div>
                  </td>
                </motion.tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aktif Kullanıcı Oturumları */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <Radio className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 animate-pulse" />
            Aktif Kullanıcı Oturumları
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterDevice('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterDevice === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterDevice('desktop')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${filterDevice === 'desktop' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setFilterDevice('mobile')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${filterDevice === 'mobile' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile</span>
            </button>
            <button
              onClick={() => setFilterDevice('tablet')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${filterDevice === 'tablet' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              <Tablet className="w-4 h-4" />
              <span>Tablet</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Şu anda aktif kullanıcı oturumu yok</p>
            </div>
          ) : (
            filteredSessions.map((session, index) => {
            const DeviceIcon = getDeviceIcon(session.device)
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg dark:hover:shadow-xl transition-all cursor-pointer bg-white dark:bg-slate-800"
                onClick={() => setSelectedUser(session)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {session.user.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{session.user}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                          {session.status === 'browsing' ? 'Geziniyor' :
                            session.status === 'cart' ? 'Sepette' :
                              session.status === 'checkout' ? 'Ödeme' : 'Satın Aldı'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <DeviceIcon className="w-3.5 h-3.5" />
                          <span>{session.device}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{session.location}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{Math.floor(session.timeOnSite / 60)}:{(session.timeOnSite % 60).toString().padStart(2, '0')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{session.timestamp}</p>
                    {session.cartValue > 0 && (
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">₺{session.cartValue.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Şu An</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{session.currentPage}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Görüntülenen</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{session.pagesViewed} sayfa</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ürün</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{session.productsViewed.length} ürün</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sepet</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{session.cartItems} ürün</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MousePointer className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{session.lastAction}</span>
                  </div>
                  <button className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                    <span>Detayları Gör</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )
          })
          )}
        </div>
      </div>

      {/* Kullanıcı Detay Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedUser.user.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedUser.user}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Oturum ID: {selectedUser.sessionId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-800 dark:text-slate-100" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Oturum Bilgileri */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status === 'browsing' ? 'Geziniyor' :
                          selectedUser.status === 'cart' ? 'Sepette' :
                            selectedUser.status === 'checkout' ? 'Ödeme' : 'Satın Aldı'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Sitede Geçirilen Süre</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {Math.floor(selectedUser.timeOnSite / 60)}:{(selectedUser.timeOnSite % 60).toString().padStart(2, '0')}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                    <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Görüntülenen Sayfa</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedUser.pagesViewed}</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                    <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Sepetteki Ürün</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedUser.cartItems}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Sepet Değeri</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">₺{selectedUser.cartValue.toLocaleString()}</p>
                  </div>
                </div>

                {/* Cihaz ve Konum */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-3">
                      {(() => {
                        const DeviceIcon = getDeviceIcon(selectedUser.device)
                        return <DeviceIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      })()}
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Cihaz Bilgisi</h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 capitalize">{selectedUser.device}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Konum</h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{selectedUser.location}</p>
                  </div>
                </div>

                {/* Görüntülenen Ürünler ve Süreleri */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Ürün Görüntüleme Detayları
                  </h4>
                  <div className="space-y-3">
                    {selectedUser.timePerProduct.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{item.product}</p>
                            <p className="text-sm text-green-600 dark:text-green-400 font-bold">₺{item.price.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2 mb-1">
                              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.time}s</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Görüntüleme süresi</p>
                          </div>
                        </div>
                        <div className="relative h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.time / 185) * 100}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Davranış Analizi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4">İlgi Alanları</h4>
                    <div className="space-y-2">
                      {selectedUser.productsViewed.map((product, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{product}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Satın Alma Potansiyeli</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600 dark:text-slate-300">İlgi Seviyesi</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">Yüksek</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600 dark:text-slate-300">Dönüşüm İhtimali</span>
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">Orta</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-amber-600 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Önerilen Aksiyonlar */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl p-6 text-white">
                  <h4 className="font-bold mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                    Önerilen Aksiyonlar
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 transition-colors text-left">
                      <p className="text-sm font-medium mb-1">İndirim Kuponu Gönder</p>
                      <p className="text-xs text-slate-300">%10 indirim fırsatı</p>
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 transition-colors text-left">
                      <p className="text-sm font-medium mb-1">Canlı Destek</p>
                      <p className="text-xs text-slate-300">Anlık yardım teklif et</p>
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 transition-colors text-left">
                      <p className="text-sm font-medium mb-1">Ürün Öner</p>
                      <p className="text-xs text-slate-300">Benzer ürünleri göster</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
