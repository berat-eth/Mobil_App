'use client'

import { useMemo, useState, useEffect } from 'react'
import { Download, Filter, Calendar, BarChart3, PieChart, LineChart, RefreshCw, Printer, BadgeCheck, Layers } from 'lucide-react'
import { ResponsiveContainer, Line, LineChart as ReLineChart, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Pie, Cell, Legend } from 'recharts'
import jsPDF from 'jspdf'

type Channel = 'hepsiburada' | 'trendyol' | 'ticimax' | 'site' | 'other'
type Status = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
type ViewMode = 'summary' | 'by-channel'

interface OrderRow {
  id: number
  date: string
  channel: Channel
  status: Status
  amount: number
  customer: string
  cargoProvider?: string
  cargoSlipPrintedAt?: string | null
}

const CHANNEL_LABELS: Record<Channel, string> = {
  hepsiburada: 'Hepsiburada',
  trendyol: 'Trendyol',
  ticimax: 'Ticimax',
  site: 'Site',
  other: 'Diğer'
}

const STATUS_LABELS: Record<Status, string> = {
  pending: 'Beklemede',
  processing: 'İşleniyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
  returned: 'İade'
}

const STATUS_COLORS: Record<Status, string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  shipped: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#ef4444',
  returned: '#8b5cf6'
}

const QUICK_RANGES = [
  { id: '7d', label: 'Son 7 Gün' },
  { id: '30d', label: 'Son 30 Gün' },
  { id: 'thisMonth', label: 'Bu Ay' }
]

const channelOrder: Channel[] = ['hepsiburada', 'trendyol', 'ticimax', 'site', 'other']

