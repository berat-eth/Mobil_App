'use client'

import { Search, Bell, Mail, User, List, Shield, X, Package, Users, ShoppingCart, Sun, Moon, Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { formatDDMMYYYY } from '@/lib/date'
import { productService } from '@/lib/services/productService'
import { userService } from '@/lib/services/userService'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/ThemeContext'
 

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps = {}) {
  const { theme, toggleTheme } = useTheme()
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  
  // Admin profile state
  const [adminProfile, setAdminProfile] = useState<{ name: string; email: string; role: string } | null>(null)
  
  // Arama için yeni state'ler
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    products: any[]
    users: any[]
    orders: any[]
  }>({ products: [], users: [], orders: [] })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Arama fonksiyonu
  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults({ products: [], users: [], orders: [] })
      setShowSearchResults(false)
      return
    }

    setSearchLoading(true)
    try {
      const [productsRes, usersRes, ordersRes] = await Promise.allSettled([
        productService.searchProducts(query, 1, 5),
        userService.searchUsers(query, 0),
        api.get(`/admin/orders/search?q=${encodeURIComponent(query)}&limit=5`)
      ])

      const results = {
        products: productsRes.status === 'fulfilled' && (productsRes.value as any)?.success ? (productsRes.value as any).data || [] : [],
        users: usersRes.status === 'fulfilled' && (usersRes.value as any)?.success ? (usersRes.value as any).data || [] : [],
        orders: ordersRes.status === 'fulfilled' && (ordersRes.value as any)?.success ? (ordersRes.value as any).data || [] : []
      }

      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Arama hatası:', error)
      setSearchResults({ products: [], users: [], orders: [] })
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounced arama
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Arama sonuçları panelini dışarı tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchResults])

  const loadLogs = () => {
    try {
      if (typeof window !== 'undefined') {
        const l = JSON.parse(localStorage.getItem('apiLogs') || '[]')
        setLogs(l)
      }
    } catch { setLogs([]) }
  }
  // Load admin profile
  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const response = await api.get<any>('/admin/profile')
        if (response.success && response.data) {
          setAdminProfile({
            name: response.data.name || 'Admin User',
            email: response.data.email || '',
            role: response.data.role || 'admin'
          })
        }
      } catch (error) {
        console.error('Admin profil bilgileri yüklenemedi:', error)
        // Fallback
        setAdminProfile({
          name: 'Admin User',
          email: '',
          role: 'admin'
        })
      }
    }
    loadAdminProfile()
  }, [])

  useEffect(() => {
    // SSR kontrolü
    if (typeof window === 'undefined') return
    
    loadLogs()
    const handler = () => loadLogs()
    window.addEventListener('api-log-updated', handler)
    return () => window.removeEventListener('api-log-updated', handler)
  }, [])

  const filtered = logs.filter((l)=>{
    const text = `${l.method||''} ${l.status||''} ${l.url||''}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  const statusColor = (status: number) => status >= 500 ? 'bg-red-100 text-red-700 border-red-200' : status >= 400 ? 'bg-orange-100 text-orange-700 border-orange-200' : status >= 300 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'
  const methodColor = (m: string) => {
    const mm = (m||'GET').toUpperCase()
    if (mm === 'GET') return 'bg-blue-100 text-blue-700 border-blue-200'
    if (mm === 'POST') return 'bg-purple-100 text-purple-700 border-purple-200'
    if (mm === 'PUT' || mm === 'PATCH') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (mm === 'DELETE') return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const copy = (text: string) => {
    try { 
      if (typeof window !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text) 
      }
    } catch {}
  }

  // Arama sonuçlarından ilgili sayfalara yönlendirme
  const navigateToResult = (type: 'product' | 'user' | 'order', id: number) => {
    setShowSearchResults(false)
    setSearchQuery('')
    
    // URL'yi güncelle ve sayfayı yenile
    if (typeof window !== 'undefined') {
      if (type === 'product') {
        window.location.href = '/products'
      } else if (type === 'user') {
        window.location.href = '/customers'
      } else if (type === 'order') {
        window.location.href = '/dashboard'
      }
    }
  }

  return (
    <header className="bg-white/80 dark:bg-dark-bg/90 backdrop-blur-lg border-b border-slate-200 dark:border-dark-border px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobil Hamburger Butonu */}
        {onMenuClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors lg:hidden flex-shrink-0"
            title="Menü"
          >
            <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </motion.button>
        )}
        <div className="flex-1 max-w-xl min-w-0">
          <div className="relative search-container">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full pl-8 sm:pl-10 pr-8 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all dark:text-white dark:placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setShowSearchResults(false)
                }}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
            
            {/* Arama Sonuçları */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-lg dark:shadow-xl z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-slate-500">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Aranıyor...
                  </div>
                ) : (
                  <>
                    {/* Ürünler */}
                    {searchResults.products.length > 0 && (
                      <div className="p-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                          <Package className="w-4 h-4" />
                          Ürünler ({searchResults.products.length})
                        </div>
                        {searchResults.products.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => navigateToResult('product', product.id)}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                SKU: {product.sku || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Kullanıcılar */}
                    {searchResults.users.length > 0 && (
                      <div className="p-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                          <Users className="w-4 h-4" />
                          Müşteriler ({searchResults.users.length})
                        </div>
                        {searchResults.users.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => navigateToResult('user', user.id)}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {user.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Siparişler */}
                    {searchResults.orders.length > 0 && (
                      <div className="p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                          <ShoppingCart className="w-4 h-4" />
                          Siparişler ({searchResults.orders.length})
                        </div>
                        {searchResults.orders.map((order) => (
                          <div
                            key={order.id}
                            onClick={() => navigateToResult('order', order.id)}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">
                                Sipariş #{order.id}
                              </div>
                              <div className="text-xs text-slate-500">
                                {order.status} - ₺{order.totalAmount}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sonuç bulunamadı */}
                    {searchResults.products.length === 0 && 
                     searchResults.users.length === 0 && 
                     searchResults.orders.length === 0 && (
                      <div className="p-4 text-center text-slate-500">
                        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <div className="text-sm">Arama sonucu bulunamadı</div>
                        <div className="text-xs mt-1">Farklı anahtar kelimeler deneyin</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 ml-2 sm:ml-4 md:ml-6 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors hidden sm:inline-flex"
          >
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLogs(!showLogs)}
            className="relative p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors hidden md:inline-flex"
            title="API Logları"
          >
            <List className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-300" />
          </motion.button>

          {/* Sistem Durumu butonu */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              try { sessionStorage.removeItem('healthChecked') } catch {}
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-health-modal'))
              }
            }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs sm:text-sm inline-flex items-center gap-1 sm:gap-2"
            title="Sistem Durumu"
          >
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" /> 
            <span className="hidden sm:inline">Sistem Durumu</span>
            <span className="sm:hidden">Sistem</span>
          </motion.button>

          {/* Dark Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-lg transition-colors inline-flex items-center justify-center dark:bg-slate-700 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
            title={theme === 'light' ? 'Karanlık Mod' : 'Aydınlık Mod'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            )}
          </motion.button>

          <div className="h-6 sm:h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
            <div className="text-right hidden md:block">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                {adminProfile?.name || 'Admin User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {adminProfile?.role === 'admin' ? 'Yönetici' : adminProfile?.role || 'Yönetici'}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg transition-shadow text-xs sm:text-sm md:text-base">
              {adminProfile?.name 
                ? adminProfile.name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2) || 'AY'
                : 'AY'}
            </div>
          </div>
        </div>
      </div>
      {showLogs && (
        <div className="mt-4 bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-dark-border p-3 sm:p-4 max-h-96 overflow-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700">API Logları</h4>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ara..." className="w-full sm:w-auto px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={()=>{if (typeof window !== 'undefined') localStorage.removeItem('apiLogs'); setLogs([])}} className="text-xs text-red-600 hover:underline whitespace-nowrap">Temizle</button>
              <button onClick={()=>{setExpanded({})}} className="text-xs text-slate-600 hover:underline whitespace-nowrap">Daralt</button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz log yok</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {filtered.map((log, idx) => {
                const id = `${log.time}-${idx}`
                const isOpen = !!expanded[id]
                const urlText = String(log.url||'')
                const u = (()=>{ try { return new URL(urlText) } catch { return null }})()
                const path = u ? `${u.pathname}${u.search}` : urlText
                const host = u ? u.host : ''
                return (
                <li key={id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded border ${methodColor(log.method)}`}>{(log.method||'GET').toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded border ${statusColor(Number(log.status||0))}`}>{log.status}</span>
                      <span className="text-slate-400">{formatDDMMYYYY(log.time)} {new Date(log.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>copy(urlText)} className="px-2 py-0.5 border border-slate-200 rounded hover:bg-slate-100">Kopyala</button>
                      <button onClick={()=>setExpanded((e)=>({...e, [id]: !isOpen}))} className="px-2 py-0.5 border border-slate-200 rounded hover:bg-slate-100">{isOpen? 'Gizle':'Detay'}</button>
                    </div>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-slate-800 break-all">
                    {host && <span className="text-slate-400">{host}</span>}<span className="ml-1">{path}</span>
                  </div>
                  {isOpen && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {log.requestBody && (
                        <div className="bg-white border border-slate-200 rounded p-2">
                          <div className="text-slate-600 mb-1">İstek Gövdesi</div>
                          <pre className="text-[11px] whitespace-pre-wrap break-all">{JSON.stringify(log.requestBody, null, 2)}</pre>
                        </div>
                      )}
                      {log.responseBody && (
                        <div className="bg-white border border-slate-200 rounded p-2">
                          <div className="text-slate-600 mb-1">Yanıt</div>
                          <pre className="text-[11px] whitespace-pre-wrap break-all">{JSON.stringify(log.responseBody, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )})}
            </ul>
          )}
        </div>
      )}
    </header>
  )
}
