'use client'

import { useEffect, useState } from 'react'
import { FolderTree, Plus, Edit2, Trash2, Search, Filter, Download, Upload, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { productService } from '@/lib/services'
import { api } from '@/lib/api'

export default function Categories() {
  const [categories, setCategories] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await productService.getCategories()
        if (res.success && res.data) setCategories(res.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kategoriler yüklenemedi')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kategoriler</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ürün kategorilerini yönetin</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kategori</span>
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Kategori ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
            />
          </div>
          <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 dark:text-white">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Kategoriler yükleniyor...</p>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
        ) : (
          <div className="space-y-3">
            {categories
              .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((name, index) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-dark-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FolderTree className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Yeni Kategori Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full" onClick={(e)=>e.stopPropagation()}>
            <div className="p-6 border-b dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Yeni Kategori</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kategori Adı</label>
                <input value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} placeholder="Örn: Polar Bere" className="w-full px-4 py-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white dark:placeholder-slate-400" />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  disabled={saving || !newCategoryName.trim()}
                  onClick={async()=>{
                    try {
                      setSaving(true)
                      const res = await api.post<any>('/admin/categories', { name: newCategoryName.trim() })
                      if ((res as any)?.success) {
                        setCategories([newCategoryName.trim(), ...categories])
                        setNewCategoryName('')
                        setShowAddModal(false)
                      } else {
                        alert('Kategori eklenemedi')
                      }
                    } catch {
                      alert('Kategori eklenemedi')
                    } finally { setSaving(false) }
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl disabled:opacity-50"
                >Kaydet</button>
                <button onClick={()=>setShowAddModal(false)} className="px-6 py-3 border dark:border-slate-700 rounded-xl dark:text-slate-300">İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
