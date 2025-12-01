'use client'

import { useEffect, useState } from 'react'
import { Crown, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function Premium() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) setRequests((res as any).data)
      else setRequests([])
    } catch (e:any) {
      setError(e?.message || 'Özel üretim talepleri getirilemedi')
      setRequests([])
    } finally { setLoading(false) }
  }

  const loadItems = async (id: number) => {
    try {
      setItemsLoading(true)
      setItemsError(null)
      const res = await api.get<any>(`/admin/custom-production-requests/${id}`)
      if ((res as any)?.success) {
        const data = (res as any).data || {}
        setItems(Array.isArray(data.items) ? data.items : [])
      } else {
        setItems([])
      }
    } catch (e:any) {
      setItemsError(e?.message || 'Talep kalemleri getirilemedi')
      setItems([])
    } finally { setItemsLoading(false) }
  }

  useEffect(()=>{ loadRequests() }, [])
  useEffect(()=>{ if (selectedId) loadItems(selectedId) }, [selectedId])

  const totalRevenue = requests.reduce((sum:number, r:any)=> sum + Number(r.totalAmount || 0), 0)
  const inProgressCount = requests.filter((r:any)=> ['review','design','production','shipped'].includes(String(r.status))).length
  const completedCount = requests.filter((r:any)=> String(r.status) === 'completed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Özel Üretim</h2>
          <p className="text-slate-500 mt-1">Kurumsal özel üretim taleplerini yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadRequests} className="px-4 py-3 border rounded-xl hover:bg-slate-50">Yenile</button>
          <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Yeni Talep
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Talep</p>
          <p className="text-3xl font-bold text-yellow-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Devam Eden</p>
          <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Tamamlanan</p>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Tutar</p>
          <p className="text-3xl font-bold text-purple-600">₺{totalRevenue.toLocaleString('tr-TR')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {loading && <p className="text-slate-500 text-sm">Yükleniyor...</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Talep No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Adet</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tutar</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r:any, index:number)=> (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-semibold text-slate-800">#{r.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-slate-800">{r.customerName || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{r.totalQuantity ?? '-'}</td>
                  <td className="px-6 py-4 font-bold text-green-600">₺{Number(r.totalAmount || 0).toLocaleString('tr-TR')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${String(r.status) === 'completed' ? 'bg-green-100 text-green-700' :
                      ['review','design','production','shipped'].includes(String(r.status)) ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {String(r.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{r.createdAt || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={()=>setSelectedId(r.id)} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:shadow-lg text-sm font-medium">
                      Detay
                    </button>
                  </td>
                </motion.tr>
              ))}
              {requests.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm">Kayıt bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Talep Kalemleri</h3>
              <p className="text-slate-500 text-sm">Talep #{selectedId} için</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>loadItems(selectedId)} className="px-3 py-2 border rounded-lg text-sm">Yenile</button>
              <button onClick={()=>{ setSelectedId(null); setItems([]) }} className="px-3 py-2 border rounded-lg text-sm">Kapat</button>
            </div>
          </div>
          {itemsLoading && <p className="text-slate-500 text-sm">Yükleniyor...</p>}
          {itemsError && <p className="text-red-600 text-sm">{itemsError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ürün ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Adet</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Özelleştirmeler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it:any, idx:number)=> (
                  <tr key={it.id || idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-800">{it.productId ?? '-'}</td>
                    <td className="px-6 py-3 text-slate-700">{it.quantity ?? '-'}</td>
                    <td className="px-6 py-3 text-slate-700 break-all">{typeof it.customizations === 'string' ? it.customizations : JSON.stringify(it.customizations)}</td>
                  </tr>
                ))}
                {items.length === 0 && !itemsLoading && !itemsError && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-slate-500 text-sm">Kayıt bulunamadı</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
