'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/ThemeContext'
import { 
  BarChart3, TrendingUp, Users, Activity, ShoppingCart, DollarSign, 
  Eye, MousePointer, Zap, AlertTriangle, Clock, Target, Filter,
  Download, RefreshCw, Calendar, ArrowUp, ArrowDown, TrendingDown,
  Loader2, Sparkles, PieChart as PieChartIcon, LineChart, Award
} from 'lucide-react'
import { 
  Line, Bar, BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ComposedChart
} from 'recharts'
import { motion } from 'framer-motion'

// Cache için basit bir Map
const analyticsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 saniye cache

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Analytics() {
  const { theme } = useTheme()
  const [timeRange, setTimeRange] = useState('7d')
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Overview data
  const [overview, setOverview] = useState<any>(null)
  const [userAnalytics, setUserAnalytics] = useState<any>(null)
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<any>(null)
  const [funnelData, setFunnelData] = useState<any>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [segmentAnalytics, setSegmentAnalytics] = useState<any>(null)
  const [productAnalytics, setProductAnalytics] = useState<any>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null)
  const [characteristics, setCharacteristics] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [timeRange, activeSection])

  const loadData = async () => {
    setLoading(true)
    try {
      const tenantId = 1
      const cacheKey = `${activeSection}-${timeRange}-${tenantId}`

      // Cache kontrolü
      const cached = analyticsCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        const data = cached.data
        switch (activeSection) {
          case 'overview': setOverview(data.overview || data); break
          case 'users': setUserAnalytics(data.users || data); break
          case 'behavior': setBehaviorAnalytics(data.behavior || data); break
          case 'funnel': setFunnelData(data.funnel || data); break
          case 'performance': setPerformanceMetrics(data.performance || data); break
          case 'segments': setSegmentAnalytics(data.segments || data); break
          case 'products': setProductAnalytics(data.products || data); break
          case 'timeseries': setTimeSeriesData(data.timeseries || data); break
          case 'characteristics': setCharacteristics(data.characteristics || data); break
        }
        setLoading(false)
        return
      }

      if (activeSection === 'overview') {
        const batchRes = await api.get(`/admin/analytics/batch?timeRange=${timeRange}&tenantId=${tenantId}&sections=overview,users,behavior,funnel,performance`) as any
        const batchData = batchRes.data || {}
        
        setOverview(batchData.overview)
        setUserAnalytics(batchData.users)
        setBehaviorAnalytics(batchData.behavior)
        setFunnelData(batchData.funnel)
        setPerformanceMetrics(batchData.performance)
        
        analyticsCache.set(cacheKey, { data: batchData, timestamp: Date.now() })
      } else {
        let endpoint = ''
        switch (activeSection) {
          case 'users':
            endpoint = `/admin/analytics/users?timeRange=${timeRange}&tenantId=${tenantId}`
            break
          case 'behavior':
            endpoint = `/admin/analytics/behavior?timeRange=${timeRange}&tenantId=${tenantId}`
            break
          case 'funnel':
            endpoint = `/admin/analytics/funnel?timeRange=${timeRange}&tenantId=${tenantId}`
            break
          case 'performance':
            endpoint = `/admin/analytics/performance?timeRange=${timeRange}&tenantId=${tenantId}`
            break
          case 'segments':
            endpoint = `/admin/analytics/segments?timeRange=${timeRange}&tenantId=${tenantId}`
            break
          case 'products':
            endpoint = `/admin/analytics/products?timeRange=${timeRange}&tenantId=${tenantId}`
            break
          case 'timeseries':
            endpoint = `/admin/analytics/timeseries?metric=users&timeRange=${timeRange}&interval=day&tenantId=${tenantId}`
            break
          case 'characteristics':
            endpoint = `/admin/analytics/characteristics?tenantId=${tenantId}`
            break
        }

        if (endpoint) {
          const res = await api.get(endpoint) as any
          const data = res.data

          switch (activeSection) {
            case 'users': setUserAnalytics(data); break
            case 'behavior': setBehaviorAnalytics(data); break
            case 'funnel': setFunnelData(data); break
            case 'performance': setPerformanceMetrics(data); break
            case 'segments': setSegmentAnalytics(data); break
            case 'products': setProductAnalytics(data); break
            case 'timeseries': setTimeSeriesData(data); break
            case 'characteristics': setCharacteristics(data); break
          }

          analyticsCache.set(cacheKey, { data, timestamp: Date.now() })
        }
      }
    } catch (error) {
      console.error('❌ Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    analyticsCache.clear()
    await loadData()
    setRefreshing(false)
  }

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const tenantId = 1
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'}/admin/analytics/export?type=${format}&format=events&timeRange=${timeRange}&tenantId=${tenantId}`,
        {
          headers: {
            'X-Admin-Key': adminKey,
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      )

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${Date.now()}.csv`
        a.click()
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${Date.now()}.json`
        a.click()
      }
    } catch (error) {
      console.error('❌ Error exporting data:', error)
      alert('Veri export edilemedi')
    }
  }

  const sections = [
    { id: 'overview', label: 'Genel Özet', icon: BarChart3, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'users', label: 'Kullanıcılar', icon: Users, gradient: 'from-green-500 to-emerald-500' },
    { id: 'behavior', label: 'Davranış', icon: Activity, gradient: 'from-purple-500 to-pink-500' },
    { id: 'funnel', label: 'Funnel', icon: Target, gradient: 'from-orange-500 to-red-500' },
    { id: 'performance', label: 'Performans', icon: Zap, gradient: 'from-yellow-500 to-amber-500' },
    { id: 'segments', label: 'Segmentler', icon: Filter, gradient: 'from-pink-500 to-rose-500' },
    { id: 'products', label: 'Ürünler', icon: ShoppingCart, gradient: 'from-cyan-500 to-blue-500' },
    { id: 'timeseries', label: 'Zaman Serisi', icon: LineChart, gradient: 'from-indigo-500 to-purple-500' },
    { id: 'characteristics', label: 'Karakteristikler', icon: Award, gradient: 'from-rose-500 to-pink-500' }
  ]

  const timeRanges = [
    { value: '1h', label: 'Son 1 Saat' },
    { value: '24h', label: 'Son 24 Saat' },
    { value: '7d', label: 'Son 7 Gün' },
    { value: '30d', label: 'Son 30 Gün' },
    { value: '90d', label: 'Son 90 Gün' },
    { value: '1y', label: 'Son 1 Yıl' }
  ]

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Analitik veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Modern Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 sm:p-8 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Detaylı Analitik</h1>
                <p className="text-blue-100 mt-1 text-sm sm:text-base">
                  Kullanıcı davranışları, performans metrikleri ve detaylı analizler
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 rounded-xl border-0 bg-white/20 backdrop-blur-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value} className="text-slate-900">{range.label}</option>
              ))}
            </select>
            <button
              onClick={() => exportData('csv')}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center gap-2 font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => exportData('json')}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center gap-2 font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modern Section Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          {sections.map(section => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-3 flex items-center gap-2 rounded-xl transition-all font-medium text-sm sm:text-base ${
                  isActive
                    ? `bg-gradient-to-r ${section.gradient} text-white shadow-lg`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{section.label}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : (
            <>
              {activeSection === 'overview' && overview && (
                <OverviewSection data={overview} theme={theme} />
              )}
              {activeSection === 'users' && userAnalytics && (
                <UsersSection data={userAnalytics} theme={theme} />
              )}
              {activeSection === 'behavior' && behaviorAnalytics && (
                <BehaviorSection data={behaviorAnalytics} theme={theme} />
              )}
              {activeSection === 'funnel' && funnelData && (
                <FunnelSection data={funnelData} theme={theme} />
              )}
              {activeSection === 'performance' && performanceMetrics && (
                <PerformanceSection data={performanceMetrics} theme={theme} />
              )}
              {activeSection === 'segments' && segmentAnalytics && (
                <SegmentsSection data={segmentAnalytics} theme={theme} />
              )}
              {activeSection === 'products' && productAnalytics && (
                <ProductsSection data={productAnalytics} theme={theme} />
              )}
              {activeSection === 'timeseries' && timeSeriesData && (
                <TimeSeriesSection data={timeSeriesData} theme={theme} />
              )}
              {activeSection === 'characteristics' && characteristics && (
                <CharacteristicsSection data={characteristics} theme={theme} />
              )}
              {!overview && !userAnalytics && !behaviorAnalytics && !funnelData && 
               !performanceMetrics && !segmentAnalytics && !productAnalytics && 
               !timeSeriesData && !characteristics && (
                <div className="text-center py-20">
                  <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Veri bulunamadı</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Overview Section Component
function OverviewSection({ data, theme }: any) {
  const kpiCards = [
    { 
      label: 'Toplam Kullanıcı', 
      value: data.totalUsers || 0, 
      icon: Users, 
      gradient: 'from-blue-500 to-cyan-500',
      change: '+12%'
    },
    { 
      label: 'Aktif Kullanıcı', 
      value: data.activeUsers || 0, 
      icon: Activity, 
      gradient: 'from-green-500 to-emerald-500',
      change: '+8%'
    },
    { 
      label: 'Toplam Oturum', 
      value: data.totalSessions || 0, 
      icon: Eye, 
      gradient: 'from-purple-500 to-pink-500',
      change: '+15%'
    },
    { 
      label: 'Toplam Event', 
      value: data.totalEvents || 0, 
      icon: MousePointer, 
      gradient: 'from-orange-500 to-red-500',
      change: '+22%'
    },
    { 
      label: 'Toplam Gelir', 
      value: `₺${(data.totalRevenue || 0).toLocaleString('tr-TR')}`, 
      icon: DollarSign, 
      gradient: 'from-green-500 to-teal-500',
      change: '+18%'
    },
    { 
      label: 'Ort. Oturum Süresi', 
      value: `${Math.floor((data.avgSessionDuration || 0) / 60)} dk`, 
      icon: Clock, 
      gradient: 'from-indigo-500 to-blue-500',
      change: '+5%'
    },
    { 
      label: 'Bounce Rate', 
      value: `${Number(data.bounceRate || 0).toFixed(1)}%`, 
      icon: TrendingDown, 
      gradient: 'from-red-500 to-rose-500',
      change: '-3%'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gradient-to-br bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  kpi.change.startsWith('+') 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {kpi.change}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {kpi.value}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Stats Grid */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Trend Analizi
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Günlük Artış</span>
                <span className="font-bold text-green-600">+{Number((data.totalUsers || 0) * 0.12).toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Haftalık Artış</span>
                <span className="font-bold text-blue-600">+{Number((data.totalUsers || 0) * 0.08).toFixed(0)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Performans Özeti
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Dönüşüm Oranı</span>
                <span className="font-bold text-purple-600">
                  {Number(data.totalSessions || 0) > 0 ? Number(((data.totalEvents || 0) / (data.totalSessions || 1)) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Etkileşim Oranı</span>
                <span className="font-bold text-orange-600">
                  {Number(data.totalUsers || 0) > 0 ? Number(((data.activeUsers || 0) / (data.totalUsers || 1)) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// Users Section Component
function UsersSection({ data, theme }: any) {
  const chartData = [
    { name: 'DAU', value: data.dau || 0 },
    { name: 'WAU', value: data.wau || 0 },
    { name: 'MAU', value: data.mau || 0 }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Aktif Kullanıcılar
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
              <span className="font-medium text-slate-700 dark:text-slate-300">Günlük (DAU)</span>
              <span className="text-2xl font-bold text-blue-600">{data.dau || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <span className="font-medium text-slate-700 dark:text-slate-300">Haftalık (WAU)</span>
              <span className="text-2xl font-bold text-green-600">{data.wau || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <span className="font-medium text-slate-700 dark:text-slate-300">Aylık (MAU)</span>
              <span className="text-2xl font-bold text-purple-600">{data.mau || 0}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Kullanıcı Türleri
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Yeni Kullanıcılar</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{data.newUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Dönen Kullanıcılar</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{data.returningUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Retention Rate</span>
              <span className="font-bold text-green-600">{Number(data.retentionRate || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Churn Rate</span>
              <span className="font-bold text-red-600">{Number(data.churnRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chart */}
      {chartData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Kullanıcı Dağılımı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  )
}

// Behavior Section Component
function BehaviorSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 shadow-xl text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <Eye className="w-8 h-8" />
            <span className="text-blue-100 text-sm">Ekran Görüntülemeleri</span>
          </div>
          <p className="text-4xl font-bold mb-2">{(data.screenViews || 0).toLocaleString()}</p>
          <p className="text-blue-100 text-sm">
            Ortalama Ekranda Kalma: {data.avgTimeOnScreen || 0}s
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 shadow-xl text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <MousePointer className="w-8 h-8" />
            <span className="text-green-100 text-sm">Scroll Derinliği</span>
          </div>
          <p className="text-4xl font-bold mb-2">{Number(data.scrollDepth?.avg || 0).toFixed(1)}%</p>
          <p className="text-green-100 text-sm">
            Maksimum: {Number(data.scrollDepth?.max || 0).toFixed(1)}%
          </p>
        </motion.div>
      </div>

      {data.topScreens && data.topScreens.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            En Popüler Ekranlar
          </h3>
          <div className="space-y-3">
            {data.topScreens.map((screen: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{screen.screenName}</span>
                </div>
                <span className="font-bold text-purple-600">{screen.viewCount} görüntüleme</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Funnel Section Component
function FunnelSection({ data, theme }: any) {
  const funnelSteps = [
    { label: 'Ürün Görüntüleme', value: data.funnel?.productViews || 0, color: '#3b82f6' },
    { label: 'Sepete Ekleme', value: data.funnel?.addToCart || 0, color: '#10b981' },
    { label: 'Checkout', value: data.funnel?.checkout || 0, color: '#f59e0b' },
    { label: 'Satın Alma', value: data.funnel?.purchase || 0, color: '#ef4444' }
  ]

  const maxValue = Math.max(...funnelSteps.map(s => s.value), 1)

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-600" />
          Satın Alma Funnel'i
        </h3>
        <div className="space-y-6">
          {funnelSteps.map((step, index) => {
            const prevValue = index > 0 ? funnelSteps[index - 1].value : step.value
            const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0
            const widthPercent = (step.value / maxValue) * 100

            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)` }}>
                      {index + 1}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{step.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg text-slate-900 dark:text-slate-100">{step.value.toLocaleString()}</span>
                    {index > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Dönüşüm: {Number(conversionRate).toFixed(1)}%</p>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ backgroundColor: step.color }}
                  >
                    {widthPercent > 10 && (
                      <span className="text-xs font-semibold text-white">{Number(widthPercent).toFixed(0)}%</span>
                    )}
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.conversionRates && Object.entries(data.conversionRates).map(([key, value]: [string, any], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 shadow-lg text-white"
          >
            <p className="text-sm text-blue-100 mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="text-3xl font-bold">{parseFloat(value).toFixed(1)}%</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Performance Section Component
function PerformanceSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Sayfa Yükleme Süreleri
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Ortalama</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{data.pageLoadTime?.avg || 0}ms</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">P95</span>
              <span className="font-bold text-blue-600">{data.pageLoadTime?.p95 || 0}ms</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">P99</span>
              <span className="font-bold text-purple-600">{data.pageLoadTime?.p99 || 0}ms</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            API Performansı
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Ortalama Yanıt Süresi</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{data.apiResponseTime?.avg || 0}ms</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Hata Oranı</span>
              <span className="font-bold text-red-600">{Number(data.errorRate || 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <span className="text-slate-700 dark:text-slate-300">Crash Sayısı</span>
              <span className="font-bold text-orange-600">{data.crashRate || 0}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Segments Section Component
function SegmentsSection({ data, theme }: any) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Henüz segment verisi yok</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Filter className="w-5 h-5 text-pink-600" />
          Segment Performansı
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Segment</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Kullanıcı</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Sipariş</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Gelir</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Ort. Sipariş</th>
              </tr>
            </thead>
            <tbody>
              {data.map((segment: any, index: number) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{segment.segmentName}</td>
                  <td className="text-right p-4 text-slate-700 dark:text-slate-300">{segment.userCount}</td>
                  <td className="text-right p-4 text-slate-700 dark:text-slate-300">{segment.orderCount}</td>
                  <td className="text-right p-4 font-bold text-green-600">₺{parseFloat(segment.totalRevenue || 0).toLocaleString('tr-TR')}</td>
                  <td className="text-right p-4 text-slate-700 dark:text-slate-300">₺{parseFloat(segment.avgOrderValue || 0).toLocaleString('tr-TR')}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

// Products Section Component
function ProductsSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            En Çok Görüntülenen
          </h3>
          <div className="space-y-3">
            {data.topViewed?.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</span>
                </div>
                <span className="font-bold text-blue-600">{product.viewCount}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            En Çok Sepete Eklenen
          </h3>
          <div className="space-y-3">
            {data.topAddedToCart?.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</span>
                </div>
                <span className="font-bold text-green-600">{product.addToCartCount}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            En Çok Satın Alınan
          </h3>
          <div className="space-y-3">
            {data.topPurchased?.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</span>
                </div>
                <span className="font-bold text-purple-600">{product.purchaseCount}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Time Series Section Component
function TimeSeriesSection({ data, theme }: any) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <LineChart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Henüz zaman serisi verisi yok</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-indigo-600" />
          Zaman Serisi Grafiği
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569' }}
            />
            <YAxis 
              stroke="#64748b"
              tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              fillOpacity={1}
              fill="url(#colorValue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}

// Characteristics Section Component
function CharacteristicsSection({ data, theme }: any) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
        <Award className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Henüz karakteristik veri yok</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-rose-600" />
          Kullanıcı Karakteristikleri
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Kullanıcı</th>
                <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Alışveriş Tarzı</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Fiyat Hassasiyeti</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Marka Sadakati</th>
                <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Teknoloji</th>
                <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Etkileşim</th>
                <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Karar Hızı</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((char: any, index: number) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{char.userName || char.email || 'N/A'}</td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">{char.shoppingStyle || 'N/A'}</td>
                  <td className="text-right p-4">
                    <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                      {char.priceSensitivityScore || 'N/A'}
                    </span>
                  </td>
                  <td className="text-right p-4">
                    <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-semibold">
                      {char.brandLoyaltyIndex || 'N/A'}
                    </span>
                  </td>
                  <td className="text-right p-4">
                    <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                      {char.technologyAdoptionScore || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">{char.engagementLevel || 'N/A'}</td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">{char.decisionSpeed || 'N/A'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

