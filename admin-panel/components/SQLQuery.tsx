'use client'

import { useEffect, useState } from 'react'
import { Database, Play, Download, Copy, Trash2, Save, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

interface QueryResult {
  columns: string[]
  rows: any[]
  rowCount: number
  executionTime: number
}

interface QueryHistory {
  id: number
  query: string
  timestamp: string
  status: 'success' | 'error'
  rowCount?: number
  executionTime?: number
}

export default function SQLQuery() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])

  const [tables, setTables] = useState<any[]>([])
  const [loadingTables, setLoadingTables] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any>('/admin/sql/tables')
        if ((res as any)?.success && (res as any).data) setTables((res as any).data)
      } finally {
        setLoadingTables(false)
      }
    })()
  }, [])

  const validateQuery = (sql: string): boolean => {
    const normalizedQuery = sql.trim().toUpperCase()
    
    // Tehlikeli komutları kontrol et
    const dangerousKeywords = [
      'UPDATE', 'DELETE', 'DROP', 'INSERT', 'ALTER', 
      'CREATE', 'TRUNCATE', 'REPLACE', 'GRANT', 'REVOKE'
    ]
    
    for (const keyword of dangerousKeywords) {
      if (normalizedQuery.includes(keyword)) {
        setError(`❌ Güvenlik: "${keyword}" komutu bu alanda kullanılamaz. Sadece SELECT sorguları çalıştırılabilir.`)
        return false
      }
    }
    
    // SELECT ile başlamalı
    if (!normalizedQuery.startsWith('SELECT')) {
      setError('❌ Sadece SELECT sorguları çalıştırılabilir.')
      return false
    }
    
    return true
  }

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('❌ Lütfen bir SQL sorgusu girin.')
      return
    }

    setError(null)
    setResult(null)

    // Sorguyu doğrula
    if (!validateQuery(query)) {
      return
    }

    setIsExecuting(true)
    try {
      const res = await api.post<any>('/admin/sql/query', { query })
      if ((res as any)?.success && (res as any).data) {
        const payload = (res as any).data
        const parsed: QueryResult = {
          columns: payload.columns || [],
          rows: payload.rows || [],
          rowCount: payload.rowCount || 0,
          executionTime: payload.executionTime || 0
        }
        setResult(parsed)
        const newHistory: QueryHistory = {
          id: Date.now(),
          query: query,
          timestamp: new Date().toLocaleString('tr-TR'),
          status: 'success',
          rowCount: parsed.rowCount,
          executionTime: parsed.executionTime
        }
        setQueryHistory([newHistory, ...queryHistory])
      } else {
        setError('❌ Sorgu başarısız')
      }
    } catch (err) {
      setError('❌ Sorgu çalıştırılırken bir hata oluştu.')
    } finally {
      setIsExecuting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('✅ Panoya kopyalandı!')
  }

  const exportToExcel = () => {
    if (!result) return

    // Excel için HTML tablosu oluştur
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
    html += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>'
    html += '<x:Name>Sorgu Sonuçları</x:Name>'
    html += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>'
    html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'
    html += '<meta charset="UTF-8"></head><body>'
    html += '<table border="1">'
    
    // Başlıklar
    html += '<thead><tr>'
    result.columns.forEach(col => {
      html += `<th style="background-color: #4F46E5; color: white; font-weight: bold; padding: 8px;">${col}</th>`
    })
    html += '</tr></thead>'
    
    // Veriler
    html += '<tbody>'
    result.rows.forEach((row, idx) => {
      html += '<tr>'
      result.columns.forEach(col => {
        const bgColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF'
        html += `<td style="background-color: ${bgColor}; padding: 6px;">${row[col]}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody></table></body></html>'

    // Blob oluştur ve indir
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `sorgu-sonuclari-${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    alert('✅ Sonuçlar Excel olarak indirildi!')
  }

  const loadSampleQuery = (tableName: string) => {
    setQuery(`SELECT * FROM ${tableName} LIMIT 10;`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <Database className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
            SQL Sorgu Penceresi
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Veritabanı sorgularınızı çalıştırın (Sadece SELECT)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sol Panel - Tablolar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Veritabanı Tabloları</h3>
            <div className="space-y-2">
              {loadingTables ? (
                <p className="text-slate-500 dark:text-slate-400">Tablolar yükleniyor...</p>
              ) : (
              tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => loadSampleQuery(table.name)}
                  className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors group border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {table.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{table.rowCount} satır</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {table.columns.slice(0, 3).join(', ')}
                    {table.columns.length > 3 && '...'}
                  </div>
                </button>
              ))
              )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Güvenlik Kuralları
              </h4>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>✅ SELECT sorguları</li>
                <li>❌ UPDATE, DELETE</li>
                <li>❌ INSERT, DROP</li>
                <li>❌ ALTER, TRUNCATE</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sağ Panel - Sorgu ve Sonuçlar */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sorgu Editörü */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">SQL Sorgusu</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(query)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Kopyala"
                >
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={() => setQuery('')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Temizle"
                >
                  <Trash2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM users WHERE..."
              className="w-full h-40 px-4 py-3 bg-slate-900 dark:bg-slate-950 text-green-400 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              spellCheck={false}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {query.length} karakter
              </div>
              <button
                onClick={executeQuery}
                disabled={isExecuting || !query.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    <span>Çalıştırılıyor...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Sorguyu Çalıştır</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Sonuçlar */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sorgu Sonuçları</h3>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {result.rowCount} satır
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-medium">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {result.executionTime.toFixed(3)}s
                    </span>
                  </div>
                </div>
                <button
                  onClick={exportToExcel}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel İndir</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      {result.columns.map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        {result.columns.map((col) => (
                          <td key={col} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Sorgu Geçmişi */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Sorgu Geçmişi</h3>
            <div className="space-y-2">
              {queryHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  onClick={() => setQuery(item.query)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.timestamp}</span>
                    <div className="flex items-center space-x-2">
                      {item.status === 'success' ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ✓ {item.rowCount} satır • {item.executionTime}s
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">✗ Hata</span>
                      )}
                    </div>
                  </div>
                  <code className="text-sm text-slate-700 dark:text-slate-300 font-mono">{item.query}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
