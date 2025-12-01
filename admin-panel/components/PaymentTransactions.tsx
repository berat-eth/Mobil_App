'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Search, Filter, Download, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function PaymentTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/payment-transactions?limit=100')
      if ((res as any)?.success && (res as any).data) setTransactions((res as any).data)
      else setTransactions([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ödeme işlemleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Ödeme İşlemleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tüm ödeme işlemlerini görüntüleyin</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Rapor İndir</span>
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="İşlem ara..."
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

        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">{error}</div>
          ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">İşlem ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Sipariş</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Sağlayıcı</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Tutar</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Durum</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .filter(t => `${t.paymentId||''} ${t.orderId||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-100">{transaction.paymentId}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{transaction.orderId}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{transaction.provider}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">₺{Number(transaction.amount||0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 w-fit ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span>{transaction.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{transaction.createdAt}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  )
}
