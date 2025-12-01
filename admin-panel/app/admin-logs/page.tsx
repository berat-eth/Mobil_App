'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Shield, RefreshCw, Lock } from 'lucide-react'

export default function AdminLogsPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [access, setAccess] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Basit oturum koruması
    if (typeof window === 'undefined') return
    try {
      const logged = sessionStorage.getItem('adminLoggedIn') === '1'
      const token = sessionStorage.getItem('authToken')
      const ok = logged && !!token
      if (!ok) {
        router.replace('/login')
      }
    } catch {}
  }, [router])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<any>('/admin/security/login-attempts', { range: 30 })
      setLogs((res as any)?.data || [])
    } catch (e: any) {
      setError(e?.message || 'Loglar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" /> Yönetici Logları
          </h1>
          {access && (
            <button onClick={load} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Yenile
            </button>
          )}
        </div>

        {!access ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3 text-slate-600 text-sm">
              <Lock className="w-4 h-4" /> Bu alan yalnızca görüntüleme amaçlıdır. Değişiklik yapılamaz.
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Giriş Kodu</label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                value={code}
                onChange={(e)=> setCode(e.target.value)}
                placeholder="••••"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={()=>{ if (code === '8466') { setAccess(true); load() } }}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >Giriş</button>
            </div>
            {code && code !== '8466' && (
              <div className="text-sm text-red-600 mt-2">Geçersiz kod</div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 text-sm text-slate-600">
              Son 30 gün · {loading ? 'Yükleniyor...' : `${logs.length} kayıt`}
            </div>
            {error && <div className="p-4 text-sm text-red-600">{error}</div>}
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Kullanıcı</th>
                    <th className="text-left font-medium px-4 py-2">IP</th>
                    <th className="text-left font-medium px-4 py-2">Olay</th>
                    <th className="text-left font-medium px-4 py-2">Zaman</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l:any)=> (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-800">{l.username || '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{l.ip || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded ${l.severity==='high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{l.eventType}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{l.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


