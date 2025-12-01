'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface MaintenanceModeData {
  enabled: boolean
  message: string
  estimatedEndTime: string | null
}

export default function MaintenanceMode() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceModeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
        const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
        
        const response = await fetch(`${API_BASE_URL}/maintenance/status?platform=web`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          if (data?.success && data?.data?.enabled) {
            setMaintenanceData({
              enabled: true,
              message: data.data.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
              estimatedEndTime: data.data.estimatedEndTime || null
            })
          } else {
            setMaintenanceData(null)
          }
        } else {
          setMaintenanceData(null)
        }
      } catch (error) {
        console.error('Bakım modu kontrolü başarısız:', error)
        setMaintenanceData(null)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    checkMaintenance()
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkMaintenance, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      
      const response = await fetch(`${API_BASE_URL}/maintenance/status?platform=web`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        cache: 'no-store'
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.success && !data?.data?.enabled) {
          // Bakım modu kapatılmış, sayfayı yenile
          window.location.reload()
        } else if (data?.success && data?.data?.enabled) {
          setMaintenanceData({
            enabled: true,
            message: data.data.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
            estimatedEndTime: data.data.estimatedEndTime || null
          })
        }
      }
    } catch (error) {
      console.error('Bakım modu kontrolü başarısız:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (loading) {
    return null
  }

  if (!maintenanceData?.enabled) {
    return null
  }

  const formatEstimatedTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff < 0) return null
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours} saat ${minutes} dakika`
    }
    return `${minutes} dakika`
  }

  const estimatedTimeRemaining = maintenanceData.estimatedEndTime 
    ? formatEstimatedTime(maintenanceData.estimatedEndTime)
    : null

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center">
          
          {/* Large Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl shadow-xl">
                <Image
                  src="/assets/logo.png"
                  alt="Huğlu Tekstil Logo"
                  width={200}
                  height={200}
                  className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Company Name */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Huğlu Tekstil
          </h1>
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-400/30 mb-12">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-amber-800 dark:text-amber-100 text-sm font-medium">Sistem Bakımda</span>
          </div>

          {/* Content Section */}
          <div className="max-w-3xl mx-auto">
              {/* Maintenance Message */}
              <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-6">
                  <svg 
                    className="w-8 h-8 text-amber-600 dark:text-amber-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                    />
                  </svg>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Teknik Bakım Çalışması
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                  {maintenanceData.message}
                </p>
              </div>

              {/* Estimated Time Card */}
              {maintenanceData.estimatedEndTime && (
                <div className="mb-10">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 md:p-8 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <svg 
                        className="w-6 h-6 text-gray-600 dark:text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                        Tahmini Bitiş Zamanı
                      </h3>
                    </div>
                    <p className="text-center text-gray-800 dark:text-gray-200 font-semibold text-lg md:text-xl mb-2">
                      {new Date(maintenanceData.estimatedEndTime).toLocaleString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {estimatedTimeRemaining && (
                      <p className="text-center text-gray-600 dark:text-gray-400 text-base">
                        Yaklaşık <span className="font-semibold text-gray-900 dark:text-white">{estimatedTimeRemaining}</span> sonra
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex-1 group relative overflow-hidden bg-gray-900 dark:bg-gray-700 text-white px-8 py-4 rounded-xl font-semibold text-base md:text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isRefreshing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Kontrol Ediliyor...
                      </>
                    ) : (
                      <>
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          />
                        </svg>
                        Tekrar Dene
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gray-800 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-semibold text-base md:text-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Sayfayı Yenile
                </button>
              </div>

            {/* Footer Info */}
            <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                Sistem otomatik olarak kontrol ediliyor
              </p>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Lütfen kısa bir süre sonra tekrar deneyin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
