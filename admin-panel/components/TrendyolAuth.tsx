'use client'

import { useState, useEffect } from 'react'
import { 
  Key, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Save, Eye, EyeOff, Loader2,
  Package, ShoppingCart as ShoppingCartIcon
} from 'lucide-react'
import { motion } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface MarketplaceIntegration {
  id?: number
  provider: 'Trendyol'
  apiKey: string
  apiSecret: string
  supplierId?: string
  status: 'active' | 'inactive' | 'error'
  lastTest?: string
  testResult?: 'success' | 'error' | null
}

export default function TrendyolAuth() {
  const [trendyolIntegration, setTrendyolIntegration] = useState<MarketplaceIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ message: string; success: boolean } | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [trendyolForm, setTrendyolForm] = useState({
    apiKey: '',
    apiSecret: '',
    supplierId: ''
  })

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const response = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (response.success && response.data) {
        const trendyol = response.data.find((i: any) => i.provider === 'Trendyol' && i.type === 'marketplace')
        
        if (trendyol) {
          setTrendyolIntegration(trendyol)
          const config = typeof trendyol.config === 'string' ? JSON.parse(trendyol.config) : (trendyol.config || {})
          setTrendyolForm({
            apiKey: trendyol.apiKey || '',
            apiSecret: trendyol.apiSecret || '',
            supplierId: config.supplierId || ''
          })
        }
      }
    } catch (err: any) {
      setError('Entegrasyonlar yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTrendyol = async () => {
    try {
      setError(null)
      setSuccess(null)

      if (!trendyolForm.apiKey || !trendyolForm.apiSecret || !trendyolForm.supplierId) {
        setError('API Key, API Secret ve Supplier ID gereklidir')
        return
      }

      const payload = {
        name: 'Trendyol Sipariş Entegrasyonu',
        type: 'marketplace',
        provider: 'Trendyol',
        apiKey: trendyolForm.apiKey,
        apiSecret: trendyolForm.apiSecret,
        status: 'active',
        config: {
          supplierId: trendyolForm.supplierId
        }
      }

      let response: ApiResponse<any>
      if (trendyolIntegration?.id) {
        response = await api.put<ApiResponse<any>>(
          `/admin/integrations/${trendyolIntegration.id}`,
          payload
        )
      } else {
        response = await api.post<ApiResponse<any>>(
          '/admin/integrations',
          payload
        )
      }

      if (response.success) {
        setSuccess('Trendyol entegrasyonu kaydedildi')
        loadIntegrations()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'İşlem başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu')
    }
  }

  const handleTest = async () => {
    if (!trendyolIntegration?.id) {
      setError('Önce entegrasyonu kaydedin')
      return
    }

    setTesting(true)
    try {
      const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
        `/admin/integrations/${trendyolIntegration.id}/test`
      )
      if (response.success && response.data) {
        setSuccess(`Test sonucu: ${response.data.message}`)
        loadIntegrations()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Test başarısız: ' + (response.message || 'Bilinmeyen hata'))
      }
    } catch (err: any) {
      setError('Test sırasında hata: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setTesting(false)
    }
  }

  const handleSyncOrders = async () => {
    if (!trendyolIntegration?.id) {
      setError('Önce entegrasyonu kaydedin')
      return
    }

    setSyncing(true)
    setSyncStatus(null)
    try {
      const response = await api.post<ApiResponse<{ synced: number; skipped: number; total: number; errors?: any[] }>>(
        `/admin/integrations/${trendyolIntegration.id}/sync-orders`,
        {}
      )
      if (response.success && response.data) {
        const { synced, skipped, total } = response.data
        setSyncStatus({
          message: `${synced} sipariş senkronize edildi, ${skipped} sipariş atlandı (Toplam: ${total})`,
          success: true
        })
        setSuccess(response.message || 'Siparişler başarıyla çekildi')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setSyncStatus({
          message: response.message || 'Sipariş çekme başarısız',
          success: false
        })
        setError(response.message || 'Sipariş çekme başarısız')
      }
    } catch (err: any) {
      setSyncStatus({
        message: err.message || 'Sipariş çekme sırasında hata oluştu',
        success: false
      })
      setError('Sipariş çekme sırasında hata: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setSyncing(false)
    }
  }

  const toggleApiKey = (field: string) => {
    setShowApiKey({ ...showApiKey, [field]: !showApiKey[field] })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4" />
      case 'error':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Trendyol Auth
              </h1>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Trendyol API kimlik bilgilerinizi yönetin
              </p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}
        </div>

        {/* Trendyol Integration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                  Trendyol API Ayarları
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sipariş entegrasyonu için gerekli bilgiler
                </p>
              </div>
            </div>
            {trendyolIntegration && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(trendyolIntegration.status)}`}>
                {getStatusIcon(trendyolIntegration.status)}
                {trendyolIntegration.status === 'active' ? 'Aktif' : trendyolIntegration.status === 'error' ? 'Hata' : 'Pasif'}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                API Key <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showApiKey['apiKey'] ? 'text' : 'password'}
                  value={trendyolForm.apiKey}
                  onChange={(e) => setTrendyolForm({ ...trendyolForm, apiKey: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Trendyol API Key"
                />
                <button
                  onClick={() => toggleApiKey('apiKey')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  {showApiKey['apiKey'] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                API Secret <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showApiKey['apiSecret'] ? 'text' : 'password'}
                  value={trendyolForm.apiSecret}
                  onChange={(e) => setTrendyolForm({ ...trendyolForm, apiSecret: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Trendyol API Secret"
                />
                <button
                  onClick={() => toggleApiKey('apiSecret')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  {showApiKey['apiSecret'] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Supplier ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={trendyolForm.supplierId}
                onChange={(e) => setTrendyolForm({ ...trendyolForm, supplierId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Trendyol Supplier ID"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Trendyol Partner Panel'den alabileceğiniz Supplier ID
              </p>
            </div>

            {syncStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                syncStatus.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {syncStatus.message}
              </div>
            )}

            {trendyolIntegration?.lastTest && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span>Son Test: </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(trendyolIntegration.lastTest).toLocaleString('tr-TR')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSyncOrders}
                disabled={syncing || !trendyolIntegration?.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCartIcon className="w-4 h-4" />
                )}
                <span>{syncing ? 'Çekiliyor...' : 'Siparişleri Çek'}</span>
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !trendyolIntegration?.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Test Et</span>
              </button>
              <button
                onClick={handleSaveTrendyol}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

