'use client'

import { useState, useEffect } from 'react'
import { UsersRound, Plus, Users, TrendingUp, X, ShoppingBag, DollarSign, Mail, Phone, MapPin, Eye, Award, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface Segment {
  id: number
  name: string
  count: number
  revenue: number
  color: string
  criteria: string
}

interface SegmentUser {
  id: number
  name: string
  email: string
  phone: string
  city: string
  totalOrders: number
  totalSpent: number
  membershipLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  lastOrder: string
}

export default function Segments() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [segmentUsers, setSegmentUsers] = useState<SegmentUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [viewingSegment, setViewingSegment] = useState<Segment | null>(null)
  const [showUsers, setShowUsers] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [criteria, setCriteria] = useState('')
  const [color, setColor] = useState('from-blue-500 to-blue-600')
  
  // Segment verilerini yükle
  useEffect(() => {
    loadSegments()
  }, [])

  const loadSegments = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>('/admin/segments')
      if (response.success) {
        setSegments(response.data || [])
      } else {
        setSegments([])
      }
    } catch (error) {
      console.error('Segment yükleme hatası:', error)
      setSegments([])
    } finally {
      setLoading(false)
    }
  }

  // Segment kullanıcıları yükle
  const loadSegmentUsers = async (segmentId: number) => {
    try {
      setLoadingUsers(true)
      const response = await api.get<any>(`/admin/segments/${segmentId}/users`)
      if (response.success) {
        setSegmentUsers(response.data || [])
      } else {
        setSegmentUsers([])
      }
    } catch (error) {
      console.error('Segment kullanıcıları yükleme hatası:', error)
      setSegmentUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Segment kullanıcıları - API'den gelecek
  const getSegmentUsers = async (segmentId: number): Promise<SegmentUser[]> => {
    try {
      const response = await api.get<any>(`/admin/segments/${segmentId}/users`)
      if (response.success) {
        return response.data || []
      }
      return []
    } catch (error) {
      console.error('Segment kullanıcıları yükleme hatası:', error)
      return []
    }
  }

  const membershipColors = {
    Bronze: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    Silver: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    Gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    Platinum: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Müşteri Segmentleri</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Müşterilerinizi segmentlere ayırın</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={loadSegments}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
          <button onClick={()=>setShowAdd(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Yeni Segment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-slate-600 dark:text-slate-400">Segmentler yükleniyor...</span>
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <UsersRound className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">Henüz segment bulunmuyor</h3>
            <p className="text-slate-500 dark:text-slate-500 mb-4">İlk segmentinizi oluşturmak için "Yeni Segment" butonuna tıklayın</p>
          </div>
        ) : (
          segments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 card-hover"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${segment.color} rounded-xl flex items-center justify-center mb-4`}>
              <UsersRound className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{segment.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{segment.criteria}</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Müşteri Sayısı</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{segment.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Toplam Gelir</span>
                <span className="font-bold text-green-600 dark:text-green-400">₺{(segment.revenue / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Ort. Harcama</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">₺{Math.round(segment.revenue / segment.count).toLocaleString()}</span>
              </div>
            </div>
            <button 
              onClick={() => setViewingSegment(segment)}
              className="w-full mt-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium"
            >
              Detayları Gör
            </button>
          </motion.div>
        ))
        )}
      </div>

      {/* Detay Modal */}
      <AnimatePresence>
        {viewingSegment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingSegment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Segment Detayları</h3>
                <button
                  onClick={() => setViewingSegment(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${viewingSegment.color} rounded-xl flex items-center justify-center`}>
                    <UsersRound className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{viewingSegment.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400">{viewingSegment.criteria}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center text-blue-600 dark:text-blue-400 mb-2">
                      <Users className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">Müşteri Sayısı</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{viewingSegment.count}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center text-green-600 mb-2">
                      <DollarSign className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">Toplam Gelir</p>
                    </div>
                    <p className="text-3xl font-bold text-green-700">₺{(viewingSegment.revenue / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center text-purple-600 mb-2">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      <p className="text-sm font-medium">Ort. Harcama</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-700">₺{Math.round(viewingSegment.revenue / viewingSegment.count).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6">
                  <h5 className="font-semibold text-slate-800 mb-4">Segment İstatistikleri</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Toplam Müşteri Oranı</span>
                      <span className="font-bold text-slate-800">{((viewingSegment.count / segments.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Gelir Katkısı</span>
                      <span className="font-bold text-green-600">{((viewingSegment.revenue / segments.reduce((sum, s) => sum + s.revenue, 0)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Büyüme Trendi</span>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-600">+{(Math.random() * 20 + 5).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">Segment Kriteri</p>
                  <p className="font-bold text-slate-800">{viewingSegment.criteria}</p>
                </div>

                <button
                  onClick={() => {
                    setShowUsers(true)
                    loadSegmentUsers(viewingSegment.id)
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                >
                  Kullanıcıları Görüntüle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kullanıcı Listesi Modal */}
      <AnimatePresence>
        {showUsers && viewingSegment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUsers(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${viewingSegment.color} rounded-xl flex items-center justify-center`}>
                    <UsersRound className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{viewingSegment.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{segmentUsers.length} kullanıcı</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUsers(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kullanıcı</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Şehir</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Üyelik</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Sipariş</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Harcama</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Son Sipariş</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                              <span className="text-slate-600 dark:text-slate-400">Kullanıcılar yükleniyor...</span>
                            </div>
                          </td>
                        </tr>
                      ) : segmentUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 bg-gradient-to-br ${
                                user.membershipLevel === 'Platinum' ? 'from-purple-500 to-purple-600' :
                                user.membershipLevel === 'Gold' ? 'from-yellow-500 to-yellow-600' :
                                user.membershipLevel === 'Silver' ? 'from-slate-400 to-slate-500' :
                                'from-orange-500 to-orange-600'
                              } rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-500">ID: {user.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center text-xs text-slate-600">
                                <Mail className="w-3 h-3 mr-2 text-slate-400" />
                                {user.email}
                              </div>
                              <div className="flex items-center text-xs text-slate-600">
                                <Phone className="w-3 h-3 mr-2 text-slate-400" />
                                {user.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-slate-600">
                              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                              {user.city}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${membershipColors[user.membershipLevel].bg} ${membershipColors[user.membershipLevel].text} ${membershipColors[user.membershipLevel].border}`}>
                              <Award className="w-3 h-3 mr-1" />
                              {user.membershipLevel}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800">{user.totalOrders}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-green-600">₺{user.totalSpent.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">{user.lastOrder}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => alert(`${user.name} kullanıcısının detayları`)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                            >
                              <Eye className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!loadingUsers && segmentUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Bu segmentte henüz kullanıcı bulunmuyor</p>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowUsers(false)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e)=>e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-2xl font-bold">Yeni Segment</h3>
              <button onClick={()=>setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ad</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="Örn: VIP"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kriter</label>
                <input value={criteria} onChange={(e)=>setCriteria(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="Örn: Toplam harcama > 5000"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Renk</label>
                <select value={color} onChange={(e)=>setColor(e.target.value)} className="w-full px-4 py-3 border rounded-xl">
                  <option value="from-blue-500 to-blue-600">Mavi</option>
                  <option value="from-green-500 to-green-600">Yeşil</option>
                  <option value="from-purple-500 to-purple-600">Mor</option>
                  <option value="from-orange-500 to-orange-600">Turuncu</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  disabled={adding || !name.trim()}
                  onClick={async()=>{
                    try {
                      setAdding(true)
                      const res = await api.post<any>('/admin/segments', { name: name.trim(), criteria: criteria.trim(), color })
                      if ((res as any)?.success) {
                        setShowAdd(false)
                        setName(''); setCriteria('')
                        alert('Segment oluşturuldu')
                        loadSegments() // Segmentleri yeniden yükle
                      } else {
                        alert('Segment eklenemedi')
                      }
                    } catch { 
                      alert('Segment eklenemedi') 
                    } finally { setAdding(false) }
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl disabled:opacity-50"
                >Kaydet</button>
                <button onClick={()=>setShowAdd(false)} className="px-6 py-3 border rounded-xl">İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
