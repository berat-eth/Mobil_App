'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, Calendar, Mail, Clock, X } from 'lucide-react'
import { api, ApiResponse } from '@/lib/api'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

interface Report {
  filename: string
  size: number
  created: Date
  modified: Date
}

export default function SnortReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const res = await api.get<ApiResponse<any[]>>('/admin/snort/reports')
      if (res?.success) {
        setReports((res.data || []).map((r: any) => ({
          ...r,
          created: new Date(r.created),
          modified: new Date(r.modified)
        })))
      }
    } catch (e: any) {
      setError(e?.message || 'Raporlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      // PDF export için fetch kullan (blob response için)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.zerodaysoftware.tr/api'
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
      
      const response = await fetch(`${baseUrl}/admin/snort/logs/export/pdf?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      
      if (!response.ok) {
        throw new Error('PDF indirilemedi')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'Rapor indirilemedi')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Raporlar
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Snort IDS log raporlarını görüntüleyin ve indirin</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <FileText className="w-5 h-5" />
          <span>Yeni Rapor</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading && !reports.length ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Henüz rapor oluşturulmamış</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {reports.map((report) => (
              <motion.div
                key={report.filename}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{report.filename}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(report.created, 'dd MMMM yyyy, HH:mm', { locale: tr })}
                      </span>
                      <span>{formatFileSize(report.size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(report.filename)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>İndir</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Report Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateReportModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              loadReports()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateReportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      if (format === 'pdf') {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.zerodaysoftware.tr/api'
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
        
        const response = await fetch(`${baseUrl}/admin/snort/logs/export/pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || '',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ startDate, endDate })
        })
        
        if (!response.ok) {
          throw new Error('PDF oluşturulamadı')
        }
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `snort-report-${Date.now()}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        // CSV veya JSON için normal API çağrısı
        const params: Record<string, string | number | boolean> = {
          limit: 10000
        }
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate
        
        const res = await api.get<ApiResponse<any[]>>('/admin/snort/logs', params)
        
        if (res?.success && res.data) {
          const data = format === 'csv' 
            ? convertToCSV(res.data)
            : JSON.stringify(res.data, null, 2)
          
          const blob = new Blob([data], { 
            type: format === 'csv' ? 'text/csv' : 'application/json' 
          })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `snort-report-${Date.now()}.${format}`
          a.click()
          window.URL.revokeObjectURL(url)
        }
      }

      onSuccess()
    } catch (e: any) {
      setError(e?.message || 'Rapor oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const convertToCSV = (logs: any[]) => {
    const headers = ['ID', 'Zaman', 'Öncelik', 'Aksiyon', 'Kaynak IP', 'Kaynak Port', 'Hedef IP', 'Hedef Port', 'Protokol', 'Mesaj', 'Signature', 'Sınıflandırma']
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.priority,
      log.action,
      log.sourceIp,
      log.sourcePort,
      log.destIp,
      log.destPort,
      log.protocol,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${log.signature.replace(/"/g, '""')}"`,
      log.classification
    ])
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Yeni Rapor Oluştur</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              İptal
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

