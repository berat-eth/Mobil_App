'use client'

import { FileText, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function Applications() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const res = await api.get<any>('/dealership/applications')
      if ((res as any)?.success && Array.isArray((res as any).data)) setApplications((res as any).data)
      else setApplications([])
    } catch (e:any) { setError(e?.message || 'Başvurular getirilemedi'); setApplications([]) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Bayilik Başvuruları</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><RefreshCw className="w-4 h-4"/>Yenile</button>
        </div>
      </div>
      <p className="text-slate-500 dark:text-slate-400">Bayilik başvurularını inceleyin ve onaylayın</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{applications.filter(a => a.status === 'pending' || a.status === 'new').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Onaylanan</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{applications.filter(a => a.status === 'approved').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Reddedilen</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{applications.filter(a => a.status === 'rejected').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        {loading && <div className="text-slate-500 dark:text-slate-400 text-sm">Yükleniyor...</div>}
        {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Başvuran</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Firma</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Telefon</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {applications.map((app, index) => (
                <motion.tr
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{app.fullName}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{app.companyName}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{app.phone}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{app.createdAt}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      app.status === 'pending' || app.status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      app.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {app.status === 'pending' || app.status === 'new' ? 'Bekliyor' :
                       app.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button onClick={async()=>{ try{ await api.put(`/dealership/applications/${app.id}/status`, { status:'approved' }); await load() } catch {} }} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </button>
                      <button onClick={async()=>{ try{ await api.put(`/dealership/applications/${app.id}/status`, { status:'rejected' }); await load() } catch {} }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
