'use client'

import { useState, useEffect } from 'react'
import { Activity, Loader2, RefreshCw, AlertCircle, Search, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface BatchRequest {
  batchRequestId: string
  status?: string
  totalCount?: number
  successCount?: number
  failureCount?: number
  [key: string]: any
}

export default function TrendyolBatch() {
  const [batchRequestId, setBatchRequestId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BatchRequest | null>(null)
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [history, setHistory] = useState<BatchRequest[]>([])

  useEffect(() => {
    loadTrendyolIntegration()
    loadHistory()
  }, [])

  const loadTrendyolIntegration = async () => {
    try {
      const response = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (response.success && response.data) {
        const trendyol = response.data.find((i: any) => i.provider === 'Trendyol' && i.type === 'marketplace')
        setTrendyolIntegration(trendyol)
      }
    } catch (err: any) {
      console.error('Trendyol entegrasyonu yüklenemedi:', err)
      setError('Trendyol entegrasyonu yüklenemedi')
    }
  }

  const loadHistory = () => {
    // LocalStorage'dan geçmiş batch request'leri yükle
    try {
      const saved = localStorage.getItem('trendyol_batch_history')
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Geçmiş yüklenemedi:', err)
    }
  }

  const saveToHistory = (batchRequest: BatchRequest) => {
    const newHistory = [batchRequest, ...history.filter(h => h.batchRequestId !== batchRequest.batchRequestId)].slice(0, 20)
    setHistory(newHistory)
    try {
      localStorage.setItem('trendyol_batch_history', JSON.stringify(newHistory))
    } catch (err) {
      console.error('Geçmiş kaydedilemedi:', err)
    }
  }

  const checkBatchRequest = async () => {
    if (!batchRequestId.trim()) {
      setError('Batch Request ID gereklidir')
      return
    }

    if (!trendyolIntegration?.id) {
      setError('Trendyol entegrasyonu bulunamadı')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await api.get<ApiResponse<any>>('/admin/trendyol/batch-request', {
        integrationId: trendyolIntegration.id.toString(),
        batchRequestId: batchRequestId.trim()
      })

      if (response.success && response.data) {
        const batchData = {
          batchRequestId: batchRequestId.trim(),
          ...response.data
        }
        setResult(batchData)
        saveToHistory(batchData)
      } else {
        setError(response.message || 'Batch request kontrolü başarısız')
      }
    } catch (err: any) {
      setError('Batch request kontrolü başarısız: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'failed':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'processing':
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-orange-600" />
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Toplu İşlem Kontrolü
              </h1>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Trendyol toplu işlem durumunu kontrol edin
              </p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {!trendyolIntegration && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Trendyol entegrasyonu bulunamadı. Lütfen önce <strong>Trendyol Auth</strong> sayfasından entegrasyonu yapılandırın.
            </div>
          )}
        </div>

        {/* Batch Request ID Input */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Batch Request ID
              </label>
              <input
                type="text"
                value={batchRequestId}
                onChange={(e) => setBatchRequestId(e.target.value)}
                placeholder="Batch request ID girin..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    checkBatchRequest()
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={checkBatchRequest}
                disabled={loading || !batchRequestId.trim() || !trendyolIntegration}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Kontrol Et
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Batch Request Sonucu
              </h3>
              {getStatusIcon(result.status || 'unknown')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Durum</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {result.status || 'Bilinmiyor'}
                </div>
              </div>
              {result.totalCount !== undefined && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-sm text-slate-600 dark:text-slate-400">Toplam</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                    {result.totalCount}
                  </div>
                </div>
              )}
              {result.successCount !== undefined && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-green-600 dark:text-green-400">Başarılı</div>
                  <div className="text-lg font-semibold text-green-700 dark:text-green-300 mt-1">
                    {result.successCount}
                  </div>
                </div>
              )}
              {result.failureCount !== undefined && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-sm text-red-600 dark:text-red-400">Başarısız</div>
                  <div className="text-lg font-semibold text-red-700 dark:text-red-300 mt-1">
                    {result.failureCount}
                  </div>
                </div>
              )}
            </div>

            {result.errors && Array.isArray(result.errors) && result.errors.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Hatalar:</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((err: any, index: number) => (
                    <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                      {err.message || err.error || JSON.stringify(err)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded">
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Batch Request ID: {result.batchRequestId}
              </div>
            </div>
          </motion.div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Geçmiş Batch Request'ler
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                  onClick={() => {
                    setBatchRequestId(item.batchRequestId)
                    checkBatchRequest()
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status || 'unknown')}
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                        {item.batchRequestId}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.status || 'Bilinmiyor'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

