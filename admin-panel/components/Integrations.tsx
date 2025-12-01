'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart as ShoppingCartIcon, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Save, X, Loader2, Eye, EyeOff, ExternalLink, Copy,
  Settings, Package
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface MarketplaceIntegration {
  id?: number
  provider: 'Trendyol' | 'HepsiBurada'
  apiKey: string
  apiSecret: string
  supplierId?: string
  merchantId?: string
  status: 'active' | 'inactive' | 'error'
  lastTest?: string
  testResult?: 'success' | 'error' | null
}

export default function Integrations() {
  const [trendyolIntegration, setTrendyolIntegration] = useState<MarketplaceIntegration | null>(null)
  const [hepsiburadaIntegration, setHepsiBuradaIntegration] = useState<MarketplaceIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [syncStatus, setSyncStatus] = useState<Record<string, { message: string; success: boolean }>>({})
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [trendyolForm, setTrendyolForm] = useState({
    apiKey: '',
    apiSecret: '',
    supplierId: ''
  })

  const [hepsiburadaForm, setHepsiBuradaForm] = useState({
    apiKey: '',
    apiSecret: '',
    merchantId: ''
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
        const hepsiburada = response.data.find((i: any) => i.provider === 'HepsiBurada' && i.type === 'marketplace')
        
        if (trendyol) {
          setTrendyolIntegration(trendyol)
          const config = typeof trendyol.config === 'string' ? JSON.parse(trendyol.config) : (trendyol.config || {})
          setTrendyolForm({
            apiKey: trendyol.apiKey || '',
            apiSecret: trendyol.apiSecret || '',
            supplierId: config.supplierId || ''
          })
        }
        
        if (hepsiburada) {
          setHepsiBuradaIntegration(hepsiburada)
          const config = typeof hepsiburada.config === 'string' ? JSON.parse(hepsiburada.config) : (hepsiburada.config || {})
          setHepsiBuradaForm({
            apiKey: hepsiburada.apiKey || '',
            apiSecret: hepsiburada.apiSecret || '',
            merchantId: config.merchantId || ''
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

  const handleSaveHepsiBurada = async () => {
    try {
      setError(null)
      setSuccess(null)

      if (!hepsiburadaForm.apiKey || !hepsiburadaForm.apiSecret || !hepsiburadaForm.merchantId) {
        setError('API Key, API Secret ve Merchant ID gereklidir')
        return
      }

      const payload = {
        name: 'HepsiBurada Sipariş Entegrasyonu',
        type: 'marketplace',
        provider: 'HepsiBurada',
        apiKey: hepsiburadaForm.apiKey,
        apiSecret: hepsiburadaForm.apiSecret,
        status: 'active',
        config: {
          merchantId: hepsiburadaForm.merchantId
        }
      }

      let response: ApiResponse<any>
      if (hepsiburadaIntegration?.id) {
        response = await api.put<ApiResponse<any>>(
          `/admin/integrations/${hepsiburadaIntegration.id}`,
          payload
        )
      } else {
        response = await api.post<ApiResponse<any>>(
          '/admin/integrations',
          payload
        )
      }

      if (response.success) {
        setSuccess('HepsiBurada entegrasyonu kaydedildi')
        loadIntegrations()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'İşlem başarısız')
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu')
    }
  }

  const handleTest = async (provider: 'Trendyol' | 'HepsiBurada') => {
    const integration = provider === 'Trendyol' ? trendyolIntegration : hepsiburadaIntegration
    if (!integration?.id) {
      setError('Önce entegrasyonu kaydedin')
      return
    }

    setTesting({ ...testing, [provider]: true })
    try {
      const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
        `/admin/integrations/${integration.id}/test`
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
      setTesting({ ...testing, [provider]: false })
    }
  }

  const handleSyncOrders = async (provider: 'Trendyol' | 'HepsiBurada') => {
    const integration = provider === 'Trendyol' ? trendyolIntegration : hepsiburadaIntegration
    if (!integration?.id) {
      setError('Önce entegrasyonu kaydedin')
      return
    }

    setSyncing({ ...syncing, [provider]: true })
    setSyncStatus({ ...syncStatus, [provider]: { message: '', success: false } })
    try {
      const response = await api.post<ApiResponse<{ synced: number; skipped: number; total: number; errors?: any[] }>>(
        `/admin/integrations/${integration.id}/sync-orders`,
        {}
      )
      if (response.success && response.data) {
        const { synced, skipped, total } = response.data
        setSyncStatus({
          ...syncStatus,
          [provider]: {
            message: `${synced} sipariş senkronize edildi, ${skipped} sipariş atlandı (Toplam: ${total})`,
            success: true
          }
        })
        setSuccess(response.message || 'Siparişler başarıyla çekildi')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setSyncStatus({
          ...syncStatus,
          [provider]: {
            message: response.message || 'Sipariş çekme başarısız',
            success: false
          }
        })
        setError(response.message || 'Sipariş çekme başarısız')
      }
    } catch (err: any) {
      setSyncStatus({
        ...syncStatus,
        [provider]: {
          message: err.message || 'Sipariş çekme sırasında hata oluştu',
          success: false
        }
      })
      setError('Sipariş çekme sırasında hata: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setSyncing({ ...syncing, [provider]: false })
    }
  }

  const toggleApiKey = (provider: string) => {
    setShowApiKey({ ...showApiKey, [provider]: !showApiKey[provider] })
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
              <ShoppingCartIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Marketplace Entegrasyonları
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                Trendyol ve HepsiBurada sipariş entegrasyonlarını yönetin
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

        {/* Marketplace Integrations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trendyol Integration */}
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
                    Trendyol
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sipariş entegrasyonu
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
                    type={showApiKey['trendyol-apiKey'] ? 'text' : 'password'}
                    value={trendyolForm.apiKey}
                    onChange={(e) => setTrendyolForm({ ...trendyolForm, apiKey: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="Trendyol API Key"
                  />
                  <button
                    onClick={() => toggleApiKey('trendyol-apiKey')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    {showApiKey['trendyol-apiKey'] ? (
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
                    type={showApiKey['trendyol-apiSecret'] ? 'text' : 'password'}
                    value={trendyolForm.apiSecret}
                    onChange={(e) => setTrendyolForm({ ...trendyolForm, apiSecret: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="Trendyol API Secret"
                        />
                        <button
                    onClick={() => toggleApiKey('trendyol-apiSecret')}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                    {showApiKey['trendyol-apiSecret'] ? (
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

              {syncStatus['Trendyol'] && (
                <div className={`p-2 rounded text-xs ${
                  syncStatus['Trendyol'].success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  {syncStatus['Trendyol'].message}
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
                  onClick={() => handleSyncOrders('Trendyol')}
                  disabled={syncing['Trendyol'] || !trendyolIntegration?.id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors disabled:opacity-50"
                >
                  {syncing['Trendyol'] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCartIcon className="w-4 h-4" />
                  )}
                  <span>{syncing['Trendyol'] ? 'Çekiliyor...' : 'Siparişleri Çek'}</span>
                </button>
                    <button
                  onClick={() => handleTest('Trendyol')}
                  disabled={testing['Trendyol'] || !trendyolIntegration?.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                    >
                  {testing['Trendyol'] ? (
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

          {/* HepsiBurada Integration */}
              <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                  </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                    HepsiBurada
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sipariş entegrasyonu
                  </p>
                </div>
                  </div>
              {hepsiburadaIntegration && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(hepsiburadaIntegration.status)}`}>
                  {getStatusIcon(hepsiburadaIntegration.status)}
                  {hepsiburadaIntegration.status === 'active' ? 'Aktif' : hepsiburadaIntegration.status === 'error' ? 'Hata' : 'Pasif'}
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
                    type={showApiKey['hepsiburada-apiKey'] ? 'text' : 'password'}
                    value={hepsiburadaForm.apiKey}
                    onChange={(e) => setHepsiBuradaForm({ ...hepsiburadaForm, apiKey: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="HepsiBurada API Key"
                  />
                  <button
                    onClick={() => toggleApiKey('hepsiburada-apiKey')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    {showApiKey['hepsiburada-apiKey'] ? (
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
                    type={showApiKey['hepsiburada-apiSecret'] ? 'text' : 'password'}
                    value={hepsiburadaForm.apiSecret}
                    onChange={(e) => setHepsiBuradaForm({ ...hepsiburadaForm, apiSecret: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="HepsiBurada API Secret"
                  />
                  <button
                    onClick={() => toggleApiKey('hepsiburada-apiSecret')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    {showApiKey['hepsiburada-apiSecret'] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Merchant ID <span className="text-red-500">*</span>
                    </label>
                    <input
                  type="text"
                  value={hepsiburadaForm.merchantId}
                  onChange={(e) => setHepsiBuradaForm({ ...hepsiburadaForm, merchantId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="HepsiBurada Merchant ID"
                    />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  HepsiBurada Mağaza Panel'den alabileceğiniz Merchant ID
                </p>
                  </div>

              {syncStatus['HepsiBurada'] && (
                <div className={`p-2 rounded text-xs ${
                  syncStatus['HepsiBurada'].success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  {syncStatus['HepsiBurada'].message}
                    </div>
                  )}

              {hepsiburadaIntegration?.lastTest && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>Son Test: </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {new Date(hepsiburadaIntegration.lastTest).toLocaleString('tr-TR')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => handleSyncOrders('HepsiBurada')}
                  disabled={syncing['HepsiBurada'] || !hepsiburadaIntegration?.id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                >
                  {syncing['HepsiBurada'] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCartIcon className="w-4 h-4" />
                  )}
                  <span>{syncing['HepsiBurada'] ? 'Çekiliyor...' : 'Siparişleri Çek'}</span>
                </button>
                  <button
                  onClick={() => handleTest('HepsiBurada')}
                  disabled={testing['HepsiBurada'] || !hepsiburadaIntegration?.id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                >
                  {testing['HepsiBurada'] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Test Et</span>
                  </button>
                  <button
                  onClick={handleSaveHepsiBurada}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Kaydet</span>
                  </button>
                </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