export default function Reports() {
  const [channel, setChannel] = useState<Channel | 'all'>('all')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [quickRange, setQuickRange] = useState<string>('7d')
  
  // Initialize with last 7 days
  const getInitialDates = () => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return {
      start: start.toISOString().slice(0, 10),
      end: today.toISOString().slice(0, 10)
    }
  }
  
  const initialDates = getInitialDates()
  const [startDate, setStartDate] = useState(initialDates.start)
  const [endDate, setEndDate] = useState(initialDates.end)
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (startDate) params.append('dateFrom', startDate)
        if (endDate) params.append('dateTo', endDate)
        if (channel !== 'all') params.append('channel', channel)
        if (status !== 'all') params.append('status', status)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const endpoint = apiUrl.includes('/api') ? `${apiUrl}/admin/reports` : `${apiUrl}/api/admin/reports`
        const response = await fetch(`${endpoint}?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch reports data')
        }

        const result = await response.json()
        if (result.success) {
          setOrders(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch reports')
        }
      } catch (err) {
        console.error('Error fetching reports:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch reports')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [channel, status, startDate, endDate])

  const filtered = useMemo(() => {
    return orders
  }, [orders])

  const totals = useMemo(() => {
    const totalAmount = filtered.reduce((s, o) => s + o.amount, 0)
    const orderCount = filtered.length
    const avgBasket = orderCount ? totalAmount / orderCount : 0
    const returns = filtered.filter((o) => o.status === 'returned').length
    const returnedRate = orderCount ? (returns / orderCount) * 100 : 0
    const onTimeCargo = filtered.filter((o) => !!o.cargoSlipPrintedAt).length
    const onTimeRate = orderCount ? (onTimeCargo / orderCount) * 100 : 0
    return { totalAmount, orderCount, avgBasket, returnedRate, onTimeRate }
  }, [filtered])

  const byChannel = useMemo(() => {
    const map: Record<Channel, { channel: Channel; amount: number; count: number }> = {
      hepsiburada: { channel: 'hepsiburada', amount: 0, count: 0 },
      trendyol: { channel: 'trendyol', amount: 0, count: 0 },
      ticimax: { channel: 'ticimax', amount: 0, count: 0 },
      site: { channel: 'site', amount: 0, count: 0 },
      other: { channel: 'other', amount: 0, count: 0 }
    }
    filtered.forEach((o) => {
      map[o.channel].amount += o.amount
      map[o.channel].count += 1
    })
    return channelOrder.map((c) => map[c])
  }, [filtered])

  const byStatus = useMemo(() => {
    const map: Record<Status, number> = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 }
    filtered.forEach((o) => { map[o.status] += 1 })
    const data = Object.entries(map).map(([k, v]) => ({ status: k as Status, value: v }))
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total === 0) {
      return [{ status: 'pending' as Status, value: 1 }]
    }
    return data
  }, [filtered])

  const timeSeries = useMemo(() => {
    const bucket: Record<string, { date: string; amount: number; count: number }> = {}
    filtered.forEach((o) => {
      if (!bucket[o.date]) bucket[o.date] = { date: o.date, amount: 0, count: 0 }
      bucket[o.date].amount += o.amount
      bucket[o.date].count += 1
    })
    return Object.values(bucket).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered])

  const resetQuickRange = (id: string) => {
    setQuickRange(id)
    const today = new Date()
    if (id === '7d') {
      const start = new Date(today)
      start.setDate(today.getDate() - 6)
      setStartDate(start.toISOString().slice(0, 10))
      setEndDate(today.toISOString().slice(0, 10))
    } else if (id === '30d') {
      const start = new Date(today)
      start.setDate(today.getDate() - 29)
      setStartDate(start.toISOString().slice(0, 10))
      setEndDate(today.toISOString().slice(0, 10))
    } else if (id === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      setStartDate(start.toISOString().slice(0, 10))
      setEndDate(today.toISOString().slice(0, 10))
    }
  }

  const exportCSV = () => {
    const headers = ['Tarih', 'Kanal', 'Durum', 'Tutar', 'Müşteri', 'Kargo Fişi']
    const rows = filtered.map((o) => [
      o.date,
      CHANNEL_LABELS[o.channel],
      STATUS_LABELS[o.status],
      o.amount.toFixed(2),
      o.customer,
      o.cargoSlipPrintedAt ? 'Evet' : 'Hayır'
    ])
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapor-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text('Detaylı Raporlama Özeti', 10, 15)
    doc.text(`Sipariş Adedi: ${totals.orderCount}`, 10, 25)
    doc.text(`Toplam Ciro: ${totals.totalAmount.toFixed(2)} TRY`, 10, 32)
    doc.text(`Sepet Ort.: ${totals.avgBasket.toFixed(2)} TRY`, 10, 39)
    doc.text(`İade/İptal Oranı: ${totals.returnedRate.toFixed(1)}%`, 10, 46)
    doc.text(`Kargo Fişi Yazılı: ${totals.onTimeRate.toFixed(1)}%`, 10, 53)
    doc.text('İlk 5 sipariş:', 10, 63)
    filtered.slice(0, 5).forEach((o, idx) => {
      doc.text(`${idx + 1}) ${o.date} - ${CHANNEL_LABELS[o.channel]} - ${o.amount.toFixed(2)} TRY`, 12, 70 + idx * 7)
    })
    doc.save(`rapor-${Date.now()}.pdf`)
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 min-h-screen">
      {error && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            {error}
          </div>
        </div>
      )}
      
      {loading && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Veriler yükleniyor...</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">Raporlama Merkezi</p>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent">
                Detaylı Raporlar
              </h1>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm ml-14">Sipariş, iade, kargo ve kampanya performansını analiz edin</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={exportCSV} 
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all duration-200 hover:border-green-300 dark:hover:border-green-700 group"
          >
            <Download className="w-4 h-4 group-hover:text-green-600 transition-colors" /> 
            <span className="font-medium">CSV</span>
          </button>
          <button 
            onClick={exportPDF} 
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all duration-200 hover:border-red-300 dark:hover:border-red-700 group"
          >
            <Printer className="w-4 h-4 group-hover:text-red-600 transition-colors" /> 
            <span className="font-medium">PDF</span>
          </button>
          <button 
            onClick={() => resetQuickRange('7d')} 
            className={`px-4 py-2.5 text-sm rounded-xl border flex items-center gap-2 transition-all duration-200 hover:scale-105 ${
              quickRange === '7d' 
                ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg'
            }`}
          >
            <RefreshCw className="w-4 h-4" /> 
            <span className="font-medium">Son 7 Gün</span>
          </button>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                viewMode === 'summary' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Genel
            </button>
            <button
              onClick={() => setViewMode('by-channel')}
              className={`px-4 py-2.5 text-sm font-medium border-l border-slate-200 dark:border-slate-700 transition-all duration-200 ${
                viewMode === 'by-channel' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Kanal Bazlı
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <p className="text-xs text-emerald-100 mb-2 font-semibold uppercase tracking-wider">Toplam Ciro</p>
            <p className="text-3xl font-bold text-white mb-1">{totals.totalAmount.toFixed(2)} ₺</p>
            <div className="flex items-center gap-1 text-emerald-100 text-xs">
              <div className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-pulse"></div>
              <span>Aktif dönem</span>
            </div>
          </div>
        </div>
        
        <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <p className="text-xs text-blue-100 mb-2 font-semibold uppercase tracking-wider">Sipariş Adedi</p>
            <p className="text-3xl font-bold text-white mb-1">{totals.orderCount}</p>
            <div className="flex items-center gap-1 text-blue-100 text-xs">
              <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse"></div>
              <span>Toplam sipariş</span>
            </div>
          </div>
        </div>
        
        <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <p className="text-xs text-purple-100 mb-2 font-semibold uppercase tracking-wider">Sepet Ortalaması</p>
            <p className="text-3xl font-bold text-white mb-1">{totals.avgBasket.toFixed(2)} ₺</p>
            <div className="flex items-center gap-1 text-purple-100 text-xs">
              <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse"></div>
              <span>Ortalama değer</span>
            </div>
          </div>
        </div>
        
        <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative">
            <p className="text-xs text-orange-100 mb-2 font-semibold uppercase tracking-wider">İade/İptal Oranı</p>
            <p className="text-3xl font-bold text-white mb-1">{totals.returnedRate.toFixed(1)}%</p>
            <div className="flex items-center gap-1 text-orange-100 text-xs">
              <div className="w-1.5 h-1.5 bg-orange-200 rounded-full animate-pulse"></div>
              <span>{totals.returnedRate < 5 ? 'Düşük risk' : totals.returnedRate < 10 ? 'Orta risk' : 'Yüksek risk'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <LineChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 dark:text-white">Ciro ve Sipariş Trendi</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">Zaman serisi analizi</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Özel aralık</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={timeSeries}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="amount" name="Ciro (₺)" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="count" name="Sipariş" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">Durum Dağılımı</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sipariş durumları</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  dataKey="value" 
                  data={byStatus} 
                  innerRadius={60} 
                  outerRadius={90}
                  paddingAngle={2}
                  label={(entry) => entry.value > 0 ? `${entry.value}` : ''}
                  labelLine={false}
                >
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => {
                    const status = props.payload?.status as Status
                    return [value, STATUS_LABELS[status] || status]
                  }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {byStatus.filter(s => s.value > 0).map((entry) => (
              <div key={entry.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] }}></div>
                  <span className="text-slate-700 dark:text-slate-300">{STATUS_LABELS[entry.status]}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">Kanal Performansı</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Satış kanalları analizi</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byChannel}>
                <defs>
                  <linearGradient id="barAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="barCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis 
                  dataKey={(d: any) => {
                    const channel = d.channel as Channel
                    return CHANNEL_LABELS[channel] || channel
                  }} 
                  stroke="#64748b" 
                  style={{ fontSize: '11px' }} 
                  angle={-15} 
                  textAnchor="end" 
                  height={60} 
                />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="amount" fill="url(#barAmount)" name="Ciro (₺)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="count" fill="url(#barCount)" name="Sipariş" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 backdrop-blur-sm shadow-xl space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">Filtreler</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Veri filtreleme seçenekleri</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">Satış Kanalı</label>
              <select 
                value={channel} 
                onChange={(e) => setChannel(e.target.value as Channel | 'all')} 
                className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">🌐 Tüm Kanallar</option>
                <option value="hepsiburada">🛒 Hepsiburada</option>
                <option value="trendyol">🛍️ Trendyol</option>
                <option value="ticimax">📦 Ticimax</option>
                <option value="site">🌐 Site</option>
                <option value="other">📱 Diğer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">Sipariş Durumu</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as Status | 'all')} 
                className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">📋 Tüm Durumlar</option>
                <option value="pending">⏳ Beklemede</option>
                <option value="processing">⚙️ İşleniyor</option>
                <option value="shipped">🚚 Kargoda</option>
                <option value="delivered">✅ Teslim Edildi</option>
                <option value="cancelled">❌ İptal</option>
                <option value="returned">↩️ İade</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">Tarih Aralığı</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Başlangıç</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Bitiş</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2 uppercase tracking-wider">Hızlı Seçim</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map((r) => (
                <button 
                  key={r.id} 
                  onClick={() => resetQuickRange(r.id)} 
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    quickRange === r.id 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'by-channel' && (
        <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">Kanal Bazlı Detay</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Her kanalın detaylı performansı</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {byChannel.map((c, idx) => {
              const gradients = [
                'from-orange-500 to-red-500',
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500',
                'from-green-500 to-emerald-500',
                'from-yellow-500 to-orange-500'
              ]
              return (
                <div 
                  key={c.channel} 
                  className={`group relative p-5 rounded-2xl bg-gradient-to-br ${gradients[idx % gradients.length]} shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <p className="text-xs text-white/80 mb-2 font-semibold uppercase tracking-wider">{CHANNEL_LABELS[c.channel]}</p>
                    <p className="text-2xl font-bold text-white mb-1">{c.amount.toFixed(2)} ₺</p>
                    <div className="flex items-center justify-between text-white/90 text-xs mt-3 pt-3 border-t border-white/20">
                      <span>Sipariş</span>
                      <span className="font-bold text-sm">{c.count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">Sipariş Listesi</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Detaylı sipariş kayıtları</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{filtered.length} kayıt</span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <tr className="text-left text-xs uppercase text-slate-600 dark:text-slate-400 font-semibold tracking-wider">
                <th className="py-4 px-4">Tarih</th>
                <th className="py-4 px-4">Kanal</th>
                <th className="py-4 px-4">Durum</th>
                <th className="py-4 px-4">Tutar</th>
                <th className="py-4 px-4">Müşteri</th>
                <th className="py-4 px-4">Kargo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-all duration-200">
                  <td className="py-4 px-4 text-slate-800 dark:text-slate-200 font-medium">{o.date}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      {CHANNEL_LABELS[o.channel]}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span 
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border-2 shadow-sm" 
                      style={{ 
                        background: `${STATUS_COLORS[o.status]}15`, 
                        borderColor: `${STATUS_COLORS[o.status]}40`, 
                        color: STATUS_COLORS[o.status] 
                      }}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{o.amount.toFixed(2)} ₺</td>
                  <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{o.customer}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 dark:text-slate-300">{o.cargoProvider || '-'}</span>
                      {o.cargoSlipPrintedAt && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 font-medium shadow-sm">
                          <BadgeCheck className="w-3 h-3" /> Fiş Yazıldı
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <BadgeCheck className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Seçilen filtrelere göre kayıt bulunamadı</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Farklı filtre seçeneklerini deneyin</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

