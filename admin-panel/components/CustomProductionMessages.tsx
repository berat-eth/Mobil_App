'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Search, Filter, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

export default function CustomProductionMessages() {
  const [messages, setMessages] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeRequestId, setActiveRequestId] = useState<number | ''>('')
  const [requests, setRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const loadMessages = async (requestId?: number) => {
    try {
      setLoading(true)
      setError(null)
      if (requestId) {
        const res = await api.get<any>(`/admin/custom-production/requests/${requestId}/messages`)
        if ((res as any)?.success && Array.isArray((res as any).data)) { setMessages((res as any).data) } else { setMessages([]) }
      } else {
        const res = await api.get<any>('/admin/custom-production/messages', { limit: 50 })
        if ((res as any)?.success && Array.isArray((res as any).data)) { setMessages((res as any).data) } else { setMessages([]) }
      }
    } catch (e:any) {
      setError(e?.message || 'Mesajlar getirilemedi')
      setMessages([])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ loadMessages(typeof activeRequestId === 'number' ? activeRequestId : undefined) }, [activeRequestId])

  const loadRequests = async () => {
    try {
      setRequestsLoading(true)
      setRequestsError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) setRequests((res as any).data)
      else setRequests([])
    } catch (e:any) {
      setRequestsError(e?.message || 'Özel üretim talepleri getirilemedi')
      setRequests([])
    } finally { setRequestsLoading(false) }
  }

  const loadRequestDetail = async (requestId: number) => {
    try {
      setItemsLoading(true)
      setItemsError(null)
      const res = await api.get<any>(`/admin/custom-production-requests/${requestId}`)
      if ((res as any)?.success) {
        const data = (res as any).data || {}
        const list = Array.isArray(data.items) ? data.items : []
        setItems(list)
      } else {
        setItems([])
      }
    } catch (e:any) {
      setItemsError(e?.message || 'Talep kalemleri getirilemedi')
      setItems([])
    } finally { setItemsLoading(false) }
  }

  useEffect(()=>{ loadRequests() }, [])
  useEffect(()=>{
    if (typeof activeRequestId === 'number') {
      loadRequestDetail(activeRequestId)
    } else {
      setItems([])
    }
  }, [activeRequestId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Özel Üretim Mesajları</h2>
          <p className="text-slate-500 mt-1">Müşterilerle özel üretim talepleriniz hakkında iletişim kurun</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Mesaj ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={String(activeRequestId)} onChange={(e)=>setActiveRequestId(Number(e.target.value)||'')} className="px-3 py-2 border rounded-lg">
            <option value="">Tüm Talepler</option>
            {requestsLoading && <option>Yükleniyor...</option>}
            {!requestsLoading && requests.map((r:any)=> (
              <option key={r.id} value={r.id}>Talep #{r.id}</option>
            ))}
          </select>
          <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>
        </div>

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {loading && <div className="text-slate-500 text-sm">Yükleniyor...</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {messages
            .filter(m => !searchTerm || String(m.message||'').toLowerCase().includes(searchTerm.toLowerCase()))
            .map((message: any, index: number) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: message.sender === 'admin' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-md p-4 rounded-xl ${
                message.sender === 'admin' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-sm">{message.userName || (message.sender==='admin' ? 'Admin' : 'Kullanıcı')}</span>
                </div>
                <p className="text-sm mb-1">{message.message}</p>
                <p className={`text-xs ${message.sender === 'admin' ? 'text-blue-100' : 'text-slate-500'}`}>
                  {message.createdAt}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
          <input
            type="text"
            placeholder="Mesajınızı yazın..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={async()=>{
              const content = newMessage.trim()
              if (!content) return
              try {
                let reqId = typeof activeRequestId === 'number' ? activeRequestId : 0
                if (!reqId) {
                  const create = await api.post<any>('/admin/custom-production/requests', { subject: 'Admin Mesajı', description: content })
                  if ((create as any)?.success && (create as any).data?.id) {
                    reqId = Number((create as any).data.id)
                    setActiveRequestId(reqId)
                  }
                }
                const send = await api.post<any>('/admin/custom-production/messages', { requestId: reqId, message: content, sender: 'admin' })
                if ((send as any)?.success) {
                  setNewMessage('')
                  await loadMessages(reqId || undefined)
                } else {
                  alert('Mesaj gönderilemedi')
                }
              } catch { alert('Mesaj gönderilemedi') }
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Gönder</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Özel Üretim Kalemleri</h3>
            {typeof activeRequestId === 'number' && <p className="text-slate-500 text-sm">Talep #{activeRequestId} için</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>loadRequests()} className="px-3 py-2 border rounded-lg text-sm">Talepleri Yenile</button>
            {typeof activeRequestId === 'number' && (
              <button onClick={()=>loadRequestDetail(activeRequestId)} className="px-3 py-2 border rounded-lg text-sm">Kalemleri Yenile</button>
            )}
          </div>
        </div>
        {requestsError && <p className="text-red-600 text-sm mb-2">{requestsError}</p>}
        {itemsLoading && <p className="text-slate-500 text-sm">Yükleniyor...</p>}
        {itemsError && <p className="text-red-600 text-sm">{itemsError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ürün ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Adet</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Özelleştirmeler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it:any, idx:number)=> (
                <tr key={it.id || idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{it.productId ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{it.quantity ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700 break-all">{typeof it.customizations === 'string' ? it.customizations : JSON.stringify(it.customizations)}</td>
                </tr>
              ))}
              {items.length === 0 && !itemsLoading && !itemsError && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500 text-sm">Kayıt bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
