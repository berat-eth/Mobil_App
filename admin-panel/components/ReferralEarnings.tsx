'use client'

import { useState } from 'react'
import { Users, Search, Filter, TrendingUp, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ReferralEarnings() {
  const [earnings, setEarnings] = useState([
    { id: 1, referrerName: 'Ahmet Yılmaz', referredName: 'Mehmet Kaya', amount: 50.00, status: 'paid', createdAt: '2024-01-15' },
    { id: 2, referrerName: 'Ayşe Demir', referredName: 'Fatma Şahin', amount: 50.00, status: 'pending', createdAt: '2024-01-14' },
  ])
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Referans Kazançları</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Referans programı kazançlarını görüntüleyin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-2xl shadow-lg p-6 text-white">
          <DollarSign className="w-8 h-8 mb-3" />
          <p className="text-green-100 text-sm">Toplam Kazanç</p>
          <p className="text-3xl font-bold">₺100.00</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-lg p-6 text-white">
          <Users className="w-8 h-8 mb-3" />
          <p className="text-blue-100 text-sm">Toplam Referans</p>
          <p className="text-3xl font-bold">2</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Kazanç ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          {earnings.map((earning, index) => (
            <motion.div
              key={earning.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{earning.referrerName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Referans: {earning.referredName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{earning.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">₺{earning.amount.toFixed(2)}</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(earning.status)}`}>
                    {earning.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
