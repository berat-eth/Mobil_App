'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, BarChart3, Bell, LogOut, ShoppingBasket, Megaphone, Image, FileText, UserCog, UsersRound, Radio, MessageSquare, Shield, Crown, Ticket, Star, AlertTriangle, Menu, X, Database, Sparkles, Mail, Smartphone, Factory, ClipboardList, PackageCheck, Wallet, CreditCard, RotateCcw, Gift, Disc, FolderTree, Activity, DollarSign, Link, Monitor, Brain, Briefcase, Map, Search, SquareStack, Eye, Link2, Receipt, Key, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen?: boolean
  onToggle?: () => void
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onToggle }: SidebarProps) {
  const router = useRouter()
  // Mobilde varsayılan olarak kapalı, desktop'ta açık
  // Eğer parent'tan isOpen prop'u geliyorsa onu kullan, yoksa local state kullan
  const [internalCollapsed, setInternalCollapsed] = useState(true)
  const isControlled = isOpen !== undefined
  const isCollapsed = isControlled ? !isOpen : internalCollapsed
  
  // Mobilde menü açıldığında body scroll'unu engelle
  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle()
    } else {
      setInternalCollapsed(!internalCollapsed)
    }
    
    if (typeof window !== 'undefined') {
      const shouldHide = isControlled ? !isOpen : !internalCollapsed
      if (!shouldHide) {
        document.body.style.overflow = ''
      } else {
        document.body.style.overflow = 'hidden'
      }
    }
  }
  
  // Mobilde menü kapandığında scroll'u geri aç
  const handleClose = () => {
    if (isControlled && onToggle) {
      onToggle()
    } else {
      setInternalCollapsed(true)
    }
    if (typeof window !== 'undefined') {
      document.body.style.overflow = ''
    }
  }

  const handleLogout = () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      try {
        sessionStorage.removeItem('adminLoggedIn')
        sessionStorage.removeItem('authToken')
      } catch {}
      router.push('/login')
    }
  }
  const menuGroups = [
    {
      title: 'Ana Menü',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'ai-insights', label: 'AI İçgörüleri', icon: Brain },
      ]
    },
    {
      title: 'E-Ticaret',
      items: [
        { id: 'orders', label: 'Siparişler', icon: ShoppingCart },
        { id: 'cart', label: 'Sepetler', icon: ShoppingBasket },
        { id: 'products', label: 'Ürünler', icon: Package },
        { id: 'categories', label: 'Kategoriler', icon: FolderTree },
        { id: 'reviews', label: 'Yorumlar', icon: Star },
        { id: 'return-requests', label: 'İade Talepleri', icon: RotateCcw },
      ]
    },
    {
      title: 'Müşteri Yönetimi',
      items: [
        { id: 'customers', label: 'Müşteriler', icon: Users },
        { id: 'segments', label: 'Müşteri Segmentleri', icon: UsersRound },
        { id: 'crm', label: 'CRM', icon: Briefcase },
      ]
    },
    // CRM grubu kaldırıldı
    {
      title: 'Üretim & Lojistik',
      items: [
        { id: 'production-planning', label: 'Üretim Planlama', icon: Factory },
        { id: 'production-orders', label: 'Üretim Emirleri', icon: ClipboardList },
        { id: 'production-tracking', label: 'Üretim Takibi', icon: PackageCheck },
      ]
    },
    {
      title: 'Pazarlama',
      items: [
        { id: 'campaigns', label: 'Kampanyalar', icon: Megaphone },
        { id: 'coupons', label: 'Kupon & İndirim Yönetimi', icon: Ticket },
        { id: 'discount-wheel-spins', label: 'Çarkıfelek', icon: Disc },
        { id: 'email', label: 'E-posta', icon: Mail },
        { id: 'sms', label: 'SMS', icon: Smartphone },
        { id: 'push-notifications', label: 'Push Bildirimler', icon: Bell },
        { id: 'stories', label: "Story'ler", icon: Image },
        { id: 'sliders', label: 'Slider Yönetimi', icon: Image },
        { id: 'popups', label: 'Popup Yönetimi', icon: SquareStack },
        { id: 'google-maps-scraper', label: 'AI Müşteri Bulucu', icon: Map },
      ]
    },
    {
      title: 'Analiz & Raporlama',
      items: [
        { id: 'analytics', label: 'Detaylı Analitik', icon: BarChart3 },
        { id: 'live-data', label: 'Canlı Veriler', icon: Radio },
        { id: 'live-users', label: 'Canlı Kullanıcılar', icon: Eye },
      ]
    },
    {
      title: 'Yapay Zeka',
      items: [
        { id: 'ml-insights', label: 'ML Insights', icon: Brain },
        { id: 'project-ajax', label: 'Project Ajax', icon: Sparkles },
        { id: 'recommendations', label: 'Ürün Önerileri', icon: Sparkles },
      ]
    },
    {
      title: 'Finans',
      items: [
        { id: 'payment-transactions', label: 'Ödeme İşlemleri', icon: CreditCard },
        { id: 'user-wallets', label: 'Kullanıcı Cüzdanları', icon: Wallet },
        { id: 'wallet-recharge-requests', label: 'Bakiye Yükleme', icon: Wallet },
        { id: 'wallet-withdraw-requests', label: 'Bakiye Çekim Talepleri', icon: Wallet },
        { id: 'referral-earnings', label: 'Referans Kazançları', icon: DollarSign },
        { id: 'invoices', label: 'Faturalar', icon: Receipt },
      ]
    },

    {
      title: 'Trendyol',
      items: [
        { id: 'trendyol-auth', label: 'Trendyol Auth', icon: Key },
        { id: 'trendyol-orders', label: 'Trendyol Siparişleri', icon: ShoppingCart },
        { id: 'trendyol-products', label: 'Trendyol Ürün Listesi', icon: List },
      ]
    },
    {
      title: 'Hepsiburada',
      items: [
        { id: 'hepsiburada-orders', label: 'Hepsiburada Siparişleri', icon: ShoppingCart },
      ]
    },
    {
      title: 'Ticimax',
      items: [
        { id: 'ticimax-orders', label: 'Ticimax Siparişleri', icon: ShoppingCart },
      ]
    },
    {
      title: 'Sistem',
      items: [
        { id: 'server-stats', label: 'Sunucu İstatistikleri', icon: Activity },
        { id: 'backup', label: 'Veri Yedekleme', icon: Settings },
        { id: 'security', label: 'Güvenlik', icon: Shield },
        { id: 'seo', label: 'SEO Panel', icon: Search },
        { id: 'admin-logs', label: 'Yönetici Logları', icon: FileText },
        { id: 'snort-logs', label: 'Snort IDS Logları', icon: AlertTriangle },
        { id: 'chatbot', label: 'Chatbot', icon: MessageSquare },
      ]
    },
    {
      title: 'B2B',
      items: [
        { id: 'applications', label: 'Bayilik Başvuruları', icon: FileText },
        { id: 'bulk-custom-production', label: 'Özel Toptan Üretim', icon: Crown },
        { id: 'quote-form-requests', label: 'Gelen Form Verileri', icon: FileText },
        { id: 'proforma-invoice', label: 'Proforma Fatura', icon: FileText },
      ]
    },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      <aside className={`${
        // Mobilde: kapalıysa tamamen gizle, açıksa göster
        // Desktop'ta: her zaman görünür, sadece genişlik değişir
        isCollapsed 
          ? 'w-72 -translate-x-full lg:translate-x-0 lg:w-20' 
          : 'w-72 translate-x-0'
      } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white shadow-2xl flex flex-col h-screen transition-all duration-300 fixed lg:relative z-50`}>
        {/* Header with Toggle */}
        <div className="p-4 border-b border-slate-700 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handleToggle}
              className="p-2 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            {!isCollapsed && (
              <span className="text-xs text-slate-400">Menü</span>
            )}
          </div>
        </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-custom">
        {menuGroups.map((group, groupIndex) => (
          <div key={group.title} className="mb-6">
            {!isCollapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            {group.items.map((item, index) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'admin-logs') { router.push('/admin-logs'); return }
                    setActiveTab(item.id)
                    // Mobilde menü öğesine tıklandığında sidebar'ı kapat
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setTimeout(() => handleClose(), 100)
                    }
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-2.5 mb-1 rounded-lg text-left transition-all text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800/50 dark:hover:bg-slate-900/70 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="ml-auto w-2 h-2 bg-white rounded-full"
                        />
                      )}
                    </>
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700 bg-slate-900 flex-shrink-0">
        <button 
          onClick={() => setActiveTab('settings')}
          title={isCollapsed ? 'Ayarlar' : ''}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'px-3'
          } py-2.5 rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Settings className={`w-5 h-5 ${!isCollapsed && 'mr-2'}`} />
          {!isCollapsed && <span>Ayarlar</span>}
        </button>
        <button 
          onClick={handleLogout}
          title={isCollapsed ? 'Çıkış Yap' : ''}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'px-3'
          } py-2.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-all mt-2`}
        >
          <LogOut className={`w-5 h-5 ${!isCollapsed && 'mr-2'}`} />
          {!isCollapsed && <span>Çıkış Yap</span>}
        </button>
      </div>

        <style jsx>{`
          .scrollbar-custom::-webkit-scrollbar {
            width: 6px;
          }

          .scrollbar-custom::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.3);
            border-radius: 10px;
            margin: 8px 0;
          }

          .scrollbar-custom::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            transition: all 0.3s ease;
          }

          .scrollbar-custom::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #7c8ef5 0%, #8b5bb8 100%);
            width: 8px;
          }

          .scrollbar-custom::-webkit-scrollbar-thumb:active {
            background: linear-gradient(180deg, #5568d3 0%, #6a3d8f 100%);
          }

          /* Firefox */
          .scrollbar-custom {
            scrollbar-width: thin;
            scrollbar-color: #667eea rgba(15, 23, 42, 0.3);
          }
        `}</style>
      </aside>
    </>
  )
}
