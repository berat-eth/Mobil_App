'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Radio, RefreshCw, MapPin, Smartphone, Navigation, Clock, Globe, Monitor, Tablet, User, Phone } from 'lucide-react'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

// Dynamic import for map to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] bg-slate-100 dark:bg-slate-800 rounded-xl">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Harita yükleniyor...</p>
      </div>
    </div>
  )
})

interface LiveUser {
  id: string
  userId?: number
  sessionId: string
  ipAddress: string
  country: string
  city: string
  latitude?: number
  longitude?: number
  device: string
  browser: string
  os: string
  page: string
  lastActivity: string
  duration: number
  userName?: string
  userPhone?: string
}

export default function LiveUsers() {
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLiveUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const liveUsersRes = await api.get<any>('/admin/live-users')
      if (liveUsersRes?.success && Array.isArray(liveUsersRes.data)) {
        setLiveUsers(liveUsersRes.data)
      } else {
        setLiveUsers([])
      }
    } catch (err: any) {
      console.error('Canlı kullanıcılar yüklenemedi:', err)
      setError(err?.message || 'Canlı kullanıcılar yüklenemedi')
      setLiveUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // İlk yükleme
    fetchLiveUsers()

    // 30 saniyede bir otomatik yenile
    const interval = setInterval(fetchLiveUsers, 30000)

    return () => clearInterval(interval)
  }, [])

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) return Smartphone
    if (device.toLowerCase().includes('tablet')) return Tablet
    return Monitor
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const getTimeAgo = (lastActivity: string) => {
    try {
      const now = new Date()
      const activityTime = new Date(lastActivity)
      const diffSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000)
      
      if (diffSeconds < 60) return `${diffSeconds} sn önce`
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} dk önce`
      return `${Math.floor(diffSeconds / 3600)} sa önce`
    } catch {
      return 'Bilinmiyor'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Canlı Kullanıcılar</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Şu anda aktif olan kullanıcıların gerçek zamanlı takibi</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {liveUsers.length} Aktif
            </span>
          </div>
          <button
            onClick={fetchLiveUsers}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm text-slate-700 dark:text-slate-300">Yenile</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl shadow-sm p-6 border border-emerald-200 dark:border-emerald-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-1">Toplam Aktif</p>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{liveUsers.length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Radio className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-sm p-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Kayıtlı Kullanıcı</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {liveUsers.filter(u => u.userId).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl shadow-sm p-6 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 dark:text-purple-400 font-medium mb-1">Misafir</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {liveUsers.filter(u => !u.userId).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl shadow-sm p-6 border border-orange-200 dark:border-orange-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 dark:text-orange-400 font-medium mb-1">Ortalama Süre</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {liveUsers.length > 0
                  ? formatDuration(Math.round(liveUsers.reduce((sum, u) => sum + (u.duration || 0), 0) / liveUsers.length))
                  : '0:00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Aktif Kullanıcı Listesi</h3>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Otomatik yenileme: 30 saniye
          </div>
        </div>

        {loading && liveUsers.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
            <span className="ml-3 text-slate-500 dark:text-slate-400">Yükleniyor...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 dark:text-red-400 mb-2">⚠️</div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={fetchLiveUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        ) : liveUsers.length === 0 ? (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Şu anda aktif kullanıcı yok</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kullanıcılar aktif olduğunda burada görünecek</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {liveUsers.map((user, index) => {
              const DeviceIcon = getDeviceIcon(user.device)
              return (
                <motion.div
                  key={user.id || user.sessionId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg text-sm">
                        {user.userId ? `U${user.userId}` : 'G'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                          {user.userName || (user.userId ? `Kullanıcı #${user.userId}` : 'Misafir Kullanıcı')}
                        </p>
                        {user.userId && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                            Kayıtlı
                          </span>
                        )}
                      </div>
                      {(user.userName || user.userPhone) && (
                        <div className="flex items-center space-x-3 mb-2 text-xs">
                          {user.userName && (
                            <span className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                              <User className="w-3.5 h-3.5" />
                              <span className="font-medium">{user.userName}</span>
                            </span>
                          )}
                          {user.userPhone && (
                            <span className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                              <Phone className="w-3.5 h-3.5" />
                              <span className="font-medium">{user.userPhone}</span>
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{user.city}, {user.country}</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <DeviceIcon className="w-3.5 h-3.5" />
                          <span>{user.device}</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <Navigation className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{user.page || '/'}</span>
                        </span>
                        <span className="text-slate-500 dark:text-slate-500">
                          {getTimeAgo(user.lastActivity)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Session Süresi</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatDuration(user.duration || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sistem</p>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{user.os}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tarayıcı</p>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{user.browser}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Map */}
      {liveUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kullanıcı Konumları</h3>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {liveUsers.filter(u => u.latitude && u.longitude).length} konum gösteriliyor
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: '500px' }}>
            <MapComponent users={liveUsers} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

