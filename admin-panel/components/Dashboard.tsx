'use client'

import { TrendingUp, Package, ShoppingCart, Users, ArrowUp, ArrowDown, DollarSign, Eye, AlertTriangle, CheckCircle, Clock, Star, Truck, CreditCard, RefreshCw, Activity, Target, Zap, TrendingDown, UserPlus, MessageSquare, Heart, BarChart3, Calendar, Filter, Download, Bell, X, Shield, Mail, Send, Smartphone, MousePointer, MapPin, Navigation, Brain, Store } from 'lucide-react'
import { Line, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { formatDDMMYYYY } from '@/lib/date'
import dynamic from 'next/dynamic'
import { productService } from '@/lib/services'
import { api } from '@/lib/api'
import AIAlertWidget from './AIAlertWidget'

// Stok uyarıları, canlı kullanıcılar ve istatistikleri state'e alındı

// SMS ve Email İstatistikleri
const smsStats = {
  totalSent: 0,
  delivered: 0,
  deliveryRate: 0,
  activeTemplates: 0,
  activeCampaigns: 0,
  lastCampaign: ''
}

const emailStats = {
  totalSent: 0,
  opened: 0,
  clicked: 0,
  openRate: 0,
  clickRate: 0,
  bounceRate: 0,
  activeTemplates: 0,
  activeCampaigns: 0
}

// Snort IDS İstatistikleri
const snortStats = {
  totalLogs: 0,
  highPriority: 0,
  mediumPriority: 0,
  lowPriority: 0,
  dropped: 0,
  alerts: 0,
  blocked: 0,
  lastUpdate: ''
}

const snortThreatData: Array<{ hour: string; threats: number }> = []

const recentThreats: Array<{ type: string; severity: 'high' | 'medium' | 'low'; ip: string; time: string; status: 'blocked' | 'alert' }> = []

export default function Dashboard() {
  const { theme } = useTheme()
  const [timeRange, setTimeRange] = useState('1day')
  const [activeChart, setActiveChart] = useState('sales')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showStockAlerts, setShowStockAlerts] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const [showCategoryDetails, setShowCategoryDetails] = useState(false)
  const [chartHeight, setChartHeight] = useState(300)

  const [totalProducts, setTotalProducts] = useState<number>(0)
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [totalCustomers, setTotalCustomers] = useState<number>(0)
  const [totalRevenue, setTotalRevenue] = useState<number>(0)
  const [inTransitCount, setInTransitCount] = useState<number>(0)
  const [deliveredCount, setDeliveredCount] = useState<number>(0)
  const [pendingPaymentCount, setPendingPaymentCount] = useState<number>(0)
  const [pendingAmount, setPendingAmount] = useState<number>(0)
  const [returnableCount, setReturnableCount] = useState<number>(0)

  // Grafik durumları (API'den türetilecek)
  const [salesData, setSalesData] = useState<Array<{ name: string; satis: number; siparis: number; musteri: number }>>([])
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [categoryPerformance, setCategoryPerformance] = useState<Array<{ name: string; satis: number; kar: number; stok: number; siparisler: number }>>([])
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sales: number; revenue: number; trend: number }>>([])
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; customer: string; product: string; amount: number; status: 'completed' | 'processing' | 'pending' }>>([])
  const [revenueData, setRevenueData] = useState<Array<{ month: string; monthLabel?: string; gelir: number; gider: number; kar: number; hedef: number }>>([])
  const [customerBehavior, setCustomerBehavior] = useState<Array<{ metric: string; value: number }>>([])
  const [hourlyActivity, setHourlyActivity] = useState<Array<{ hour: string; orders: number; visitors: number }>>([])
  const [realtimeActivities, setRealtimeActivities] = useState<Array<any>>([])
  const [kpiMetrics, setKpiMetrics] = useState<Array<{ title: string; value: string; target: string; progress: number; trend: 'up' | 'down'; change: string }>>([])
  const [trafficSources, setTrafficSources] = useState<Array<{ source: string; visitors: number; conversion: number; revenue: number; color: string }>>([])
  const [stockAlerts, setStockAlerts] = useState<Array<{ product: string; category: string; stock: number; minStock: number; status: 'critical' | 'warning' }>>([])
  const [snortStats, setSnortStats] = useState<{ total: number; high: number; medium: number; low: number; alerts: number; dropped: number; last: string }>({ total: 0, high: 0, medium: 0, low: 0, alerts: 0, dropped: 0, last: '' })

  // Özel toptan üretim istatistikleri
  const [customProdTotal, setCustomProdTotal] = useState<number>(0)
  const [customProdInProgress, setCustomProdInProgress] = useState<number>(0)
  const [customProdCompleted, setCustomProdCompleted] = useState<number>(0)
  const [customProdAmount, setCustomProdAmount] = useState<number>(0)

  // Trendyol istatistikleri
  const [trendyolOrdersCount, setTrendyolOrdersCount] = useState<number>(0)
  const [trendyolTotalAmount, setTrendyolTotalAmount] = useState<number>(0)
  const [trendyolPendingCount, setTrendyolPendingCount] = useState<number>(0)
  const [trendyolCompletedCount, setTrendyolCompletedCount] = useState<number>(0)

  // Hepsiburada istatistikleri
  const [hepsiburadaOrdersCount, setHepsiburadaOrdersCount] = useState<number>(0)
  const [hepsiburadaTotalAmount, setHepsiburadaTotalAmount] = useState<number>(0)
  const [hepsiburadaPendingCount, setHepsiburadaPendingCount] = useState<number>(0)
  const [hepsiburadaCompletedCount, setHepsiburadaCompletedCount] = useState<number>(0)

  // Ticimax istatistikleri
  const [ticimaxOrdersCount, setTicimaxOrdersCount] = useState<number>(0)
  const [ticimaxTotalAmount, setTicimaxTotalAmount] = useState<number>(0)
  const [ticimaxPendingCount, setTicimaxPendingCount] = useState<number>(0)
  const [ticimaxCompletedCount, setTicimaxCompletedCount] = useState<number>(0)

  // Chart height'ı responsive yap
  useEffect(() => {
    const updateChartHeight = () => {
      if (typeof window !== 'undefined') {
        setChartHeight(window.innerWidth < 640 ? 250 : 300)
      }
    }
    updateChartHeight()
    window.addEventListener('resize', updateChartHeight)
    return () => window.removeEventListener('resize', updateChartHeight)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, adminOrders, adminCategories, categoryStats, customRequests, snortRes, trendyolOrders, hepsiburadaOrders, ticimaxOrders] = await Promise.all([
          productService.getProducts(1, 50),
          api.get<any>('/admin/orders'),
          api.get<any>('/admin/categories'),
          api.get<any>('/admin/category-stats'),
          api.get<any>('/admin/custom-production-requests').catch(()=>({ success:true, data: [] })),
          api.get<any>('/admin/snort/logs').catch(()=>({ success:true, data: [] })),
          api.get<any>('/admin/marketplace-orders', { provider: 'trendyol' }).catch(()=>({ success:true, data: [], total: 0, totalAmount: 0 })),
          api.get<any>('/admin/hepsiburada-orders').catch(()=>({ success:true, data: [], total: 0, totalAmount: 0 })),
          api.get<any>('/admin/ticimax-orders').catch(()=>({ success:true, data: [], total: 0, totalAmount: 0 }))
        ])
        // Snort IDS status
        try {
          const logs = (snortRes as any)?.data || []
          if (Array.isArray(logs)) {
            const toLower = (s:any)=> String(s||'').toLowerCase()
            const total = logs.length
            const high = logs.filter((l:any)=> toLower(l.priority)==='high').length
            const medium = logs.filter((l:any)=> toLower(l.priority)==='medium').length
            const low = logs.filter((l:any)=> toLower(l.priority)==='low').length
            const alerts = logs.filter((l:any)=> toLower(l.action)==='alert').length
            const dropped = logs.filter((l:any)=> toLower(l.action)==='drop').length
            const last = logs[0]?.timestamp || ''
            setSnortStats({ total, high, medium, low, alerts, dropped, last })
          } else {
            setSnortStats({ total:0, high:0, medium:0, low:0, alerts:0, dropped:0, last:'' })
          }
        } catch { setSnortStats({ total:0, high:0, medium:0, low:0, alerts:0, dropped:0, last:'' }) }
        // Canlı görüntülemeler (yaklaşık canlı kullanıcı metrikleri için)
        let liveViews: any = { success: true, data: [] as any[] }
        try { liveViews = await api.get<any>('/admin/live-views') } catch {}
        // Kategori dağılımı ve performansı
        const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16']
        let categoryDistributionSet = false
        if ((categoryStats as any)?.success && (categoryStats as any).data) {
          const stats = (categoryStats as any).data as any[]
          const totalRev = stats.reduce((s, x:any)=> s + (Number(x.revenue)||0), 0)
          const dist = stats
            .sort((a:any,b:any)=> (Number(b.revenue||0) - Number(a.revenue||0)))
            .slice(0,8)
            .map((s:any, i:number)=> ({
              name: s.name || 'Diğer',
              value: totalRev ? Math.round((Number(s.revenue||0)/totalRev)*100) : 0,
              color: colors[i%colors.length]
            }))
          setCategoryData(dist)
          categoryDistributionSet = true
        }
        if (!categoryDistributionSet && (adminCategories as any)?.success && (adminCategories as any).data) {
          const cats = (adminCategories as any).data as any[]
          const totalCount = cats.reduce((s:any,c:any)=> s + (Number(c.productCount)||0), 0)
          const dist = cats
            .sort((a:any,b:any)=> (Number(b.productCount||0) - Number(a.productCount||0)))
            .slice(0,8)
            .map((c:any, i:number)=> ({
              name: c.name,
              value: totalCount ? Math.round((Number(c.productCount||0)/totalCount)*100) : 0,
              color: colors[i%colors.length]
            }))
          setCategoryData(dist)
        }

        if ((categoryStats as any)?.success && (categoryStats as any).data) {
          const stats = (categoryStats as any).data as any[]
          setCategoryPerformance(
            stats
              .sort((a:any,b:any)=> (Number(b.revenue||0) - Number(a.revenue||0)))
              .slice(0,6)
              .map(s=>({
                name: s.name||'Diğer',
                satis: Math.round(Number(s.revenue)||0),
                kar: Math.round((Number(s.revenue)||0)*0.3),
                stok: Number(s.stock)||0,
                siparisler: Number(s.orders)||0
              }))
          )
          // En çok satan ürünler: ürün verisi + basit sıralama (yorum sayısı/rating varsa)
          const prods = (productsRes as any)?.data?.products || (productsRes as any)?.data || []
          const top = [...prods]
            .sort((a: any, b: any) => (Number(b.reviewCount||0) - Number(a.reviewCount||0)) || (Number(b.rating||0) - Number(a.rating||0)))
            .slice(0, 6)
            .map((p: any) => ({ name: p.name, sales: Number(p.reviewCount||0), revenue: Number(p.price||0) * Number(p.reviewCount||0), trend: 0 }))
          setTopProducts(top)
        }

        // Özel toptan üretim istatistikleri
        if ((customRequests as any)?.success && Array.isArray((customRequests as any).data)) {
          const list = (customRequests as any).data as any[]
          setCustomProdTotal(list.length)
          const inProg = list.filter((r:any)=> ['review','design','production','shipped'].includes(String(r.status))).length
          setCustomProdInProgress(inProg)
          const compl = list.filter((r:any)=> String(r.status) === 'completed').length
          setCustomProdCompleted(compl)
          const sumAmt = list.reduce((s:number, r:any)=> s + (Number(r.totalAmount)||0), 0)
          setCustomProdAmount(sumAmt)
        } else {
          setCustomProdTotal(0); setCustomProdInProgress(0); setCustomProdCompleted(0); setCustomProdAmount(0)
        }

        // Siparişlerden türeyen metrikler (admin endpoint)
        if ((adminOrders as any)?.success && (adminOrders as any).data) {
          const orders = (adminOrders as any).data as any[]
          // Sadece stoğu olan ürünleri say
          const activeProducts = productsRes.data?.products?.filter((p: any) => (p.stock ?? 0) > 0) || []
          setTotalProducts(activeProducts.length)
          setTotalOrders(orders.length)
          setTotalRevenue(orders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0))

          const lower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : '')
          const delivered = orders.filter(o => lower(o.status) === 'completed')
          const inTransit = orders.filter(o => lower(o.status) === 'processing' || lower(o.status) === 'shipped')
          const pending = orders.filter(o => lower(o.status) === 'pending')

          setDeliveredCount(delivered.length)
          setInTransitCount(inTransit.length)
          setPendingPaymentCount(pending.length)
          setPendingAmount(pending.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0))

          // Sales trend - timeRange'a göre hesapla
          const now = new Date()
          let startDate = new Date()
          let groupBy: 'day' | 'week' | 'month' = 'day'
          
          switch (timeRange) {
            case '1day':
              startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
              groupBy = 'day'
              break
            case '3days':
              startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
              groupBy = 'day'
              break
            case '5days':
              startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
              groupBy = 'day'
              break
            case '7days':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              groupBy = 'day'
              break
            case '30days':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              groupBy = 'day'
              break
            case '3months':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              groupBy = 'week'
              break
            case 'year':
              startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
              groupBy = 'month'
              break
            default:
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              groupBy = 'day'
          }

          const filteredOrders = orders.filter((o: any) => {
            const orderDate = new Date(o.createdAt)
            return orderDate >= startDate
          })

          const byPeriod = new Map<string, { satis: number; siparis: number }>()
          
          filteredOrders.forEach((o: any) => {
            const d = new Date(o.createdAt)
            let key = ''
            
            if (groupBy === 'day') {
              key = formatDDMMYYYY(d)
            } else if (groupBy === 'week') {
              const weekStart = new Date(d)
              weekStart.setDate(d.getDate() - d.getDay())
              key = `Hafta ${formatDDMMYYYY(weekStart)}`
            } else if (groupBy === 'month') {
              const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
              key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
            }
            
            const prev = byPeriod.get(key) || { satis: 0, siparis: 0 }
            prev.satis += Number(o.totalAmount) || 0
            prev.siparis += 1
            byPeriod.set(key, prev)
          })
          
          // Eksik günleri/haftaları/ayları doldur
          const result: Array<{ name: string; satis: number; siparis: number; musteri: number }> = []
          
          if (groupBy === 'day') {
            const currentDate = new Date(startDate)
            while (currentDate <= now) {
              const key = formatDDMMYYYY(currentDate)
              const data = byPeriod.get(key) || { satis: 0, siparis: 0 }
              result.push({ name: key, satis: Math.round(data.satis), siparis: data.siparis, musteri: 0 })
              currentDate.setDate(currentDate.getDate() + 1)
            }
          } else if (groupBy === 'week') {
            const currentDate = new Date(startDate)
            currentDate.setDate(currentDate.getDate() - currentDate.getDay())
            while (currentDate <= now) {
              const weekStart = new Date(currentDate)
              const key = `Hafta ${formatDDMMYYYY(weekStart)}`
              const data = byPeriod.get(key) || { satis: 0, siparis: 0 }
              result.push({ name: key, satis: Math.round(data.satis), siparis: data.siparis, musteri: 0 })
              currentDate.setDate(currentDate.getDate() + 7)
            }
          } else if (groupBy === 'month') {
            const currentDate = new Date(startDate)
            currentDate.setDate(1)
            const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
            while (currentDate <= now) {
              const key = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              const data = byPeriod.get(key) || { satis: 0, siparis: 0 }
              result.push({ name: key, satis: Math.round(data.satis), siparis: data.siparis, musteri: 0 })
              currentDate.setMonth(currentDate.getMonth() + 1)
            }
          }
          
          setSalesData(result)

          // Recent orders (son 10)
          setRecentOrders(
            orders.slice(0,10).map((o:any)=>({ id: `#${o.id}`, customer: o.userName || '-', product: `${o.itemCount||0} ürün`, amount: Number(o.totalAmount)||0, status: (lower(o.status) as any)||'pending' }))
          )

          // Hourly activity (son 24 saat)
          const byHour = new Array(24).fill(0)
          orders.forEach((o:any)=>{ const h = new Date(o.createdAt).getHours(); byHour[h]++ })
          setHourlyActivity(byHour.map((v, i)=>({ hour: `${i}:00`, orders: v, visitors: Math.max(v*3, v) })))

          // Revenue by month - Siparişlerden hesapla
          try {
            // Siparişlerden aylık veri hesapla
            const monthlyMap = new Map<string, number>()
            orders.forEach((o: any) => {
              const d = new Date(o.createdAt)
              const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              const monthLabel = `${d.toLocaleString('tr-TR', { month: 'short' })} ${d.getFullYear()}`
              const current = monthlyMap.get(monthKey) || 0
              monthlyMap.set(monthKey, current + (Number(o.totalAmount) || 0))
            })
            
            if (monthlyMap.size > 0) {
              // Map'ten array'e çevir ve son 12 ayı al
              const backendData = Array.from(monthlyMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .slice(-12)
                .map(([monthKey, revenue]) => {
                  const [year, month] = monthKey.split('-')
                  const d = new Date(parseInt(year), parseInt(month) - 1)
                  return {
                    month: monthKey,
                    monthLabel: `${d.toLocaleString('tr-TR', { month: 'short' })} ${year}`,
                    gelir: revenue,
                    gider: Math.round(revenue * 0.7),
                    kar: Math.round(revenue * 0.3),
                    hedef: Math.round(revenue * 1.05)
                  }
                });
              
              // Eksik ayları kontrol et ve doldur (ek güvenlik)
              const now = new Date()
              const expectedMonths = 12
              const monthSet = new Set(backendData.map((d: any) => d.month))
              
              // Son 12 ayın listesini oluştur
              const allMonths: string[] = []
              for (let i = expectedMonths - 1; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const month = date.toISOString().slice(0, 7) // YYYY-MM formatı
                allMonths.push(month)
              }
              
              // Eksik ayları ekle
              const completeData = [...backendData]
              allMonths.forEach(month => {
                if (!monthSet.has(month)) {
                  const date = new Date(month + '-01')
                  const monthLabel = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
                  completeData.push({
                    month,
                    monthLabel,
                    gelir: 0,
                    gider: 0,
                    kar: 0,
                    hedef: 0
                  })
                }
              })
              
              // Aylara göre sırala
              completeData.sort((a, b) => a.month.localeCompare(b.month))
              
              setRevenueData(completeData)
            } else {
              // Fallback: Client-side hesaplama (tüm ayları göster)
              const byMonth = new Map<string, number>()
              orders.forEach((o:any)=>{ 
                const date = new Date(o.createdAt);
                const m = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}`; 
                byMonth.set(m, (byMonth.get(m)||0) + (Number(o.totalAmount)||0)) 
              })
              const months = Array.from(byMonth.entries()).sort((a,b)=>a[0]<b[0]? -1:1)
              setRevenueData(months.map(([month, gelir])=>{
                const date = new Date(month + '-01')
                const monthLabel = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
                return { month, monthLabel, gelir, gider: Math.round(gelir*0.6), kar: Math.round(gelir*0.4), hedef: Math.round(gelir*1.05) }
              }))
            }
          } catch (error) {
            // Fallback: Client-side hesaplama (tüm ayları göster)
            const byMonth = new Map<string, number>()
            orders.forEach((o:any)=>{ 
              const date = new Date(o.createdAt);
              const m = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}`; 
              byMonth.set(m, (byMonth.get(m)||0) + (Number(o.totalAmount)||0)) 
            })
            const months = Array.from(byMonth.entries()).sort((a,b)=>a[0]<b[0]? -1:1)
            setRevenueData(months.map(([month, gelir])=>({ month, gelir, gider: Math.round(gelir*0.6), kar: Math.round(gelir*0.4), hedef: Math.round(gelir*1.05) })))
          }
        }

        // Basit KPI ve kaynak dağılımını statülerden türet
        setKpiMetrics([
        ])

        setTrafficSources([
          { source: 'Doğrudan', visitors: 1200, conversion: 2.4, revenue: totalRevenue*0.3, color: '#3b82f6' },
          { source: 'Organik', visitors: 2200, conversion: 1.9, revenue: totalRevenue*0.25, color: '#10b981' },
          { source: 'Reklam', visitors: 900, conversion: 3.1, revenue: totalRevenue*0.35, color: '#f59e0b' },
          { source: 'Sosyal', visitors: 600, conversion: 1.2, revenue: totalRevenue*0.1, color: '#8b5cf6' },
          { source: 'E-posta', visitors: 300, conversion: 4.0, revenue: totalRevenue*0.08, color: '#ef4444' },
        ])

        // Stok uyarıları (ürün stok < minStock)
        try {
          const productsList = (productsRes as any)?.data?.products || (productsRes as any)?.data || []
          const alerts: Array<{ product: string; category: string; stock: number; minStock: number; status: 'critical' | 'warning' }> = (productsList as any[])
            .filter((p:any) => typeof p.stock === 'number' && p.stock >= 0 && p.stock <= 5)
            .slice(0, 10)
            .map((p:any) => ({
              product: String(p.name||'-'),
              category: String(p.category || '-'),
              stock: Number(p.stock||0),
              minStock: 5,
              status: (Number(p.stock||0) <= 1 ? 'critical' : 'warning'),
            }))
          setStockAlerts(alerts)
        } catch {}

        // Müşteri davranışı (radar) — canlı görüntülemelerden türet
        try {
          const views = (liveViews as any)?.data || []
          const totalViews = views.length
          const addedToCart = views.filter((v:any)=>v.addedToCart).length
          const purchases = views.filter((v:any)=>v.purchased).length
          const score = (n:number, base:number) => Math.min(100, Math.round((n/Math.max(base,1))*100))
          setCustomerBehavior([
            { metric: 'Ürün Görüntüleme', value: Math.min(100, totalViews) },
            { metric: 'Sepete Ekleme', value: score(addedToCart, totalViews || 50) },
            { metric: 'Satın Alma', value: score(purchases, totalViews || 50) },
            { metric: 'Etkileşim', value: score(addedToCart + purchases, (totalViews||50)*2) },
            { metric: 'Dönüşüm', value: score(purchases, addedToCart || 30) },
          ])
        } catch {}

        // Trendyol sipariş istatistikleri
        try {
          if ((trendyolOrders as any)?.success && (trendyolOrders as any).data) {
            const orders = (trendyolOrders as any).data as any[]
            const responseWithTotal = trendyolOrders as any
            
            // Toplam sipariş sayısı
            if (responseWithTotal.total !== undefined) {
              setTrendyolOrdersCount(responseWithTotal.total)
            } else {
              setTrendyolOrdersCount(orders.length)
            }
            
            // Toplam tutar
            if (responseWithTotal.totalAmount !== undefined) {
              setTrendyolTotalAmount(responseWithTotal.totalAmount)
            } else {
              const calculatedTotal = orders.reduce((sum: number, order: any) => {
                return sum + (parseFloat(String(order.totalAmount || 0)))
              }, 0)
              setTrendyolTotalAmount(calculatedTotal)
            }
            
            // Durum bazlı sayılar
            const lower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : '')
            const pending = orders.filter((o: any) => {
              const status = lower(o.status)
              return status === 'pending' || status === 'processing' || status === 'waiting'
            })
            const completed = orders.filter((o: any) => {
              const status = lower(o.status)
              return status === 'completed' || status === 'delivered' || status === 'shipped'
            })
            
            setTrendyolPendingCount(pending.length)
            setTrendyolCompletedCount(completed.length)
          } else {
            setTrendyolOrdersCount(0)
            setTrendyolTotalAmount(0)
            setTrendyolPendingCount(0)
            setTrendyolCompletedCount(0)
          }
        } catch {
          setTrendyolOrdersCount(0)
          setTrendyolTotalAmount(0)
          setTrendyolPendingCount(0)
          setTrendyolCompletedCount(0)
        }

        // Hepsiburada sipariş istatistikleri
        try {
          if ((hepsiburadaOrders as any)?.success && (hepsiburadaOrders as any).data) {
            const orders = (hepsiburadaOrders as any).data as any[]
            const responseWithTotal = hepsiburadaOrders as any
            
            // Toplam sipariş sayısı
            if (responseWithTotal.total !== undefined) {
              setHepsiburadaOrdersCount(responseWithTotal.total)
            } else {
              setHepsiburadaOrdersCount(orders.length)
            }
            
            // Toplam tutar
            if (responseWithTotal.totalAmount !== undefined) {
              setHepsiburadaTotalAmount(responseWithTotal.totalAmount)
            } else {
              const calculatedTotal = orders.reduce((sum: number, order: any) => {
                return sum + (parseFloat(String(order.totalAmount || 0)))
              }, 0)
              setHepsiburadaTotalAmount(calculatedTotal)
            }
            
            // Durum bazlı sayılar
            const lower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : '')
            const pending = orders.filter((o: any) => {
              const status = lower(o.status)
              return status === 'pending' || status === 'processing' || status === 'waiting'
            })
            const completed = orders.filter((o: any) => {
              const status = lower(o.status)
              return status === 'completed' || status === 'delivered' || status === 'shipped'
            })
            
            setHepsiburadaPendingCount(pending.length)
            setHepsiburadaCompletedCount(completed.length)
          } else {
            setHepsiburadaOrdersCount(0)
            setHepsiburadaTotalAmount(0)
            setHepsiburadaPendingCount(0)
            setHepsiburadaCompletedCount(0)
          }
        } catch {
          setHepsiburadaOrdersCount(0)
          setHepsiburadaTotalAmount(0)
          setHepsiburadaPendingCount(0)
          setHepsiburadaCompletedCount(0)
        }

        // Ticimax sipariş istatistikleri
        try {
          if ((ticimaxOrders as any)?.success && (ticimaxOrders as any).data) {
            const orders = (ticimaxOrders as any).data as any[]
            const responseWithTotal = ticimaxOrders as any
            
            // Toplam sipariş sayısı
            if (responseWithTotal.total !== undefined) {
              setTicimaxOrdersCount(responseWithTotal.total)
            } else {
              setTicimaxOrdersCount(orders.length)
            }
            
            // Toplam tutar
            if (responseWithTotal.totalAmount !== undefined) {
              setTicimaxTotalAmount(responseWithTotal.totalAmount)
            } else {
              const calculatedTotal = orders.reduce((sum: number, order: any) => {
                return sum + (parseFloat(String(order.totalAmount || 0)))
              }, 0)
              setTicimaxTotalAmount(calculatedTotal)
            }
            
            // Durum bazlı sayılar
            const lower = (s: any) => (typeof s === 'string' ? s.toLowerCase() : '')
            const pending = orders.filter((o: any) => {
              const status = lower(o.status)
              return status === 'pending' || status === 'processing' || status === 'waiting'
            })
            const completed = orders.filter((o: any) => {
              const status = lower(o.status)
              return status === 'completed' || status === 'delivered' || status === 'shipped'
            })
            
            setTicimaxPendingCount(pending.length)
            setTicimaxCompletedCount(completed.length)
          } else {
            setTicimaxOrdersCount(0)
            setTicimaxTotalAmount(0)
            setTicimaxPendingCount(0)
            setTicimaxCompletedCount(0)
          }
        } catch {
          setTicimaxOrdersCount(0)
          setTicimaxTotalAmount(0)
          setTicimaxPendingCount(0)
          setTicimaxCompletedCount(0)
        }

        // Gerçek Zamanlı Aktivite - Gerçek verilerden oluştur
        try {
          const activities: any[] = []
          const now = new Date()
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

          // Son siparişlerden aktiviteler oluştur
          if ((adminOrders as any)?.success && (adminOrders as any).data) {
            const recentOrders = ((adminOrders as any).data as any[])
              .filter((o: any) => new Date(o.createdAt) >= fiveMinutesAgo)
              .slice(0, 5)
            
            recentOrders.forEach((order: any) => {
              activities.push({
                id: `order-${order.id}`,
                type: 'order',
                user: order.userName || order.userEmail || 'Misafir',
                action: 'Yeni sipariş verdi',
                product: `${order.itemCount || 0} ürün`,
                amount: Number(order.totalAmount) || 0,
                time: formatTimeAgo(new Date(order.createdAt)),
                color: 'blue',
                icon: ShoppingCart
              })
            })
          }

          // Son yorumlardan aktiviteler oluştur
          try {
            const reviewsRes = await api.get<any>('/admin/reviews', { limit: 10, page: 1 }).catch(() => null)
            if (reviewsRes?.success && reviewsRes.data) {
              const recentReviews = (reviewsRes.data as any[])
                .filter((r: any) => new Date(r.createdAt) >= fiveMinutesAgo)
                .slice(0, 3)
              
              recentReviews.forEach((review: any) => {
                activities.push({
                  id: `review-${review.id}`,
                  type: 'review',
                  user: review.userName || review.userEmail || 'Misafir',
                  action: 'Ürün yorumu yaptı',
                  product: review.productName || 'Ürün',
                  rating: review.rating || 0,
                  time: formatTimeAgo(new Date(review.createdAt)),
                  color: 'yellow',
                  icon: Star
                })
              })
            }
          } catch {}

          // Son kullanıcılardan aktiviteler oluştur
          try {
            const usersRes = await api.get<any>('/admin/users', { limit: 10, page: 1 }).catch(() => null)
            if (usersRes?.success && usersRes.data) {
              const newUsers = (usersRes.data as any[])
                .filter((u: any) => new Date(u.createdAt) >= fiveMinutesAgo)
                .slice(0, 2)
              
              newUsers.forEach((user: any) => {
                activities.push({
                  id: `user-${user.id}`,
                  type: 'customer',
                  user: user.name || user.email || 'Yeni Kullanıcı',
                  action: 'Sisteme kayıt oldu',
                  time: formatTimeAgo(new Date(user.createdAt)),
                  color: 'green',
                  icon: UserPlus
                })
              })
            }
          } catch {}

          // Zaman sırasına göre sırala (en yeni önce)
          activities.sort((a, b) => {
            const timeA = getTimeFromAgo(a.time)
            const timeB = getTimeFromAgo(b.time)
            return timeB - timeA
          })

          setRealtimeActivities(activities.slice(0, 10))
        } catch (error) {
          console.error('❌ Error loading realtime activities:', error)
          setRealtimeActivities([])
        }

      } catch {
        // sessiz geç
      }
    }
    load()
  }, [timeRange])

  // Yardımcı fonksiyonlar
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    
    if (diffSecs < 60) return 'Az önce'
    if (diffMins < 60) return `${diffMins} dk önce`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} sa önce`
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  const getTimeFromAgo = (timeStr: string): number => {
    if (timeStr === 'Az önce') return Date.now()
    const match = timeStr.match(/(\d+)\s*(dk|sa)\s*önce/)
    if (match) {
      const value = parseInt(match[1])
      const unit = match[2]
      const ms = unit === 'dk' ? value * 60 * 1000 : value * 60 * 60 * 1000
      return Date.now() - ms
    }
    return Date.now()
  }

  const downloadReport = () => {
    // CSV formatında rapor oluştur
    const reportData = {
      tarih: formatDDMMYYYY(new Date()),
      saat: new Date().toLocaleTimeString('tr-TR'),
      donem: timeRange === '1day' ? 'Son 1 Gün' :
        timeRange === '3days' ? 'Son 3 Gün' :
          timeRange === '5days' ? 'Son 5 Gün' :
            timeRange === '7days' ? 'Son 7 Gün' :
              timeRange === '30days' ? 'Son 30 Gün' :
                timeRange === '3months' ? 'Son 3 Ay' : 'Bu Yıl',

      // Genel İstatistikler
      toplamSatis: `₺${totalRevenue.toLocaleString('tr-TR')}`,
      toplamSiparis: totalOrders.toLocaleString('tr-TR'),
      aktifUrun: totalProducts.toLocaleString('tr-TR'),
      toplamMusteri: totalCustomers.toLocaleString('tr-TR'),

      // Satış Verileri
      aylikSatislar: salesData,

      // Kategori Performansı
      kategoriPerformansi: categoryPerformance,

      // Stok Uyarıları
      stokUyarilari: stockAlerts,

      // Son Siparişler
      sonSiparisler: recentOrders,

      // KPI Metrikleri
      kpiMetrikleri: kpiMetrics,

      // SMS ve Email
      smsIstatistikleri: smsStats,
      emailIstatistikleri: emailStats,

      // Snort Güvenlik
      snortIstatistikleri: snortStats
    }

    // CSV içeriği oluştur
    let csvContent = 'DASHBOARD RAPORU\n\n'
    csvContent += `Tarih: ${reportData.tarih}\n`
    csvContent += `Saat: ${reportData.saat}\n`
    csvContent += `Dönem: ${reportData.donem}\n\n`

    csvContent += '=== GENEL İSTATİSTİKLER ===\n'
    csvContent += `Toplam Satış,${reportData.toplamSatis}\n`
    csvContent += `Toplam Sipariş,${reportData.toplamSiparis}\n`
    csvContent += `Aktif Ürün,${reportData.aktifUrun}\n`
    csvContent += `Toplam Müşteri,${reportData.toplamMusteri}\n\n`

    csvContent += '=== AYLIK SATIŞLAR ===\n'
    csvContent += 'Ay,Satış,Sipariş,Müşteri\n'
    salesData.forEach(item => {
      csvContent += `${item.name},${item.satis},${item.siparis},${item.musteri}\n`
    })
    csvContent += '\n'

    csvContent += '=== KATEGORİ PERFORMANSI ===\n'
    csvContent += 'Kategori,Satış,Kar,Stok,Siparişler\n'
    categoryPerformance.forEach(item => {
      csvContent += `${item.name},${item.satis},${item.kar},${item.stok},${item.siparisler}\n`
    })
    csvContent += '\n'

    csvContent += '=== STOK UYARILARI ===\n'
    csvContent += 'Ürün,Kategori,Mevcut Stok,Min Stok,Durum\n'
    stockAlerts.forEach(item => {
      csvContent += `${item.product},${item.category},${item.stock},${item.minStock},${item.status}\n`
    })
    csvContent += '\n'

    csvContent += '=== KPI METRİKLERİ ===\n'
    csvContent += 'Metrik,Değer,Hedef,İlerleme,Değişim\n'
    kpiMetrics.forEach(item => {
      csvContent += `${item.title},${item.value},${item.target},${item.progress}%,${item.change}\n`
    })
    csvContent += '\n'

    csvContent += '=== SMS PAZARLAMA İSTATİSTİKLERİ ===\n'
    csvContent += `Gönderilen SMS,${smsStats.totalSent}\n`
    csvContent += `Teslim Edilen,${smsStats.delivered}\n`
    csvContent += `Aktif Şablon,${smsStats.activeTemplates}\n`
    csvContent += `Aktif Kampanya,${smsStats.activeCampaigns}\n`
    csvContent += `Son Kampanya,${smsStats.lastCampaign}\n\n`

    csvContent += '=== E-POSTA PAZARLAMA İSTATİSTİKLERİ ===\n'
    csvContent += `Gönderilen Email,${emailStats.totalSent}\n`
    csvContent += `Açılan,${emailStats.opened}\n`
    csvContent += `Tıklanan,${emailStats.clicked}\n`
    csvContent += `Açılma Oranı,${emailStats.openRate}%\n`
    csvContent += `Tıklama Oranı,${emailStats.clickRate}%\n`
    csvContent += `Bounce Oranı,${emailStats.bounceRate}%\n`
    csvContent += `Aktif Şablon,${emailStats.activeTemplates}\n`
    csvContent += `Aktif Kampanya,${emailStats.activeCampaigns}\n\n`

    csvContent += '=== SNORT GÜVENLİK İSTATİSTİKLERİ ===\n'
    csvContent += `Toplam Log,${snortStats.total}\n`
    csvContent += `Yüksek Öncelik,${snortStats.high}\n`
    csvContent += `Orta Öncelik,${snortStats.medium}\n`
    csvContent += `Düşük Öncelik,${snortStats.low}\n`
    csvContent += `Engellenen,${snortStats.dropped}\n`
    csvContent += `Uyarılar,${snortStats.alerts}\n`

    // Blob oluştur ve indir
    if (typeof window !== 'undefined') {
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `dashboard-raporu-${formatDDMMYYYY(new Date())}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // Başarı bildirimi
    alert('✅ Rapor başarıyla indirildi!')
  }

  const stats = [
    {
      title: 'Toplam Satış',
      value: `₺${totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: '',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      detail: ''
    },
    {
      title: 'Toplam Sipariş',
      value: totalOrders.toLocaleString(),
      change: '',
      trend: 'up',
      icon: ShoppingCart,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      detail: ''
    },
    {
      title: 'Aktif Ürün',
      value: totalProducts.toLocaleString(),
      change: '',
      trend: 'up',
      icon: Package,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      detail: ''
    },
    {
      title: 'Toplam Müşteri',
      value: totalCustomers.toLocaleString(),
      change: '',
      trend: 'up',
      icon: Users,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100',
      detail: ''
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Hoş geldiniz! İşte bugünün özeti</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2 dark:text-slate-300"
          >
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2 dark:text-slate-300"
          >
            <Download className="w-4 h-4" />
            <span>Rapor İndir</span>
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
          >
            <option value="1day">Son 1 Gün</option>
            <option value="3days">Son 3 Gün</option>
            <option value="5days">Son 5 Gün</option>
            <option value="7days">Son 7 Gün</option>
            <option value="30days">Son 30 Gün</option>
            <option value="3months">Son 3 Ay</option>
            <option value="year">Bu Yıl</option>
          </select>
          <button
            onClick={() => {
              setNotifications(0)
              alert(`${notifications} yeni bildiriminiz var!`)
            }}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden card-hover cursor-pointer"
            >
              <div className={`bg-gradient-to-br ${stat.bgGradient} dark:from-slate-800 dark:to-slate-900 p-6`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{stat.value}</p>
                    <div className="flex items-center space-x-1 mb-2">
                      {stat.trend === 'up' ? (
                        <ArrowUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">bu ay</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.detail}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${stat.gradient} p-3 rounded-xl shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Trendyol İstatistikleri */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Trendyol Marketplace</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Sipariş</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{trendyolOrdersCount.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Tutar</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">₺{trendyolTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Bekleyen</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{trendyolPendingCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Tamamlanan</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{trendyolCompletedCount}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hepsiburada İstatistikleri */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Hepsiburada Marketplace</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Sipariş</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{hepsiburadaOrdersCount.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Tutar</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">₺{hepsiburadaTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Bekleyen</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{hepsiburadaPendingCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Tamamlanan</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{hepsiburadaCompletedCount}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ticimax İstatistikleri */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Ticimax Siparişleri</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Sipariş</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{ticimaxOrdersCount.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Tutar</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">₺{ticimaxTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Bekleyen</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{ticimaxPendingCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Tamamlanan</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{ticimaxCompletedCount}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Özel Toptan Üretim Özet Kartları (B2B) */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">B2B • Özel Toptan Üretim</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Talep</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{customProdTotal}</p>
            </div>
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Devam Eden</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{customProdInProgress}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Tamamlanan</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{customProdCompleted}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Toplam Tutar</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">₺{customProdAmount.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* KPI Metrikleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetrics.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300">{kpi.title}</h4>
              <Target className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpi.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hedef: {kpi.target}</p>
              </div>
              <div className="flex items-center space-x-1">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.change}
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${kpi.progress}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className={`absolute h-full rounded-full ${kpi.progress >= 80 ? 'bg-green-500' :
                  kpi.progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Satış Trendi</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
              >
                <option value="1day">Günlük (Son 1 Gün)</option>
                <option value="3days">Günlük (Son 3 Gün)</option>
                <option value="5days">Günlük (Son 5 Gün)</option>
                <option value="7days">Günlük (Son 7 Gün)</option>
                <option value="30days">Günlük (Son 30 Gün)</option>
                <option value="3months">Haftalık (Son 3 Ay)</option>
                <option value="year">Aylık (Bu Yıl)</option>
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveChart('sales')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${activeChart === 'sales' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  Satış
                </button>
                <button
                  onClick={() => setActiveChart('orders')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${activeChart === 'orders' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  Sipariş
                </button>
                <button
                  onClick={() => setActiveChart('customers')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${activeChart === 'customers' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  Müşteri
                </button>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {salesData && salesData.length > 0 ? (
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorSatis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSiparis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMusteri" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="name" stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
              <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              {activeChart === 'sales' && (
                <Area type="monotone" dataKey="satis" stroke="#667eea" strokeWidth={3} fillOpacity={1} fill="url(#colorSatis)" />
              )}
              {activeChart === 'orders' && (
                <Area type="monotone" dataKey="siparis" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSiparis)" />
              )}
              {activeChart === 'customers' && (
                <Area type="monotone" dataKey="musteri" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorMusteri)" />
              )}
            </AreaChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">Kategori Dağılımı</h3>
          <ResponsiveContainer width="100%" height={chartHeight}>
            {categoryData && categoryData.length > 0 ? (
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{
                  color: theme === 'dark' ? '#e2e8f0' : '#1e293b'
                }}
              />
            </PieChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
          <div className="mt-3 sm:mt-4 space-y-2">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">{cat.name}</span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 ml-2 flex-shrink-0">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kategori Performansı</h3>
            <button
              onClick={() => setShowCategoryDetails(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Tümünü Gör
            </button>
          </div>
          <div className="space-y-4">
            {categoryPerformance.map((cat, index) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{cat.name}</h4>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                    {cat.siparisler} sipariş
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Satış</p>
                    <p className="font-bold text-sm sm:text-base text-green-600 dark:text-green-400">₺{(cat.satis / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kar</p>
                    <p className="font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400">₺{(cat.kar / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stok</p>
                    <p className="font-bold text-sm sm:text-base text-purple-600 dark:text-purple-400">{cat.stok}</p>
                  </div>
                </div>
                <div className="mt-3 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 h-full rounded-full"
                    style={{ width: `${(cat.satis / 145000) * 100}%` }}
                  ></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
              Stok Uyarıları
            </h3>
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium">
              {stockAlerts.length} Uyarı
            </span>
          </div>
          <div className="space-y-3">
            {stockAlerts.map((alert, index) => (
              <motion.div
                key={alert.product}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-l-4 ${alert.status === 'critical'
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-700'
                  : 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 dark:border-orange-700'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{alert.product}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{alert.category}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${alert.status === 'critical'
                    ? 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                    : 'bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
                    }`}>
                    {alert.status === 'critical' ? 'Kritik' : 'Uyarı'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Mevcut Stok:</span>
                  <span className={`font-bold ${alert.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                    }`}>
                    {alert.stock} / {alert.minStock}
                  </span>
                </div>
                <div className="mt-2 bg-white dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${alert.status === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                      }`}
                    style={{ width: `${(alert.stock / alert.minStock) * 100}%` }}
                  ></div>
                </div>
              </motion.div>
            ))}
          </div>
          <button
            onClick={() => setShowStockAlerts(true)}
            className="w-full mt-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
          >
            Tüm Stok Uyarılarını Gör
          </button>
        </div>
      </div>


      {/* Snort IDS Güvenlik İstatistikleri */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Snort IDS Güvenlik Durumu</h3>
              <p className="text-slate-400 text-sm">Son güncelleme: {snortStats.last || '-'}</p>
            </div>
          </div>
          <button
            onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'snort-logs' } }))}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-medium"
          >
            Detaylı Görünüm
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-700/50 rounded-xl p-4 border border-slate-600"
          >
            <p className="text-slate-400 text-xs mb-2">Toplam Log</p>
            <p className="text-2xl font-bold text-white">{snortStats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-red-500/10 rounded-xl p-4 border border-red-500/30"
          >
            <p className="text-red-400 text-xs mb-2">Yüksek</p>
            <p className="text-2xl font-bold text-red-400">{snortStats.high}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30"
          >
            <p className="text-orange-400 text-xs mb-2">Orta</p>
            <p className="text-2xl font-bold text-orange-400">{snortStats.medium}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30"
          >
            <p className="text-blue-400 text-xs mb-2">Düşük</p>
            <p className="text-2xl font-bold text-blue-400">{snortStats.low}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-red-500/10 rounded-xl p-4 border border-red-500/30"
          >
            <p className="text-red-400 text-xs mb-2">Engellendi</p>
            <p className="text-2xl font-bold text-red-400">{snortStats.dropped}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30"
          >
            <p className="text-yellow-400 text-xs mb-2">Uyarılar</p>
            <p className="text-2xl font-bold text-yellow-400">{snortStats.alerts}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tehdit Grafiği */}
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600">
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-red-400" />
              Saatlik Tehdit Aktivitesi
            </h4>
            <ResponsiveContainer width="100%" height={150}>
              {snortThreatData && snortThreatData.length > 0 ? (
              <AreaChart data={snortThreatData}>
                <defs>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="hour" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="threats"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorThreats)"
                />
              </AreaChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Veri yok</div>
              )}
            </ResponsiveContainer>
          </div>

          {/* Son Tehditler */}
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600">
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-400" />
              Son Güvenlik Olayları
            </h4>
            <div className="space-y-3">
              {recentThreats.map((threat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${threat.severity === 'high' ? 'bg-red-500' :
                        threat.severity === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                        }`}></span>
                      <p className="text-white text-sm font-medium">{threat.type}</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span>{threat.ip}</span>
                      <span>•</span>
                      <span>{threat.time}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${threat.status === 'blocked'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {threat.status === 'blocked' ? 'Engellendi' : 'Uyarı'}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Özet Kartlar (API'den türetilen) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Truck className="w-8 h-8 opacity-80" />
            <ArrowUp className="w-5 h-5" />
          </div>
          <p className="text-blue-100 text-sm mb-1">Kargoda</p>
          <p className="text-3xl font-bold mb-2">{inTransitCount.toLocaleString('tr-TR')}</p>
          <p className="text-sm text-blue-100">Aktif gönderimde</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 opacity-80" />
            <ArrowUp className="w-5 h-5" />
          </div>
          <p className="text-green-100 text-sm mb-1">Teslim Edildi</p>
          <p className="text-3xl font-bold mb-2">{deliveredCount.toLocaleString('tr-TR')}</p>
          <p className="text-sm text-green-100">Toplam teslim</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-purple-100 text-sm mb-1">Ödeme Bekleyen</p>
          <p className="text-3xl font-bold mb-2">{pendingPaymentCount.toLocaleString('tr-TR')}</p>
          <p className="text-sm text-purple-100">₺{pendingAmount.toLocaleString('tr-TR')} değer</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <RefreshCw className="w-8 h-8 opacity-80" />
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-orange-100 text-sm mb-1">İade Talebi</p>
          <p className="text-3xl font-bold mb-2">{returnableCount.toLocaleString('tr-TR')}</p>
          <p className="text-sm text-orange-100">İşlem bekliyor</p>
        </div>
      </div>

      {/* Gelir Analizi ve Saatlik Aktivite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gelir Analizi</h3>
            <BarChart3 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {revenueData && revenueData.length > 0 ? (
            <ComposedChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" />
              <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="gelir" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="gider" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Line type="monotone" dataKey="kar" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="hedef" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Saatlik Aktivite</h3>
            <Activity className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {hourlyActivity && hourlyActivity.length > 0 ? (
            <AreaChart data={hourlyActivity}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" name="Siparişler" />
              <Area type="monotone" dataKey="visitors" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" name="Ziyaretçiler" />
            </AreaChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Veri yok</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Müşteri Davranışı ve Gerçek Zamanlı Aktivite */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 dark:from-slate-800 dark:via-purple-900/20 dark:to-blue-900/20 rounded-2xl shadow-lg border border-purple-100/50 dark:border-purple-800/30 p-6 relative overflow-hidden"
        >
          {/* Dekoratif arka plan elemanları */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-blue-200/20 dark:from-purple-800/10 dark:to-blue-800/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200/20 to-purple-200/20 dark:from-blue-800/10 dark:to-purple-800/10 rounded-full blur-2xl -ml-12 -mb-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Müşteri Davranışı</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Analiz ve İstatistikler</p>
                </div>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              {customerBehavior && customerBehavior.length > 0 ? (
                <RadarChart data={customerBehavior}>
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <PolarGrid 
                    stroke={theme === 'dark' ? '#475569' : '#cbd5e1'} 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'}
                    fontSize={11}
                    fontWeight={500}
                    tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar 
                    name="Puan" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={2.5}
                    fill="url(#radarGradient)" 
                    fillOpacity={0.7}
                    dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      padding: '12px',
                    }}
                    labelStyle={{
                      color: theme === 'dark' ? '#cbd5e1' : '#1e293b',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                    itemStyle={{
                      color: theme === 'dark' ? '#cbd5e1' : '#1e293b',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Puan']}
                  />
                </RadarChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p>Veri yok</p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
            
            <div className="mt-6 space-y-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              {customerBehavior.map((item, index) => {
                const getIcon = () => {
                  if (item.metric.includes('Görüntüleme')) return Eye
                  if (item.metric.includes('Sepete')) return ShoppingCart
                  if (item.metric.includes('Satın')) return CheckCircle
                  if (item.metric.includes('Etkileşim')) return Activity
                  return Target
                }
                const Icon = getIcon()
                const getColor = () => {
                  if (item.value >= 80) return 'from-emerald-500 to-green-500'
                  if (item.value >= 60) return 'from-blue-500 to-cyan-500'
                  if (item.value >= 40) return 'from-yellow-500 to-orange-500'
                  return 'from-red-500 to-pink-500'
                }
                return (
                  <motion.div 
                    key={item.metric}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getColor()} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.metric}</p>
                          <div className="mt-1.5 w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.value}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                              className={`h-full bg-gradient-to-r ${getColor()} rounded-full shadow-sm`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-purple-200/50 dark:border-purple-700/50">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.value}%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500 rounded-lg blur-md opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gerçek Zamanlı Aktivite</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Canlı sistem olayları</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">CANLI</span>
              </div>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Tümü</span>
              </button>
            </div>
          </div>

          {/* Aktivite İstatistikleri - Gerçek Veriler */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  +{realtimeActivities.filter(a => a.type === 'order').length}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalOrders}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Sipariş</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  +{realtimeActivities.filter(a => a.type === 'customer').length}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalCustomers}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Ziyaretçi</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  +{realtimeActivities.filter(a => a.type === 'review').length}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {realtimeActivities.filter(a => a.type === 'review').length}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Yorum</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  +₺{realtimeActivities
                    .filter(a => a.type === 'order' && a.amount)
                    .reduce((sum, a) => sum + (a.amount || 0), 0)
                    .toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                ₺{totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Gelir</p>
            </div>
          </div>

          {/* Aktivite Akışı */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
            {realtimeActivities.map((activity, index) => {
              const Icon = activity.icon
              const colorClasses = {
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', glow: 'shadow-blue-100' },
                yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', glow: 'shadow-yellow-100' },
                green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', glow: 'shadow-green-100' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', glow: 'shadow-purple-100' },
                red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', glow: 'shadow-red-100' }
              }
              const colors = colorClasses[activity.color as keyof typeof colorClasses] || colorClasses.blue

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                  className={`relative group bg-slate-50 backdrop-blur-sm border ${colors.border} rounded-xl p-4 hover:bg-slate-100 transition-all duration-300 cursor-pointer ${colors.glow} hover:shadow-lg`}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 ${colors.bg} rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`}></div>

                  <div className="relative flex items-start space-x-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 ${colors.bg} border ${colors.border} p-2.5 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-sm font-bold text-slate-800">{activity.user}</p>
                            {activity.type === 'order' && (
                              <span className="px-2 py-0.5 bg-blue-100 border border-blue-200 rounded text-xs font-medium text-blue-700">
                                Sipariş
                              </span>
                            )}
                            {activity.type === 'review' && (
                              <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-200 rounded text-xs font-medium text-yellow-700">
                                Yorum
                              </span>
                            )}
                            {activity.type === 'customer' && (
                              <span className="px-2 py-0.5 bg-green-100 border border-green-200 rounded text-xs font-medium text-green-700">
                                Yeni Üye
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{activity.action}</p>
                          {activity.product && (
                            <p className="text-xs text-slate-500 font-medium">{activity.product}</p>
                          )}
                          {activity.rating && (
                            <div className="flex items-center mt-1.5 space-x-1">
                              {[...Array(activity.rating)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Amount & Time */}
                        <div className="text-right flex-shrink-0">
                          {activity.amount && (
                            <div className="mb-1 px-2 py-1 bg-green-100 border border-green-200 rounded-lg">
                              <p className="text-sm font-bold text-green-700">₺{activity.amount.toLocaleString()}</p>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 font-medium">{activity.time}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Border Animation */}
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-slate-200 transition-colors duration-300"></div>
                </motion.div>
              )
            })}
          </div>

          {/* Footer Stats */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <div className="flex items-center space-x-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Son 5 dakika</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Otomatik yenileme: Açık</span>
              </div>
            </div>
            <button
              onClick={async () => {
                // Verileri yeniden yükle
                const load = async () => {
                  try {
                    const [adminOrders, reviewsRes, usersRes] = await Promise.all([
                      api.get<any>('/admin/orders'),
                      api.get<any>('/admin/reviews', { limit: 10, page: 1 }).catch(() => null),
                      api.get<any>('/admin/users', { limit: 10, page: 1 }).catch(() => null)
                    ])
                    
                    const activities: any[] = []
                    const now = new Date()
                    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

                    if ((adminOrders as any)?.success && (adminOrders as any).data) {
                      const recentOrders = ((adminOrders as any).data as any[])
                        .filter((o: any) => new Date(o.createdAt) >= fiveMinutesAgo)
                        .slice(0, 5)
                      
                      recentOrders.forEach((order: any) => {
                        activities.push({
                          id: `order-${order.id}`,
                          type: 'order',
                          user: order.userName || order.userEmail || 'Misafir',
                          action: 'Yeni sipariş verdi',
                          product: `${order.itemCount || 0} ürün`,
                          amount: Number(order.totalAmount) || 0,
                          time: formatTimeAgo(new Date(order.createdAt)),
                          color: 'blue',
                          icon: ShoppingCart
                        })
                      })
                    }

                    if (reviewsRes?.success && reviewsRes.data) {
                      const recentReviews = (reviewsRes.data as any[])
                        .filter((r: any) => new Date(r.createdAt) >= fiveMinutesAgo)
                        .slice(0, 3)
                      
                      recentReviews.forEach((review: any) => {
                        activities.push({
                          id: `review-${review.id}`,
                          type: 'review',
                          user: review.userName || review.userEmail || 'Misafir',
                          action: 'Ürün yorumu yaptı',
                          product: review.productName || 'Ürün',
                          rating: review.rating || 0,
                          time: formatTimeAgo(new Date(review.createdAt)),
                          color: 'yellow',
                          icon: Star
                        })
                      })
                    }

                    if (usersRes?.success && usersRes.data) {
                      const newUsers = (usersRes.data as any[])
                        .filter((u: any) => new Date(u.createdAt) >= fiveMinutesAgo)
                        .slice(0, 2)
                      
                      newUsers.forEach((user: any) => {
                        activities.push({
                          id: `user-${user.id}`,
                          type: 'customer',
                          user: user.name || user.email || 'Yeni Kullanıcı',
                          action: 'Sisteme kayıt oldu',
                          time: formatTimeAgo(new Date(user.createdAt)),
                          color: 'green',
                          icon: UserPlus
                        })
                      })
                    }

                    activities.sort((a, b) => {
                      const timeA = getTimeFromAgo(a.time)
                      const timeB = getTimeFromAgo(b.time)
                      return timeB - timeA
                    })

                    setRealtimeActivities(activities.slice(0, 10))
                  } catch (error) {
                    console.error('❌ Error refreshing activities:', error)
                  }
                }
                await load()
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors group"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-800 group-hover:rotate-180 transition-all duration-500" />
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800">Yenile</span>
            </button>
          </div>
        </div>
      </div>

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">En Çok Satan Ürünler</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{product.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{product.sales} satış</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 dark:text-slate-100">₺{(product.revenue / 1000).toFixed(0)}K</p>
                  <div className="flex items-center justify-end space-x-1">
                    {product.trend > 0 ? (
                      <ArrowUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`text-xs font-semibold ${product.trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {Math.abs(product.trend)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Son Siparişler</h3>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{order.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                      {order.status === 'completed' ? 'Tamamlandı' :
                        order.status === 'processing' ? 'İşleniyor' : 'Beklemede'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{order.customer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.product}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-slate-800 dark:text-slate-100">₺{order.amount.toLocaleString()}</p>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mt-1 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400" />
                    Detay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI İçgörüleri Uyarı Alanı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIAlertWidget />
        
        {/* Sistem Durumu Kartı */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Sistem Durumu</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Tüm sistemler çalışıyor</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">API Durumu</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Aktif</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Veritabanı</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Bağlı</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Önbellek</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Çalışıyor</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  try { sessionStorage.removeItem('healthChecked') } catch {}
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-health-modal'))
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Activity className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>Detaylı Durum</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hızlı Eylemler */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Hızlı Eylemler</h3>
            <p className="text-slate-300">Sık kullanılan işlemlere hızlı erişim</p>
          </div>
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { icon: Package, label: 'Yeni Ürün', color: 'blue', action: () => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'products' } })) },
            { icon: ShoppingCart, label: 'Sipariş Oluştur', color: 'green', action: () => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'orders' } })) },
            { icon: Users, label: 'Müşteri Ekle', color: 'purple', action: () => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'customers' } })) },
            { icon: TrendingUp, label: 'Kampanya', color: 'orange', action: () => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'campaigns' } })) },
            { icon: MessageSquare, label: 'Destek', color: 'pink', action: () => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'chatbot' } })) },
            { icon: BarChart3, label: 'Rapor', color: 'cyan', action: () => downloadReport() },
          ].map((action, index) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                onClick={action.action}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all border border-white/10"
              >
                <div className={`p-3 bg-${action.color}-500/20 rounded-lg mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-white text-center">{action.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Kategori Detayları Modal */}
      <AnimatePresence>
        {showCategoryDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCategoryDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kategori Performans Detayları</h3>
                <button
                  onClick={() => setShowCategoryDetails(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {categoryPerformance.map((cat, index) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{cat.name}</h4>
                      <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium">
                        {cat.siparisler} sipariş
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Satış</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">₺{(cat.satis / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Kar</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">₺{(cat.kar / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Stok</p>
                        <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{cat.stok}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">Kar Marjı</p>
                        <p className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{((cat.kar / cat.satis) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full"
                        style={{ width: `${(cat.satis / 145000) * 100}%` }}
                      ></div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <button
                  onClick={() => setShowCategoryDetails(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sipariş Detay Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sipariş Detayları</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş No</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedOrder.id}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedOrder.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    selectedOrder.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                    {selectedOrder.status === 'completed' ? 'Tamamlandı' :
                      selectedOrder.status === 'processing' ? 'İşleniyor' : 'Beklemede'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Müşteri</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{selectedOrder.customer}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ürün</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{selectedOrder.product}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Tutar</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">₺{selectedOrder.amount.toLocaleString()}</p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtre Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center">
                  <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 mr-2 sm:mr-3" />
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Filtreler</h3>
                </div>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tarih Aralığı</label>
                  <select className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300">
                    <option>Son 7 Gün</option>
                    <option>Son 30 Gün</option>
                    <option>Son 3 Ay</option>
                    <option>Bu Yıl</option>
                    <option>Özel Tarih</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kategori</label>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryData.map((cat) => (
                      <label key={cat.name} className="flex items-center space-x-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sipariş Durumu</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center space-x-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Tamamlandı</span>
                    </label>
                    <label className="flex items-center space-x-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                      <span className="text-sm text-slate-700 dark:text-slate-300">İşleniyor</span>
                    </label>
                    <label className="flex items-center space-x-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Beklemede</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tutar Aralığı</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Min ₺"
                      className="px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                    />
                    <input
                      type="number"
                      placeholder="Max ₺"
                      className="px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex space-x-3">
                <button
                  onClick={() => {
                    alert('✅ Filtreler uygulandı!')
                    setShowFilterModal(false)
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Filtreleri Uygula
                </button>
                <button
                  onClick={() => {
                    alert('🔄 Filtreler sıfırlandı!')
                  }}
                  className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Sıfırla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sipariş Detay Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sipariş Detayı</h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Sipariş No</p>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Durum</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${selectedOrder.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        selectedOrder.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                        {selectedOrder.status === 'completed' ? 'Tamamlandı' :
                          selectedOrder.status === 'processing' ? 'İşleniyor' : 'Beklemede'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Müşteri</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedOrder.customer}</p>
                    </div>
                    <Users className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ürün</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedOrder.product}</p>
                    </div>
                    <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tutar</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">₺{selectedOrder.amount.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Sipariş Durumu</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Sipariş Alındı</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">15 Ocak 2024, 14:30</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedOrder.status !== 'pending' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}>
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Kargoya Verildi</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedOrder.status !== 'pending' ? '15 Ocak 2024, 16:45' : 'Bekleniyor...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedOrder.status === 'completed' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}>
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Teslim Edildi</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedOrder.status === 'completed' ? '16 Ocak 2024, 10:20' : 'Bekleniyor...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex space-x-3">
                <button
                  onClick={() => alert('📧 Müşteriye bildirim gönderildi!')}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Müşteriye Bildir
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stok Uyarıları Modal */}
      <AnimatePresence>
        {showStockAlerts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStockAlerts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tüm Stok Uyarıları</h3>
                </div>
                <button
                  onClick={() => setShowStockAlerts(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {stockAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.product}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 rounded-xl border-l-4 ${alert.status === 'critical'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-600'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{alert.product}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{alert.category}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${alert.status === 'critical'
                        ? 'bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : 'bg-orange-200 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                        }`}>
                        {alert.status === 'critical' ? 'Kritik Seviye' : 'Uyarı'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Mevcut Stok</p>
                        <p className={`text-2xl font-bold ${alert.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                          }`}>
                          {alert.stock}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Minimum Stok</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{alert.minStock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Eksik</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{alert.minStock - alert.stock}</p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full ${alert.status === 'critical' ? 'bg-red-500 dark:bg-red-600' : 'bg-orange-500 dark:bg-orange-600'
                          }`}
                        style={{ width: `${(alert.stock / alert.minStock) * 100}%` }}
                      ></div>
                    </div>
                    <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Stok Siparişi Ver
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <button
                  onClick={() => setShowStockAlerts(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
