'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Download, Eye, Mail, Phone, MapPin, TrendingUp, RefreshCw, X, MessageCircle, ExternalLink, Award, Save } from 'lucide-react'
import { formatDDMMYYYY } from '@/lib/date'
import { motion, AnimatePresence } from 'framer-motion'
import { userService } from '@/lib/services'
import type { User } from '@/lib/api'

interface CustomerStats {
  orders?: number
  totalSpent?: number
  lastOrder?: string
}

export default function Customers() {
  const LEVELS = ['Bronze','Silver','Gold','Platinum'] as const

  const [pendingSaves, setPendingSaves] = useState<Record<number, boolean>>({})

  const setMembershipLevelLocal = (userId: number, level: typeof LEVELS[number]) => {
    setCustomers(prev => prev.map(c => c.id === userId ? ({ ...(c as any), membershipLevel: level } as any) : c))
  }

  const saveMembershipLevel = async (userId: number, level: typeof LEVELS[number]) => {
    setPendingSaves(p => ({ ...p, [userId]: true }))
    const previous = customers.find(c => c.id === userId) as any
    try {
      // Sunucu tarafında alan yoksa sessizce başarısız olabilir; en azından lokal state güncel kalır
      await userService.updateProfile(userId, { membershipLevel: level } as any)
    } catch (e: any) {
      // Geri al ve kullanıcıyı bilgilendir
      if (previous) setMembershipLevelLocal(userId, previous.membershipLevel)
      alert(e?.message || 'Seviye kaydedilemedi')
    } finally {
      setPendingSaves(p => ({ ...p, [userId]: false }))
    }
  }
  const getWhatsAppLink = (phone: string) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`
  const [activeTab, setActiveTab] = useState<'list' | 'levels' | 'profiles' | 'addresses' | 'events' | 'analytics'>('list')
  const [customers, setCustomers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingCustomer, setViewingCustomer] = useState<User | null>(null)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      // Backend'de tüm kullanıcıları getiren endpoint yoksa, yaygın bir harf ile arama yapıyoruz
      const response = await userService.getAllUsers()
      
      if (response.success && response.data) {
        setCustomers(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Müşteriler yüklenirken hata oluştu')
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      fetchCustomers()
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await userService.searchUsers(query, 0)
      
      if (response.success && response.data) {
        setCustomers(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchCustomers(searchTerm)
      } else {
        fetchCustomers()
      }
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Müşteriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Hata</p>
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={fetchCustomers}
          className="mt-4 px-6 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
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
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Müşteri Yönetimi</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tüm müşteri bilgilerini yönetin</p>
        </div>
        <button
          onClick={fetchCustomers}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Yenile
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-2 flex gap-2 overflow-x-auto border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'list'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Müşteri Listesi
        </button>
        <button
          onClick={() => setActiveTab('levels')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'levels'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Kullanıcı Seviyeleri
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'profiles'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Profiller
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'addresses'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Adresler
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'events'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Etkinlikler
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Analitik
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Toplam Müşteri</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Aktif Müşteri</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Yeni Müşteri (Bu Ay)</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {customers.filter(c => {
                  const createdDate = new Date(c.createdAt)
                  const now = new Date()
                  return createdDate.getMonth() === now.getMonth() && 
                         createdDate.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Kayıtlı Email</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300">
              <Filter className="w-4 h-4" />
              <span>Filtrele</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300">
              <Download className="w-4 h-4" />
              <span>Dışa Aktar</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adres</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kayıt Tarihi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-600 dark:text-slate-300">{customer.email}</span>
                        {customer.email && (
                          <a
                            href={`mailto:${customer.email}`}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            title="E‑posta gönder"
                            aria-label="E‑posta gönder"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-600 dark:text-slate-300">{customer.phone}</span>
                        {customer.phone && (
                          <a
                            href={getWhatsAppLink(customer.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="WhatsApp ile yaz"
                            aria-label="WhatsApp ile yaz"
                          >
                            <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-600 dark:text-slate-300">{customer.address || 'Belirtilmemiş'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-slate-600 dark:text-slate-300">{formatDDMMYYYY(customer.createdAt)}</span></td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setViewingCustomer(customer)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Müşteri bulunamadı</p>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {viewingCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingCustomer(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Müşteri Detayları</h3>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {viewingCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{viewingCustomer.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400">ID: #{viewingCustomer.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Email</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{viewingCustomer.email}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Telefon</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{viewingCustomer.phone}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 col-span-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Adres</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{viewingCustomer.address || 'Belirtilmemiş'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Kayıt Tarihi</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{formatDDMMYYYY(viewingCustomer.createdAt)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}

      {activeTab === 'levels' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {LEVELS.map(level => {
              const count = customers.filter(c => (c as any).membershipLevel === level).length
              return (
                <div key={level} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{level} Üye</p>
                      <p className={`text-2xl font-bold mt-1 ${level==='Platinum'?'text-purple-600 dark:text-purple-400':level==='Gold'?'text-yellow-600 dark:text-yellow-400':level==='Silver'?'text-slate-600 dark:text-slate-400':'text-orange-600 dark:text-orange-400'}`}>{count}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${level==='Platinum'?'bg-purple-100 dark:bg-purple-900/30':level==='Gold'?'bg-yellow-100 dark:bg-yellow-900/30':level==='Silver'?'bg-slate-100 dark:bg-slate-700':'bg-orange-100 dark:bg-orange-900/30'}`}>
                      <Award className={`w-6 h-6 ${level==='Platinum'?'text-purple-600 dark:text-purple-400':level==='Gold'?'text-yellow-600 dark:text-yellow-400':level==='Silver'?'text-slate-600 dark:text-slate-400':'text-orange-600 dark:text-orange-400'}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Seviye Yönetimi</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Listeden kullanıcı seviyesini güncelleyin</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Mevcut Seviye</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Yeni Seviye</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kaydet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {customers.map((c, index) => {
                    const current = (c as any).membershipLevel as typeof LEVELS[number] | undefined
                    const selected = current || 'Bronze'
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{c.email}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${selected==='Platinum'?'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800':selected==='Gold'?'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800':selected==='Silver'?'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600':'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}>
                            <Award className="w-3 h-3 mr-1" />
                            {selected}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <select
                            defaultValue={selected}
                            onChange={(e) => setMembershipLevelLocal(c.id, e.target.value as any)}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            {LEVELS.map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => saveMembershipLevel(c.id, ((customers.find(u => u.id === c.id) as any)?.membershipLevel) || 'Bronze')}
                            disabled={!!pendingSaves[c.id]}
                            className={`inline-flex items-center px-3 py-2 rounded-lg text-white ${pendingSaves[c.id] ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600'} disabled:opacity-60`}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Kaydet
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Profil Kartları</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Toplam {customers.length} müşteri</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((c) => {
              const level = (c as any).membershipLevel as any | undefined
              return (
                <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.email}</p>
                    </div>
                    {level && (
                      <span className={`px-2 py-1 rounded text-xs border ${level==='Platinum'?'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800':level==='Gold'?'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800':level==='Silver'?'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600':'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}>{level}</span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{c.phone}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <a href={`mailto:${c.email}`} className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm">E‑posta</a>
                    <a href={`https://wa.me/${(c.phone || '').replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-sm">WhatsApp</a>
                    <button onClick={() => setViewingCustomer(c)} className="px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm">Detay</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Adres Listesi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Adres bilgisi olan müşteriler listelenir</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Adres</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {customers.filter(c => !!c.address).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span>{c.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2"><Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" /><a className="text-blue-600 dark:text-blue-400 hover:underline" href={`mailto:${c.email}`}>{c.email}</a></div>
                        <div className="flex items-center space-x-2"><Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" /><a className="text-green-600 dark:text-green-400 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${(c.phone || '').replace(/\D/g,'')}`}>{c.phone}</a></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Etkinlik Akışı</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kayıt tarihine göre son olaylar</p>
          </div>
          <div className="space-y-4">
            {customers
              .slice()
              .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 50)
              .map(c => (
              <div key={c.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200"><span className="font-semibold">{c.name}</span> kayıt oldu</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDDMMYYYY(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Toplam Müşteri</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{customers.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Email Kayıtlı</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{customers.filter(c => !!c.email).length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Telefon Kayıtlı</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{customers.filter(c => !!c.phone).length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Adres Kayıtlı</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{customers.filter(c => !!c.address).length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Üyelik Seviyesi Dağılımı</h4>
              <div className="space-y-2">
                {['Bronze','Silver','Gold','Platinum'].map(l => {
                  const cnt = customers.filter(c => (c as any).membershipLevel === l).length
                  const pct = customers.length ? Math.round((cnt/customers.length)*100) : 0
                  return (
                    <div key={l} className="flex items-center">
                      <div className="w-24 text-sm text-slate-600 dark:text-slate-400">{l}</div>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded">
                        <div className={`${l==='Platinum'?'bg-purple-600 dark:bg-purple-500':l==='Gold'?'bg-yellow-500 dark:bg-yellow-400':l==='Silver'?'bg-slate-500 dark:bg-slate-400':'bg-orange-500 dark:bg-orange-400'} h-2 rounded`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-slate-800 dark:text-slate-200 ml-2">{cnt}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Email Alan Adları</h4>
              <div className="space-y-2">
                {Object.entries(
                  customers.reduce((acc: Record<string, number>, c) => {
                    const domain = (c.email || '').split('@')[1] || 'diğer'
                    acc[domain] = (acc[domain] || 0) + 1
                    return acc
                  }, {})
                ).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([domain,count]) => (
                  <div key={domain} className="flex items-center">
                    <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{domain}</div>
                    <div className="w-12 text-right text-sm font-medium text-slate-800 dark:text-slate-200">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
