'use client'

import { useEffect, useState } from 'react'
import { Wallet, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function WalletRechargeRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/wallet-recharge-requests?limit=100')
      if ((res as any)?.success && (res as any).data) setRequests((res as any).data)
      else setRequests([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme talepleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const updateStatus = async (id: string, status: 'completed' | 'failed' | 'cancelled' | 'pending_approval') => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }))
      await api.post(`/admin/wallet-recharge-requests/${id}/status`, { status })
      await fetchRequests()
    } catch (e) {
      alert('İşlem başarısız')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const approveRequest = (req: any) => {
    if (!confirm(`${req.id} talebini onaylamak istiyor musunuz?`)) return
    updateStatus(req.id, 'completed')
  }

  const rejectRequest = (req: any) => {
    if (!confirm(`${req.id} talebini reddetmek istiyor musunuz?`)) return
    updateStatus(req.id, 'failed')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'pending_approval': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      case 'cancelled': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'pending_approval': return <Clock className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Bakiye Yükleme Talepleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Cüzdan yükleme taleplerini yönetin</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Talep ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-slate-700 dark:text-slate-300 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">{error}</div>
        ) : (
        <div className="space-y-3">
          {requests
            .filter(r => `${r.userName||''} ${r.id||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{request.userName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Talep ID: {request.id}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{request.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">₺{Number(request.amount||0).toFixed(2)}</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 w-fit ml-auto ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span>{request.status}</span>
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{request.paymentMethod}</p>
                <div className="flex items-center space-x-2 mt-3">
                  <button
                    disabled={actionLoading[request.id]}
                    onClick={() => approveRequest(request)}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Onayla
                  </button>
                  <button
                    disabled={actionLoading[request.id]}
                    onClick={() => rejectRequest(request)}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Reddet
                  </button>
                </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
