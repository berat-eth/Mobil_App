'use client'

import { useState } from 'react'
import { ClipboardList, Package, Calendar, User, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

export default function ProductionOrders() {
  // Mock veriler kaldırıldı - Backend entegrasyonu için hazır
  const [orders] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    plannedStart: '',
    plannedEnd: '',
    importance_level: 'Orta',
    notes: ''
  })

  const handleCreate = async () => {
    setError(null)
    const productId = parseInt(String(form.productId || '').trim(), 10)
    const quantity = parseInt(String(form.quantity || '').trim(), 10)
    if (!productId || !quantity || quantity < 1) {
      setError('Ürün ID ve adet zorunludur')
      return
    }
    setSubmitting(true)
    try {
      await api.post<any>('/admin/production-orders', {
        productId,
        quantity,
        status: 'planned',
        plannedStart: form.plannedStart || null,
        plannedEnd: form.plannedEnd || null,
        warehouseId: null,
        importance_level: form.importance_level,
        notes: form.notes || null
      })
      setShowCreate(false)
      setForm({ productId: '', quantity: '', plannedStart: '', plannedEnd: '', importance_level: 'Orta', notes: '' })
      if (typeof window !== 'undefined') {
        window.alert('Üretim emri oluşturuldu')
      }
    } catch (e: any) {
      setError(e?.message || 'Üretim emri oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors = {
    'Başlamadı': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
    'Devam Ediyor': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'Tamamlandı': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'Gecikmiş': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }

  // İstatistik kartları kaldırıldı (mock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Üretim Emirleri</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Üretim emirlerini takip edin</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium"
        >
          Yeni Emir Oluştur
        </button>
      </div>

      {/* İstatistik kartları kaldırıldı */}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Aktif Üretim Emirleri</h3>
        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-r from-slate-50 dark:from-slate-700/50 to-white dark:to-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-mono text-sm font-bold">
                      {order.id}
                    </span>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">{order.product}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-gray-400 mb-3">
                    <span className="flex items-center">
                      <Package className="w-4 h-4 mr-1" />
                      {order.quantity} Adet
                    </span>
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {order.assignedTo}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {order.startDate} - {order.dueDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${order.completion === 100 ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400'}`}
                          style={{ width: `${order.completion}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{order.completion}%</span>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Yeni Emir Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700"
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-semibold text-slate-800 dark:text-white">Yeni Üretim Emri</h4>
                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-300" onClick={() => setShowCreate(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Ürün ID</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    placeholder="Örn: 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Adet</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="Örn: 100"
                    min={1}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Planlanan Başlangıç</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.plannedStart}
                      onChange={(e) => setForm({ ...form, plannedStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Planlanan Bitiş</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.plannedEnd}
                      onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Önem Seviyesi</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.importance_level}
                    onChange={(e) => setForm({ ...form, importance_level: e.target.value })}
                  >
                    <option value="Düşük">Düşük</option>
                    <option value="Orta">Orta</option>
                    <option value="Yüksek">Yüksek</option>
                    <option value="Kritik">Kritik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Notlar</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Opsiyonel açıklama"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  Vazgeç
                </button>
                <button
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={handleCreate}
                  disabled={submitting}
                >
                  {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
