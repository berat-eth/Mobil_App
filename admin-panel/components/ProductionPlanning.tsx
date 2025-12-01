'use client'

import { useEffect, useState } from 'react'
import { Factory, Package, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Search, Filter, Edit, Trash2, ClipboardList, X, BarChart3, Users, Zap, LayoutGrid, List, ChevronDown, Eye, PlayCircle, PauseCircle } from 'lucide-react'
import { productService } from '@/lib/services'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface ProductionPlan {
  id: number
  productName: string
  productCode: string
  plannedQuantity: number
  producedQuantity: number
  unit: string
  startDate: string
  endDate: string
  status: 'Planlandı' | 'Üretimde' | 'Tamamlandı' | 'Gecikmiş'
  priority: 'Düşük' | 'Orta' | 'Yüksek' | 'Acil'
  importance_level: 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik'
  factory: string
  notes: string
  assignedTeam?: string
  estimatedDays?: number
}

export default function ProductionPlanning() {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [lowStock, setLowStock] = useState<Array<{ id: number; name: string; sku?: string; stock: number; image?: string; sizes?: Record<string, number> }>>([])
  const [loadingLowStock, setLoadingLowStock] = useState(false)
  const [errorLowStock, setErrorLowStock] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterImportance, setFilterImportance] = useState<string>('all')
  const [filterFactory, setFilterFactory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string; sku?: string; stock: number; image?: string; sizes?: Record<string, number> } | null>(null)
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
    'XS': 0,
    'S': 0,
    'M': 0,
    'L': 0,
    'XL': 0,
    '2XL': 0,
    '3XL': 0,
    '4XL': 0,
    '5XL': 0,
  })
  const [selectedImportance, setSelectedImportance] = useState<'Düşük' | 'Orta' | 'Yüksek' | 'Kritik'>('Orta')
  const [sizeStocks, setSizeStocks] = useState<Array<{ id: number; name: string; sku?: string; image?: string; sizes: Record<string, number> }>>([])
  const [loadingSizeStocks, setLoadingSizeStocks] = useState(false)

  const statusColors = {
    'Planlandı': 'bg-blue-100 text-blue-700 border-blue-200',
    'Üretimde': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Tamamlandı': 'bg-green-100 text-green-700 border-green-200',
    'Gecikmiş': 'bg-red-100 text-red-700 border-red-200',
  }

  const priorityColors = {
    'Düşük': 'bg-slate-100 text-slate-700',
    'Orta': 'bg-blue-100 text-blue-700',
    'Yüksek': 'bg-orange-100 text-orange-700',
    'Acil': 'bg-red-100 text-red-700',
  }

  const importanceColors = {
    'Düşük': 'bg-gray-100 text-gray-700',
    'Orta': 'bg-blue-100 text-blue-700',
    'Yüksek': 'bg-orange-100 text-orange-700',
    'Kritik': 'bg-red-100 text-red-700',
  }

  const statusIcons = {
    'Planlandı': Clock,
    'Üretimde': Factory,
    'Tamamlandı': CheckCircle,
    'Gecikmiş': AlertCircle,
  }

  // Beden stoklarını çek
  useEffect(() => {
    let alive = true
    ; (async () => {
      try {
        setLoadingSizeStocks(true)
        // Düşük stoklu ürünleri çek
        const response = await api.get<any>('/admin/low-stock-products?threshold=10')
        if (alive && response.data.success) {
          const products = response.data.data || []
          
          setSizeStocks(products)
        }
      } catch (e: any) {
        console.error('Beden stokları alınamadı:', e)
        setSizeStocks([])
      } finally { 
        setLoadingSizeStocks(false) 
      }
    })()
    return () => { alive = false }
  }, [])

  // İstatistik kartları kaldırıldı (mock)
  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          setLoadingLowStock(true)
          setErrorLowStock(null)
          // Düşük stoklu ürünler API'si
          const response = await api.get<any>('/admin/low-stock-products?threshold=10')
          if (alive && response.data.success) {
            const products = response.data.data || []
            const sorted = [...products].sort((a, b) => (a.stock || 0) - (b.stock || 0))
            setLowStock(sorted)
          } else {
            setLowStock([])
          }
        } catch (e: any) {
          setErrorLowStock(e?.message || 'Düşük stok listesi alınamadı')
          setLowStock([])
        } finally { setLoadingLowStock(false) }
      })()
    return () => { alive = false }
  }, [])

  // Arama: 300ms debounce ile ürünleri isim/SKU'ya göre getir
  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      try {
        setSearching(true)
        if (searchQuery.trim().length >= 2) {
          const res = await productService.searchProducts(searchQuery.trim(), 1, 50)
          if (alive && (res as any)?.success && Array.isArray((res as any)?.data)) {
            const results = (res as any).data as Array<{ id: number; name: string; sku?: string; stock?: number; image?: string; category?: string }>
            // Kamp ve Silah Aksesuar kategorisindeki ürünleri filtrele
            const filteredResults = results.filter(p => 
              !p.category || 
              (!p.category.toLowerCase().includes('kamp') && 
               !p.category.toLowerCase().includes('camp') &&
               !p.category.toLowerCase().includes('silah') &&
               !p.category.toLowerCase().includes('aksesuar'))
            )
            
            // Her ürün için beden stoklarını çek
            const productsWithSizes = await Promise.all(
              filteredResults.map(async (product) => {
                try {
                  const variationsRes = await productService.getProductVariations(product.id)
                  if ((variationsRes as any)?.success && Array.isArray((variationsRes as any)?.data?.variations)) {
                    const variations = (variationsRes as any).data.variations
                    const sizes: Record<string, number> = {}
                    
                    variations.forEach((variation: any) => {
                      if (variation.size && variation.stock !== undefined) {
                        sizes[variation.size] = variation.stock
                      }
                    })
                    
                    return {
                      id: product.id,
                      name: product.name,
                      sku: (product as any).sku,
                      stock: product.stock ?? 0,
                      image: product.image,
                      sizes
                    }
                  }
                  return {
                    id: product.id,
                    name: product.name,
                    sku: (product as any).sku,
                    stock: product.stock ?? 0,
                    image: product.image,
                    sizes: {}
                  }
                } catch (error) {
                  return {
                    id: product.id,
                    name: product.name,
                    sku: (product as any).sku,
                    stock: product.stock ?? 0,
                    image: product.image,
                    sizes: {}
                  }
                }
              })
            )
            
            const sorted = [...productsWithSizes].sort((a, b) => (a.stock || 0) - (b.stock || 0))
            setLowStock(sorted)
          }
        } else {
          const res = await productService.getProducts(1, 50)
          if (alive && (res as any)?.success && Array.isArray((res as any)?.data?.products)) {
            const products = (res as any).data.products as Array<{ id: number; name: string; sku?: string; stock?: number; image?: string; category?: string }>
            // Kamp ve Silah Aksesuar kategorisindeki ürünleri filtrele
            const filteredProducts = products.filter(p => 
              !p.category || 
              (!p.category.toLowerCase().includes('kamp') && 
               !p.category.toLowerCase().includes('camp') &&
               !p.category.toLowerCase().includes('silah') &&
               !p.category.toLowerCase().includes('aksesuar'))
            )
            
            // Her ürün için beden stoklarını çek
            const productsWithSizes = await Promise.all(
              filteredProducts.map(async (product) => {
                try {
                  // Ürün detaylarını çek (variationDetails JSON'ını almak için)
                  const productRes = await productService.getProductById(product.id)
                  if ((productRes as any)?.success && (productRes as any)?.data) {
                    const productData = (productRes as any).data
                    const sizes: Record<string, number> = {}
                    
                    // variationDetails JSON'ını parse et
                    if (productData.variationDetails) {
                      try {
                        const variationDetails = typeof productData.variationDetails === 'string' 
                          ? JSON.parse(productData.variationDetails) 
                          : productData.variationDetails
                        
                        if (Array.isArray(variationDetails)) {
                          variationDetails.forEach((variation: any) => {
                            if (variation.attributes && variation.stok !== undefined) {
                              // attributes objesinden beden bilgisini çıkar
                              const attributes = variation.attributes
                              if (attributes && typeof attributes === 'object') {
                                // Beden bilgisini bul (Beden, Size, etc.)
                                const sizeKeys = Object.keys(attributes).filter(key => 
                                  key.toLowerCase().includes('beden') || 
                                  key.toLowerCase().includes('size')
                                )
                                
                                if (sizeKeys.length > 0) {
                                  const size = attributes[sizeKeys[0]]
                                  if (size && typeof size === 'string') {
                                    sizes[size] = parseInt(variation.stok) || 0
                                  }
                                }
                              }
                            } else if (variation.stok !== undefined) {
                              // Attributes yoksa ama stok varsa, varyasyon ID'sini beden olarak kullan
                              const bedenIsimleri = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
                              const index = variationDetails.indexOf(variation)
                              if (index < bedenIsimleri.length) {
                                const bedenAdi = bedenIsimleri[index]
                                sizes[bedenAdi] = parseInt(variation.stok) || 0
                              }
                            }
                          })
                        }
                      } catch (parseError) {
                        console.error(`Ürün ${product.id} variationDetails parse hatası:`, parseError)
                      }
                    }
                    
                    return {
                      id: product.id,
                      name: product.name,
                      sku: (product as any).sku,
                      stock: product.stock ?? 0,
                      image: product.image,
                      sizes
                    }
                  }
                  return {
                    id: product.id,
                    name: product.name,
                    sku: (product as any).sku,
                    stock: product.stock ?? 0,
                    image: product.image,
                    sizes: {}
                  }
                } catch (error) {
                  console.error(`Ürün ${product.id} detayları alınamadı:`, error)
                  return {
                    id: product.id,
                    name: product.name,
                    sku: (product as any).sku,
                    stock: product.stock ?? 0,
                    image: product.image,
                    sizes: {}
                  }
                }
              })
            )
            
            const sorted = [...productsWithSizes].sort((a, b) => (a.stock || 0) - (b.stock || 0))
            setLowStock(sorted)
          }
        }
      } finally { setSearching(false) }
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [searchQuery])

  const getProgressPercentage = (plan: ProductionPlan) => {
    return Math.round((plan.producedQuantity / plan.plannedQuantity) * 100)
  }

  const filteredPlans = plans.filter(plan => {
    if (filterStatus !== 'all' && plan.status !== filterStatus) return false
    if (filterPriority !== 'all' && plan.priority !== filterPriority) return false
    if (filterImportance !== 'all' && plan.importance_level !== filterImportance) return false
    if (filterFactory !== 'all' && plan.factory !== filterFactory) return false
    return true
  })

  const stats = {
    total: plans.length,
    planned: plans.filter(p => p.status === 'Planlandı').length,
    inProgress: plans.filter(p => p.status === 'Üretimde').length,
    completed: plans.filter(p => p.status === 'Tamamlandı').length,
    delayed: plans.filter(p => p.status === 'Gecikmiş').length,
    totalProduction: plans.reduce((sum, p) => sum + p.producedQuantity, 0),
    totalPlanned: plans.reduce((sum, p) => sum + p.plannedQuantity, 0),
  }

  const kanbanColumns = [
    { status: 'Planlandı', color: 'blue', icon: Clock },
    { status: 'Üretimde', color: 'yellow', icon: Factory },
    { status: 'Tamamlandı', color: 'green', icon: CheckCircle },
  ]

  const handleProductSelect = (product: { id: number; name: string; sku?: string; stock: number; image?: string; sizes?: Record<string, number> }) => {
    setSelectedProduct(product)
    setSizeQuantities({
      'XS': 0,
      'S': 0,
      'M': 0,
      'L': 0,
      'XL': 0,
      '2XL': 0,
      '3XL': 0,
      '4XL': 0,
      '5XL': 0,
    })
    setSelectedImportance('Orta')
    setShowSizeModal(true)
  }

  const handleSizeQuantityChange = (size: string, value: number) => {
    setSizeQuantities(prev => ({
      ...prev,
      [size]: Math.max(0, value)
    }))
  }

  const getTotalQuantity = () => {
    return Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0)
  }

  const handleCreateProductionRequest = async () => {
    const totalQty = getTotalQuantity()
    if (totalQty === 0) {
      alert('Lütfen en az bir beden için miktar girin')
      return
    }

    if (!selectedProduct) {
      alert('Ürün seçilmedi')
      return
    }

    try {
      // API çağrısı yap
      const response = await fetch('https://api.huglutekstil.com/api/admin/production-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: totalQty,
          status: 'planned',
          importance_level: selectedImportance,
          notes: `${selectedProduct.name} için üretim talebi - Bedenler: ${Object.entries(sizeQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([size, qty]) => `${size}: ${qty}`)
            .join(', ')}`
        })
      })

      if (!response.ok) {
        throw new Error('Üretim talebi oluşturulamadı')
      }

      const result = await response.json()
      
      if (result.success) {
        alert(`${selectedProduct.name} için toplam ${totalQty} adet üretim talebi oluşturuldu!`)
    setShowSizeModal(false)
        // Sayfayı yenile veya listeyi güncelle
        typeof window !== 'undefined' && window.location.reload()
      } else {
        throw new Error(result.message || 'Üretim talebi oluşturulamadı')
      }
    } catch (error) {
      console.error('Üretim talebi oluşturma hatası:', error)
      alert(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Üretim Planlama</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Fabrika üretim planlarını görselleştirin ve yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Plan</span>
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold">{stats.total}</span>
          </div>
          <p className="text-blue-100 text-sm">Toplam Plan</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-yellow-500 to-orange-500 dark:from-yellow-700 dark:to-orange-700 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Factory className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold">{stats.inProgress}</span>
          </div>
          <p className="text-orange-100 text-sm">Üretimde</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-700 dark:to-emerald-800 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold">{stats.completed}</span>
          </div>
          <p className="text-green-100 text-sm">Tamamlandı</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-700 dark:to-pink-800 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-3xl font-bold">{stats.totalPlanned > 0 ? Math.round((stats.totalProduction / stats.totalPlanned) * 100) : 0}%</span>
          </div>
          <p className="text-purple-100 text-sm">Genel İlerleme</p>
        </motion.div>
      </div>

      {/* Filtreler ve Arama */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ürün adı, kodu veya fabrika ara..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all ${showFilters ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'} border`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtreler</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="Planlandı">Planlandı</option>
              <option value="Üretimde">Üretimde</option>
              <option value="Tamamlandı">Tamamlandı</option>
              <option value="Gecikmiş">Gecikmiş</option>
            </select>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="Düşük">Düşük</option>
              <option value="Orta">Orta</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Acil">Acil</option>
            </select>

            <select
              value={filterImportance}
              onChange={e => setFilterImportance(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Önem Seviyeleri</option>
              <option value="Düşük">Düşük</option>
              <option value="Orta">Orta</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Kritik">Kritik</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fabrika</label>
                  <select
                    value={filterFactory}
                    onChange={e => setFilterFactory(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Fabrikalar</option>
                    <option value="Fabrika 1">Fabrika 1</option>
                    <option value="Fabrika 2">Fabrika 2</option>
                    <option value="Fabrika 3">Fabrika 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tarih Aralığı</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterStatus('all')
                      setFilterPriority('all')
                      setFilterImportance('all')
                      setFilterFactory('all')
                      setSearchQuery('')
                    }}
                    className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Düşük Stoklu Ürünler */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Düşük Stoklu Ürünler</h3>
            <p className="text-slate-500 text-sm mt-1">Üretim talebi oluşturmak için ürün seçin</p>
          </div>
          <button
            onClick={() => {
              (async () => {
                try {
                  setLoadingLowStock(true)
                  const res = await productService.getProducts(1, 50)
                  if ((res as any)?.success && Array.isArray((res as any)?.data?.products)) {
                    const products = (res as any).data.products as Array<{ id: number; name: string; sku?: string; stock?: number; image?: string; category?: string }>
                    // Kamp ve Silah Aksesuar kategorisindeki ürünleri filtrele
                    const filteredProducts = products.filter(p => 
                      !p.category || 
                      (!p.category.toLowerCase().includes('kamp') && 
                       !p.category.toLowerCase().includes('camp') &&
                       !p.category.toLowerCase().includes('silah') &&
                       !p.category.toLowerCase().includes('aksesuar'))
                    )
                    
                    // Her ürün için beden stoklarını çek
                    const productsWithSizes = await Promise.all(
                      filteredProducts.map(async (product) => {
                        try {
                          const variationsRes = await productService.getProductVariations(product.id)
                          if ((variationsRes as any)?.success && Array.isArray((variationsRes as any)?.data?.variations)) {
                            const variations = (variationsRes as any).data.variations
                            const sizes: Record<string, number> = {}
                            
                            variations.forEach((variation: any) => {
                              if (variation.size && variation.stock !== undefined) {
                                sizes[variation.size] = variation.stock
                              }
                            })
                            
                            return {
                              id: product.id,
                              name: product.name,
                              sku: (product as any).sku,
                              stock: product.stock ?? 0,
                              image: product.image,
                              sizes
                            }
                          }
                          return {
                            id: product.id,
                            name: product.name,
                            sku: (product as any).sku,
                            stock: product.stock ?? 0,
                            image: product.image,
                            sizes: {}
                          }
                        } catch (error) {
                          return {
                            id: product.id,
                            name: product.name,
                            sku: (product as any).sku,
                            stock: product.stock ?? 0,
                            image: product.image,
                            sizes: {}
                          }
                        }
                      })
                    )
                    
                    const sorted = [...productsWithSizes].sort((a, b) => (a.stock || 0) - (b.stock || 0))
                    setLowStock(sorted)
                  }
                } finally { setLoadingLowStock(false) }
              })()
            }}
            className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 text-sm transition-colors"
          >
            Yenile
          </button>
        </div>

        {(loadingLowStock || searching) && (
          <div className="text-center py-8 text-slate-500">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Yükleniyor...
          </div>
        )}

        {errorLowStock && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorLowStock}
          </div>
        )}

        {!loadingLowStock && !searching && !errorLowStock && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Görsel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ürün Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">XS</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">S</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">M</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">L</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">XL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">2XL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">3XL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">4XL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">5XL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Toplam</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStock.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{product.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-sm">{product.sku || '-'}</td>
                    {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map(size => (
                      <td key={size} className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          (product.sizes?.[size] || 0) === 0 ? 'bg-red-100 text-red-700' :
                          (product.sizes?.[size] || 0) < 10 ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {product.sizes?.[size] || 0}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        product.stock === 0 ? 'bg-red-100 text-red-700' :
                        product.stock < 50 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleProductSelect(product)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
                      >
                        Seç
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Üretim Planları Listesi */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Aktif Üretim Planları</h3>
        <div className="space-y-4">
          {plans.map((plan, index) => {
            const StatusIcon = statusIcons[plan.status]
            const progress = getProgressPercentage(plan)

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-6 flex-wrap lg:flex-nowrap">
                  {/* Sol - Ürün Bilgileri */}
                  <div className="flex items-start space-x-4 flex-1 min-w-[300px]">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                      <Package className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{plan.productName}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-mono">
                          {plan.productCode}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${priorityColors[plan.priority]}`}>
                          {plan.priority}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${importanceColors[plan.importance_level]}`}>
                          {plan.importance_level}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        <span className="flex items-center">
                          <Factory className="w-4 h-4 mr-1" />
                          {plan.factory}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {plan.startDate} - {plan.endDate}
                        </span>
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">Üretim İlerlemesi</span>
                          <span className="font-bold text-slate-800">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${progress === 100 ? 'bg-green-500' :
                                progress >= 70 ? 'bg-blue-500' :
                                  progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">{plan.notes}</p>
                    </div>
                  </div>

                  {/* Orta - Miktar Bilgileri */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Planlanan</p>
                      <p className="text-2xl font-bold text-slate-800">{plan.plannedQuantity.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{plan.unit}</p>
                    </div>
                    <div className="text-4xl text-slate-300">→</div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Üretilen</p>
                      <p className="text-2xl font-bold text-green-600">{plan.producedQuantity.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{plan.unit}</p>
                    </div>
                  </div>

                  {/* Sağ - Durum ve Aksiyonlar */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${statusColors[plan.status]}`}>
                      <StatusIcon className="w-4 h-4 mr-2" />
                      {plan.status}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Yeni Plan Ekleme Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-2xl font-bold text-slate-800">Yeni Üretim Planı</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ürün Adı</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ürün Kodu</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Planlanan Miktar</label>
                    <input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Birim</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Adet</option>
                      <option>Çift</option>
                      <option>Kg</option>
                      <option>Litre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Başlangıç Tarihi</label>
                    <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bitiş Tarihi</label>
                    <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fabrika</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Fabrika 1</option>
                      <option>Fabrika 2</option>
                      <option>Fabrika 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Öncelik</label>
                    <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Düşük</option>
                      <option>Orta</option>
                      <option>Yüksek</option>
                      <option>Acil</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notlar</label>
                  <textarea rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
                    Planı Kaydet
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beden Seçim ve Üretim Talebi Modalı */}
      <AnimatePresence>
        {showSizeModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSizeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-lg" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-white/20 border-2 border-white flex items-center justify-center">
                        <Package className="w-10 h-10" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{selectedProduct.name}</h3>
                      <p className="text-blue-100 text-sm">SKU: {selectedProduct.sku || 'N/A'} • Mevcut Stok: {selectedProduct.stock} adet</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSizeModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-2">Beden Seçimi ve Miktar Belirleme</h4>
                  <p className="text-slate-500 text-sm">Her beden için üretilecek miktarı girin</p>
                </div>

                {/* Önem Seviyesi Seçimi */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Önem Seviyesi</label>
                  <div className="grid grid-cols-4 gap-3">
                    {(['Düşük', 'Orta', 'Yüksek', 'Kritik'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedImportance(level)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          selectedImportance === level
                            ? `${importanceColors[level]} border-2 border-current shadow-lg`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mevcut Beden Stokları */}
                {selectedProduct.sizes && Object.keys(selectedProduct.sizes).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-slate-800 mb-3">Mevcut Beden Stokları</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {Object.entries(selectedProduct.sizes).map(([size, stock]) => (
                        <div key={size} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-center">
                            <div className="text-sm font-medium text-slate-600">{size}</div>
                            <div className={`text-lg font-bold ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {stock} adet
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beden Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {Object.keys(sizeQuantities).map((size) => (
                    <motion.div
                      key={size}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200 hover:border-blue-400 transition-all"
                    >
                      <label className="block mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-slate-800">{size}</span>
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${sizeQuantities[size] > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                            }`}>
                            {sizeQuantities[size] > 0 ? `${sizeQuantities[size]} adet` : 'Boş'}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={sizeQuantities[size]}
                            onChange={(e) => handleSizeQuantityChange(size, parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-semibold"
                            placeholder="0"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                            <button
                              onClick={() => handleSizeQuantityChange(size, sizeQuantities[size] + 1)}
                              className="w-6 h-6 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleSizeQuantityChange(size, Math.max(0, sizeQuantities[size] - 1))}
                              className="w-6 h-6 bg-slate-400 text-white rounded hover:bg-slate-500 flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                          </div>
                        </div>
                      </label>
                    </motion.div>
                  ))}
                </div>

                {/* Özet Bilgiler */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-200">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Toplam Miktar</p>
                      <p className="text-3xl font-bold text-blue-600">{getTotalQuantity()}</p>
                      <p className="text-xs text-slate-500">adet</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Seçilen Beden</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {Object.values(sizeQuantities).filter(q => q > 0).length}
                      </p>
                      <p className="text-xs text-slate-500">beden</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Mevcut Stok</p>
                      <p className="text-3xl font-bold text-orange-600">{selectedProduct.stock}</p>
                      <p className="text-xs text-slate-500">adet</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600 mb-1">Önem Seviyesi</p>
                      <p className={`text-2xl font-bold px-3 py-1 rounded-lg ${importanceColors[selectedImportance]}`}>
                        {selectedImportance}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hızlı Seçim Butonları */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-slate-700 mb-3">Hızlı Miktar Seçimi (Tüm Bedenler)</p>
                  <div className="flex gap-2 flex-wrap">
                    {[10, 25, 50, 100, 200].map(qty => (
                      <button
                        key={qty}
                        onClick={() => {
                          const newQuantities = { ...sizeQuantities }
                          Object.keys(newQuantities).forEach(size => {
                            newQuantities[size] = qty
                          })
                          setSizeQuantities(newQuantities)
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                      >
                        {qty} adet
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const newQuantities = { ...sizeQuantities }
                        Object.keys(newQuantities).forEach(size => {
                          newQuantities[size] = 0
                        })
                        setSizeQuantities(newQuantities)
                      }}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      Temizle
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateProductionRequest}
                    disabled={getTotalQuantity() === 0}
                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${getTotalQuantity() === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02]'
                      }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Factory className="w-6 h-6" />
                      Üretim Talebi Oluştur
                    </span>
                  </button>
                  <button
                    onClick={() => setShowSizeModal(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold text-lg"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
