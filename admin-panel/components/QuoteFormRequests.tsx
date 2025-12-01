'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, Eye, XCircle, RefreshCw, Mail, Phone, User, Building2, Package, DollarSign, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

export default function QuoteFormRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        // Sadece Teklif Al formundan gelen talepleri filtrele
        const quoteFormRequests = (res as any).data.filter((r: any) => r.source === 'quote-form')
        setRequests(quoteFormRequests)
      } else {
        setRequests([])
      }
    } catch (e: any) {
      setError(e?.message || 'Talepler getirilemedi')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/admin/custom-production-requests/${id}/status`, { status })
      await loadRequests()
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status })
      }
      alert('Durum güncellendi')
    } catch {
      alert('Durum güncellenemedi')
    }
  }

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Beklemede',
      review: 'İnceleniyor',
      design: 'Tasarım',
      production: 'Üretimde',
      shipped: 'Kargolandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal'
    }
    return map[status] || status
  }

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = !searchQuery || 
      req.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const parseNotes = (notes: string) => {
    if (!notes) return {}
    const parsed: any = {}
    const lines = notes.split('\n')
    let currentSection = ''
    let currentContent: string[] = []
    
    lines.forEach(line => {
      if (line.includes(':')) {
        if (currentSection && currentContent.length > 0) {
          parsed[currentSection] = currentContent.join('\n')
        }
        const [key, ...valueParts] = line.split(':')
        currentSection = key.trim()
        const value = valueParts.join(':').trim()
        currentContent = value ? [value] : []
      } else if (line.trim()) {
        currentContent.push(line.trim())
      }
    })
    
    if (currentSection && currentContent.length > 0) {
      parsed[currentSection] = currentContent.join('\n')
    }
    
    return parsed
  }

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gelen Form Verileri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Teklif Al formundan gelen tüm talepler</p>
        </div>
        <button 
          onClick={loadRequests} 
          className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Talep no, müşteri adı, e-posta veya telefon ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="review">İnceleniyor</option>
          <option value="design">Tasarım</option>
          <option value="production">Üretimde</option>
          <option value="shipped">Kargolandı</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Talep No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ürün Tipi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Miktar</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    {searchQuery || statusFilter !== 'all' ? 'Filtre kriterlerine uygun talep bulunamadı' : 'Henüz form talebi bulunmuyor'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const notesData = parseNotes(request.notes || '')
                  const productType = notesData['Ürün Tipi'] || '-'
                  const quantity = notesData['Miktar'] || request.totalQuantity || 0
                  
                  return (
                    <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {request.requestNumber || `#${request.id}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{request.customerName || '-'}</span>
                          {request.companyName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">{request.companyName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{request.customerEmail || '-'}</span>
                          <span className="text-slate-600 dark:text-slate-400">{request.customerPhone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{productType}</td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          request.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          ['review','design','production','shipped'].includes(request.status) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          request.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {translateStatus(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowDetailModal(true)
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Detay
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Talep Detayları</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {selectedRequest.requestNumber || `Talep #${selectedRequest.id}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Source Badge */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <p className="font-semibold text-blue-900 dark:text-blue-300">Teklif Al Formundan Gelen Talep</p>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    Bu talep web sitesindeki "Teklif Al" formundan gönderilmiştir.
                  </p>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Müşteri</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedRequest.customerName || '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedRequest.userId ? `User ID: ${selectedRequest.userId}` : 'Misafir Kullanıcı'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">E-posta</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 break-all">{selectedRequest.customerEmail || '-'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Telefon</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {selectedRequest.customerPhone || 'Belirtilmemiş'}
                    </p>
                  </div>
                </div>

                {/* Company Info */}
                {selectedRequest.companyName && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Firma Bilgileri</p>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedRequest.companyName}</p>
                    {selectedRequest.companyAddress && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedRequest.companyAddress}</p>
                    )}
                  </div>
                )}

                {/* Status and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Durum</p>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium inline-block ${String(selectedRequest.status) === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      ['review','design','production','shipped'].includes(String(selectedRequest.status)) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {translateStatus(selectedRequest.status)}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Tutar</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ₺{Number(selectedRequest.totalAmount || 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Adet</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedRequest.totalQuantity || 0}
                    </p>
                  </div>
                </div>

                {/* Form Details */}
                {selectedRequest.notes && (() => {
                  const notesData = parseNotes(selectedRequest.notes)
                  return (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-yellow-900 dark:text-yellow-300 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Form Detayları
                      </h4>
                      <div className="space-y-4">
                        {notesData['Ürün Tipi'] && (
                          <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Ürün Tipi</p>
                              <p className="text-yellow-800 dark:text-yellow-300 mt-1">{notesData['Ürün Tipi']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Miktar'] && (
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">inventory_2</span>
                            <div>
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Miktar</p>
                              <p className="text-yellow-800 dark:text-yellow-300 mt-1">{notesData['Miktar']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Bütçe Aralığı'] && (
                          <div className="flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Bütçe Aralığı</p>
                              <p className="text-yellow-800 dark:text-yellow-300 mt-1">{notesData['Bütçe Aralığı']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Proje Detayları'] && (
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Proje Detayları</p>
                              <p className="text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{notesData['Proje Detayları']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Hizmet Seçenekleri'] && (
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">settings</span>
                            <div>
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Hizmet Seçenekleri</p>
                              <p className="text-yellow-800 dark:text-yellow-300 mt-1">{notesData['Hizmet Seçenekleri']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Nakış Detayları'] && (
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">draw</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Nakış Detayları</p>
                              <p className="text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{notesData['Nakış Detayları']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Baskı Detayları'] && (
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">print</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Baskı Detayları</p>
                              <p className="text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{notesData['Baskı Detayları']}</p>
                            </div>
                          </div>
                        )}
                        {notesData['Beden Dağılımı'] && (
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">straighten</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Beden Dağılımı</p>
                              <p className="text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{notesData['Beden Dağılımı']}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Full Notes (fallback) */}
                {selectedRequest.notes && Object.keys(parseNotes(selectedRequest.notes)).length === 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Form Detayları</h4>
                    <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedRequest.notes}</p>
                  </div>
                )}

                {/* Status Actions */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <select
                    onChange={(e) => updateStatus(selectedRequest.id, e.target.value)}
                    value={selectedRequest.status}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="review">İnceleniyor</option>
                    <option value="design">Tasarım</option>
                    <option value="production">Üretimde</option>
                    <option value="shipped">Kargolandı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

