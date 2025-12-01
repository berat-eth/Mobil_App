'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb, 
  Target, 
  Zap, 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign,
  RefreshCw,
  Eye,
  ArrowRight,
  Star,
  Clock,
  Activity,
  Shield,
  MessageSquare,
  Calendar,
  Filter,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Cpu,
  Database,
  Network
} from 'lucide-react'
import { Line, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import { api } from '@/lib/api'
import { aiProvidersService } from '@/lib/services/ai-providers'

interface AIInsight {
  id: string
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  category: 'sales' | 'inventory' | 'customers' | 'marketing' | 'operations'
  actionable: boolean
  estimatedValue?: number
  timeframe?: string
  priority: number
  createdAt: string
  tags: string[]
}

interface AIPrediction {
  metric: string
  currentValue: number
  predictedValue: number
  confidence: number
  timeframe: string
  trend: 'up' | 'down' | 'stable'
  factors: string[]
}

interface AIRecommendation {
  id: string
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  impact: 'high' | 'medium' | 'low'
  roi?: number
  timeframe: string
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
}

export default function AIInsights() {
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'predictions' | 'recommendations'>('overview')
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [predictions, setPredictions] = useState<AIPrediction[]>([])
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: 'all',
    impact: 'all',
    timeframe: 'all'
  })

  // API verisi (başarısız olursa mock fallback)
  useEffect(() => {
    const loadAIData = async () => {
      setLoading(true)
      try {
        const res = await aiProvidersService.fetchInsights()
        const data = (res as any) || {}
        if (Array.isArray(data.insights)) setInsights(data.insights)
        if (Array.isArray(data.predictions)) setPredictions(data.predictions)
        if (Array.isArray(data.recommendations)) setRecommendations(data.recommendations)
      } catch {
        // Mock fallback
        setInsights([
        {
          id: '1',
          type: 'opportunity',
          title: 'Yüksek Potansiyelli Müşteri Segmenti',
          description: '25-35 yaş arası outdoor giyim müşterileri %40 daha fazla harcama yapıyor. Bu segment için özel kampanya öneriliyor.',
          impact: 'high',
          confidence: 87,
          category: 'customers',
          actionable: true,
          estimatedValue: 45000,
          timeframe: '30 gün',
          priority: 1,
          createdAt: new Date().toISOString(),
          tags: ['segmentasyon', 'kampanya', 'outdoor']
        },
        {
          id: '2',
          type: 'warning',
          title: 'Stok Tükenme Riski',
          description: 'Mont kategorisinde 3 ürün 7 gün içinde tükenecek. Hızlı tedarik veya alternatif ürün önerisi gerekli.',
          impact: 'high',
          confidence: 92,
          category: 'inventory',
          actionable: true,
          timeframe: '7 gün',
          priority: 2,
          createdAt: new Date().toISOString(),
          tags: ['stok', 'tedarik', 'mont']
        },
        {
          id: '3',
          type: 'trend',
          title: 'Hafta Sonu Satış Artışı',
          description: 'Cumartesi ve Pazar günleri satışlar %25 artıyor. Hafta sonu kampanyaları optimize edilebilir.',
          impact: 'medium',
          confidence: 78,
          category: 'sales',
          actionable: true,
          estimatedValue: 12000,
          timeframe: '14 gün',
          priority: 3,
          createdAt: new Date().toISOString(),
          tags: ['hafta sonu', 'kampanya', 'satış']
        },
        {
          id: '4',
          type: 'recommendation',
          title: 'Fiyat Optimizasyonu Fırsatı',
          description: 'Kamp malzemeleri kategorisinde %8-12 fiyat artışı mümkün. Rekabet analizi destekliyor.',
          impact: 'high',
          confidence: 85,
          category: 'sales',
          actionable: true,
          estimatedValue: 28000,
          timeframe: '21 gün',
          priority: 2,
          createdAt: new Date().toISOString(),
          tags: ['fiyat', 'optimizasyon', 'kamp']
        }
      ])
      setPredictions([
        {
          metric: 'Aylık Satış',
          currentValue: 125000,
          predictedValue: 142000,
          confidence: 82,
          timeframe: '30 gün',
          trend: 'up',
          factors: ['Sezonluk artış', 'Yeni ürün lansmanı', 'Kampanya etkisi']
        },
        {
          metric: 'Müşteri Sayısı',
          currentValue: 1250,
          predictedValue: 1380,
          confidence: 76,
          timeframe: '30 gün',
          trend: 'up',
          factors: ['Referans artışı', 'Sosyal medya etkisi', 'SEO iyileştirmeleri']
        },
        {
          metric: 'Stok Devir Hızı',
          currentValue: 2.3,
          predictedValue: 2.1,
          confidence: 68,
          timeframe: '30 gün',
          trend: 'down',
          factors: ['Sezon sonu', 'Yeni ürün girişi', 'Tedarik gecikmeleri']
        }
      ])
      setRecommendations([
        {
          id: '1',
          title: 'Akıllı Fiyatlandırma Sistemi',
          description: 'Dinamik fiyatlandırma algoritması ile %15 gelir artışı sağlanabilir.',
          category: 'Sales',
          priority: 'high',
          effort: 'medium',
          impact: 'high',
          roi: 340,
          timeframe: '45 gün',
          status: 'pending'
        },
        {
          id: '2',
          title: 'Müşteri Segmentasyonu',
          description: 'AI destekli müşteri segmentasyonu ile kişiselleştirilmiş kampanyalar.',
          category: 'Marketing',
          priority: 'high',
          effort: 'low',
          impact: 'high',
          roi: 280,
          timeframe: '30 gün',
          status: 'pending'
        },
        {
          id: '3',
          title: 'Stok Optimizasyonu',
          description: 'Makine öğrenmesi ile stok seviyelerini optimize et.',
          category: 'Operations',
          priority: 'medium',
          effort: 'high',
          impact: 'medium',
          roi: 150,
          timeframe: '60 gün',
          status: 'pending'
        }
      ])
      } finally {
        setLoading(false)
      }
    }

    loadAIData()
  }, [])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return Lightbulb
      case 'warning': return AlertTriangle
      case 'trend': return TrendingUp
      case 'recommendation': return Target
      default: return Brain
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-red-600 bg-red-100'
      case 'trend': return 'text-blue-600 bg-blue-100'
      case 'recommendation': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredInsights = insights.filter(insight => {
    if (filters.category !== 'all' && insight.category !== filters.category) return false
    if (filters.impact !== 'all' && insight.impact !== filters.impact) return false
    return true
  })

  const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
    { id: 'insights', label: 'İçgörüler', icon: Brain },
    { id: 'predictions', label: 'Tahminler', icon: TrendingUp },
    { id: 'recommendations', label: 'Öneriler', icon: Target }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">AI içgörüleri analiz ediliyor...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            AI İçgörüleri
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Yapay zeka destekli analiz ve öneriler</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
          >
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kategori</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="all">Tümü</option>
                  <option value="sales">Satış</option>
                  <option value="inventory">Stok</option>
                  <option value="customers">Müşteriler</option>
                  <option value="marketing">Pazarlama</option>
                  <option value="operations">Operasyonlar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Etki</label>
                <select
                  value={filters.impact}
                  onChange={(e) => setFilters({ ...filters, impact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="all">Tümü</option>
                  <option value="high">Yüksek</option>
                  <option value="medium">Orta</option>
                  <option value="low">Düşük</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Zaman Aralığı</label>
                <select
                  value={filters.timeframe}
                  onChange={(e) => setFilters({ ...filters, timeframe: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="all">Tümü</option>
                  <option value="7">7 gün</option>
                  <option value="30">30 gün</option>
                  <option value="90">90 gün</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Brain className="w-8 h-8" />
                  <span className="text-2xl font-bold">{insights.length}</span>
                </div>
                <h3 className="font-semibold mb-1">Toplam İçgörü</h3>
                <p className="text-blue-100 text-sm">Aktif analizler</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-2xl font-bold">{predictions.length}</span>
                </div>
                <h3 className="font-semibold mb-1">Tahmin</h3>
                <p className="text-green-100 text-sm">Gelecek projeksiyonlar</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Target className="w-8 h-8" />
                  <span className="text-2xl font-bold">{recommendations.length}</span>
                </div>
                <h3 className="font-semibold mb-1">Öneri</h3>
                <p className="text-purple-100 text-sm">Aksiyon önerileri</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="w-8 h-8" />
                  <span className="text-2xl font-bold">87%</span>
                </div>
                <h3 className="font-semibold mb-1">Ortalama Güven</h3>
                <p className="text-orange-100 text-sm">AI doğruluğu</p>
              </div>
            </div>

            {/* Recent Insights */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Son İçgörüler</h3>
              <div className="space-y-4">
                {insights.slice(0, 3).map((insight) => {
                  const Icon = getInsightIcon(insight.type)
                  return (
                    <div
                      key={insight.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <div className={`p-2 rounded-lg ${getInsightColor(insight.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{insight.title}</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">{insight.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className={`px-2 py-1 rounded-full ${getImpactColor(insight.impact)}`}>
                            {insight.impact === 'high' ? 'Yüksek' : insight.impact === 'medium' ? 'Orta' : 'Düşük'} Etki
                          </span>
                          <span>{insight.confidence}% Güven</span>
                          <span>{insight.timeframe}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {filteredInsights.map((insight) => {
              const Icon = getInsightIcon(insight.type)
              return (
                <div
                  key={insight.id}
                  className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${getInsightColor(insight.type)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{insight.title}</h3>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{insight.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact === 'high' ? 'Yüksek' : insight.impact === 'medium' ? 'Orta' : 'Düşük'} Etki
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          <span>{insight.confidence}% Güven</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{insight.timeframe}</span>
                        </div>
                        {insight.estimatedValue && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>₺{insight.estimatedValue.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {insight.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {insight.actionable && (
                          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <span>Aksiyon Al</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {activeTab === 'predictions' && (
          <motion.div
            key="predictions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {predictions.map((prediction) => (
              <div
                key={prediction.metric}
                className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{prediction.metric}</h3>
                  <div className="flex items-center gap-2">
                    {prediction.trend === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : prediction.trend === 'down' ? (
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                    <span className="text-sm text-slate-500 dark:text-slate-400">{prediction.timeframe}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {prediction.currentValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Mevcut Değer</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {prediction.predictedValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Tahmin Edilen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {prediction.confidence}%
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Güven Seviyesi</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Etkileyen Faktörler:</h4>
                  <div className="flex flex-wrap gap-2">
                    {prediction.factors.map((factor) => (
                      <span
                        key={factor}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{rec.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {rec.priority === 'high' ? 'Yüksek' : rec.priority === 'medium' ? 'Orta' : 'Düşük'} Öncelik
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{rec.category}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Kategori</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{rec.effort}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Çaba</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{rec.impact}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Etki</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{rec.timeframe}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Süre</div>
                  </div>
                </div>

                {rec.roi && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-600">ROI: %{rec.roi}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Durum:</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      rec.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      rec.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      rec.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                      {rec.status === 'pending' ? 'Beklemede' :
                       rec.status === 'in_progress' ? 'Devam Ediyor' :
                       rec.status === 'completed' ? 'Tamamlandı' : 'Reddedildi'}
                    </span>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <span>Uygula</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight Detail Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedInsight(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getInsightColor(selectedInsight.type)}`}>
                    {(() => { const Icon = getInsightIcon(selectedInsight.type); return <Icon className="w-6 h-6" /> })()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedInsight.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400">{selectedInsight.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedInsight.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Güven Seviyesi</span>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{selectedInsight.confidence}%</div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Etki</span>
                    <div className={`text-lg font-semibold ${getImpactColor(selectedInsight.impact)}`}>
                      {selectedInsight.impact === 'high' ? 'Yüksek' : selectedInsight.impact === 'medium' ? 'Orta' : 'Düşük'}
                    </div>
                  </div>
                </div>

                {selectedInsight.estimatedValue && (
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Tahmini Değer</span>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">₺{selectedInsight.estimatedValue.toLocaleString()}</div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Etiketler</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedInsight.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Kapat
                </button>
                {selectedInsight.actionable && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Aksiyon Al
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
