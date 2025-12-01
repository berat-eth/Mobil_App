'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp, 
  Target, 
  ArrowRight, 
  X, 
  Zap,
  Eye,
  Clock,
  DollarSign,
  Activity,
  CheckCircle
} from 'lucide-react'

interface AIAlert {
  id: string
  type: 'warning' | 'opportunity' | 'trend' | 'recommendation'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  category: 'sales' | 'inventory' | 'customers' | 'marketing' | 'operations'
  estimatedValue?: number
  timeframe?: string
  priority: number
  createdAt: string
}

export default function AIAlertWidget() {
  const [alerts, setAlerts] = useState<AIAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true)
      
      // Simulated API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock critical alerts
      setAlerts([
        {
          id: '1',
          type: 'warning',
          title: 'Stok Tükenme Riski',
          description: 'Mont kategorisinde 3 ürün 7 gün içinde tükenecek',
          impact: 'high',
          confidence: 92,
          category: 'inventory',
          timeframe: '7 gün',
          priority: 1,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          type: 'opportunity',
          title: 'Yüksek Potansiyelli Segment',
          description: '25-35 yaş outdoor müşterileri %40 daha fazla harcıyor',
          impact: 'high',
          confidence: 87,
          category: 'customers',
          estimatedValue: 45000,
          timeframe: '30 gün',
          priority: 2,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          type: 'recommendation',
          title: 'Fiyat Optimizasyonu',
          description: 'Kamp malzemelerinde %8-12 fiyat artışı mümkün',
          impact: 'high',
          confidence: 85,
          category: 'sales',
          estimatedValue: 28000,
          timeframe: '21 gün',
          priority: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: '4',
          type: 'trend',
          title: 'Hafta Sonu Artışı',
          description: 'Cumartesi-Pazar satışları %25 artıyor',
          impact: 'medium',
          confidence: 78,
          category: 'sales',
          estimatedValue: 12000,
          timeframe: '14 gün',
          priority: 4,
          createdAt: new Date().toISOString()
        }
      ])
      
      setLoading(false)
    }

    loadAlerts()
  }, [])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle
      case 'opportunity': return Lightbulb
      case 'trend': return TrendingUp
      case 'recommendation': return Target
      default: return Brain
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
      case 'opportunity': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
      case 'trend': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
      case 'recommendation': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    }
  }

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))
  const displayAlerts = showAll ? visibleAlerts : visibleAlerts.slice(0, 2)

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI İçgörüleri</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Analiz ediliyor...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI İçgörüleri</h3>
            <p className="text-sm text-green-600 dark:text-green-400">Tüm sistemler normal</p>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Şu anda kritik bir içgörü bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI İçgörüleri</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {visibleAlerts.length} kritik içgörü
              {visibleAlerts.filter(a => a.impact === 'high').length > 0 && 
                ` • ${visibleAlerts.filter(a => a.impact === 'high').length} yüksek öncelik`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {visibleAlerts.length > 2 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {showAll ? 'Daha Az' : 'Tümünü Gör'}
            </button>
          )}
          <button
            onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'ai-insights' } }))}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            <span>Detaylar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {displayAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type)
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm mb-1 text-slate-800 dark:text-slate-200">{alert.title}</h4>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 line-clamp-2">{alert.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${getImpactColor(alert.impact)}`}>
                        {alert.impact === 'high' ? 'Yüksek' : alert.impact === 'medium' ? 'Orta' : 'Düşük'}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{alert.confidence}% güven</span>
                      {alert.estimatedValue && (
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ₺{alert.estimatedValue.toLocaleString()}
                        </span>
                      )}
                      {alert.timeframe && (
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.timeframe}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {visibleAlerts.length > 2 && !showAll && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            +{visibleAlerts.length - 2} daha fazla içgörü mevcut
          </p>
        </div>
      )}
    </div>
  )
}
