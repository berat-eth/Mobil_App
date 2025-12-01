'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react'
import { api } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface Rule {
  id: number
  name: string
  enabled: boolean
  condition: {
    priority?: 'high' | 'medium' | 'low'
    sameIP?: boolean
    threshold: number
    timeWindow: number
  }
  action: 'block'
  duration?: number | null
  createdAt?: string
  updatedAt?: string
}

export default function SnortRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const res = await api.get<any>('/admin/snort/rules')
      if (res?.success) {
        setRules(res.data || [])
      }
    } catch (e: any) {
      setError(e?.message || 'Kurallar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (rule: Partial<Rule>) => {
    try {
      setLoading(true)
      setError(null)
      
      if (editingRule) {
        await api.put(`/admin/snort/rules/${editingRule.id}`, rule)
      } else {
        await api.post('/admin/snort/rules', rule)
      }
      
      await loadRules()
      setEditingRule(null)
      setShowAddModal(false)
    } catch (e: any) {
      setError(e?.message || 'Kural kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return
    
    try {
      setLoading(true)
      await api.delete(`/admin/snort/rules/${id}`)
      await loadRules()
    } catch (e: any) {
      setError(e?.message || 'Kural silinemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (rule: Rule) => {
    try {
      await api.put(`/admin/snort/rules/${rule.id}`, { enabled: !rule.enabled })
      await loadRules()
    } catch (e: any) {
      setError(e?.message || 'Kural güncellenemedi')
    }
  }

  const formatTimeWindow = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} gün`
    if (hours > 0) return `${hours} saat`
    return `${minutes} dakika`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            Otomatik Engelleme Kuralları
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Snort IDS için otomatik engelleme kurallarını yönetin</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Kural</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading && !rules.length ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {rules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{rule.name}</h3>
                      <button
                        onClick={() => handleToggle(rule)}
                        className="flex items-center"
                      >
                        {rule.enabled ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${rule.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                        {rule.enabled ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <p>
                        <strong>Koşul:</strong>{' '}
                        {rule.condition.priority && `${rule.condition.priority} öncelikli`}
                        {rule.condition.sameIP && 'Aynı IP\'den'}
                        {' '}log sayısı {rule.condition.threshold} veya daha fazla
                      </p>
                      <p>
                        <strong>Zaman Penceresi:</strong> {formatTimeWindow(rule.condition.timeWindow)}
                      </p>
                      <p>
                        <strong>Aksiyon:</strong> IP engelleme {rule.duration ? `(${formatTimeWindow(rule.duration)})` : '(Kalıcı)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingRule) && (
          <RuleModal
            rule={editingRule}
            onSave={handleSave}
            onClose={() => {
              setShowAddModal(false)
              setEditingRule(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function RuleModal({ rule, onSave, onClose }: { rule: Rule | null; onSave: (rule: Partial<Rule>) => void; onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Rule>>({
    name: rule?.name || '',
    enabled: rule?.enabled ?? true,
    condition: {
      priority: rule?.condition?.priority || 'high',
      threshold: rule?.condition?.threshold || 5,
      timeWindow: rule?.condition?.timeWindow || 3600000
    },
    action: 'block',
    duration: rule?.duration || null
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {rule ? 'Kural Düzenle' : 'Yeni Kural'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kural Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Öncelik</label>
            <select
              value={formData.condition?.priority || 'high'}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition!, priority: e.target.value as any }
              })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Eşik Değeri</label>
            <input
              type="number"
              value={formData.condition?.threshold || 5}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition!, threshold: parseInt(e.target.value) }
              })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Zaman Penceresi (dakika)</label>
            <input
              type="number"
              value={formData.condition?.timeWindow ? formData.condition.timeWindow / 60000 : 60}
              onChange={(e) => setFormData({
                ...formData,
                condition: { ...formData.condition!, timeWindow: parseInt(e.target.value) * 60000 }
              })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Save className="w-5 h-5 inline mr-2" />
              Kaydet
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

