'use client'

import { useEffect, useState } from 'react'
import { Ticket, Plus, Copy, Trash2, TrendingUp, Gift, Search, Filter, CheckCircle, XCircle, Clock, Eye, Edit, DollarSign, Percent, Calendar, Users, X, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { giftCardService, GiftCard } from '@/lib/services/giftCardService'

interface Coupon {
  id: number
  code: string
  discount: string
  type: 'percentage' | 'fixed'
  minAmount: number
  maxUses: number
  used: number
  validUntil: string
  active: boolean
  description?: string
  createdAt?: string
}

interface UserDiscountCode {
  id: number
  code: string
  discount: string
  type: 'percentage' | 'fixed'
  userId?: number
  userName?: string
  userEmail?: string
  minAmount?: number
  maxUses?: number
  used: number
  validUntil: string
  active: boolean
  createdAt?: string
}


export default function Coupons() {
  // State'ler
  const [activeTab, setActiveTab] = useState<'coupons' | 'discount-codes' | 'gift-cards'>('coupons')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [discountCodes, setDiscountCodes] = useState<UserDiscountCode[]>([])
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // Modal state'leri
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'coupon' | 'discount-code' | 'gift-card'>('coupon')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    code: '',
    discount: '',
    type: 'percentage' as 'percentage' | 'fixed',
    minAmount: '',
    maxUses: '',
    validUntil: '',
    active: true,
    description: '',
    amount: '',
    recipientEmail: '',
    recipientName: '',
    message: '',
    userId: '',
    userName: '',
    userEmail: ''
  })

  // Kullanıcı seçimi için state'ler
  const [users, setUsers] = useState<any[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userSearchLoading, setUserSearchLoading] = useState(false)

  // Veri yükleme fonksiyonları
  const loadCoupons = async () => {
    try {
      const response = await api.get('/admin/coupons') as any
      if (response.success) {
        setCoupons(response.data || [])
      }
    } catch (error) {
      console.error('Kuponlar yükleme hatası:', error)
    }
  }

  const loadDiscountCodes = async () => {
    try {
      const response = await api.get('/admin/user-discount-codes?limit=100') as any
      if (response.success) {
        setDiscountCodes(response.data || [])
      }
    } catch (error) {
      console.error('İndirim kodları yükleme hatası:', error)
    }
  }

  const loadGiftCards = async () => {
    try {
      const response = await giftCardService.list()
      if (response.success) {
        setGiftCards(response.data || [])
      }
    } catch (error) {
      console.error('Hediye kartları yükleme hatası:', error)
    }
  }

  // Kullanıcı arama fonksiyonu
  const searchUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setUsers([])
      return
    }
    
    try {
      setUserSearchLoading(true)
      console.log('🔍 Kullanıcı aranıyor:', searchTerm)
      
      // Farklı endpoint'leri dene
      let response: any
      try {
        // Önce /admin/users/search dene
        response = await api.get(`/admin/users/search?q=${encodeURIComponent(searchTerm)}&limit=10`)
        console.log('📡 /admin/users/search response:', response)
      } catch (searchError) {
        console.log('⚠️ /admin/users/search başarısız, /admin/users dene')
        // Alternatif endpoint dene
        response = await api.get(`/admin/users?search=${encodeURIComponent(searchTerm)}&limit=10`)
        console.log('📡 /admin/users response:', response)
      }
      
      if (response && (response.success || response.data)) {
        const users = response.data || response
        console.log('👥 Bulunan kullanıcılar:', users)
        setUsers(Array.isArray(users) ? users : [])
      } else {
        console.log('❌ Kullanıcı bulunamadı, mock data kullanılıyor')
        // Fallback: Mock kullanıcı verileri
        const mockUsers = [
          { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet@example.com', firstName: 'Ahmet', lastName: 'Yılmaz' },
          { id: 2, name: 'Ayşe Demir', email: 'ayse@example.com', firstName: 'Ayşe', lastName: 'Demir' },
          { id: 3, name: 'Mehmet Kaya', email: 'mehmet@example.com', firstName: 'Mehmet', lastName: 'Kaya' },
          { id: 4, name: 'Fatma Öz', email: 'fatma@example.com', firstName: 'Fatma', lastName: 'Öz' },
          { id: 5, name: 'Ali Çelik', email: 'ali@example.com', firstName: 'Ali', lastName: 'Çelik' }
        ].filter(user => 
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setUsers(mockUsers)
      }
    } catch (error) {
      console.error('❌ Kullanıcı arama hatası:', error)
      console.log('🔄 Mock data kullanılıyor')
      // Fallback: Mock kullanıcı verileri
      const mockUsers = [
        { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet@example.com', firstName: 'Ahmet', lastName: 'Yılmaz' },
        { id: 2, name: 'Ayşe Demir', email: 'ayse@example.com', firstName: 'Ayşe', lastName: 'Demir' },
        { id: 3, name: 'Mehmet Kaya', email: 'mehmet@example.com', firstName: 'Mehmet', lastName: 'Kaya' },
        { id: 4, name: 'Fatma Öz', email: 'fatma@example.com', firstName: 'Fatma', lastName: 'Öz' },
        { id: 5, name: 'Ali Çelik', email: 'ali@example.com', firstName: 'Ali', lastName: 'Çelik' }
      ].filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setUsers(mockUsers)
    } finally {
      setUserSearchLoading(false)
    }
  }

  // Kullanıcı seçimi
  const selectUser = (user: any) => {
    setSelectedUser(user)
    setFormData({
      ...formData,
      userId: user.id.toString(),
      userName: user.name || user.firstName + ' ' + user.lastName,
      userEmail: user.email,
      recipientName: user.name || user.firstName + ' ' + user.lastName,
      recipientEmail: user.email
    })
    setUserSearchTerm('')
    setShowUserSearch(false)
  }

  // Kullanıcı seçimini temizle
  const clearUserSelection = () => {
    setSelectedUser(null)
    setFormData({
      ...formData,
      userId: '',
      userName: '',
      userEmail: '',
      recipientName: '',
      recipientEmail: ''
    })
  }

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        await Promise.all([
          loadCoupons(),
          loadDiscountCodes(),
          loadGiftCards()
        ])
      } catch (error) {
        setError('Veriler yüklenirken hata oluştu')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // Kullanıcı arama için useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchTerm.length >= 2) {
        searchUsers(userSearchTerm)
      } else {
        setUsers([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [userSearchTerm])

  // Yardımcı fonksiyonlar
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Kod kopyalandı: ${code}`)
  }

  const deleteItem = async (id: number, type: 'coupon' | 'discount-code' | 'gift-card') => {
    if (confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) {
      try {
        let endpoint = ''
        switch (type) {
          case 'coupon':
            endpoint = `/admin/coupons/${id}`
            break
          case 'discount-code':
            endpoint = `/admin/user-discount-codes/${id}`
            break
          case 'gift-card':
            endpoint = `/admin/gift-cards/${id}`
            break
        }
        
        const response = await api.delete(endpoint) as any
        if (response.success) {
          // State'i güncelle
          switch (type) {
            case 'coupon':
      setCoupons(coupons.filter(c => c.id !== id))
              break
            case 'discount-code':
              setDiscountCodes(discountCodes.filter(c => c.id !== id))
              break
            case 'gift-card':
              setGiftCards(giftCards.filter(c => c.id !== id))
              break
          }
        }
      } catch (error) {
        console.error('Silme hatası:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'used': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'expired': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'used': return <Clock className="w-4 h-4" />
      case 'expired': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('💾 Form gönderiliyor...', { modalType, editingItem, formData })
    
    // Form validation
    if (!formData.code.trim()) {
      alert('❌ Kod alanı zorunludur!')
      return
    }
    
    if (!formData.discount.trim()) {
      alert('❌ İndirim alanı zorunludur!')
      return
    }
    
    if (modalType === 'gift-card' && !formData.amount) {
      alert('❌ Hediye kartı tutarı zorunludur!')
      return
    }
    
    setSubmitLoading(true)
    
    try {
      const submitData = {
        ...formData,
        minAmount: formData.minAmount ? parseFloat(formData.minAmount) : 0,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : 0,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        userId: formData.userId ? parseInt(formData.userId) : undefined
      }

      console.log('📤 Gönderilecek veri:', submitData)

      let endpoint = ''
      let response: any

      if (editingItem) {
        // Güncelleme
        switch (modalType) {
          case 'coupon':
            endpoint = `/admin/coupons/${editingItem.id}`
            response = await api.put(endpoint, submitData)
            break
          case 'discount-code':
            endpoint = `/admin/user-discount-codes/${editingItem.id}`
            response = await api.put(endpoint, submitData)
            break
          case 'gift-card':
            endpoint = `/admin/gift-cards/${editingItem.id}`
            response = await api.put(endpoint, submitData)
            break
        }
      } else {
        // Yeni oluşturma
        switch (modalType) {
          case 'coupon':
            endpoint = '/admin/coupons'
            response = await api.post(endpoint, submitData)
            break
          case 'discount-code':
            endpoint = '/admin/user-discount-codes'
            response = await api.post(endpoint, submitData)
            break
          case 'gift-card':
            endpoint = '/admin/gift-cards'
            response = await api.post(endpoint, submitData)
            break
        }
      }

      console.log('📡 API Response:', response)

      // Response kontrolünü iyileştir
      if (response && (response.success || response.data)) {
        const newItem = response.data || response
        
        console.log('✅ Başarılı, yeni öğe:', newItem)
        
        // State'i güncelle
        switch (modalType) {
          case 'coupon':
            if (editingItem) {
              setCoupons(coupons.map(c => c.id === editingItem.id ? newItem : c))
            } else {
              setCoupons([...coupons, newItem])
            }
            break
          case 'discount-code':
            if (editingItem) {
              setDiscountCodes(discountCodes.map(c => c.id === editingItem.id ? newItem : c))
            } else {
              setDiscountCodes([...discountCodes, newItem])
            }
            break
          case 'gift-card':
            if (editingItem) {
              setGiftCards(giftCards.map(c => c.id === editingItem.id ? newItem : c))
            } else {
              setGiftCards([...giftCards, newItem])
            }
            break
        }
        
        // Modal'ı kapat ve form'u temizle
        setIsModalOpen(false)
        setEditingItem(null)
        setSelectedUser(null)
        setFormData({
          code: '',
          discount: '',
          type: 'percentage',
          minAmount: '',
          maxUses: '',
          validUntil: '',
          active: true,
          description: '',
          amount: '',
          recipientEmail: '',
          recipientName: '',
          message: '',
          userId: '',
          userName: '',
          userEmail: ''
        })
        
        alert('✅ Başarıyla kaydedildi!')
      } else {
        console.error('❌ API başarısız:', response)
        alert('❌ Kaydetme başarısız: ' + (response?.message || 'Bilinmeyen hata'))
      }
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error)
      alert('❌ Kaydetme hatası: ' + (error as Error).message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const openModal = (type: 'coupon' | 'discount-code' | 'gift-card', item?: any) => {
    setModalType(type)
    setEditingItem(item || null)
    
    if (item) {
      setFormData({
        code: item.code || '',
        discount: item.discount || '',
        type: item.type || 'percentage',
        minAmount: item.minAmount?.toString() || '',
        maxUses: item.maxUses?.toString() || '',
        validUntil: item.validUntil || '',
        active: item.active !== undefined ? item.active : true,
        description: item.description || '',
        amount: item.amount?.toString() || '',
        recipientEmail: item.recipientEmail || '',
        recipientName: item.recipientName || '',
        message: item.message || '',
        userId: item.userId?.toString() || '',
        userName: item.userName || '',
        userEmail: item.userEmail || ''
      })
    } else {
      setFormData({
        code: '',
        discount: '',
        type: 'percentage',
        minAmount: '',
        maxUses: '',
        validUntil: '',
        active: true,
        description: '',
        amount: '',
        recipientEmail: '',
        recipientName: '',
        message: '',
        userId: '',
        userName: '',
        userEmail: ''
      })
    }
    
    setIsModalOpen(true)
  }

  // Filtrelenmiş veriler
  const filteredCoupons = coupons.filter(c => 
    c?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const filteredDiscountCodes = discountCodes.filter(c => 
    c?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const filteredGiftCards = giftCards.filter(c => 
    c?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Kupon & İndirim Yönetimi</h1>
            <p className="text-blue-100 text-lg">Kuponlar, indirim kodları ve hediye kartlarını yönetin</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input 
                value={searchTerm} 
                onChange={(e)=>setSearchTerm(e.target.value)} 
                placeholder="Kod ara..." 
                className="w-full sm:w-64 px-4 py-3 pl-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30" 
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="w-5 h-5 text-blue-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { key:'coupons', label:'Kupon Kodları', icon: <Ticket className="w-4 h-4" /> },
            { key:'discount-codes', label:'Kullanıcı İndirim Kodları', icon: <Users className="w-4 h-4" /> },
            { key:'gift-cards', label:'Hediye Kartları', icon: <Gift className="w-4 h-4" /> },
          ].map((t:any)=> (
            <button
              key={t.key}
              onClick={()=>setActiveTab(t.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab===t.key 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Ticket className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{coupons.filter(c => c.active).length}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Aktif Kuponlar</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Şu anda kullanılabilir kuponlar</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{discountCodes.filter(c => c.active).length}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Aktif İndirim Kodları</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Kullanıcıya özel indirim kodları</p>
        </motion.div>

          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{giftCards.filter(c => c.status === 'active').length}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Aktif Hediye Kartları</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Kullanılabilir hediye kartları</p>
        </motion.div>
      </div>

      {/* Content Sections */}
      {activeTab === 'coupons' && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kupon Kodları</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Genel kullanım için kupon kodları</p>
        </div>
              <button 
                onClick={() => openModal('coupon')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4 inline mr-2" />
          Yeni Kupon
        </button>
      </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kupon</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İndirim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kullanım</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Geçerlilik</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCoupons.map((coupon, index) => (
                  <motion.tr
            key={coupon.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                          <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{coupon.code}</div>
                          {coupon.description && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">{coupon.description}</div>
                          )}
        </div>
        </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        {coupon.discount 
                          ? (coupon.type === 'percentage' ? `%${coupon.discount}` : `${coupon.discount}₺`)
                          : '-'}
        </div>
                      {coupon.minAmount > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Min: {coupon.minAmount}₺</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {coupon.used ?? 0}/{coupon.maxUses || '∞'}
                        </div>
                        {coupon.maxUses && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" 
                              style={{ width: `${((coupon.used ?? 0) / coupon.maxUses) * 100}%` }}
                            ></div>
        </div>
                        )}
      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {coupon.validUntil && !isNaN(new Date(coupon.validUntil).getTime())
                          ? new Date(coupon.validUntil).toLocaleDateString('tr-TR')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        coupon.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {coupon.active ? 'Aktif' : 'Pasif'}
                </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => copyCode(coupon.code)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          title="Kopyala"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openModal('coupon', coupon)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteItem(coupon.id, 'coupon')}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'discount-codes' && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kullanıcı İndirim Kodları</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Kullanıcıya özel indirim kodları</p>
              </div>
                  <button
                onClick={() => openModal('discount-code')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                  >
                <Plus className="w-4 h-4 inline mr-2" />
                Yeni İndirim Kodu
                  </button>
                </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kullanıcı</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İndirim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kullanım</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Geçerlilik</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDiscountCodes.map((code, index) => (
                  <motion.tr
                    key={code.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center text-white">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{code.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {code.userName ? code.userName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{code.userName || 'Genel'}</div>
                          {code.userId && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">ID: {code.userId}</div>
                          )}
                          {code.userEmail && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{code.userEmail}</div>
                          )}
                        </div>
              </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        {code.discount 
                          ? (code.type === 'percentage' ? `%${code.discount}` : `${code.discount}₺`)
                          : '-'}
              </div>
                      {code.minAmount && code.minAmount > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Min: {code.minAmount}₺</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {code.used ?? 0}/{code.maxUses || '∞'}
                        </div>
                        {code.maxUses && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                            <div 
                              className="bg-green-600 dark:bg-green-400 h-2 rounded-full" 
                              style={{ width: `${((code.used ?? 0) / code.maxUses) * 100}%` }}
                ></div>
              </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {code.validUntil && !isNaN(new Date(code.validUntil).getTime())
                          ? new Date(code.validUntil).toLocaleDateString('tr-TR')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        code.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {code.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => copyCode(code.code)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          title="Kopyala"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openModal('discount-code', code)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteItem(code.id, 'discount-code')}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
              </div>
              </div>
      )}

      {activeTab === 'gift-cards' && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Hediye Kartları</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Hediye kartlarını yönetin</p>
              </div>
              <button
                onClick={() => openModal('gift-card')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Yeni Hediye Kartı
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hediye Kartı</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Alıcı</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tutar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bakiye</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Geçerlilik</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredGiftCards.map((card, index) => (
                  <motion.tr
                    key={card.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                          <Gift className="w-5 h-5" />
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{card.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {card.recipientName ? card.recipientName.charAt(0).toUpperCase() : 'H'}
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{card.recipientName || 'Belirtilmemiş'}</div>
                          {card.recipientEmail && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{card.recipientEmail}</div>
                          )}
                          {card.userId && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">Kullanıcı ID: {card.userId}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-purple-600 dark:text-purple-400">
                        {card.amount ? `${card.amount}₺` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        {card.balance !== undefined && card.balance !== null ? `${card.balance}₺` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {card.validUntil && !isNaN(new Date(card.validUntil).getTime())
                          ? new Date(card.validUntil).toLocaleDateString('tr-TR')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                        {getStatusIcon(card.status)}
                        <span className="ml-1">
                          {card.status === 'active' ? 'Aktif' : 
                           card.status === 'used' ? 'Kullanıldı' : 'Süresi Doldu'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => copyCode(card.code)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          title="Kopyala"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openModal('gift-card', card)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
              <button
                          onClick={() => deleteItem(card.id, 'gift-card')}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                          title="Sil"
              >
                          <Trash2 className="w-4 h-4" />
              </button>
            </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => {
                setTimeout(() => setShowUserSearch(false), 200)
              }}
              className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-bold">
                      {editingItem ? 'Düzenle' : 'Yeni'} {
                        modalType === 'coupon' ? 'Kupon' :
                        modalType === 'discount-code' ? 'İndirim Kodu' : 'Hediye Kartı'
                      }
                    </h3>
                    <p className="text-blue-100 mt-1">Detayları doldurun</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kod *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.code} 
                      onChange={(e)=>setFormData({...formData,code:e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                      placeholder="Kupon/indirim kodu"
                    />
                  </div>
                  
                  {modalType === 'gift-card' ? (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Tutar (₺) *</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.amount} 
                        onChange={(e)=>setFormData({...formData,amount:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Hediye kartı tutarı"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">İndirim *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.discount} 
                        onChange={(e)=>setFormData({...formData,discount:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="İndirim değeri"
                      />
                    </div>
                  )}
                </div>

                {modalType !== 'gift-card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">İndirim Türü</label>
                      <select 
                        value={formData.type} 
                        onChange={(e)=>setFormData({...formData,type:e.target.value as any})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                      >
                        <option value="percentage">Yüzde (%)</option>
                        <option value="fixed">Sabit Tutar (₺)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Min. Tutar</label>
                      <input 
                        type="number" 
                        value={formData.minAmount} 
                        onChange={(e)=>setFormData({...formData,minAmount:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Minimum sepet tutarı"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Max. Kullanım</label>
                    <input 
                      type="number" 
                      value={formData.maxUses} 
                      onChange={(e)=>setFormData({...formData,maxUses:e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                      placeholder="Maksimum kullanım sayısı"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Geçerlilik Tarihi *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.validUntil} 
                      onChange={(e)=>setFormData({...formData,validUntil:e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                    />
                  </div>
                </div>

                {(modalType === 'discount-code' || modalType === 'gift-card') && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Kullanıcı Seçimi</h4>
                    
                    {/* Kullanıcı Arama */}
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kullanıcı Ara</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={userSearchTerm} 
                          onChange={(e) => {
                            setUserSearchTerm(e.target.value)
                            setShowUserSearch(true)
                          }}
                          onFocus={() => setShowUserSearch(true)}
                          className="w-full px-4 py-3 pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                          placeholder="Kullanıcı adı veya e-posta ile ara..."
                        />
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        {userSearchLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Kullanıcı Arama Sonuçları */}
                      {showUserSearch && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-dark-card border border-slate-300 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {userSearchLoading ? (
                            <div className="p-4 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">Kullanıcılar aranıyor...</div>
                            </div>
                          ) : users.length > 0 ? (
                            users.map((user) => (
                              <div key={user.id} className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 last:border-b-0 transition-colors">
                                <button
                                  type="button"
                                  onClick={() => selectUser(user)}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                      {user.name ? user.name.charAt(0).toUpperCase() : 
                                       user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                      <div className="font-medium text-slate-800 dark:text-slate-100">
                                        {user.name || `${user.firstName} ${user.lastName}`}
                                      </div>
                                      <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                      <div className="text-xs text-slate-400 dark:text-slate-500">ID: {user.id}</div>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            ))
                          ) : userSearchTerm.length >= 2 ? (
                            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                              <div className="text-sm">Kullanıcı bulunamadı</div>
                              <div className="text-xs mt-1">Farklı bir arama terimi deneyin</div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Seçilen Kullanıcı */}
                    {selectedUser && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 
                               selectedUser.firstName ? selectedUser.firstName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-100">
                                {selectedUser.name || `${selectedUser.firstName} ${selectedUser.lastName}`}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400">{selectedUser.email}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">ID: {selectedUser.id}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={clearUserSelection}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                            title="Kullanıcı seçimini kaldır"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Manuel Kullanıcı ID Girişi */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Veya Manuel Kullanıcı ID</label>
                      <input 
                        type="number" 
                        value={formData.userId} 
                        onChange={(e)=>setFormData({...formData,userId:e.target.value})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                        placeholder="Kullanıcı ID (boş bırakılırsa genel)"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Kullanıcı araması yapmadan doğrudan ID ile de tanımlayabilirsiniz
                      </p>
                    </div>
                  </div>
                )}

                {modalType === 'gift-card' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Hediye Kartı Detayları</h4>
                    
                    {/* Manuel Alıcı Bilgileri (Kullanıcı seçilmediyse) */}
                    {!selectedUser && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Alıcı Adı</label>
                          <input 
                            type="text" 
                            value={formData.recipientName} 
                            onChange={(e)=>setFormData({...formData,recipientName:e.target.value})} 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                            placeholder="Alıcı adı"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Alıcı E-posta</label>
                          <input 
                            type="email" 
                            value={formData.recipientEmail} 
                            onChange={(e)=>setFormData({...formData,recipientEmail:e.target.value})} 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                            placeholder="Alıcı e-posta"
                          />
                        </div>
                      </div>
                    )}

                    {/* Seçilen Kullanıcı için Bilgi Güncelleme */}
                    {selectedUser && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="font-semibold text-green-800 dark:text-green-300">Kullanıcı Seçildi - Bilgiler Otomatik Dolduruldu</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Alıcı Adı</label>
                              <input 
                                type="text" 
                                value={formData.recipientName} 
                                onChange={(e)=>setFormData({...formData,recipientName:e.target.value})} 
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                                placeholder="Alıcı adı"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Alıcı E-posta</label>
                              <input 
                                type="email" 
                                value={formData.recipientEmail} 
                                onChange={(e)=>setFormData({...formData,recipientEmail:e.target.value})} 
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                                placeholder="Alıcı e-posta"
                              />
                            </div>
                          </div>
      </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Açıklama</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e)=>setFormData({...formData,description:e.target.value})} 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                    rows={3} 
                    placeholder="Açıklama"
                  />
                </div>

                {modalType === 'gift-card' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Mesaj</label>
                    <textarea 
                      value={formData.message} 
                      onChange={(e)=>setFormData({...formData,message:e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100" 
                      rows={3} 
                      placeholder="Hediye kartı mesajı"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="active" 
                    checked={formData.active} 
                    onChange={(e)=>setFormData({...formData,active:e.target.checked})} 
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Aktif
                  </label>
                </div>

                <div className="flex space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button 
                    type="submit" 
                    disabled={submitLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl flex items-center justify-center font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitLoading ? (
                      <>
                        <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        {editingItem ? 'Güncelle' : 'Kaydet'}
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-8 py-4 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-slate-700 dark:text-slate-300"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
