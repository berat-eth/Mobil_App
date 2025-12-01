'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/ThemeContext'
import { 
  Brain, TrendingUp, Users, ShoppingCart, AlertTriangle, Target,
  RefreshCw, Download, Filter, BarChart3, Zap, Activity, Eye, FileText, AlertCircle, X
} from 'lucide-react'
import { 
  Line, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts'
import { motion } from 'framer-motion'

export default function MLInsights() {
  const { theme } = useTheme()
  const [timeRange, setTimeRange] = useState('7d')
  const [activeSection, setActiveSection] = useState('overview')
  const [loading, setLoading] = useState(true)

  // Data states
  const [statistics, setStatistics] = useState<any>(null)
  const [predictions, setPredictions] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any>(null)
  const [segments, setSegments] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [logs, setLogs] = useState<any>(null)
  const [logType, setLogType] = useState('training')
  const [error, setError] = useState<string | null>(null)

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Retry helper with exponential backoff for 429 errors
  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // 429 hatası kontrolü
        const is429Error = 
          error?.status === 429 || 
          error?.response?.status === 429 ||
          (error?.message && error.message.includes('429')) ||
          (error?.message && error.message.includes('Too many requests'));
        
        if (is429Error && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          console.log(`⏳ Rate limit (429) - ${delay}ms bekleniyor (deneme ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 429 değilse veya son denemeyse throw et
        throw error;
      }
    }
    
    throw lastError;
  }, []);

  // Debounced load data
  useEffect(() => {
    // Önceki timer'ı temizle
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Yeni timer başlat
    debounceTimerRef.current = setTimeout(() => {
      loadData();
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [timeRange, activeSection])

  useEffect(() => {
    if (activeSection === 'logs') {
      // Logs için de debounce ekle
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        loadLogs();
      }, 300);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [logType, activeSection])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const tenantId = 1

      switch (activeSection) {
        case 'overview':
          const statsRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/statistics?timeRange=${timeRange}&tenantId=${tenantId}`) as Promise<any>
          )
          console.log('📊 Statistics response:', statsRes)
          if (statsRes && statsRes.success !== false) {
            setStatistics(statsRes.data || statsRes)
          } else {
            setError(statsRes?.message || 'İstatistikler yüklenemedi')
            setStatistics(null)
          }
          break

        case 'predictions':
          // Get all predictions (userId optional)
          const predRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/predictions?limit=50&tenantId=${tenantId}`) as Promise<any>
          )
          console.log('🔮 Predictions response:', predRes)
          if (predRes && predRes.success !== false) {
            setPredictions(predRes.data || predRes || [])
          } else {
            setError(predRes?.message || 'Tahminler yüklenemedi')
            setPredictions([])
          }
          break

        case 'recommendations':
          // Get all recommendations (userId optional)
          const recRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/recommendations?limit=50&tenantId=${tenantId}`) as Promise<any>
          )
          console.log('🛍️ Recommendations response:', recRes)
          if (recRes && recRes.success !== false) {
            const recData = recRes.data || recRes
            setRecommendations(Array.isArray(recData) ? recData : (recData ? [recData] : []))
          } else {
            setError(recRes?.message || 'Öneriler yüklenemedi')
            setRecommendations([])
          }
          break

        case 'anomalies':
          const anomRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/anomalies?limit=100&tenantId=${tenantId}`) as Promise<any>
          )
          console.log('⚠️ Anomalies response:', anomRes)
          if (anomRes && anomRes.success !== false) {
            setAnomalies(anomRes.data || anomRes)
          } else {
            setError(anomRes?.message || 'Anomaliler yüklenemedi')
            setAnomalies(null)
          }
          break

        case 'segments':
          const segRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/segments?tenantId=${tenantId}`) as Promise<any>
          )
          console.log('👥 Segments response:', segRes)
          if (segRes && segRes.success !== false) {
            setSegments(segRes.data || segRes || [])
          } else {
            setError(segRes?.message || 'Segmentler yüklenemedi')
            setSegments([])
          }
          break

        case 'models':
          const modelsRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/models`) as Promise<any>
          )
          console.log('🤖 Models response:', modelsRes)
          if (modelsRes && modelsRes.success !== false) {
            setModels(modelsRes.data || modelsRes || [])
          } else {
            setError(modelsRes?.message || 'Modeller yüklenemedi')
            setModels([])
          }
          break

        case 'logs':
          await loadLogs()
          break
      }
    } catch (error: any) {
      console.error('❌ Error loading ML data:', error)
      const errorMsg = error.message || error.response?.data?.message || 'Veri yüklenirken bir hata oluştu'
      
      // 429 hatası için özel mesaj
      if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('Too many requests')) {
        setError('Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.')
      } else {
        setError(errorMsg)
      }
      
      // Reset all data states on error
      setStatistics(null)
      setPredictions([])
      setRecommendations([])
      setAnomalies(null)
      setSegments([])
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      setError(null)
      let logsRes
      switch (logType) {
        case 'training':
          logsRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/logs/training?limit=100`) as Promise<any>
          )
          break
        case 'inference':
          logsRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/logs/inference?limit=100`) as Promise<any>
          )
          break
        case 'errors':
          logsRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/logs/errors?limit=100`) as Promise<any>
          )
          break
        default:
          logsRes = await retryWithBackoff(() => 
            api.get(`/admin/ml/logs/training?limit=100`) as Promise<any>
          )
      }
      console.log('📋 Logs response:', logsRes)
      if (logsRes && logsRes.success !== false) {
        setLogs(logsRes.data || logsRes)
      } else {
        setError(logsRes?.message || 'Loglar yüklenemedi')
        setLogs(null)
      }
    } catch (error: any) {
      console.error('❌ Error loading logs:', error)
      const errorMsg = error.message || error.response?.data?.message || 'Loglar yüklenirken bir hata oluştu'
      
      // 429 hatası için özel mesaj
      if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('Too many requests')) {
        setError('Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.')
      } else {
        setError(errorMsg)
      }
      
      setLogs(null)
    }
  }

  const triggerTraining = async (modelType: string) => {
    try {
      console.log(`🚀 Eğitim başlatılıyor: ${modelType}`)
      const response = await retryWithBackoff(() => 
        api.post('/admin/ml/train', { modelType, days: 30 }) as Promise<any>
      )
      
      if (response.success) {
        alert(`✅ ${modelType} model eğitimi başlatıldı!\n\nKonsol loglarını kontrol edin.`)
        console.log('✅ Eğitim başlatıldı:', response)
        // Veriyi yenile
        if (activeSection === 'models') {
          loadData()
        }
      } else {
        throw new Error(response.message || 'Eğitim başlatılamadı')
      }
    } catch (error: any) {
      console.error('❌ Training error:', error)
      const errorMsg = error.message || error.response?.data?.message || 'Eğitim başlatılamadı'
      
      // 429 hatası için özel mesaj
      if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('Too many requests')) {
        alert(`❌ Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.`)
      } else {
        alert(`❌ Hata: ${errorMsg}\n\nML servisinin çalıştığından emin olun (http://localhost:8001)`)
      }
    }
  }

  const sections = [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
    { id: 'predictions', label: 'Tahminler', icon: TrendingUp },
    { id: 'recommendations', label: 'Öneriler', icon: ShoppingCart },
    { id: 'anomalies', label: 'Anomaliler', icon: AlertTriangle },
    { id: 'segments', label: 'Segmentler', icon: Users },
    { id: 'models', label: 'Modeller', icon: Brain },
    { id: 'logs', label: 'Loglar', icon: FileText }
  ]

  const timeRanges = [
    { value: '1h', label: 'Son 1 Saat' },
    { value: '24h', label: 'Son 24 Saat' },
    { value: '7d', label: 'Son 7 Gün' },
    { value: '30d', label: 'Son 30 Gün' }
  ]

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            ML Insights
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Makine öğrenmesi tahminleri, önerileri ve analizleri
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">Hata</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {activeSection === 'overview' && statistics && (
          <OverviewSection data={statistics} theme={theme} />
        )}
        {activeSection === 'overview' && !statistics && !loading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md text-center">
            <p className="text-slate-600 dark:text-slate-400">Henüz istatistik verisi yok</p>
          </div>
        )}
        {activeSection === 'predictions' && (
          <PredictionsSection data={predictions} theme={theme} />
        )}
        {activeSection === 'recommendations' && (
          <RecommendationsSection data={recommendations} theme={theme} />
        )}
        {activeSection === 'anomalies' && anomalies && (
          <AnomaliesSection data={anomalies} theme={theme} />
        )}
        {activeSection === 'anomalies' && !anomalies && !loading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md text-center">
            <p className="text-slate-600 dark:text-slate-400">Henüz anomali verisi yok</p>
          </div>
        )}
        {activeSection === 'segments' && (
          <SegmentsSection data={segments} theme={theme} />
        )}
        {activeSection === 'models' && (
          <ModelsSection data={models} onTrain={triggerTraining} theme={theme} />
        )}
        {activeSection === 'logs' && (
          <LogsSection 
            data={logs} 
            logType={logType} 
            onLogTypeChange={setLogType}
            onRefresh={loadLogs}
            theme={theme} 
          />
        )}
      </div>
    </div>
  )
}

