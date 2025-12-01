'use client'

import { useEffect, useState } from 'react'
import { Crown, Plus, MessageSquare, Search, Filter, Send, Globe, Building2, Eye, User, Mail, Phone, Package, RefreshCw, CheckCircle, XCircle, FileText, Download, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

export default function BulkCustomProduction() {
  // Active tab: 'b2b' or 'website'
  const [activeTab, setActiveTab] = useState<'b2b' | 'website'>('b2b')

  // Requests & items
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [items, setItems] = useState<any[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // Website requests (siteden gelenler)
  const [websiteRequests, setWebsiteRequests] = useState<any[]>([])
  const [websiteLoading, setWebsiteLoading] = useState(false)
  const [websiteError, setWebsiteError] = useState<string | null>(null)
  const [selectedWebsiteRequest, setSelectedWebsiteRequest] = useState<any | null>(null)
  const [showWebsiteDetailModal, setShowWebsiteDetailModal] = useState(false)
  const [websiteSearchQuery, setWebsiteSearchQuery] = useState('')
  const [websiteStatusFilter, setWebsiteStatusFilter] = useState<string>('all')
  const [showProformaModal, setShowProformaModal] = useState(false)
  const [selectedRequestForProforma, setSelectedRequestForProforma] = useState<any | null>(null)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteAmount, setQuoteAmount] = useState<string>('')
  const [quoteNotes, setQuoteNotes] = useState<string>('')

  // Messages
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ subject: '', description: '', customerName: '', customerPhone: '' })

  const translateStatus = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (!s) return '-'
    if (s === 'pending') return 'Beklemede'
    if (s === 'review') return 'Teklif'
    if (s === 'design') return 'Tasarım'
    if (s === 'production') return 'Üretimde'
    if (s === 'shipped') return 'Kargolandı'
    if (s === 'completed') return 'Tamamlandı'
    if (s === 'cancelled') return 'İptal'
    return status as any
  }

  const setRequestStatus = async (id: number, status: 'pending' | 'review' | 'design' | 'production' | 'shipped' | 'completed' | 'cancelled') => {
    try {
      await api.put(`/admin/custom-production-requests/${id}/status`, { status })
      await loadRequests()
      if (typeof id === 'number') {
        await loadItems(id)
      }
      alert('İşlem uygulandı')
    } catch {
      alert('İşlem başarısız')
    }
  }

  const renderCustomization = (value: any) => {
    // Eğer değer yoksa veya boşsa
    if (!value) return <span className="text-slate-500 dark:text-slate-400">-</span>
    
    let data: any = value
    // Eğer string ise JSON parse etmeyi dene
    if (typeof value === 'string') {
      // Eğer zaten düz metinse (JSON değilse) direkt göster
      if (!value.trim().startsWith('{') && !value.trim().startsWith('[')) {
        return <span className="text-slate-700 dark:text-slate-300">{value}</span>
      }
      try { 
        data = JSON.parse(value) 
      } catch { 
        // JSON parse edilemezse string olarak göster
        return <span className="text-slate-700 dark:text-slate-300 break-words">{value}</span>
      }
    }
    
    // Eğer object değilse string olarak göster
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return <span className="text-slate-700 dark:text-slate-300 break-words">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
    }
    
    // Object ise okunabilir formatta göster
    return (
      <div className="text-xs space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {data.text && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Yazı:</span>
            <span className="text-slate-700 dark:text-slate-300 flex-1">{data.text}</span>
          </div>
        )}
        {data.color && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Renk:</span>
            <div className="flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600" 
                style={{ backgroundColor: data.color }}
                title={data.color}
              />
              <span className="text-slate-700 dark:text-slate-300">{data.color}</span>
            </div>
          </div>
        )}
        {data.position && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Pozisyon:</span>
            <span className="text-slate-700 dark:text-slate-300 flex-1">{data.position === 'front' ? 'Ön' : data.position === 'back' ? 'Arka' : data.position}</span>
          </div>
        )}
        {data.logo && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Logo:</span>
            <a 
              href={String(data.logo)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
            >
              {String(data.logo).startsWith('file://') ? '📎 Yerel Dosya' : String(data.logo).slice(0, 50)}{String(data.logo).length > 50 ? '...' : ''}
            </a>
          </div>
        )}
        {data.logoSize && (typeof data.logoSize === 'object') && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Logo Boyutu:</span>
            <span className="text-slate-700 dark:text-slate-300">{data.logoSize.width} × {data.logoSize.height} cm</span>
          </div>
        )}
        {typeof data.isBenden === 'boolean' && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Benden:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${data.isBenden ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'}`}>
              {data.isBenden ? 'Evet' : 'Hayır'}
            </span>
          </div>
        )}
        {data.bendenSize && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Beden:</span>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
              {data.bendenSize}
            </span>
          </div>
        )}
        {data.bendenQuantity != null && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Beden Adeti:</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{data.bendenQuantity}</span>
          </div>
        )}
        {data.bendenDescription && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[60px]">Açıklama:</span>
            <span className="text-slate-700 dark:text-slate-300 flex-1 break-words">{data.bendenDescription}</span>
          </div>
        )}
        {/* Beden Sayıları (Web sitesinden gelen talepler için) */}
        {data.sizes && Array.isArray(data.sizes) && data.sizes.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400 min-w-[80px]">Beden Dağılımı:</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {data.sizes.map((sizeItem: any, idx: number) => (
                <span 
                  key={idx}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium"
                  title={`${sizeItem.size}: ${sizeItem.quantity} adet`}
                >
                  {sizeItem.size}: <strong>{sizeItem.quantity}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) setRequests((res as any).data)
      else setRequests([])
    } catch (e:any) {
      setError(e?.message || 'Özel üretim talepleri getirilemedi')
      setRequests([])
    } finally { setLoading(false) }
  }

  const enrichItemsWithProductNames = async (items: any[]): Promise<any[]> => {
    return Promise.all(
      items.map(async (item: any) => {
        if (!item.productName && item.productId) {
          item.productName = await loadProductName(item.productId)
        }
        return item
      })
    )
  }

  const loadWebsiteRequests = async () => {
    try {
      setWebsiteLoading(true)
      setWebsiteError(null)
      // Siteden gelen talepleri getir - userId var olanlar (müşteriler tarafından gönderilenler) + Teklif Al formundan gelenler
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        // Siteden gelen talepler: sadece userId var olanlar (müşteriler tarafından gönderilenler)
        // Teklif Al formundan gelenler artık ayrı sayfada (Gelen Form Verileri) gösteriliyor
        let websiteData = (res as any).data.filter((r: any) => {
          // Teklif Al formundan gelenleri hariç tut
          if (r.source === 'quote-form') return false
          // Müşteri panelinden gelenler (userId var ve B2B değil)
          if (r.userId && r.customerName && (!r.customerName.includes('B2B') && !r.customerName.includes('Toptan'))) return true
          return false
        })
        
        // Her talebin items'larına ürün adlarını ekle
        for (const request of websiteData) {
          if (request.items && Array.isArray(request.items)) {
            request.items = await enrichItemsWithProductNames(request.items)
          }
        }
        
        setWebsiteRequests(websiteData)
      } else {
        setWebsiteRequests([])
      }
    } catch (e: any) {
      setWebsiteError(e?.message || 'Siteden gelen talepler getirilemedi')
      setWebsiteRequests([])
    } finally {
      setWebsiteLoading(false)
    }
  }

  const updateWebsiteRequestStatus = async (id: number, status: string) => {
    try {
      await api.put(`/admin/custom-production-requests/${id}/status`, { status })
      await loadWebsiteRequests()
      alert('Durum güncellendi')
    } catch {
      alert('Durum güncellenemedi')
    }
  }

  const loadProductName = async (productId: number): Promise<string> => {
    try {
      const res = await api.get<any>(`/products/${productId}`)
      if ((res as any)?.success && (res as any).data) {
        return (res as any).data.name || (res as any).data.title || `Ürün #${productId}`
      }
    } catch {
      // Hata durumunda ID döndür
    }
    return `Ürün #${productId}`
  }

  const loadItems = async (id: number) => {
    try {
      setItemsLoading(true)
      setItemsError(null)
      const res = await api.get<any>(`/admin/custom-production-requests/${id}`)
      if ((res as any)?.success) {
        const data = (res as any).data || {}
        const itemsList = Array.isArray(data.items) ? data.items : []
        
        // Ürün adlarını yükle (eğer productName yoksa)
        const itemsWithNames = await Promise.all(
          itemsList.map(async (item: any) => {
            if (!item.productName && item.productId) {
              item.productName = await loadProductName(item.productId)
            }
            return item
          })
        )
        
        setItems(itemsWithNames)
      } else {
        setItems([])
      }
    } catch (e:any) {
      setItemsError(e?.message || 'Talep kalemleri getirilemedi')
      setItems([])
    } finally { setItemsLoading(false) }
  }

  const loadMessages = async (id?: number) => {
    try {
      setMessagesLoading(true)
      setMessagesError(null)
      if (id) {
        const res = await api.get<any>(`/admin/custom-production/requests/${id}/messages`)
        if ((res as any)?.success && Array.isArray((res as any).data)) setMessages((res as any).data)
        else setMessages([])
      } else {
        const res = await api.get<any>('/admin/custom-production/messages', { limit: 50 })
        if ((res as any)?.success && Array.isArray((res as any).data)) setMessages((res as any).data)
        else setMessages([])
      }
    } catch (e:any) {
      setMessagesError(e?.message || 'Mesajlar getirilemedi')
      setMessages([])
    } finally { setMessagesLoading(false) }
  }

  useEffect(()=>{ 
    loadRequests()
    loadWebsiteRequests()
  }, [])
  useEffect(()=>{
    if (typeof selectedId === 'number') {
      loadItems(selectedId)
      loadMessages(selectedId)
    } else {
      setItems([])
      loadMessages(undefined)
    }
  }, [selectedId])

  const filteredWebsiteRequests = websiteRequests.filter(req => {
    const searchLower = websiteSearchQuery.toLowerCase()
    const matchesSearch = 
      (req.requestNumber?.toLowerCase().includes(searchLower) || false) ||
      (req.customerName?.toLowerCase().includes(searchLower) || false) ||
      (req.customerEmail?.toLowerCase().includes(searchLower) || false) ||
      (req.customerPhone?.toLowerCase().includes(searchLower) || false)
    const matchesStatus = websiteStatusFilter === 'all' || req.status === websiteStatusFilter
    return matchesSearch && matchesStatus
  })

  const websiteStats = {
    total: websiteRequests.length,
    pending: websiteRequests.filter((r: any) => r.status === 'pending').length,
    inProgress: websiteRequests.filter((r: any) => ['review', 'design', 'production', 'shipped'].includes(String(r.status))).length,
    completed: websiteRequests.filter((r: any) => r.status === 'completed').length,
    totalAmount: websiteRequests.reduce((sum: number, r: any) => sum + Number(r.totalAmount || 0), 0)
  }

  const totalRevenue = requests.reduce((sum:number, r:any)=> sum + Number(r.totalAmount || 0), 0)
  const inProgressCount = requests.filter((r:any)=> ['review','design','production','shipped'].includes(String(r.status))).length
  const completedCount = requests.filter((r:any)=> String(r.status) === 'completed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Özel Toptan Üretim</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Talepleri, kalemleri ve mesajlaşmayı tek ekranda yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { loadRequests(); if (activeTab === 'website') loadWebsiteRequests(); }} 
            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
          {activeTab === 'b2b' && (
            <button onClick={()=> setShowCreateModal(true)} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Talep
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('b2b')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'b2b'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>B2B Talepler</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('website')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'website'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Siteden Gelenler</span>
            {websiteStats.total > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold">
                {websiteStats.total}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'b2b' && (
          <motion.div
            key="b2b"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* B2B Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Talep</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{requests.length}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Devam Eden</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{inProgressCount}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Tamamlanan</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Tutar</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">₺{totalRevenue.toLocaleString('tr-TR')}</p>
              </div>
            </div>

            {/* B2B Requests table */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>}
        {loading && <p className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Talep No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Telefon</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {requests.map((r:any, index:number)=> (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">#{r.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{r.customerName || '-'}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{r.customerEmail || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{r.customerPhone || '-'}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{r.totalQuantity ?? '-'}</td>
                  <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">₺{Number(r.totalAmount || 0).toLocaleString('tr-TR')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${String(r.status) === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      ['review','design','production','shipped'].includes(String(r.status)) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                      {translateStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.createdAt || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={()=>{ setSelectedId(r.id); setShowDetailModal(true); }} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg text-sm font-medium transition-shadow">
                      Detay
                    </button>
                  </td>
                </motion.tr>
              ))}
              {requests.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">Kayıt bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
          </motion.div>
        )}

        {activeTab === 'website' && (
          <motion.div
            key="website"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Website Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Talep</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{websiteStats.total}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Beklemede</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{websiteStats.pending}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Devam Eden</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{websiteStats.inProgress}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Tamamlanan</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{websiteStats.completed}</p>
              </div>
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Tutar</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">₺{websiteStats.totalAmount.toLocaleString('tr-TR')}</p>
              </div>
            </div>

            {/* Website Filters */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Talep no, müşteri adı, email veya telefon ara..."
                    value={websiteSearchQuery}
                    onChange={(e) => setWebsiteSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="relative">
                  <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <select
                    value={websiteStatusFilter}
                    onChange={(e) => setWebsiteStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 appearance-none"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="pending">Beklemede</option>
                    <option value="review">İnceleniyor</option>
                    <option value="design">Tasarım</option>
                    <option value="production">Üretimde</option>
                    <option value="shipped">Kargolandı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Website Requests Table */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              {websiteLoading && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Yükleniyor...
                </div>
              )}
              {websiteError && (
                <div className="p-4 m-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {websiteError}
                </div>
              )}
              {!websiteLoading && !websiteError && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Talep No</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredWebsiteRequests.map((request: any, index: number) => (
                        <motion.tr
                          key={request.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{request.requestNumber || `#${request.id}`}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{request.customerName || '-'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">ID: {request.userId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{request.customerEmail || '-'}</span>
                              </div>
                              {request.customerPhone && (
                                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                                  <Phone className="w-3 h-3" />
                                  <span>{request.customerPhone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-semibold">
                            {request.totalQuantity || request.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-green-600 dark:text-green-400">
                              ₺{Number(request.totalAmount || 0).toLocaleString('tr-TR')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${String(request.status) === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              ['review','design','production','shipped'].includes(String(request.status)) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {translateStatus(request.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedWebsiteRequest(request)
                                  setShowWebsiteDetailModal(true)
                                }}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Detayları Görüntüle"
                              >
                                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </button>
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => updateWebsiteRequestStatus(request.id, 'review')}
                                    className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title="İncelemeye Al"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </button>
                                  <button
                                    onClick={() => updateWebsiteRequestStatus(request.id, 'cancelled')}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="İptal Et"
                                  >
                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                      {filteredWebsiteRequests.length === 0 && !websiteLoading && !websiteError && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            {websiteSearchQuery || websiteStatusFilter !== 'all' ? 'Filtre kriterlerine uygun talep bulunamadı' : 'Henüz siteden talep bulunmuyor'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      {showDetailModal && typeof selectedId === 'number' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=> setShowDetailModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-700" onClick={(e)=> e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Talep Detayı</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Talep #{selectedId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const req = requests.find((x:any)=> x.id === selectedId)
                    setSelectedRequestForProforma(req || { id: selectedId, items: items })
                    setShowProformaModal(true)
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Proforma Fatura
                </button>
                <button onClick={()=> setRequestStatus(selectedId, 'review')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Teklif</button>
                <button onClick={()=> setRequestStatus(selectedId, 'completed')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">Onayla</button>
                <button onClick={()=> setRequestStatus(selectedId, 'cancelled')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Reddet</button>
                <button onClick={()=> setShowDetailModal(false)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">Kapat</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const req = requests.find((x:any)=> x.id === selectedId) || {}
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Müşteri</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{req.customerName || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{req.customerPhone || '-'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Durum</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{translateStatus(req.status)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Toplam</p>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-400">₺{Number(req.totalAmount||0).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                )
              })()}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map((it:any, idx:number)=> (
                      <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-100">{it.productName || (it.productId ? `Ürün #${it.productId}` : '-')}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{it.quantity ?? '-'}</td>
                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300 break-all">{renderCustomization(it.note ?? it.customizations)}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={3} className="px-6 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">Kalem bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=> setShowCreateModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700" onClick={(e)=> e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Yeni Talep</h3>
              <button onClick={()=> setShowCreateModal(false)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">Kapat</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Müşteri Adı</label>
                <input value={createForm.customerName} onChange={(e)=> setCreateForm({ ...createForm, customerName: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Telefon</label>
                <input value={createForm.customerPhone} onChange={(e)=> setCreateForm({ ...createForm, customerPhone: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Telefon" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Konu</label>
                <input value={createForm.subject} onChange={(e)=> setCreateForm({ ...createForm, subject: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Örn: Toptan Av Bıçağı" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Açıklama</label>
                <textarea value={createForm.description} onChange={(e)=> setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none" rows={4} placeholder="İhtiyaç detayı" />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button onClick={()=> setShowCreateModal(false)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">İptal</button>
                <button
                  onClick={async()=>{
                    const payload:any = { subject: createForm.subject, description: createForm.description }
                    if (createForm.customerName) payload.customerName = createForm.customerName
                    if (createForm.customerPhone) payload.customerPhone = createForm.customerPhone
                    try {
                      const resp = await api.post<any>('/admin/custom-production/requests', payload)
                      if ((resp as any)?.success && (resp as any).data?.id) {
                        setShowCreateModal(false)
                        setCreateForm({ subject: '', description: '', customerName: '', customerPhone: '' })
                        await loadRequests()
                        const newId = Number((resp as any).data.id)
                        setSelectedId(newId)
                        setShowDetailModal(true)
                        await loadItems(newId)
                      } else {
                        alert('Talep oluşturulamadı')
                      }
                    } catch { alert('Talep oluşturulamadı') }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items and messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Talep Kalemleri</h3>
              {typeof selectedId === 'number' && <p className="text-slate-500 dark:text-slate-400 text-sm">Talep #{selectedId} için</p>}
            </div>
            <div className="flex items-center gap-2">
              {typeof selectedId === 'number' && (
                <button onClick={()=>loadItems(selectedId)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Yenile</button>
              )}
            </div>
          </div>
          {itemsLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</p>}
          {itemsError && <p className="text-red-600 dark:text-red-400 text-sm">{itemsError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Mesaj/Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((it:any, idx:number)=> (
                  <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-100">{it.productName || (it.productId ? `Ürün #${it.productId}` : '-')}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{it.quantity ?? '-'}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300 break-all">{renderCustomization(it.note ?? it.customizations)}</td>
                  </tr>
                ))}
                {items.length === 0 && !itemsLoading && !itemsError && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">Kayıt bulunamadı</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Mesaj ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-300 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
          </div>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {messagesLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</div>}
            {messagesError && <div className="text-red-600 dark:text-red-400 text-sm">{messagesError}</div>}
            {messages
              .filter(m => !searchTerm || String(m.message||'').toLowerCase().includes(searchTerm.toLowerCase()))
              .map((message: any, index: number) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, x: message.sender === 'admin' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-md p-4 rounded-xl ${
                  message.sender === 'admin' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-semibold text-sm">{message.userName || (message.sender==='admin' ? 'Admin' : 'Kullanıcı')}</span>
                  </div>
                  <p className="text-sm mb-1">{message.message}</p>
                  <p className={`text-xs ${message.sender === 'admin' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {message.createdAt}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="Mesajınızı yazın..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              onClick={async()=>{
                const content = newMessage.trim()
                if (!content) return
                try {
                  let reqId = typeof selectedId === 'number' ? selectedId : 0
                  if (!reqId) {
                    const create = await api.post<any>('/admin/custom-production/requests', { subject: 'Admin Mesajı', description: content })
                    if ((create as any)?.success && (create as any).data?.id) {
                      reqId = Number((create as any).data.id)
                      setSelectedId(reqId)
                      await loadRequests()
                    }
                  }
                  const send = await api.post<any>('/admin/custom-production/messages', { requestId: reqId, message: content, sender: 'admin' })
                  if ((send as any)?.success) {
                    setNewMessage('')
                    await loadMessages(reqId || undefined)
                  } else {
                    alert('Mesaj gönderilemedi')
                  }
                } catch { alert('Mesaj gönderilemedi') }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Gönder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Website Detail Modal */}
      <AnimatePresence>
        {showWebsiteDetailModal && selectedWebsiteRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWebsiteDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Talep Detayları</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {selectedWebsiteRequest.requestNumber || `Talep #${selectedWebsiteRequest.id}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowWebsiteDetailModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Müşteri</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedWebsiteRequest.customerName || '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedWebsiteRequest.userId ? `User ID: ${selectedWebsiteRequest.userId}` : 'Misafir Kullanıcı (Giriş yapmadan form doldurdu)'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">E-posta</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 break-all">{selectedWebsiteRequest.customerEmail || '-'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Telefon</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {selectedWebsiteRequest.customerPhone || 'Belirtilmemiş'}
                    </p>
                  </div>
                </div>

                {/* Status and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Durum</p>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium inline-block ${String(selectedWebsiteRequest.status) === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      ['review','design','production','shipped'].includes(String(selectedWebsiteRequest.status)) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {translateStatus(selectedWebsiteRequest.status)}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Tutar</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ₺{Number(selectedWebsiteRequest.totalAmount || 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Adet</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedWebsiteRequest.totalQuantity || selectedWebsiteRequest.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                {selectedWebsiteRequest.items && selectedWebsiteRequest.items.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Ürünler</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Beden Dağılımı</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Birim Fiyat</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Toplam</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Not/Özelleştirme</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {selectedWebsiteRequest.items.map((item: any, idx: number) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                                {item.productName || (item.productId ? `Ürün #${item.productId}` : '-')}
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.quantity || 0}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {(() => {
                                  try {
                                    const customizations = typeof item.customizations === 'string' 
                                      ? JSON.parse(item.customizations) 
                                      : item.customizations;
                                    if (customizations && customizations.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
                                      return (
                                        <div className="flex flex-wrap gap-1.5">
                                          {customizations.sizes.map((sizeItem: any, idx: number) => (
                                            <span 
                                              key={idx}
                                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium"
                                              title={`${sizeItem.size}: ${sizeItem.quantity} adet`}
                                            >
                                              {sizeItem.size}: <strong>{sizeItem.quantity}</strong>
                                            </span>
                                          ))}
                                        </div>
                                      );
                                    }
                                  } catch {}
                                  return <span className="text-slate-500 dark:text-slate-400">-</span>;
                                })()}
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">₺{Number(item.price || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                                ₺{Number((item.price || 0) * (item.quantity || 0)).toLocaleString('tr-TR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {item.note ? (
                                  <span className="text-slate-700 dark:text-slate-300">{item.note}</span>
                                ) : item.customizations ? (
                                  renderCustomization(item.customizations)
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedWebsiteRequest.notes && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Genel Notlar</p>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedWebsiteRequest.notes}</p>
                  </div>
                )}

                {/* Status Actions */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedRequestForProforma(selectedWebsiteRequest)
                        setShowProformaModal(true)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Proforma Fatura
                    </button>
                    <button 
                      onClick={() => {
                        // Birim fiyat * 1.2 (kar) * 1.1 (KDV) = birim fiyat * 1.32
                        let calculatedQuoteAmount = 0
                        if (selectedWebsiteRequest.items && selectedWebsiteRequest.items.length > 0) {
                          selectedWebsiteRequest.items.forEach((item: any) => {
                            const basePrice = item.price || item.productPrice || 0
                            const quantity = item.quantity || 0
                            // Kar: %20, KDV: %10
                            const quotePricePerUnit = basePrice * 1.2 * 1.1 // = basePrice * 1.32
                            calculatedQuoteAmount += quotePricePerUnit * quantity
                          })
                        }
                        setQuoteAmount(calculatedQuoteAmount.toFixed(2))
                        setQuoteNotes('')
                        setShowQuoteModal(true)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Teklif Oluştur
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => updateWebsiteRequestStatus(selectedWebsiteRequest.id, e.target.value)}
                    value={selectedWebsiteRequest.status}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="review">İnceleniyor</option>
                    <option value="design">Tasarım</option>
                    <option value="production">Üretimde</option>
                    <option value="shipped">Kargolandı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                  <button
                    onClick={() => setShowWebsiteDetailModal(false)}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
                  >
                    Kapat
                  </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teklif Oluştur Modal */}
      <AnimatePresence>
        {showQuoteModal && selectedWebsiteRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Teklif Oluştur</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  {selectedWebsiteRequest.requestNumber || `Talep #${selectedWebsiteRequest.id}`}
                </p>
    </div>

              <div className="p-6 space-y-4">
                {/* Hesaplama Detayları */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Fiyatlandırma Formülü</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    Birim Fiyat × 1.20 (Kar) × 1.10 (KDV) = Birim Fiyat × 1.32
                  </p>
                </div>

                {/* Ürün ve Beden Detayları */}
                {selectedWebsiteRequest.items && selectedWebsiteRequest.items.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Ürün</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Beden</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">Adet</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">Birim Fiyat</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">Teklif Fiyat</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {selectedWebsiteRequest.items.map((item: any, itemIdx: number) => {
                          const basePrice = item.price || item.productPrice || 0
                          const quotePricePerUnit = basePrice * 1.32
                          
                          try {
                            const customizations = typeof item.customizations === 'string' 
                              ? JSON.parse(item.customizations) 
                              : item.customizations;
                            
                            if (customizations?.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
                              return customizations.sizes.map((sizeItem: any, sizeIdx: number) => {
                                const sizeQuantity = sizeItem.quantity || 0
                                const sizeTotal = quotePricePerUnit * sizeQuantity
                                
                                return (
                                  <tr key={`${itemIdx}-${sizeIdx}`} className={sizeIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}>
                                    {sizeIdx === 0 && (
                                      <td rowSpan={customizations.sizes.length} className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">
                                        {item.productName || `Ürün #${item.productId}`}
                                      </td>
                                    )}
                                    <td className="px-4 py-2">
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                        {sizeItem.size}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{sizeQuantity}</td>
                                    {sizeIdx === 0 && (
                                      <td rowSpan={customizations.sizes.length} className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                                        ₺{Number(basePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    )}
                                    {sizeIdx === 0 && (
                                      <td rowSpan={customizations.sizes.length} className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-semibold">
                                        ₺{Number(quotePricePerUnit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    )}
                                    <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">
                                      ₺{Number(sizeTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                )
                              })
                            }
                          } catch {}
                          
                          // Beden bilgisi yoksa
                          const itemQuantity = item.quantity || 0
                          const itemTotal = quotePricePerUnit * itemQuantity
                          
                          return (
                            <tr key={itemIdx} className="bg-white dark:bg-slate-900">
                              <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">
                                {item.productName || `Ürün #${item.productId}`}
                              </td>
                              <td className="px-4 py-2 text-slate-500 dark:text-slate-400">-</td>
                              <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{itemQuantity}</td>
                              <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                                ₺{Number(basePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-semibold">
                                ₺{Number(quotePricePerUnit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">
                                ₺{Number(itemTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Teklif Tutarı */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Teklif Tutarı (₺)
                  </label>
                  <input
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Teklif Notları */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Teklif Notları (Opsiyonel)
                  </label>
                  <textarea
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Teklif ile ilgili özel notlar..."
                  />
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowQuoteModal(false)
                      setQuoteAmount('')
                      setQuoteNotes('')
                    }}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.post<any>(`/admin/custom-production-requests/${selectedWebsiteRequest.id}/quote`, {
                          quoteAmount: parseFloat(quoteAmount),
                          quoteCurrency: 'TRY',
                          quoteNotes: quoteNotes,
                          quoteValidUntil: null
                        })
                        if ((response as any)?.success) {
                          alert('Teklif başarıyla gönderildi')
                          setShowQuoteModal(false)
                          setQuoteAmount('')
                          setQuoteNotes('')
                          await loadWebsiteRequests()
                          setShowWebsiteDetailModal(false)
                        } else {
                          alert('Teklif gönderilemedi: ' + ((response as any)?.message || 'Bilinmeyen hata'))
                        }
                      } catch (error: any) {
                        console.error('Teklif gönderme hatası:', error)
                        alert('Teklif gönderilemedi: ' + (error.message || 'Bilinmeyen hata'))
                      }
                    }}
                    disabled={!quoteAmount || parseFloat(quoteAmount) <= 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Teklifi Gönder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proforma Fatura Modal */}
      <AnimatePresence>
        {showProformaModal && selectedRequestForProforma && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProformaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Proforma Fatura</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {selectedRequestForProforma.requestNumber || `Talep #${selectedRequestForProforma.id}`}
                  </p>
    </div>
                <button
                  onClick={() => setShowProformaModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Firma Bilgileri */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Gönderen (Firma)</h4>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">Huğlu Tekstil Atölyesi</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">KOMEK, 43173.SK SİTESİ NO:20</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Beyşehir, Konya 42700</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Tel: +90 530 312 58 13</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Alıcı (Müşteri)</h4>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">
                      {selectedRequestForProforma.customerName || '-'}
                    </p>
                    {selectedRequestForProforma.companyName && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedRequestForProforma.companyName}</p>
                    )}
                    {selectedRequestForProforma.companyAddress && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{selectedRequestForProforma.companyAddress}</p>
                    )}
                    {selectedRequestForProforma.taxAddress && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedRequestForProforma.taxAddress}</p>
                    )}
                    {selectedRequestForProforma.customerEmail && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">E-posta: {selectedRequestForProforma.customerEmail}</p>
                    )}
                    {selectedRequestForProforma.customerPhone && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">Tel: {selectedRequestForProforma.customerPhone}</p>
                    )}
                    {selectedRequestForProforma.taxNumber && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Vergi No: {selectedRequestForProforma.taxNumber}</p>
                    )}
                  </div>
                </div>

                {/* Fatura Bilgileri */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Proforma Fatura No</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        PRO-{selectedRequestForProforma.requestNumber || selectedRequestForProforma.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tarih</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ürün Listesi - Beden Bazlı */}
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Ürünler</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Beden</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adet</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Birim Fiyat</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {(() => {
                          let rowIndex = 0
                          const rows: JSX.Element[] = []
                          
                          const items = Array.isArray(selectedRequestForProforma.items) 
                            ? selectedRequestForProforma.items 
                            : []
                          
                          items.forEach((item: any, itemIdx: number) => {
                            const itemPrice = item.price || item.productPrice || 0
                            
                            try {
                              const customizations = typeof item.customizations === 'string' 
                                ? JSON.parse(item.customizations) 
                                : item.customizations;
                              
                              if (customizations?.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
                                // Beden bazlı gösterim
                                customizations.sizes.forEach((sizeItem: any, sizeIdx: number) => {
                                  rowIndex++
                                  const sizeQuantity = sizeItem.quantity || 0
                                  const sizeTotal = itemPrice * sizeQuantity
                                  
                                  rows.push(
                                    <tr key={`${item.id || itemIdx}-${sizeIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{rowIndex}</td>
                                      <td className="px-4 py-3">
                                        {sizeIdx === 0 && (
                                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                                            {item.productName || (item.productId ? `Ürün #${item.productId}` : '-')}
                                          </p>
                                        )}
                                        {sizeIdx > 0 && <span className="text-slate-400 text-sm">↳</span>}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                                          {sizeItem.size}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{sizeQuantity}</td>
                                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">₺{Number(itemPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">₺{Number(sizeTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                  )
                                })
                              } else {
                                // Beden bilgisi yoksa normal gösterim
                                rowIndex++
                                const itemQuantity = item.quantity || 0
                                const itemTotal = itemPrice * itemQuantity
                                
                                rows.push(
                                  <tr key={item.id || itemIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{rowIndex}</td>
                                    <td className="px-4 py-3">
                                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                                        {item.productName || (item.productId ? `Ürün #${item.productId}` : '-')}
                                      </p>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">-</td>
                                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{itemQuantity}</td>
                                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">₺{Number(itemPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">₺{Number(itemTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                )
                              }
                            } catch {
                              // Parse hatası durumunda normal gösterim
                              rowIndex++
                              const itemQuantity = item.quantity || 0
                              const itemTotal = itemPrice * itemQuantity
                              
                              rows.push(
                                <tr key={item.id || itemIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{rowIndex}</td>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                                      {item.productName || (item.productId ? `Ürün #${item.productId}` : '-')}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">-</td>
                                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{itemQuantity}</td>
                                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">₺{Number(itemPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">₺{Number(itemTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              )
                            }
                          })
                          
                          return rows
                        })()}
                        <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                          <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">Toplam:</td>
                          <td className="px-4 py-3 text-right font-bold text-lg text-green-600 dark:text-green-400">
                            ₺{Number(selectedRequestForProforma.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notlar */}
                {selectedRequestForProforma.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notlar</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedRequestForProforma.notes}</p>
                  </div>
                )}

                {/* Uyarı */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Not:</strong> Bu belge proforma faturadır ve resmi fatura yerine geçmez. Ödeme sonrası resmi fatura kesilecektir.
                  </p>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      window.print()
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Yazdır
                  </button>
                  <button
                    onClick={() => {
                      const html = generateProformaInvoiceHTML(selectedRequestForProforma)
                      const blob = new Blob([html], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `proforma-fatura-${selectedRequestForProforma.requestNumber || selectedRequestForProforma.id}.html`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    HTML İndir
                  </button>
                  <button
                    onClick={() => setShowProformaModal(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Kapat
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

// Proforma Fatura HTML Template Generator
function generateProformaInvoiceHTML(request: any): string {
  const invoiceNumber = `PRO-${request.requestNumber || request.id}`
  const invoiceDate = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
  const items = request.items || []
  
  const itemsRows = items.map((item: any, idx: number) => {
    const itemPrice = item.price || item.productPrice || 0
    const itemQuantity = item.quantity || 0
    const itemTotal = itemPrice * itemQuantity
    
    let sizeInfo = ''
    try {
      const customizations = typeof item.customizations === 'string' 
        ? JSON.parse(item.customizations) 
        : item.customizations;
      if (customizations?.sizes && Array.isArray(customizations.sizes) && customizations.sizes.length > 0) {
        sizeInfo = `<br><small style="color: #64748b;">Beden: ${customizations.sizes.map((s: any) => `${s.size}:${s.quantity}`).join(', ')}</small>`
      }
    } catch {}
    
    return `
      <tr>
        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.productName || (item.productId ? `Ürün #${item.productId}` : '-'))}${sizeInfo}</td>
        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${itemQuantity}</td>
        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">₺${Number(itemPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600;">₺${Number(itemTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
  }).join('')
  
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proforma Fatura - ${invoiceNumber}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      max-width: 210mm;
      margin: 20px auto;
      padding: 20px;
      background: #f8fafc;
      color: #1e293b;
    }
    .invoice-container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .company-info h1 {
      margin: 0 0 10px 0;
      color: #1e40af;
      font-size: 24px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      margin: 0 0 10px 0;
      color: #7c3aed;
      font-size: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .info-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #64748b;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #1e293b;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    th:last-child,
    td:last-child {
      text-align: right;
    }
    .total-row {
      background: #f1f5f9;
      font-weight: 700;
    }
    .total-row td {
      padding: 15px 8px;
      font-size: 18px;
    }
    .note-box {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>Huğlu Tekstil Atölyesi</h1>
        <p style="margin: 5px 0; color: #64748b;">KOMEK, 43173.SK SİTESİ NO:20</p>
        <p style="margin: 5px 0; color: #64748b;">Beyşehir, Konya 42700</p>
        <p style="margin: 5px 0; color: #64748b;">Tel: +90 530 312 58 13</p>
      </div>
      <div class="invoice-info">
        <h2>PROFORMA FATURA</h2>
        <p style="margin: 5px 0;"><strong>No:</strong> ${invoiceNumber}</p>
        <p style="margin: 5px 0;"><strong>Tarih:</strong> ${invoiceDate}</p>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <h3>Gönderen</h3>
        <p style="margin: 5px 0; font-weight: 600;">Huğlu Tekstil Atölyesi</p>
        <p style="margin: 5px 0; color: #64748b;">KOMEK, 43173.SK SİTESİ NO:20</p>
        <p style="margin: 5px 0; color: #64748b;">Beyşehir, Konya 42700</p>
      </div>
      <div class="info-card">
        <h3>Alıcı</h3>
        <p style="margin: 5px 0; font-weight: 600;">${escapeHtml(request.customerName || '-')}</p>
        ${request.companyName ? `<p style="margin: 5px 0; color: #64748b;">${escapeHtml(request.companyName)}</p>` : ''}
        ${request.companyAddress ? `<p style="margin: 5px 0; color: #64748b;">${escapeHtml(request.companyAddress)}</p>` : ''}
        ${request.taxAddress ? `<p style="margin: 5px 0; color: #64748b;">${escapeHtml(request.taxAddress)}</p>` : ''}
        ${request.customerEmail ? `<p style="margin: 5px 0; color: #64748b;">E-posta: ${escapeHtml(request.customerEmail)}</p>` : ''}
        ${request.customerPhone ? `<p style="margin: 5px 0; color: #64748b;">Tel: ${escapeHtml(request.customerPhone)}</p>` : ''}
        ${request.taxNumber ? `<p style="margin: 5px 0; color: #64748b;">Vergi No: ${escapeHtml(request.taxNumber)}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Ürün</th>
          <th style="text-align: right;">Miktar</th>
          <th style="text-align: right;">Birim Fiyat</th>
          <th style="text-align: right;">Tutar</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr class="total-row">
          <td colspan="4" style="text-align: right; padding: 15px 8px;">TOPLAM:</td>
          <td style="padding: 15px 8px; color: #059669; font-size: 18px;">₺${Number(request.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    ${request.notes ? `
    <div class="note-box">
      <h4 style="margin: 0 0 10px 0; font-size: 14px;">Notlar</h4>
      <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(request.notes)}</p>
    </div>
    ` : ''}

    <div class="note-box">
      <p style="margin: 0; font-weight: 600; color: #92400e;"><strong>Not:</strong> Bu belge proforma faturadır ve resmi fatura yerine geçmez. Ödeme sonrası resmi fatura kesilecektir.</p>
    </div>

    <div class="footer">
      <p>Huğlu Tekstil Atölyesi - ${invoiceDate}</p>
      <p>Bu belge elektronik ortamda oluşturulmuştur.</p>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return String(text || '').replace(/[&<>"']/g, (m) => map[m])
}


