'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listsApi } from '@/utils/api'
import Link from 'next/link'

interface ListItem {
  id: number
  productId: number
  productName: string
  productImage: string
  productPrice: number
  quantity: number
}

interface UserList {
  id: number
  name: string
  description: string
  createdAt: string
  items: ListItem[]
}

export default function ListelerPage() {
  const { user } = useAuth()
  const [lists, setLists] = useState<UserList[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedList, setSelectedList] = useState<UserList | null>(null)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadLists()
    }
  }, [user?.id])

  const loadLists = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await listsApi.getUserLists(user.id)
      if (response.success && response.data) {
        const formattedLists: UserList[] = response.data.map((list: any) => ({
          id: list.id,
          name: list.name,
          description: list.description || '',
          createdAt: list.createdAt,
          items: [] // itemCount var ama items array'i yok, detay sayfasında yüklenecek
        }))
        setLists(formattedLists)
      }
    } catch (error) {
      console.error('Listeler yüklenemedi:', error)
      alert('Listeler yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async () => {
    if (!newListName.trim() || !user?.id) {
      alert('Lütfen liste adı girin')
      return
    }

    try {
      const response = await listsApi.createList(user.id, newListName, newListDescription)
      if (response.success && response.data) {
        const newList: UserList = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description || '',
          createdAt: new Date().toISOString(),
          items: []
        }
        setLists([...lists, newList])
        setNewListName('')
        setNewListDescription('')
        setShowCreateModal(false)
      } else {
        alert(response.message || 'Liste oluşturulamadı')
      }
    } catch (error) {
      console.error('Liste oluşturulamadı:', error)
      alert('Liste oluşturulamadı. Lütfen tekrar deneyin.')
    }
  }

  const handleDeleteList = async (listId: number) => {
    if (!confirm('Bu listeyi silmek istediğinize emin misiniz?') || !user?.id) return

    try {
      const response = await listsApi.deleteList(listId, user.id)
      if (response.success) {
        setLists(lists.filter(list => list.id !== listId))
      } else {
        alert(response.message || 'Liste silinemedi')
      }
    } catch (error) {
      console.error('Liste silinemedi:', error)
      alert('Liste silinemedi. Lütfen tekrar deneyin.')
    }
  }

  const handleEditList = (list: UserList) => {
    setSelectedList(list)
    setNewListName(list.name)
    setNewListDescription(list.description)
    setShowEditModal(true)
  }

  const handleUpdateList = async () => {
    if (!selectedList || !newListName.trim() || !user?.id) {
      alert('Lütfen liste adı girin')
      return
    }

    try {
      const response = await listsApi.updateList(selectedList.id, user.id, newListName, newListDescription)
      if (response.success) {
        setLists(lists.map(list =>
          list.id === selectedList.id
            ? { ...list, name: newListName, description: newListDescription }
            : list
        ))
        setShowEditModal(false)
        setSelectedList(null)
        setNewListName('')
        setNewListDescription('')
      } else {
        alert(response.message || 'Liste güncellenemedi')
      }
    } catch (error) {
      console.error('Liste güncellenemedi:', error)
      alert('Liste güncellenemedi. Lütfen tekrar deneyin.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
            Listelerim
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Alışveriş listelerinizi oluşturun ve yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Yeni Liste</span>
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-500 mb-4">
            list
          </span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Henüz liste oluşturmadınız
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            İlk listenizi oluşturarak başlayın
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Liste Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {list.name}
                  </h3>
                  {list.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {list.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditList(list)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Düzenle"
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Sil"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>{(list as any).itemCount || 0} ürün</span>
                <span>
                  {new Date(list.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <Link
                href={`/panel/listeler/${list.id}`}
                className="block w-full py-2 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Listeyi Görüntüle
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Yeni Liste Oluştur
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewListName('')
                  setNewListDescription('')
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Liste Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  placeholder="Örn: Yaz Koleksiyonu"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                  placeholder="Liste hakkında kısa bir açıklama (opsiyonel)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewListName('')
                    setNewListDescription('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateList}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Listeyi Düzenle
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedList(null)
                  setNewListName('')
                  setNewListDescription('')
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Liste Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedList(null)
                    setNewListName('')
                    setNewListDescription('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateList}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

