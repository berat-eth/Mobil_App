'use client'

import { useState } from 'react'
import { PackageCheck, TrendingUp, Activity, AlertTriangle, Factory } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProductionTracking() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [tracking] = useState<any[]>([])

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Üretim Takibi</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Gerçek zamanlı üretim verilerini izleyin</p>
        </div>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Canlı Üretim Durumu</h3>
        <div className="space-y-4">
          {tracking.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-slate-50 dark:from-slate-700/50 to-white dark:to-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{item.factory}</h4>
                  <p className="text-sm text-slate-600 dark:text-gray-400">{item.product}</p>
                </div>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  item.status === 'Normal' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {item.status === 'Normal' ? '✓ Normal' : '⚠ Düşük Verim'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Mevcut Üretim</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{item.currentOutput}</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Hedef</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{item.targetOutput}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Verimlilik</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{item.efficiency}%</p>
                </div>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${item.efficiency >= 80 ? 'bg-green-500 dark:bg-green-400' : item.efficiency >= 60 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-red-500 dark:bg-red-400'}`}
                  style={{ width: `${(item.currentOutput / item.targetOutput) * 100}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
