'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function ReturnRequests() {
  const [returns, setReturns] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReturns = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/return-requests?limit=100')
      if ((res as any)?.success && (res as any).data) setReturns((res as any).data)
      else setReturns([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İade talepleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReturns() }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">İade Talepleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Müşteri iade taleplerini yönetin</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="İade ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 dark:text-white">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">{error}</div>
        ) : (
        <div className="space-y-3">
          {returns
            .filter(r => `${r.customerName||''} ${r.orderId||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((returnReq, index) => (
            <motion.div
              key={returnReq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{returnReq.customerName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Sipariş: {returnReq.orderId}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Sebep: {returnReq.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">₺{returnReq.refundAmount.toFixed(2)}</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(returnReq.status)}`}>
                    {returnReq.status}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{returnReq.requestDate}</p>
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
