'use client'

import { useState, useEffect } from 'react'
import { Disc, Search, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Spin {
  id: number
  userId?: number
  userName?: string
  deviceId: string
  spinResult: string
  discountCode: string
  isUsed: boolean
  usedAt?: string
  createdAt: string
  expiresAt: string
}

export default function DiscountWheelSpins() {
  const [spins, setSpins] = useState<Spin[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSpins()
  }, [])

  const loadSpins = async () => {
    try {
      setLoading(true)
      setError(null)
      const { api } = await import('@/lib/api')
      const response = await api.get<any>('/admin/discount-wheel-spins')
      const data = response as any
      
      if (data.success && Array.isArray(data.data)) {
        setSpins(data.data)
      } else {
        setSpins([])
      }
    } catch (err: any) {
      console.error('Error loading wheel spins:', err)
      setError(err?.message || 'Çevirmeler yüklenemedi')
      setSpins([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSpins = spins.filter(spin => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      spin.userName?.toLowerCase().includes(search) ||
      spin.discountCode?.toLowerCase().includes(search) ||
      spin.deviceId?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Çarkıfelek Çevirmeleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">İndirim çarkı sonuçlarını görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Kullanıcı, kod veya cihaz ID ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <button 
            onClick={loadSpins}
            disabled={loading}
            className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Yükleniyor...</span>
          </div>
        ) : filteredSpins.length === 0 ? (
          <div className="text-center py-12">
            <Disc className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz çark çevirilmedi'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSpins.map((spin, index) => {
              const createdAt = new Date(spin.createdAt).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
              const expiresAt = new Date(spin.expiresAt).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
              
              return (
                <motion.div
                  key={spin.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Disc className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                          {spin.userName || 'Misafir Kullanıcı'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Kod: {spin.discountCode}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{createdAt}</p>
                        {spin.deviceId && (
                          <p className="text-xs text-slate-400 dark:text-slate-500">Cihaz: {spin.deviceId.substring(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">%{spin.spinResult}</p>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        spin.isUsed ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {spin.isUsed ? 'Kullanıldı' : 'Aktif'}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Son: {expiresAt}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
