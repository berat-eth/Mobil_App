'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { listsApi, productsApi, customProductionApi } from '@/utils/api'
import Link from 'next/link'
import Image from 'next/image'
import { createPortal } from 'react-dom'

interface ListItem {
  id: number
  productId: number
  productName: string
  productImage?: string
  productPrice: number
  quantity: number
  notes?: string
  sizes?: Record<string, number> // Beden dağılımı: { "M": 5, "L": 10, ... }
}

interface UserList {
  id: number
  name: string
  description: string
  createdAt: string
  items: ListItem[]
}

interface Product {
  id: number
  name: string
  price: number
  image?: string
  brand?: string
  category?: string
  stock?: number
}

export default function ListeDetayPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const listId = params?.id ? parseInt(params.id as string) : null

  const [list, setList] = useState<UserList | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({})
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingItem, setEditingItem] = useState<ListItem | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [isCreatingRequest, setIsCreatingRequest] = useState(false)
  const [requestNotes, setRequestNotes] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [itemSizes, setItemSizes] = useState<Record<number, Record<string, number>>>({})
  
  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (listId && user?.id) {
      loadList()
    }
  }, [listId, user?.id])

  const loadList = async () => {
    if (!listId || !user?.id) return

    try {
      setLoading(true)
      const response = await listsApi.getListById(listId, user.id)
      if (response.success && response.data) {
        const listData = response.data
        // Ensure productPrice is a number
        const normalizedItems = (listData.items || []).map((item: any) => ({
          ...item,
          productPrice: typeof item.productPrice === 'string' 
            ? parseFloat(item.productPrice) || 0 
            : (typeof item.productPrice === 'number' ? item.productPrice : 0),
          quantity: typeof item.quantity === 'string' 
            ? parseInt(item.quantity) || 1 
            : (typeof item.quantity === 'number' ? item.quantity : 1)
        }))
        const itemsWithSizes = normalizedItems.map((item: any) => {
          // Notes'tan beden bilgilerini parse et
          let sizes: Record<string, number> = {}
          if (item.notes) {
            const bedenMatch = item.notes.match(/Beden:\s*([^\n]+)/i)
            if (bedenMatch) {
              const bedenString = bedenMatch[1]
              bedenString.split(',').forEach((part: string) => {
                const match = part.trim().match(/(\w+):\s*(\d+)/)
                if (match) {
                  sizes[match[1]] = parseInt(match[2])
                }
              })
            }
          }
          
          return {
            ...item,
            sizes: item.sizes || item.customizations?.sizes || sizes,
            // Beden bilgisini notes'tan çıkar
            notes: item.notes ? item.notes.replace(/\n?Beden:.*/i, '').trim() : ''
          }
        })
        setList({
          id: listData.id,
          name: listData.name,
          description: listData.description || '',
          createdAt: listData.createdAt,
          items: itemsWithSizes
        })
        
        // Mevcut beden bilgilerini state'e yükle
        const sizesState: Record<number, Record<string, number>> = {}
        itemsWithSizes.forEach((item: any) => {
          if (item.sizes && Object.keys(item.sizes).length > 0) {
            sizesState[item.id] = item.sizes
          }
        })
        setItemSizes(sizesState)
      } else {
        alert('Liste bulunamadı')
        router.push('/panel/listeler')
      }
    } catch (error) {
      console.error('Liste yüklenemedi:', error)
      alert('Liste yüklenemedi. Lütfen tekrar deneyin.')
      router.push('/panel/listeler')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await productsApi.filterProducts({
        tekstilOnly: true
      })
      if (response.success && response.data && Array.isArray(response.data)) {
        setProducts(response.data)
      }
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error)
    }
  }

  const handleAddProducts = async () => {
    if (selectedProducts.size === 0 || !listId || !user?.id) {
      alert('Lütfen en az bir ürün seçin')
      return
    }

    setIsAdding(true)
    try {
      const addPromises = Array.from(selectedProducts).map(productId => {
        const qty = productQuantities[productId] || 1
        return listsApi.addProductToList(
          listId,
          user.id,
          productId,
          qty,
          notes
        )
      })

      const results = await Promise.all(addPromises)
      const failed = results.filter(r => !r.success)
      
      if (failed.length > 0) {
        alert(`${failed.length} ürün eklenemedi. Diğer ürünler eklendi.`)
      } else {
        alert(`${selectedProducts.size} ürün başarıyla eklendi`)
      }

      await loadList()
      setShowAddProductModal(false)
      setSelectedProducts(new Set())
      setProductQuantities({})
      setQuantity(1)
      setNotes('')
      setSearchQuery('')
    } catch (error) {
      console.error('Ürünler eklenemedi:', error)
      alert('Ürünler eklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setIsAdding(false)
    }
  }

  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
      const newQuantities = { ...productQuantities }
      delete newQuantities[productId]
      setProductQuantities(newQuantities)
    } else {
      newSelected.add(productId)
      setProductQuantities({ ...productQuantities, [productId]: 1 })
    }
    setSelectedProducts(newSelected)
  }

  const updateProductQuantity = (productId: number, qty: number) => {
    setProductQuantities({ ...productQuantities, [productId]: Math.max(1, qty) })
  }

  const handleCreateRequest = async () => {
    if (!list || !user?.id || list.items.length === 0) {
      alert('Liste boş veya kullanıcı bilgisi bulunamadı')
      return
    }

    if (!user.name || !user.email) {
      alert('Lütfen profil bilgilerinizi tamamlayın (Ad Soyad ve E-posta)')
      return
    }

    setIsCreatingRequest(true)
    try {
      const items = list.items.map(item => {
        const itemSizeData = itemSizes[item.id] || item.sizes || {}
        const sizesString = Object.entries(itemSizeData)
          .filter(([_, qty]) => qty > 0)
          .map(([size, qty]) => `${size}: ${qty}`)
          .join(', ')
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          customizations: {
            notes: item.notes || '',
            productName: item.productName,
            sizes: itemSizeData,
            sizesString: sizesString
          },
          productPrice: typeof item.productPrice === 'number' ? item.productPrice : parseFloat(String(item.productPrice)) || 0
        }
      })

      const requestData = {
        userId: user.id,
        items: items,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone || undefined,
        companyName: user.companyName || undefined,
        notes: `Liste: ${list.name}\n${list.description ? `Açıklama: ${list.description}\n` : ''}${requestNotes ? `\nEk Notlar:\n${requestNotes}` : ''}`
      }

      const response = await customProductionApi.createRequest(requestData)
      
      if (response.success && response.data) {
        alert(`Talep başarıyla oluşturuldu!\nTalep No: ${response.data.requestNumber}`)
        setShowCreateRequestModal(false)
        setRequestNotes('')
        // Talep sayfasına yönlendir (eğer varsa)
        router.push(`/panel/teklifler`)
      } else {
        alert(response.message || 'Talep oluşturulamadı')
      }
    } catch (error) {
      console.error('Talep oluşturulamadı:', error)
      alert('Talep oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setIsCreatingRequest(false)
    }
  }

  const handleRemoveProduct = async (itemId: number) => {
    if (!confirm('Bu ürünü listeden çıkarmak istediğinize emin misiniz?') || !listId || !user?.id) return

    try {
      const response = await listsApi.removeProductFromList(listId, itemId, user.id)
      if (response.success) {
        await loadList()
      } else {
        alert(response.message || 'Ürün çıkarılamadı')
      }
    } catch (error) {
      console.error('Ürün çıkarılamadı:', error)
      alert('Ürün çıkarılamadı. Lütfen tekrar deneyin.')
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !listId || !user?.id) return

    try {
      const response = await listsApi.updateListItem(
        listId,
        editingItem.id,
        user.id,
        quantity,
        notes
      )
      if (response.success) {
        await loadList()
        setEditingItem(null)
        setQuantity(1)
        setNotes('')
      } else {
        alert(response.message || 'Ürün güncellenemedi')
      }
    } catch (error) {
      console.error('Ürün güncellenemedi:', error)
      alert('Ürün güncellenemedi. Lütfen tekrar deneyin.')
    }
  }

  const openAddProductModal = () => {
    setShowAddProductModal(true)
    setSelectedProducts(new Set())
    setProductQuantities({})
    setQuantity(1)
    setNotes('')
    setSearchQuery('')
    loadProducts()
  }

  const openEditModal = (item: ListItem) => {
    setEditingItem(item)
    setQuantity(item.quantity)
    setNotes(item.notes || '')
    // Beden bilgilerini de yükle
    if (item.sizes) {
      setItemSizes({ ...itemSizes, [item.id]: item.sizes })
    }
  }

  const toggleItemExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const updateItemSize = (itemId: number, size: string, quantity: number) => {
    const currentSizes = itemSizes[itemId] || {}
    const newSizes = { ...currentSizes, [size]: Math.max(0, quantity) }
    // Eğer 0 ise, o bedeni kaldır
    if (quantity === 0) {
      delete newSizes[size]
    }
    setItemSizes({ ...itemSizes, [itemId]: newSizes })
  }

  const saveItemSizes = async (itemId: number) => {
    if (!listId || !user?.id || !list) return

    const sizes = itemSizes[itemId] || {}
    const sizesNotes = Object.entries(sizes)
      .filter(([_, qty]) => qty > 0)
      .map(([size, qty]) => `${size}: ${qty}`)
      .join(', ')
    
    const notes = list.items.find(i => i.id === itemId)?.notes || ''
    const combinedNotes = sizesNotes ? (notes ? `${notes}\nBeden: ${sizesNotes}` : `Beden: ${sizesNotes}`) : notes

    try {
      const response = await listsApi.updateListItem(
        listId,
        itemId,
        user.id,
        undefined,
        combinedNotes
      )
      if (response.success) {
        await loadList()
        setExpandedItems(new Set(Array.from(expandedItems).filter(id => id !== itemId)))
      } else {
        alert(response.message || 'Beden bilgileri kaydedilemedi')
      }
    } catch (error) {
      console.error('Beden bilgileri kaydedilemedi:', error)
      alert('Beden bilgileri kaydedilemedi. Lütfen tekrar deneyin.')
    }
  }

  const filteredProducts = searchQuery
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products

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

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Liste bulunamadı</p>
        <Link
          href="/panel/listeler"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Listelere Dön
        </Link>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/panel/listeler"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
              {list.name}
            </h1>
            {list.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {list.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {list.items.length > 0 && (
            <button
              onClick={() => setShowCreateRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              <span className="material-symbols-outlined">request_quote</span>
              <span>Talep Oluştur</span>
            </button>
          )}
          <button
            onClick={openAddProductModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Ürün Ekle</span>
          </button>
        </div>
      </div>

      {/* List Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Ürün</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {list.items.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Oluşturulma</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {new Date(list.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      {list.items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-500 mb-4">
            shopping_cart
          </span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Liste boş
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Listeye ürün ekleyerek başlayın
          </p>
          <button
            onClick={openAddProductModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Ürün Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {list.items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-gray-400">
                        image
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {item.productName}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Adet: {item.quantity}</span>
                    {(() => {
                      const currentSizes = itemSizes[item.id] || item.sizes || {}
                      const totalSizes = Object.values(currentSizes).reduce((sum, qty) => sum + qty, 0)
                      if (totalSizes > 0) {
                        return (
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-semibold">
                            Beden Toplamı: {totalSizes} adet
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                      Not: {item.notes}
                    </p>
                  )}
                  
                  {/* Beden Bilgileri Toggle */}
                  <button
                    onClick={() => toggleItemExpanded(item.id)}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-2"
                  >
                    <span className="material-symbols-outlined text-lg transition-transform duration-200" style={{ transform: expandedItems.has(item.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      expand_more
                    </span>
                    <span>Beden Dağılımı {expandedItems.has(item.id) ? 'Gizle' : 'Göster'}</span>
                  </button>

                  {/* Beden Dağılımı (Açılıp Kapanabilir) */}
                  {expandedItems.has(item.id) && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {standardSizes.map((size) => {
                          const currentSizes = itemSizes[item.id] || item.sizes || {}
                          const qty = currentSizes[size] || 0
                          return (
                            <div key={size} className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {size}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={(e) => updateItemSize(item.id, size, parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white text-sm"
                                placeholder="0"
                              />
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold">Beden Toplamı:</span>{' '}
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {Object.values(itemSizes[item.id] || item.sizes || {}).reduce((sum, qty) => sum + qty, 0)} adet
                            </span>
                          </div>
                          {(() => {
                            const currentSizes = itemSizes[item.id] || item.sizes || {}
                            const sizeDetails = Object.entries(currentSizes)
                              .filter(([_, qty]) => qty > 0)
                              .map(([size, qty]) => `${size}: ${qty}`)
                              .join(', ')
                            if (sizeDetails) {
                              return (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ({sizeDetails})
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                        <button
                          onClick={() => saveItemSizes(item.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Düzenle"
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button
                    onClick={() => handleRemoveProduct(item.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Kaldır"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddProductModal(false)
            setSelectedProducts(new Set())
            setProductQuantities({})
            setSearchQuery('')
          }
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ürün Ekle
              </h2>
              <button
                onClick={() => {
                  setShowAddProductModal(false)
                  setSelectedProducts(new Set())
                  setProductQuantities({})
                  setSearchQuery('')
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ürün ara..."
                  className="w-full px-4 py-3 pl-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
              </div>

              {/* Selected Count */}
              {selectedProducts.size > 0 && (
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {selectedProducts.size} ürün seçildi
                  </p>
                </div>
              )}

              {/* Product List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const productQty = productQuantities[product.id] || 1
                  return (
                    <div
                      key={product.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProductSelection(product.id)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-2xl text-gray-400">
                                image
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate">
                            {product.name}
                          </h3>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">Adet:</label>
                            <input
                              type="number"
                              min="1"
                              value={productQty}
                              onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedProducts.size > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Genel Not (Opsiyonel) - Tüm seçili ürünler için geçerli
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                      placeholder="Tüm seçili ürünler için not ekleyin..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAddProductModal(false)
                  setSelectedProducts(new Set())
                  setProductQuantities({})
                  setSearchQuery('')
                }}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddProducts}
                disabled={selectedProducts.size === 0 || isAdding}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                    <span>Ekleniyor...</span>
                  </>
                ) : (
                  <>
                    <span>Seçili Ürünleri Ekle ({selectedProducts.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Edit Item Modal */}
      {editingItem && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setEditingItem(null)
            setQuantity(1)
            setNotes('')
          }
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ürünü Düzenle
              </h2>
              <button
                onClick={() => {
                  setEditingItem(null)
                  setQuantity(1)
                  setNotes('')
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Adet
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Not (Opsiyonel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setEditingItem(null)
                  setQuantity(1)
                  setNotes('')
                }}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateItem}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Create Request Modal */}
      {showCreateRequestModal && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCreateRequestModal(false)
            setRequestNotes('')
          }
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Talep Oluştur
              </h2>
              <button
                onClick={() => {
                  setShowCreateRequestModal(false)
                  setRequestNotes('')
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Liste Bilgileri */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Liste Bilgileri</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Liste Adı:</span> <span className="text-gray-600 dark:text-gray-400">{list.name}</span></p>
                  {list.description && (
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Açıklama:</span> <span className="text-gray-600 dark:text-gray-400">{list.description}</span></p>
                  )}
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Toplam Ürün:</span> <span className="text-gray-600 dark:text-gray-400">{list.items.length} adet</span></p>
                </div>
              </div>

              {/* Ürün Listesi */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Talep Edilecek Ürünler</h3>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  {list.items.map((item, index) => {
                    const itemSizeData = itemSizes[item.id] || item.sizes || {}
                    const sizesString = Object.entries(itemSizeData)
                      .filter(([_, qty]) => qty > 0)
                      .map(([size, qty]) => `${size}: ${qty}`)
                      .join(', ')
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{index + 1}. {item.productName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Adet: {item.quantity}</p>
                          {sizesString && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">Beden: {sizesString}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-1">Not: {item.notes}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Müşteri Bilgileri */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Müşteri Bilgileri</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Ad Soyad:</span> <span className="text-gray-600 dark:text-gray-400">{user?.name || 'Belirtilmemiş'}</span></p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">E-posta:</span> <span className="text-gray-600 dark:text-gray-400">{user?.email || 'Belirtilmemiş'}</span></p>
                  {user?.phone && (
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Telefon:</span> <span className="text-gray-600 dark:text-gray-400">{user.phone}</span></p>
                  )}
                  {user?.companyName && (
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Şirket:</span> <span className="text-gray-600 dark:text-gray-400">{user.companyName}</span></p>
                  )}
                </div>
              </div>

              {/* Ek Notlar */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ek Notlar (Opsiyonel)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                  placeholder="Talep hakkında ek bilgiler ekleyebilirsiniz..."
                />
              </div>

              {/* Uyarı */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">info</span>
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-1">Bilgilendirme</p>
                    <p>Listedeki tüm ürünler talep olarak gönderilecektir. Talep oluşturulduktan sonra teklifler sayfasından takip edebilirsiniz.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowCreateRequestModal(false)
                  setRequestNotes('')
                }}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={isCreatingRequest || !user?.name || !user?.email}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingRequest ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                    <span>Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Talep Oluştur</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

