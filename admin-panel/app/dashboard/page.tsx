'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDDMMYYYY } from '@/lib/date'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ShieldCheck, AlertTriangle, X } from 'lucide-react'
import Dashboard from '@/components/Dashboard'
import Sidebar from '@/components/Sidebar'
import Products from '@/components/Products'
import Orders from '@/components/Orders'
import Customers from '@/components/Customers'
import Header from '@/components/Header'
import Cart from '@/components/Cart'
import Campaigns from '@/components/Campaigns'
import Stories from '@/components/Stories'
import Applications from '@/components/Applications'
import CustomerCare from '@/components/CustomerCare'
import Segments from '@/components/Segments'

import LiveData from '@/components/LiveData'
import LiveUsers from '@/components/LiveUsers'

import Chatbot from '@/components/Chatbot'
import Security from '@/components/Security'
import BulkCustomProduction from '@/components/BulkCustomProduction'
import QuoteFormRequests from '@/components/QuoteFormRequests'
import ProformaInvoice from '@/components/ProformaInvoice'
import Backup from '@/components/Backup'
import ServerStats from '@/components/ServerStats'
import PushNotifications from '@/components/PushNotifications'
import Sliders from '@/components/Sliders'
import Coupons from '@/components/Coupons'
import Reviews from '@/components/Reviews'
import SnortLogs from '@/components/SnortLogs'
import Settings from '@/components/Settings'
import ProjectAjax from '@/components/ProjectAjax'
import Email from '@/components/Email'
import SMS from '@/components/SMS'
import ProductionPlanning from '@/components/ProductionPlanning'
import ProductionOrders from '@/components/ProductionOrders'
import ProductionTracking from '@/components/ProductionTracking'
import Invoices from '@/components/Invoices'
import Categories from '@/components/Categories'
import PaymentTransactions from '@/components/PaymentTransactions'
import ReturnRequests from '@/components/ReturnRequests'
import UserWallets from '@/components/UserWallets'
import WalletTransactions from '@/components/WalletTransactions'
import WalletRechargeRequests from '@/components/WalletRechargeRequests'
import WalletWithdrawRequests from '@/components/WalletWithdrawRequests'
import ReferralEarnings from '@/components/ReferralEarnings'
import DiscountWheelSpins from '@/components/DiscountWheelSpins'
import Recommendations from '@/components/Recommendations'
// CustomProductionMessages merged into BulkCustomProduction
import AIInsights from '@/components/AIInsights'
import CRM from '@/components/CRM'
import GoogleMapsScraper from '@/components/GoogleMapsScraper'
import SEO from '@/components/SEO'
import Popups from '@/components/Popups'
import Analytics from '@/components/Analytics'
import MLInsights from '@/components/MLInsights'
import Integrations from '@/components/Integrations'
import TrendyolOrders from '@/components/TrendyolOrders'
import TrendyolAuth from '@/components/TrendyolAuth'
import TrendyolProducts from '@/components/TrendyolProducts'
import HepsiburadaOrders from '@/components/HepsiburadaOrders'
import TicimaxOrders from '@/components/TicimaxOrders'


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  // Desktop'ta varsayılan olarak açık, mobilde kapalı
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [health, setHealth] = useState<any | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  // İlk yüklemede ekran genişliğine göre sidebar durumunu ayarla
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1024
      setSidebarOpen(isDesktop)
    }
  }, [])

  // Hızlı eylemler ve bileşenler arası basit gezinme için custom event dinleyicisi
  useEffect(() => {
    // SSR kontrolü
    if (typeof window === 'undefined') return
    // Basit oturum koruması: giriş yapılmamışsa login'e yönlendir
    try {
      const logged = sessionStorage.getItem('adminLoggedIn') === '1'
      const token = sessionStorage.getItem('authToken')
      // 2FA devre dışı - sadece login kontrolü yap
      const ok = logged && !!token
      if (!ok) {
        // login sayfasına dön
        window.location.href = '/login'
        return
      }
    } catch {}
    
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { tab?: string }
      if (detail?.tab) setActiveTab(String(detail.tab))
    }
    window.addEventListener('goto-tab', handler as EventListener)
    // Header'dan modal açma eventi
    const openHealth = () => setShowHealthModal(true)
    window.addEventListener('open-health-modal', openHealth)
    return () => {
      window.removeEventListener('goto-tab', handler as EventListener)
      window.removeEventListener('open-health-modal', openHealth)
    }
  }, [])

  // Açılışta sağlık kontrolü
  useEffect(() => {
    // SSR kontrolü
    if (typeof window === 'undefined') return
    
    try {
      const already = sessionStorage.getItem('healthChecked')
      if (already) return
    } catch {}
    setShowHealthModal(true)
    setHealthLoading(true)
    setHealthError(null)
    api.get<any>('/health')
      .then((res) => {
        setHealth(res)
      })
      .catch((err) => {
        setHealthError(err?.message || 'Sağlık kontrolü başarısız')
      })
      .finally(() => {
        setHealthLoading(false)
        try { sessionStorage.setItem('healthChecked', '1') } catch {}
      })
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <AnimatePresence>
            {showHealthModal && (
              <div className="fixed inset-0 z-[9999]">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowHealthModal(false)}></div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-1/2 top-2 sm:top-10 -translate-x-1/2 w-[98%] sm:w-[95%] md:w-[90%] max-w-xl bg-white dark:bg-dark-card rounded-lg sm:rounded-xl shadow-xl border border-slate-200 dark:border-dark-border overflow-hidden max-h-[96vh] sm:max-h-[90vh] md:max-h-none overflow-y-auto"
                >
                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card sticky top-0 z-10">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      {healthLoading ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-500 animate-spin flex-shrink-0" />
                      ) : healthError || health?.success === false ? (
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                      )}
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200 truncate">Sistem Sağlık Kontrolü</h3>
                    </div>
                    <button onClick={() => setShowHealthModal(false)} className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0 ml-1 sm:ml-2 touch-target">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6 space-y-2.5 sm:space-y-3 md:space-y-4">
                    {healthLoading && (
                      <div className="flex items-center justify-center gap-2 sm:gap-3 py-6 sm:py-8 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300">
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        <span className="whitespace-nowrap">Sistem kontrol ediliyor...</span>
                      </div>
                    )}
                    {!healthLoading && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
                          <div className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wide">Sunucu</div>
                            <div className={`text-lg sm:text-xl md:text-2xl font-bold ${healthError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {healthError ? 'HATA' : 'OK'}
                            </div>
                          </div>
                          <div className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wide">Veritabanı</div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize break-words">
                              {health?.database || (healthError ? 'bilinmiyor' : 'ok')}
                            </div>
                          </div>
                          <div className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wide">Uptime</div>
                            <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 break-words">
                              {typeof health?.uptime !== 'undefined' ? `${Math.round(health.uptime)} sn` : '-'}
                            </div>
                          </div>
                          <div className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wide">Saat</div>
                            <div className="text-base sm:text-lg md:text-xl font-bold font-mono text-slate-800 dark:text-slate-100 break-words">
                              {health?.timestamp ? formatDDMMYYYY(health.timestamp) : formatDDMMYYYY(new Date())}
                            </div>
                          </div>
                        </div>
                        {healthError && (
                          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-2 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm md:text-base">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold mb-1">Hata Detayı</div>
                                <div className="break-words">{healthError}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 md:p-6 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-end gap-2 sm:gap-3 sticky bottom-0">
                    <button 
                      onClick={() => setShowHealthModal(false)} 
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all shadow-md hover:shadow-lg touch-target"
                    >
                      Tamam
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'ai-insights' && <AIInsights />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'crm' && <CRM />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'cart' && <Cart />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'campaigns' && <Campaigns />}
          {activeTab === 'coupons' && <Coupons />}
          {activeTab === 'stories' && <Stories />}
          {activeTab === 'sliders' && <Sliders />}
          {activeTab === 'popups' && <Popups />}
          {activeTab === 'push-notifications' && <PushNotifications />}
          {activeTab === 'reviews' && <Reviews />}
          {activeTab === 'applications' && <Applications />}
          {activeTab === 'customer-care' && <CustomerCare />}
          {activeTab === 'segments' && <Segments />}

          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'ml-insights' && <MLInsights />}
          {activeTab === 'live-data' && <LiveData />}
          {activeTab === 'live-users' && <LiveUsers />}
          {activeTab === 'server-stats' && <ServerStats />}
          {activeTab === 'backup' && <Backup />}

          {activeTab === 'chatbot' && <Chatbot />}
          {activeTab === 'security' && <Security />}
          {activeTab === 'snort-logs' && <SnortLogs />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'bulk-custom-production' && <BulkCustomProduction />}
          {activeTab === 'quote-form-requests' && <QuoteFormRequests />}
          {activeTab === 'proforma-invoice' && <ProformaInvoice />}
          {activeTab === 'project-ajax' && <ProjectAjax />}
          {activeTab === 'email' && <Email />}
          {activeTab === 'sms' && <SMS />}
          {activeTab === 'production-planning' && <ProductionPlanning />}
          {activeTab === 'production-orders' && <ProductionOrders />}
          {activeTab === 'production-tracking' && <ProductionTracking />}
          {activeTab === 'categories' && <Categories />}
          {activeTab === 'payment-transactions' && <PaymentTransactions />}
          {activeTab === 'return-requests' && <ReturnRequests />}
          {activeTab === 'user-wallets' && <UserWallets />}
          {activeTab === 'wallet-transactions' && <WalletTransactions />}
          {activeTab === 'wallet-recharge-requests' && <WalletRechargeRequests />}
          {activeTab === 'wallet-withdraw-requests' && <WalletWithdrawRequests />}
          {activeTab === 'referral-earnings' && <ReferralEarnings />}
          {activeTab === 'discount-wheel-spins' && <DiscountWheelSpins />}
          {activeTab === 'recommendations' && <Recommendations />}
          {activeTab === 'google-maps-scraper' && <GoogleMapsScraper />}
          {activeTab === 'seo' && <SEO />}
          {activeTab === 'integrations' && <Integrations />}
          {activeTab === 'trendyol-auth' && <TrendyolAuth />}
          {activeTab === 'trendyol-orders' && <TrendyolOrders />}
          {activeTab === 'trendyol-products' && <TrendyolProducts />}
          {activeTab === 'hepsiburada-orders' && <HepsiburadaOrders />}
          {activeTab === 'ticimax-orders' && <TicimaxOrders />}
          {activeTab === 'invoices' && <Invoices />}
        </main>
      </div>
    </div>
  )
}