// Overview Section
function OverviewSection({ data, theme }: any) {
  const kpiCards = [
    { label: 'Toplam Tahmin', value: data.totalPredictions, icon: TrendingUp, color: 'blue' },
    { label: 'Toplam Öneri', value: data.totalRecommendations, icon: ShoppingCart, color: 'green' },
    { label: 'Tespit Edilen Anomali', value: data.totalAnomalies, icon: AlertTriangle, color: 'red' },
    { label: 'Ort. Tahmin Olasılığı', value: `${(data.avgPredictionProbability * 100).toFixed(1)}%`, icon: Target, color: 'purple' }
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
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {kpi.value}
                  </p>
                </div>
                <Icon className={`w-8 h-8 text-${kpi.color}-600`} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {data.topAnomalyTypes && data.topAnomalyTypes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Anomali Türleri</h3>
          <div className="space-y-2">
            {data.topAnomalyTypes.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="capitalize">{item.anomalyType}</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Predictions Section
function PredictionsSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Kullanıcı Tahminleri</h3>
        {data.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Henüz tahmin verisi yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-2">Kullanıcı ID</th>
                  <th className="text-left p-2">Tahmin Türü</th>
                  <th className="text-right p-2">Olasılık</th>
                  <th className="text-left p-2">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((pred: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="p-2">{pred.userId}</td>
                    <td className="p-2 capitalize">{pred.predictionType}</td>
                    <td className="text-right p-2">
                      <span className={`font-bold ${pred.probability > 0.7 ? 'text-green-600' : pred.probability > 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {(pred.probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(pred.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Recommendations Section
function RecommendationsSection({ data, theme }: any) {
  const recommendations = Array.isArray(data) ? data : (data ? [data] : []);
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Ürün Önerileri</h3>
        {recommendations.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Henüz öneri verisi yok</p>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec: any, index: number) => (
              <div key={index} className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Kullanıcı ID: {rec.userId}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('tr-TR') : 
                     rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('tr-TR') : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {rec.productIds && rec.productIds.length > 0 ? (
                    rec.productIds.slice(0, 10).map((productId: number, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700 rounded">
                        <span>Ürün #{productId}</span>
                        <span className="text-sm font-bold text-blue-600">
                          {rec.scores && rec.scores[idx] !== undefined 
                            ? `${(rec.scores[idx] * 100).toFixed(1)}%` 
                            : '-'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">Bu öneri için ürün bilgisi yok</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Anomalies Section
function AnomaliesSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Tespit Edilen Anomaliler</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Toplam: {data.total} anomali
        </p>
        {data.anomalies && data.anomalies.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Henüz anomali tespit edilmedi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-2">Kullanıcı</th>
                  <th className="text-left p-2">Anomali Türü</th>
                  <th className="text-right p-2">Skor</th>
                  <th className="text-left p-2">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies?.slice(0, 100).map((anom: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="p-2">{anom.userName || `User #${anom.userId}`}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        anom.anomalyType === 'bot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        anom.anomalyType === 'fraud' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {anom.anomalyType}
                      </span>
                    </td>
                    <td className="text-right p-2">
                      <span className={`font-bold ${anom.anomalyScore > 0.8 ? 'text-red-600' : anom.anomalyScore > 0.5 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {(anom.anomalyScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(anom.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Segments Section
function SegmentsSection({ data, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Kullanıcı Segmentleri</h3>
        {data.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Henüz segment verisi yok</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((segment: any, index: number) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">{segment.segmentName}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Kullanıcı Sayısı</span>
                    <span className="font-bold">{segment.userCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Ort. Güven</span>
                    <span className="font-bold">{(segment.avgConfidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Logs Section
function LogsSection({ data, logType, onLogTypeChange, onRefresh, theme }: any) {
  const logTypes = [
    { value: 'training', label: 'Eğitim Logları', icon: Brain },
    { value: 'inference', label: 'Inference Logları', icon: Zap },
    { value: 'errors', label: 'Hata Logları', icon: AlertCircle }
  ]

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Log Type Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md">
        <div className="flex flex-wrap gap-2 mb-4">
          {logTypes.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                onClick={() => onLogTypeChange(type.value)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  logType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            )
          })}
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>

        {data.total !== undefined && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Toplam: {data.total} kayıt
          </p>
        )}
      </div>

      {/* Training Logs */}
      {logType === 'training' && data.logs && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Eğitim Logları</h3>
          {data.logs.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">Henüz eğitim logu yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Epoch</th>
                    <th className="text-right p-2">Loss</th>
                    <th className="text-right p-2">Accuracy</th>
                    <th className="text-right p-2">Val Loss</th>
                    <th className="text-right p-2">Val Accuracy</th>
                    <th className="text-right p-2">Learning Rate</th>
                    <th className="text-left p-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{log.modelName}</div>
                          <div className="text-xs text-slate-500">{log.modelType}</div>
                        </div>
                      </td>
                      <td className="p-2">{log.epoch}</td>
                      <td className="text-right p-2">{log.loss ? log.loss.toFixed(6) : '-'}</td>
                      <td className="text-right p-2">
                        {log.accuracy ? `${(log.accuracy * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td className="text-right p-2">
                        {log.validationLoss ? log.validationLoss.toFixed(6) : '-'}
                      </td>
                      <td className="text-right p-2">
                        {log.validationAccuracy ? `${(log.validationAccuracy * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td className="text-right p-2">
                        {log.learningRate ? log.learningRate.toFixed(8) : '-'}
                      </td>
                      <td className="p-2 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Inference Logs */}
      {logType === 'inference' && data.inferences && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Inference Logları</h3>
          {data.inferences.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">Henüz inference logu yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-2">Kullanıcı ID</th>
                    <th className="text-left p-2">Tahmin Türü</th>
                    <th className="text-right p-2">Olasılık</th>
                    <th className="text-left p-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inferences.map((log: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="p-2">{log.userId || '-'}</td>
                      <td className="p-2 capitalize">{log.predictionType}</td>
                      <td className="text-right p-2">
                        <span className={`font-bold ${
                          log.probability > 0.7 ? 'text-green-600' : 
                          log.probability > 0.4 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {(log.probability * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-2 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Error Logs */}
      {logType === 'errors' && data.errors && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Hata Logları</h3>
          {data.errors.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">Henüz hata logu yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-2">Kullanıcı</th>
                    <th className="text-left p-2">Anomali Türü</th>
                    <th className="text-right p-2">Skor</th>
                    <th className="text-left p-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {data.errors.map((log: any, index: number) => (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="p-2">{log.userName || `User #${log.userId}`}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.anomalyType === 'bot' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          log.anomalyType === 'fraud' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {log.anomalyType}
                        </span>
                      </td>
                      <td className="text-right p-2">
                        <span className={`font-bold ${
                          log.anomalyScore > 0.8 ? 'text-red-600' : 
                          log.anomalyScore > 0.5 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {(log.anomalyScore * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-2 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Models Section
function ModelsSection({ data, onTrain, theme }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Model Durumu</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTrain('purchase_prediction')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Purchase Model Eğit
            </button>
            <button
              onClick={() => onTrain('recommendation')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Recommendation Model Eğit
            </button>
            <button
              onClick={() => onTrain('anomaly_detection')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
            >
              Anomaly Model Eğit
            </button>
            <button
              onClick={() => onTrain('segmentation')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Segmentation Model Eğit
            </button>
            <button
              onClick={() => onTrain('all')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Tüm Modelleri Eğit
            </button>
          </div>
        </div>
        {data.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Henüz model yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-2">Model Adı</th>
                  <th className="text-left p-2">Tür</th>
                  <th className="text-left p-2">Versiyon</th>
                  <th className="text-left p-2">Durum</th>
                  <th className="text-right p-2">Accuracy</th>
                  <th className="text-right p-2">Precision</th>
                  <th className="text-right p-2">Recall</th>
                  <th className="text-right p-2">F1 Score</th>
                </tr>
              </thead>
              <tbody>
                {data.map((model: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="p-2">{model.modelName}</td>
                    <td className="p-2">{model.modelType}</td>
                    <td className="p-2">{model.version}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        model.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        model.status === 'training' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {model.status}
                      </span>
                    </td>
                    <td className="text-right p-2">{model.accuracy ? (model.accuracy * 100).toFixed(1) + '%' : '-'}</td>
                    <td className="text-right p-2">{model.precision ? (model.precision * 100).toFixed(1) + '%' : '-'}</td>
                    <td className="text-right p-2">{model.recall ? (model.recall * 100).toFixed(1) + '%' : '-'}</td>
                    <td className="text-right p-2">{model.f1Score ? (model.f1Score * 100).toFixed(1) + '%' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

