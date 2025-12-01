'use client'

import { useState, useEffect } from 'react'
import { Map, Loader2, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface Address {
  id?: number
  addressType?: string
  firstName?: string
  lastName?: string
  company?: string
  address1?: string
  address2?: string
  district?: string
  city?: string
  country?: string
  postalCode?: string
  phoneNumber?: string
  [key: string]: any
}

export default function TrendyolAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trendyolIntegration, setTrendyolIntegration] = useState<any>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)

  useEffect(() => {
    loadTrendyolIntegration()
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

  const loadAddresses = async () => {
    if (!trendyolIntegration?.id) {
      setError('Trendyol entegrasyonu bulunamadı')
      return
    }

    // Rate limit uyarısı: 1 req/hour
    const now = new Date()
    if (lastFetchTime) {
      const timeDiff = now.getTime() - lastFetchTime.getTime()
      const hoursDiff = timeDiff / (1000 * 60 * 60)
      if (hoursDiff < 1) {
        const remainingMinutes = Math.ceil((1 - hoursDiff) * 60)
        setError(`Bu servis saatte bir kez çağrılabilir. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.get<ApiResponse<any>>('/admin/trendyol/addresses', {
        integrationId: trendyolIntegration.id.toString()
      })

      if (response.success && response.data) {
        const addressesList = Array.isArray(response.data) ? response.data : (response.data.addresses || response.data.content || [])
        setAddresses(addressesList)
        setLastFetchTime(new Date())
      } else {
        setError(response.message || 'Adres bilgileri alınamadı')
      }
    } catch (err: any) {
      setError('Adres bilgileri alınamadı: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  İade ve Sevkiyat Adresleri
                </h1>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Trendyol iade ve sevkiyat adres bilgileri
                </p>
              </div>
            </div>
            <button
              onClick={loadAddresses}
              disabled={loading || !trendyolIntegration}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yükle
            </button>
          </div>

          {/* Rate Limit Uyarısı */}
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Önemli: Rate Limit</div>
                <div className="text-sm">
                  Bu servis saatte sadece <strong>1 kez</strong> çağrılabilir. Lütfen dikkatli kullanın.
                </div>
              </div>
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

          {lastFetchTime && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
              Son yükleme: {lastFetchTime.toLocaleString('tr-TR')}
            </div>
          )}
        </div>

        {/* Addresses List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {addresses.length} adres bulundu
            </span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-12 text-center">
                <Map className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Adres bulunamadı. Yüklemek için yukarıdaki butona tıklayın.
                </p>
              </div>
            ) : (
              addresses.map((address, index) => (
                <div
                  key={address.id || index}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                        {address.addressType || 'Adres'} {address.id && `#${address.id}`}
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(address.firstName || address.lastName) && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Ad Soyad: </span>
                            <span className="text-slate-900 dark:text-white">
                              {address.firstName} {address.lastName}
                            </span>
                          </div>
                        )}
                        {address.company && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Şirket: </span>
                            <span className="text-slate-900 dark:text-white">{address.company}</span>
                          </div>
                        )}
                        {address.phoneNumber && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Telefon: </span>
                            <span className="text-slate-900 dark:text-white">{address.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="space-y-2 text-sm">
                        {address.address1 && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Adres 1: </span>
                            <span className="text-slate-900 dark:text-white">{address.address1}</span>
                          </div>
                        )}
                        {address.address2 && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Adres 2: </span>
                            <span className="text-slate-900 dark:text-white">{address.address2}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">İlçe/İl: </span>
                          <span className="text-slate-900 dark:text-white">
                            {address.district} {address.city && `/ ${address.city}`}
                          </span>
                        </div>
                        {address.postalCode && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Posta Kodu: </span>
                            <span className="text-slate-900 dark:text-white">{address.postalCode}</span>
                          </div>
                        )}
                        {address.country && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Ülke: </span>
                            <span className="text-slate-900 dark:text-white">{address.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

