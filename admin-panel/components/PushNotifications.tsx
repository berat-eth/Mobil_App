'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, Users, Calendar, TrendingUp, Plus, X, Search, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: number
  userId: number
  userName: string
  userEmail: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface User {
  id: number
  name: string
  email: string
}

export default function PushNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetType: 'user', // 'user' or 'multiple'
    userId: '',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: ''
  })

  const notificationTypes = [
    { value: 'info', label: 'Bilgi', icon: 'ℹ️' },
    { value: 'success', label: 'Başarı', icon: '✅' },
    { value: 'warning', label: 'Uyarı', icon: '⚠️' },
    { value: 'error', label: 'Hata', icon: '❌' },
    { value: 'promotion', label: 'Promosyon', icon: '🎁' },
    { value: 'order', label: 'Sipariş', icon: '📦' },
  ]

  useEffect(() => {
    loadNotifications()
  }, [])

  useEffect(() => {
    if (userSearchQuery.length >= 2) {
      searchUsers()
    } else {
      setUsers([])
    }
  }, [userSearchQuery])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const { api } = await import('@/lib/api')
      const response = await api.get<any>('/admin/notifications')
      const data = response as any
      
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async () => {
    try {
      const { api } = await import('@/lib/api')
      const response = await api.get<any>(`/admin/users?search=${encodeURIComponent(userSearchQuery)}&limit=20`)
      const data = response as any
      
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.message) {
      alert('Başlık ve mesaj gereklidir')
      return
    }

    if (formData.targetType === 'user' && !formData.userId && selectedUsers.length === 0) {
      alert('Lütfen en az bir kullanıcı seçin')
      return
    }

    try {
      setSending(true)
      const { api } = await import('@/lib/api')
      
      const userIds = formData.targetType === 'user' && formData.userId
        ? [parseInt(formData.userId)]
        : selectedUsers.length > 0
        ? selectedUsers
        : []

      if (userIds.length === 0) {
        alert('Lütfen en az bir kullanıcı seçin')
        return
      }

      const payload = {
        userIds,
        title: formData.title,
        message: formData.message,
        type: formData.type,
      }

      const response = await api.post<any>('/admin/notifications/send', payload)
      const data = response as any

      if (data.success) {
        alert(`Bildirim ${data.sentCount || userIds.length} kullanıcıya gönderildi`)
        setIsModalOpen(false)
        setFormData({
          title: '',
          message: '',
          type: 'info',
          targetType: 'user',
          userId: '',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: ''
        })
        setSelectedUsers([])
        loadNotifications()
      } else {
        alert('Bildirim gönderilemedi: ' + (data.message || 'Bilinmeyen hata'))
      }
    } catch (error: any) {
      console.error('Error sending notification:', error)
      alert('Bildirim gönderilirken hata oluştu: ' + (error?.message || 'Bilinmeyen hata'))
    } finally {
      setSending(false)
    }
  }

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'error': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      case 'promotion': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'order': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Bildirim Yönetimi</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kullanıcılara özel bildirim gönderin</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Bildirim
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Toplam Bildirim</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{notifications.length}</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Okunma Oranı</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {notifications.length > 0
              ? ((notifications.filter(n => n.isRead).length / notifications.length) * 100).toFixed(0)
              : '0'}%
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Okunmamış</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {notifications.filter(n => !n.isRead).length}
          </p>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bildirim Geçmişi</h3>
          <button
            onClick={loadNotifications}
            className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Yenile
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-500 dark:text-slate-400 mt-4">Yükleniyor...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Henüz bildirim gönderilmedi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md transition-shadow bg-white dark:bg-dark-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{notif.title}</h4>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getTypeColor(notif.type)}`}>
                        {notificationTypes.find(t => t.value === notif.type)?.label || notif.type}
                      </span>
                      {!notif.isRead && (
                        <span className="px-2 py-1 rounded-full bg-blue-500 text-white text-xs">Yeni</span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">{notif.message}</p>
                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>👤 {notif.userName} ({notif.userEmail})</span>
                      <span>📅 {formatDate(notif.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Yeni Bildirim</h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-6 h-6 text-slate-800 dark:text-slate-100" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Başlık *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Bildirim başlığı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Mesaj *</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                    rows={3}
                    placeholder="Bildirim mesajı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Bildirim Tipi</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100"
                  >
                    {notificationTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Hedef Kullanıcılar</label>
                  <div className="space-y-3">
                    <label className="flex items-center text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="targetType"
                        checked={formData.targetType === 'user'}
                        onChange={() => {
                          setFormData({ ...formData, targetType: 'user', userId: '' })
                          setSelectedUsers([])
                        }}
                        className="mr-2"
                      />
                      Tek Kullanıcı
                    </label>
                    <label className="flex items-center text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="targetType"
                        checked={formData.targetType === 'multiple'}
                        onChange={() => setFormData({ ...formData, targetType: 'multiple', userId: '' })}
                        className="mr-2"
                      />
                      Birden Fazla Kullanıcı
                    </label>
                  </div>
                  
                  {formData.targetType === 'user' && (
                    <div className="mt-3 relative">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 relative">
                          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => {
                              setUserSearchQuery(e.target.value)
                              setShowUserSearch(true)
                            }}
                            onFocus={() => setShowUserSearch(true)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
                            placeholder="Kullanıcı ara (isim veya email)"
                          />
                        </div>
                      </div>
                      {showUserSearch && users.length > 0 && (
                        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {users.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, userId: user.id.toString() })
                                setShowUserSearch(false)
                                setUserSearchQuery('')
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-100">{user.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                              </div>
                              {formData.userId === user.id.toString() && (
                                <UserCheck className="w-5 h-5 text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.userId && (
                        <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-between">
                          <span className="text-sm text-blue-700 dark:text-blue-400">
                            Seçili: {users.find(u => u.id.toString() === formData.userId)?.name || 'Kullanıcı'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, userId: '' })}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.targetType === 'multiple' && (
                    <div className="mt-3 space-y-3">
                      <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value)
                            setShowUserSearch(true)
                          }}
                          onFocus={() => setShowUserSearch(true)}
                          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
                          placeholder="Kullanıcı ara (isim veya email)"
                        />
                      </div>
                      {showUserSearch && users.length > 0 && (
                        <div className="border border-slate-300 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto bg-white dark:bg-slate-800">
                          {users.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => toggleUserSelection(user.id)}
                              className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between ${
                                selectedUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                              }`}
                            >
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-100">{user.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <UserCheck className="w-5 h-5 text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedUsers.length > 0 && (
                        <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            {selectedUsers.length} kullanıcı seçildi
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Gönder
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
