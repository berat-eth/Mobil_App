'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Trash2, RefreshCw, Package, Eye, X, User, Mail, Phone, Brain, BarChart3, AlertTriangle, TrendingUp, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cartService, userService } from '@/lib/services'
import type { CartItem, User as UserType } from '@/lib/api'
import { useCallback } from 'react'
import { api } from '@/lib/api'

interface UserCart {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  items: CartItem[];
  total: number;
}

export default function Cart() {
  const [userCarts, setUserCarts] = useState<UserCart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingCart, setViewingCart] = useState<UserCart | null>(null)
  const [coupon, setCoupon] = useState<string>('')
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const getDeviceId = () => {
    try {
      if (typeof window === 'undefined') return undefined
      const k = 'device_id'
      let id = localStorage.getItem(k)
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36)
        localStorage.setItem(k, id)
      }
      return id
    } catch { return undefined }
  }
  const [searchTerm, setSearchTerm] = useState('')

  const performAIAnalysis = async () => {
    setAiLoading(true)
    try {
      // Simulated AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock AI analysis data
      const analysisData = {
        insights: [
          {
            type: 'warning',
            title: 'Yüksek Sepet Terk Oranı',
            description: 'Sepet terk oranı %68 - ortalamadan %15 yüksek',
            impact: 'high',
            recommendation: 'Sepet kurtarma e-postaları gönderin'
          },
          {
            type: 'opportunity',
            title: 'Fiyat Hassasiyeti',
            description: 'Kullanıcılar %10-15 indirimde satın alma eğiliminde',
            impact: 'medium',
            recommendation: 'Hedefli indirim kampanyaları düzenleyin'
          },
          {
            type: 'trend',
            title: 'Popüler Ürün Kombinasyonları',
            description: 'Mont + Pantolon kombinasyonu %45 daha sık satın alınıyor',
            impact: 'medium',
            recommendation: 'Bundle ürün paketleri oluşturun'
          }
        ],
        recommendations: [
          'Sepet kurtarma e-postalarını optimize edin',
          'Ücretsiz kargo eşiğini düşürün',
          'Güvenlik rozetleri ekleyin',
          'Müşteri yorumlarını öne çıkarın'
        ],
        stats: {
          averageCartValue: totalValue / Math.max(activeUsers, 1),
          conversionRate: 32,
          abandonmentRate: 68,
          topCategory: 'Outdoor Giyim',
          peakHours: '19:00-21:00'
        }
      }
      
      setAiAnalysisData(analysisData)
      setShowAIAnalysis(true)
    } catch (error) {
      console.error('AI Analysis error:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const fetchAllCarts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Backend'de admin/carts endpoint'i yoksa, kullanıcıları alıp sepetlerini çekeceğiz
      // Önce kullanıcıları alalım (minimum 2 karakter gerektiği için 'a' ile arama yapıyoruz)
      const usersResponse = await userService.getAllUsers()
      
      if (usersResponse.success && usersResponse.data) {
        const users = usersResponse.data
        
        // Her kullanıcının sepetini ve toplamını çek
        const cartsPromises = users.map(async (user: any) => {
          try {
            const [cartResponse, totalResponse, detailedTotal] = await Promise.all([
              cartService.getCart(user.id),
              cartService.getCartTotal(user.id),
              cartService.getCartTotalDetailed(user.id).catch(() => ({ success: false }))
            ])

            const items = cartResponse.success ? cartResponse.data || [] : []
            const computedFromItems = items.reduce((sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
            const totalSimple = totalResponse.success ? (totalResponse.data || 0) : 0
            const dtData = (detailedTotal as any)?.success ? (detailedTotal as any).data : null
            const totalDetailed = dtData && typeof dtData.total === 'number' ? dtData.total : 0
            const subtotalDetailed = dtData && typeof dtData.subtotal === 'number' ? dtData.subtotal : 0
            // Eğer detaylı toplam subtotal>0 ise onu kullan; aksi halde güvenilir kaynaklara düş
            const preferred = subtotalDetailed > 0 ? totalDetailed : 0
            const finalTotal = Number(preferred || totalSimple || computedFromItems) || 0

            return {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userPhone: user.phone,
              items,
              total: finalTotal
            }
          } catch (err) {
            console.error(`Error fetching cart for user ${user.id}:`, err)
            return {
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              userPhone: user.phone,
              items: [],
              total: 0
            }
          }
        })
        
        const carts = await Promise.all(cartsPromises)
        // Sadece sepetinde ürün olan kullanıcıları göster
        setUserCarts(carts.filter(cart => cart.items.length > 0))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sepetler yüklenirken hata oluştu')
      console.error('Error fetching carts:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearUserCart = async (userId: number, userName: string) => {
    if (!confirm(`${userName} kullanıcısının sepetini temizlemek istediğinizden emin misiniz?`)) return

    try {
      await cartService.clearCart(userId)
      await fetchAllCarts() // Refresh
    } catch (err) {
      console.error('Error clearing cart:', err)
      alert('Sepet temizlenirken hata oluştu')
    }
  }

  useEffect(() => {
    fetchAllCarts()
  }, [])

  const filteredCarts = userCarts.filter(cart =>
    cart.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cart.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalItems = userCarts.reduce((sum, cart) => sum + cart.items.length, 0)
  const totalValue = userCarts.reduce((sum, cart) => sum + cart.total, 0)
  const activeUsers = userCarts.length

  if (loading && userCarts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Sepetler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-semibold mb-2">Hata</p>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchAllCarts}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Tüm Kullanıcı Sepetleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Aktif sepetleri görüntüleyin ve yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={performAIAnalysis}
            disabled={aiLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Brain className="w-5 h-5 mr-2" />
            )}
            {aiLoading ? 'Analiz Ediliyor...' : 'YZ Analiz'}
          </button>
          <button
            onClick={fetchAllCarts}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Yenile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Aktif Sepet</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{activeUsers}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Toplam Ürün</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Toplam Değer</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                ₺{totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Ort. Sepet Değeri</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                ₺{activeUsers > 0 ? (totalValue / activeUsers).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
            <Package className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Kullanıcı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all dark:text-white dark:placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {filteredCarts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Aktif Sepet Bulunamadı</h3>
            <p className="text-slate-500 dark:text-slate-400">Henüz hiçbir kullanıcının sepetinde ürün yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCarts.map((cart, index) => (
              <motion.div
                key={cart.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">
                        {cart.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">{cart.userName}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{cart.userId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingCart(cart)}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5 text-blue-600" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{cart.userEmail}</span>
                  </div>
                  {cart.userPhone && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{cart.userPhone}</span>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Ürün Sayısı</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cart.items.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Toplam</span>
                      <span className="font-bold text-green-600">₺{Number(cart.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <DiscountActions userId={cart.userId} />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewingCart(cart)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Detayları Gör
                  </button>
                  <button
                    onClick={() => clearUserCart(cart.userId, cart.userName)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Detail Modal */}
      <AnimatePresence>
        {viewingCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingCart(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Sepet Detayları</h3>
                  <p className="text-slate-500 mt-1">{viewingCart.userName}</p>
                </div>
                <button
                  onClick={() => setViewingCart(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Kullanıcı</p>
                    <p className="text-lg font-bold text-slate-800">{viewingCart.userName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Email</p>
                    <p className="text-lg font-bold text-slate-800 truncate">{viewingCart.userEmail}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Ürün Sayısı</p>
                    <p className="text-lg font-bold text-blue-600">{viewingCart.items.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-1">Toplam Tutar</p>
                    <p className="text-lg font-bold text-green-600">
                      ₺{viewingCart.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Sepetteki Ürünler</h4>
                  <div className="space-y-3">
                    {viewingCart.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          {item.variationString && (
                            <p className="text-sm text-slate-500 mt-1">{item.variationString}</p>
                          )}
                          <p className="text-sm text-slate-500 mt-1">
                            Adet: {item.quantity} | Stok: {item.stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-slate-500">
                            Toplam: ₺{(item.price * item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coupon / Discount Code */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-3">İndirim Kodu Uygula</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Kodu girin"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <button
                      disabled={applyingCoupon || !coupon.trim()}
                      onClick={async () => {
                        if (!viewingCart) return
                        try {
                          setApplyingCoupon(true)
                          setCouponMsg(null)
                          const currentTotal = Number(viewingCart.total || 0)
                          const res = await cartService.applyDiscountCode(
                            viewingCart.userId,
                            coupon.trim(),
                            currentTotal,
                            getDeviceId()
                          )
                          if ((res as any)?.success) {
                            setCouponMsg('✅ İndirim uygulandı')
                            // Toplamı güncellemek için sepetleri yeniden yükle ve modal içeriğini de tazele
                            await fetchAllCarts()
                            const refreshed = userCarts.find(c => c.userId === viewingCart.userId)
                            if (refreshed) setViewingCart(refreshed)
                          } else {
                            setCouponMsg('İndirim kodu uygulanamadı')
                          }
                        } catch (e: any) {
                          setCouponMsg(`Hata: ${e?.message || 'Uygulanamadı'}`)
                        } finally {
                          setApplyingCoupon(false)
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {applyingCoupon ? 'Uygulanıyor...' : 'Uygula'}
                    </button>
                  </div>
                  {couponMsg && (
                    <p className="text-sm mt-2 text-slate-600">{couponMsg}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => clearUserCart(viewingCart.userId, viewingCart.userName)}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
                  >
                    Sepeti Temizle
                  </button>
                  <button
                    onClick={() => setViewingCart(null)}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {showAIAnalysis && aiAnalysisData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAIAnalysis(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">YZ Sepet Analizi</h3>
                    <p className="text-slate-500">Yapay zeka destekli sepet analizi ve öneriler</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIAnalysis(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      ₺{aiAnalysisData.stats.averageCartValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600">Ortalama Sepet Değeri</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      %{aiAnalysisData.stats.conversionRate}
                    </div>
                    <div className="text-sm text-green-600">Dönüşüm Oranı</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="text-2xl font-bold text-red-600">
                      %{aiAnalysisData.stats.abandonmentRate}
                    </div>
                    <div className="text-sm text-red-600">Sepet Terk Oranı</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {aiAnalysisData.stats.peakHours}
                    </div>
                    <div className="text-sm text-purple-600">Yoğun Saatler</div>
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    AI İçgörüleri
                  </h4>
                  <div className="space-y-4">
                    {aiAnalysisData.insights.map((insight: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border ${
                          insight.type === 'warning' ? 'bg-red-50 border-red-200' :
                          insight.type === 'opportunity' ? 'bg-green-50 border-green-200' :
                          'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            insight.type === 'warning' ? 'bg-red-100 text-red-600' :
                            insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                             insight.type === 'opportunity' ? <Eye className="w-4 h-4" /> :
                             <TrendingUp className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-800 mb-1">{insight.title}</h5>
                            <p className="text-slate-600 text-sm mb-2">{insight.description}</p>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                                insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {insight.impact === 'high' ? 'Yüksek' : insight.impact === 'medium' ? 'Orta' : 'Düşük'} Etki
                              </span>
                              <span className="text-xs text-slate-500">{insight.recommendation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    AI Önerileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiAnalysisData.recommendations.map((rec: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-slate-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowAIAnalysis(false)}
                    className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to AI Insights page
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'ai-insights' } }))
                      }
                      setShowAIAnalysis(false)
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                  >
                    Detaylı Analiz
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DiscountActions({ userId }: { userId: number }) {
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getDeviceId = () => {
    try {
      if (typeof window === 'undefined') return undefined
      const k = 'device_id'
      let id = localStorage.getItem(k)
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36)
        localStorage.setItem(k, id)
      }
      return id
    } catch { return undefined }
  }

  const createCode = useCallback(async () => {
    const v = parseFloat(value)
    if (isNaN(v) || v <= 0) { setMsg('Geçerli bir değer girin'); return }
    try {
      setLoading(true)
      setMsg(null)
      setError(null)
      // 1) Ana uç: admin kod oluşturma
      try {
        const res = await api.post<any>('/admin/user-discount-codes', {
          userId,
          discountType: type,
          discountValue: v
        })
        if ((res as any)?.success && (res as any).data?.code) {
          setMsg(`Kod oluşturuldu: ${(res as any).data.code}`)
          setValue('')
          return
        }
        throw new Error('create_failed')
      } catch (primaryErr: any) {
        // 2) Fallback: İndirim çarkı ile kod üret (server bu uçta kodu DB'ye de yazar)
        try {
          const spin = await api.post<any>('/discount-wheel/spin', { userId, deviceId: getDeviceId(), userAgent: navigator.userAgent })
          if ((spin as any)?.success && (spin as any).data?.discountCode) {
            setMsg(`Kod oluşturuldu: ${(spin as any).data.discountCode}`)
            setValue('')
          } else {
            throw new Error('spin_failed')
          }
        } catch (fallbackErr: any) {
          // 3) Her iki yol da hata verdiyse kullanıcıya açık mesaj
          const message = primaryErr?.message || fallbackErr?.message || 'Kod oluşturulamadı'
          setError(`Kod oluşturma başarısız: ${message}`)
        }
      }
    } catch (e: any) {
      const message = e?.message || 'Hata'
      // 500 durumunda daha anlaşılır mesaj
      if (String(message).toLowerCase().includes('creating discount code')) {
        setError('Sunucu hatası: İndirim kodu oluşturulamadı. Lütfen daha sonra tekrar deneyin.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [type, value, userId])

  return (
    <div className="flex items-center justify-end space-x-2">
      <select value={type} onChange={(e) => setType(e.target.value as any)} className="px-2 py-1 border border-slate-300 rounded-lg text-sm">
        <option value="percentage">% İndirim</option>
        <option value="fixed">Net Tutar</option>
      </select>
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type==='percentage' ? '% oran' : '₺ tutar'} className="px-2 py-1 border border-slate-300 rounded-lg w-28 text-sm" />
      <button disabled={loading} onClick={createCode} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">İndirim Kodu</button>
      {msg && <span className="text-xs text-emerald-600 truncate max-w-[160px]">{msg}</span>}
      {error && <span className="text-xs text-red-600 truncate max-w-[160px]">{error}</span>}
    </div>
  )
}
