'use client'

import { useEffect, useState } from 'react'
import { FileText, Search, Filter, Calendar, User, Package, Calculator, Save, RefreshCw, Archive, CheckCircle, XCircle, Edit, Eye, X, Download, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, ApiResponse } from '@/lib/api'
import { productService } from '@/lib/services/productService'

interface ProformaRequest {
  id: number
  requestNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  companyName?: string
  createdAt: string
  status: string
  items?: ProformaItem[]
  totalQuantity?: number
}

interface ProformaItem {
  id: number
  productId: number
  productName: string
  productImage?: string
  quantity: number
  customizations?: any
  sizeDistribution?: SizeDistribution
}

interface ManualInvoiceItem {
  id: string // Geçici ID
  productId?: number
  productName: string
  productImage?: string
  quantity: number
  sizeDistribution?: SizeDistribution
}

interface Product {
  id: number
  name: string
  image?: string
  price?: number
  brand?: string
  category?: string
}

interface SizeDistribution {
  [key: string]: number // Beden: Adet (örn: { "S": 10, "M": 20, "L": 15 })
}

interface CostInputs {
  unitCost: number // Birim maliyeti
  printingCost: number // Baskı maliyeti
  embroideryCost: number // Nakış maliyeti
}

interface ItemCalculation {
  itemId: number
  productName: string
  quantity: number
  totalCost: number
  unitPrice: number
  finalUnitPrice: number
  totalOfferAmount: number
  vatAmount: number
  totalWithVat: number
}

interface CalculationResult {
  itemCalculations: ItemCalculation[]
  totalCost: number
  totalQuantity: number
  profitMargin: number
  vatRate: number
  totalOfferAmount: number
  totalVatAmount: number
  totalWithVat: number
  profitPercentage: number
}

export default function ProformaInvoice() {
  // Talep listesi
  const [requests, setRequests] = useState<ProformaRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtreler
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Seçili talep
  const [selectedRequest, setSelectedRequest] = useState<ProformaRequest | null>(null)
  const [selectedItems, setSelectedItems] = useState<ProformaItem[]>([])
  
  // Maliyet girişi - Her ürün için ayrı
  const [itemCosts, setItemCosts] = useState<Record<number, CostInputs>>({})
  
  // Hesaplama sonuçları
  const [calculation, setCalculation] = useState<CalculationResult | null>(null)
  const [profitMargin, setProfitMargin] = useState<number>(0) // Kâr marjı yüzdesi
  const [vatRate, setVatRate] = useState<number>(10) // KDV oranı (%)
  const [sharedShippingCost, setSharedShippingCost] = useState<number>(0) // Paylaşılan kargo maliyeti
  
  // KDV oranları
  const vatRates = [0, 1, 10, 20]
  
  // Teklif oluşturma
  const [unitSalePrice, setUnitSalePrice] = useState<number>(0)
  const [totalOfferAmount, setTotalOfferAmount] = useState<number>(0)
  const [profitPercentage, setProfitPercentage] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  
  // Manuel fatura oluşturma
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState<boolean>(false)
  const [manualCustomerName, setManualCustomerName] = useState<string>('')
  const [manualCustomerEmail, setManualCustomerEmail] = useState<string>('')
  const [manualCustomerPhone, setManualCustomerPhone] = useState<string>('')
  const [manualCompanyName, setManualCompanyName] = useState<string>('')
  const [manualInvoiceDate, setManualInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [manualItems, setManualItems] = useState<ManualInvoiceItem[]>([])
  const [manualItemCosts, setManualItemCosts] = useState<Record<string, CostInputs>>({})
  const [manualCalculation, setManualCalculation] = useState<CalculationResult | null>(null)
  const [manualRequestId, setManualRequestId] = useState<number | null>(null)
  
  // Ürün arama
  const [productSearchQueries, setProductSearchQueries] = useState<Record<string, string>>({})
  const [productSearchResults, setProductSearchResults] = useState<Record<string, Product[]>>({})
  const [productSearchLoading, setProductSearchLoading] = useState<Record<string, boolean>>({})
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<string, boolean>>({})
  
  useEffect(() => {
    loadRequests()
  }, [])
  
  useEffect(() => {
    if (selectedRequest) {
      loadRequestDetails(selectedRequest.id)
      resetCosts()
    }
  }, [selectedRequest])
  
  useEffect(() => {
    calculateCosts()
  }, [itemCosts, profitMargin, selectedItems, sharedShippingCost, vatRate])
  
  useEffect(() => {
    if (showManualInvoiceModal) {
      calculateManualCosts()
    }
  }, [manualItemCosts, profitMargin, manualItems, sharedShippingCost, vatRate, showManualInvoiceModal])
  
  useEffect(() => {
    if (calculation) {
      // Ortalama birim fiyat hesapla (KDV hariç)
      const avgUnitPrice = calculation.totalQuantity > 0 
        ? calculation.totalOfferAmount / calculation.totalQuantity 
        : 0
      setUnitSalePrice(avgUnitPrice)
      setTotalOfferAmount(calculation.totalWithVat) // KDV dahil toplam tutar
      setProfitPercentage(calculation.profitPercentage)
    }
  }, [calculation])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<any>('/admin/custom-production-requests')
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        // Proforma fatura için uygun talepleri filtrele
        const proformaRequests = (res as any).data.map((r: any) => ({
          id: r.id,
          requestNumber: r.requestNumber || `REQ-${r.id}`,
          customerName: r.customerName || 'Bilinmeyen',
          customerEmail: r.customerEmail,
          customerPhone: r.customerPhone,
          companyName: r.companyName,
          createdAt: r.createdAt,
          status: r.status || 'pending',
          totalQuantity: r.totalQuantity || 0
        }))
        setRequests(proformaRequests)
      } else {
        setRequests([])
      }
    } catch (e: any) {
      setError(e?.message || 'Talepler getirilemedi')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const loadRequestDetails = async (requestId: number) => {
    try {
      const res = await api.get<any>(`/admin/custom-production-requests/${requestId}`)
      if ((res as any)?.success && (res as any).data) {
        const data = (res as any).data
        
        // Items'ları işle
        let items: ProformaItem[] = []
        if (data.items && Array.isArray(data.items)) {
          // Her item için ürün bilgilerini getir
          items = await Promise.all(
            data.items.map(async (item: any) => {
              let productName = item.productName || 'Bilinmeyen Ürün'
              let productImage = item.productImage
              
              // Ürün bilgilerini API'den çek
              if (item.productId) {
                try {
                  const productRes = await api.get<any>(`/products/${item.productId}`)
                  if ((productRes as any)?.success && (productRes as any).data) {
                    productName = (productRes as any).data.name || productName
                    productImage = (productRes as any).data.image || productImage
                  }
                } catch {
                  // Ürün bulunamazsa varsayılan değerler kullanılır
                }
              }
              
              // Beden dağılımını parse et
              let sizeDistribution: SizeDistribution | undefined
              if (item.customizations) {
                try {
                  const customizations = typeof item.customizations === 'string' 
                    ? JSON.parse(item.customizations) 
                    : item.customizations
                  
                  if (customizations.sizes && Array.isArray(customizations.sizes)) {
                    sizeDistribution = {}
                    customizations.sizes.forEach((sizeItem: any) => {
                      if (sizeItem.size && sizeItem.quantity) {
                        sizeDistribution![sizeItem.size] = sizeItem.quantity
                      }
                    })
                  } else if (customizations.sizeDistribution) {
                    sizeDistribution = customizations.sizeDistribution
                  }
                } catch {
                  // Parse hatası, boş bırak
                }
              }
              
              return {
                id: item.id,
                productId: item.productId,
                productName,
                productImage,
                quantity: item.quantity || 0,
                customizations: item.customizations,
                sizeDistribution
              }
            })
          )
        }
        
        setSelectedItems(items)
      }
    } catch (e: any) {
      console.error('Talep detayları getirilemedi:', e)
      setSelectedItems([])
    }
  }

  const resetCosts = () => {
    // Her ürün için maliyet girişlerini sıfırla
    // NOT: Veritabanından fiyat çekilmiyor, kullanıcının manuel girişi bekleniyor
    const newCosts: Record<number, CostInputs> = {}
    selectedItems.forEach(item => {
      newCosts[item.id] = {
        unitCost: 0, // Kullanıcının girdiği değer kullanılacak, veritabanı fiyatı kullanılmıyor
        printingCost: 0,
        embroideryCost: 0
      }
    })
    setItemCosts(newCosts)
    setProfitMargin(0)
    setVatRate(10) // Varsayılan KDV %10
    setSharedShippingCost(0)
  }

  const calculateCosts = () => {
    // Toplam adet hesapla
    const totalQuantity = selectedItems.reduce((sum, item) => {
      const sizeDist = item.sizeDistribution
      if (sizeDist) {
        return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
      }
      return sum + item.quantity
    }, 0)
    
    if (totalQuantity === 0 || selectedItems.length === 0) {
      setCalculation(null)
      return
    }
    
    // Her ürün için ayrı hesaplama yap
    const itemCalculations: ItemCalculation[] = []
    
    // Kargo maliyeti adet başına
    const shippingCostPerUnit = totalQuantity > 0 ? sharedShippingCost / totalQuantity : 0
    
    let totalCost = 0 // Kargo artık birim fiyata dahil olduğu için totalCost'a dahil edilmiyor
    
    selectedItems.forEach(item => {
      const costs = itemCosts[item.id] || {
        unitCost: 0,
        printingCost: 0,
        embroideryCost: 0
      }
      
      const sizeDist = item.sizeDistribution
      const itemQuantity = sizeDist 
        ? Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
        : item.quantity
      
      if (itemQuantity === 0) return
      
      // Ürün toplam maliyeti (birim maliyet + baskı + nakış)
      const itemTotalCost = 
        (costs.unitCost * itemQuantity) +
        costs.printingCost +
        costs.embroideryCost
      
      totalCost += itemTotalCost
      
      // Baskı ve nakış adet başına maliyetleri
      const printingCostPerUnit = costs.printingCost / itemQuantity
      const embroideryCostPerUnit = costs.embroideryCost / itemQuantity
      
      // Birim fiyatı (kâr marjı uygulanmış)
      const unitPriceBeforeMargin = costs.unitCost
      const unitPriceWithMargin = profitMargin > 0 
        ? unitPriceBeforeMargin * (1 + profitMargin / 100)
        : unitPriceBeforeMargin
      
      // Birim satış fiyatı = Birim fiyatı + baskı + nakış + kargo (KDV hariç)
      const unitSalePriceWithoutVat = unitPriceWithMargin + printingCostPerUnit + embroideryCostPerUnit + shippingCostPerUnit
      
      // KDV hesaplama (birim başına)
      const vatPerUnit = unitSalePriceWithoutVat * (vatRate / 100)
      
      // Final birim fiyat (KDV dahil) = Birim fiyatı + baskı + nakış + kargo + KDV
      const finalUnitPrice = unitSalePriceWithoutVat + vatPerUnit
      
      // Ürün teklif tutarı (KDV hariç)
      const itemTotalOfferAmount = unitSalePriceWithoutVat * itemQuantity
      
      // Toplam KDV
      const itemVatAmount = vatPerUnit * itemQuantity
      
      // Toplam (KDV dahil)
      const itemTotalWithVat = finalUnitPrice * itemQuantity
      
      itemCalculations.push({
        itemId: item.id,
        productName: item.productName,
        quantity: itemQuantity,
        totalCost: itemTotalCost,
        unitPrice: unitSalePriceWithoutVat, // Birim satış fiyatı (KDV hariç)
        finalUnitPrice, // Final birim fiyat (KDV dahil)
        totalOfferAmount: itemTotalOfferAmount,
        vatAmount: itemVatAmount,
        totalWithVat: itemTotalWithVat
      })
    })
    
    // Toplam maliyet (ürünler + kargo)
    const totalCostWithShipping = totalCost + sharedShippingCost
    
    // Toplam teklif tutarı (KDV hariç) - TÜM ÜRÜNLERİN TOPLAMI
    const totalOfferAmount = itemCalculations.reduce((sum, calc) => sum + calc.totalOfferAmount, 0)
    
    // Toplam KDV - TÜM ÜRÜNLERİN TOPLAMI
    const totalVatAmount = itemCalculations.reduce((sum, calc) => sum + calc.vatAmount, 0)
    
    // Toplam tutar (KDV dahil) - TÜM ÜRÜNLERİN TOPLAMI
    // Alternatif hesaplama: Her ürünün totalWithVat değerlerini topla
    const totalWithVatFromItems = itemCalculations.reduce((sum, calc) => sum + calc.totalWithVat, 0)
    // İki yöntem de aynı sonucu vermeli, güvenlik için ikisini de kontrol et
    const totalWithVat = totalOfferAmount + totalVatAmount
    
    // Hesaplama kontrolü (geliştirme aşamasında)
    if (Math.abs(totalWithVat - totalWithVatFromItems) > 0.01) {
      console.warn('Toplam hesaplama uyumsuzluğu:', { totalWithVat, totalWithVatFromItems })
    }
    
    // Kâr yüzdesi (kargo dahil toplam maliyet üzerinden)
    const profitPercentage = totalCostWithShipping > 0 
      ? ((totalOfferAmount - totalCostWithShipping) / totalCostWithShipping) * 100
      : 0
    
    setCalculation({
      itemCalculations,
      totalCost: totalCostWithShipping, // Kargo dahil toplam maliyet
      totalQuantity,
      profitMargin,
      vatRate,
      totalOfferAmount,
      totalVatAmount,
      totalWithVat,
      profitPercentage
    })
  }

  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null)

  const handleDeleteRequest = async (requestId: number, requestNumber: string, e: React.MouseEvent) => {
    e.stopPropagation() // Talep seçimini engelle
    
    if (!confirm(`"${requestNumber}" talebini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    try {
      setDeletingRequestId(requestId)
      setError(null)

      const response = await api.delete<ApiResponse<any>>(`/admin/custom-production-requests/${requestId}`)

      if (response.success) {
        // Silinen talep seçiliyse, seçimi temizle
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(null)
          setSelectedItems([])
          setCalculation(null)
        }
        
        // Talepleri yeniden yükle
        await loadRequests()
        
        // Başarı mesajı göster
        setError(null)
        const successMsg = 'Talep başarıyla silindi'
        setTimeout(() => {
          // Başarı mesajını göstermek için geçici olarak error state'ini kullanabiliriz
          // veya ayrı bir success state ekleyebiliriz
        }, 100)
      } else {
        throw new Error(response.message || 'Talep silinemedi')
      }
    } catch (err: any) {
      setError('Talep silinirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setDeletingRequestId(null)
    }
  }

  const handleSelectRequest = (request: ProformaRequest) => {
    setSelectedRequest(request)
  }

  const handleCostChange = (itemId: number, field: keyof CostInputs, value: string) => {
    // Boş string veya geçersiz değer için 0 kullan
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setItemCosts(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          unitCost: 0,
          printingCost: 0,
          embroideryCost: 0
        }),
        [field]: numValue
      }
    }))
  }
  
  const handleSharedShippingChange = (value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setSharedShippingCost(numValue)
  }
  
  const handleProfitMarginChange = (value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setProfitMargin(numValue)
  }
  
  // Manuel fatura hesaplama
  const calculateManualCosts = () => {
    const totalQuantity = manualItems.reduce((sum, item) => {
      const sizeDist = item.sizeDistribution
      if (sizeDist) {
        return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
      }
      return sum + item.quantity
    }, 0)
    
    if (totalQuantity === 0 || manualItems.length === 0) {
      setManualCalculation(null)
      return
    }
    
    const itemCalculations: ItemCalculation[] = []
    const shippingCostPerUnit = totalQuantity > 0 ? sharedShippingCost / totalQuantity : 0
    let totalCost = 0
    
    manualItems.forEach(item => {
      const costs = manualItemCosts[item.id] || {
        unitCost: 0,
        printingCost: 0,
        embroideryCost: 0
      }
      
      const sizeDist = item.sizeDistribution
      const itemQuantity = sizeDist 
        ? Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
        : item.quantity
      
      if (itemQuantity === 0) return
      
      const itemTotalCost = 
        (costs.unitCost * itemQuantity) +
        costs.printingCost +
        costs.embroideryCost
      
      totalCost += itemTotalCost
      
      const printingCostPerUnit = costs.printingCost / itemQuantity
      const embroideryCostPerUnit = costs.embroideryCost / itemQuantity
      
      const unitPriceBeforeMargin = costs.unitCost
      const unitPriceWithMargin = profitMargin > 0 
        ? unitPriceBeforeMargin * (1 + profitMargin / 100)
        : unitPriceBeforeMargin
      
      const unitSalePriceWithoutVat = unitPriceWithMargin + printingCostPerUnit + embroideryCostPerUnit + shippingCostPerUnit
      const vatPerUnit = unitSalePriceWithoutVat * (vatRate / 100)
      const finalUnitPrice = unitSalePriceWithoutVat + vatPerUnit
      const itemTotalOfferAmount = unitSalePriceWithoutVat * itemQuantity
      const itemVatAmount = vatPerUnit * itemQuantity
      const itemTotalWithVat = finalUnitPrice * itemQuantity
      
      itemCalculations.push({
        itemId: parseInt(item.id) || 0,
        productName: item.productName,
        quantity: itemQuantity,
        totalCost: itemTotalCost,
        unitPrice: unitSalePriceWithoutVat,
        finalUnitPrice,
        totalOfferAmount: itemTotalOfferAmount,
        vatAmount: itemVatAmount,
        totalWithVat: itemTotalWithVat
      })
    })
    
    const totalCostWithShipping = totalCost + sharedShippingCost
    const totalOfferAmount = itemCalculations.reduce((sum, calc) => sum + calc.totalOfferAmount, 0)
    const totalVatAmount = itemCalculations.reduce((sum, calc) => sum + calc.vatAmount, 0)
    const totalWithVat = totalOfferAmount + totalVatAmount
    const profitPercentage = totalCostWithShipping > 0 
      ? ((totalOfferAmount - totalCostWithShipping) / totalCostWithShipping) * 100
      : 0
    
    setManualCalculation({
      itemCalculations,
      totalCost: totalCostWithShipping,
      totalQuantity,
      profitMargin,
      vatRate,
      totalOfferAmount,
      totalVatAmount,
      totalWithVat,
      profitPercentage
    })
  }
  
  // Ürün arama
  const handleProductSearch = async (itemId: string, query: string) => {
    setProductSearchQueries(prev => ({ ...prev, [itemId]: query }))
    
    if (!query || query.trim().length < 2) {
      setProductSearchResults(prev => ({ ...prev, [itemId]: [] }))
      setShowProductDropdowns(prev => ({ ...prev, [itemId]: false }))
      return
    }
    
    setProductSearchLoading(prev => ({ ...prev, [itemId]: true }))
    setShowProductDropdowns(prev => ({ ...prev, [itemId]: true }))
    
    try {
      const response = await productService.searchProducts(query.trim(), 1, 20)
      if ((response as any)?.success && Array.isArray((response as any).data)) {
        setProductSearchResults(prev => ({ ...prev, [itemId]: (response as any).data }))
      } else {
        setProductSearchResults(prev => ({ ...prev, [itemId]: [] }))
      }
    } catch (error) {
      console.error('Ürün arama hatası:', error)
      setProductSearchResults(prev => ({ ...prev, [itemId]: [] }))
    } finally {
      setProductSearchLoading(prev => ({ ...prev, [itemId]: false }))
    }
  }
  
  const selectProduct = (itemId: string, product: Product) => {
    setManualItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, productId: product.id, productName: product.name, productImage: product.image }
        : item
    ))
    setProductSearchQueries(prev => ({ ...prev, [itemId]: product.name }))
    setShowProductDropdowns(prev => ({ ...prev, [itemId]: false }))
    setProductSearchResults(prev => ({ ...prev, [itemId]: [] }))
  }
  
  // Manuel fatura işlemleri
  const addManualItem = () => {
    const newItem: ManualInvoiceItem = {
      id: `manual-${Date.now()}-${Math.random()}`,
      productName: '',
      quantity: 1,
      sizeDistribution: undefined
    }
    setManualItems([...manualItems, newItem])
    setManualItemCosts({
      ...manualItemCosts,
      [newItem.id]: {
        unitCost: 0,
        printingCost: 0,
        embroideryCost: 0
      }
    })
    setProductSearchQueries(prev => ({ ...prev, [newItem.id]: '' }))
  }
  
  const removeManualItem = (itemId: string) => {
    setManualItems(manualItems.filter(item => item.id !== itemId))
    const newCosts = { ...manualItemCosts }
    delete newCosts[itemId]
    setManualItemCosts(newCosts)
    
    // Ürün arama state'lerini temizle
    const newQueries = { ...productSearchQueries }
    delete newQueries[itemId]
    setProductSearchQueries(newQueries)
    
    const newResults = { ...productSearchResults }
    delete newResults[itemId]
    setProductSearchResults(newResults)
    
    const newLoading = { ...productSearchLoading }
    delete newLoading[itemId]
    setProductSearchLoading(newLoading)
    
    const newDropdowns = { ...showProductDropdowns }
    delete newDropdowns[itemId]
    setShowProductDropdowns(newDropdowns)
  }
  
  const updateManualItem = (itemId: string, field: keyof ManualInvoiceItem, value: any) => {
    setManualItems(manualItems.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }
  
  const handleManualCostChange = (itemId: string, field: keyof CostInputs, value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Number(value)
    setManualItemCosts(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          unitCost: 0,
          printingCost: 0,
          embroideryCost: 0
        }),
        [field]: numValue
      }
    }))
  }
  
  const resetManualInvoice = () => {
    setManualCustomerName('')
    setManualCustomerEmail('')
    setManualCustomerPhone('')
    setManualCompanyName('')
    setManualInvoiceDate(new Date().toISOString().split('T')[0])
    setManualItems([])
    setManualItemCosts({})
    setManualCalculation(null)
    setManualRequestId(null)
    setProfitMargin(0)
    setVatRate(10)
    setSharedShippingCost(0)
    setNotes('')
    setProductSearchQueries({})
    setProductSearchResults({})
    setProductSearchLoading({})
    setShowProductDropdowns({})
  }
  
  const handleSaveManualInvoice = async () => {
    if (!manualCustomerName.trim()) {
      alert('Lütfen müşteri adı girin')
      return
    }
    
    if (manualItems.length === 0) {
      alert('Lütfen en az bir ürün ekleyin')
      return
    }
    
    if (!manualCalculation) {
      alert('Lütfen maliyet bilgilerini girin ve hesaplama yapın')
      return
    }
    
    try {
      // Önce custom production request oluştur
      const totalQuantity = manualItems.reduce((sum, item) => {
        const sizeDist = item.sizeDistribution
        if (sizeDist) {
          return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
        }
        return sum + item.quantity
      }, 0)
      
      const requestData = {
        customerName: manualCustomerName,
        customerEmail: manualCustomerEmail || undefined,
        customerPhone: manualCustomerPhone || undefined,
        companyName: manualCompanyName || undefined,
        items: manualItems.map(item => ({
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.sizeDistribution 
            ? Object.values(item.sizeDistribution).reduce((s: number, q: number) => s + q, 0)
            : item.quantity,
          customizations: item.sizeDistribution ? { sizeDistribution: item.sizeDistribution } : undefined
        })),
        totalQuantity,
        totalAmount: manualCalculation.totalWithVat,
        notes: notes || 'Manuel oluşturulan proforma fatura'
      }
      
      // Admin için manuel fatura oluşturma endpoint'i
      const createRes = await api.post<any>('/admin/custom-production-requests/manual', requestData)
      
      if ((createRes as any)?.success && (createRes as any).data?.id) {
        const requestId = (createRes as any).data.id
        
        // Proforma quote kaydet
        const itemCostsForSave: Record<number, CostInputs> = {}
        manualItems.forEach((item, index) => {
          itemCostsForSave[index + 1] = manualItemCosts[item.id] || {
            unitCost: 0,
            printingCost: 0,
            embroideryCost: 0
          }
        })
        
        await api.post(`/admin/custom-production-requests/${requestId}/proforma-quote`, {
          itemCosts: itemCostsForSave,
          sharedShippingCost,
          profitMargin,
          vatRate,
          unitSalePrice: manualCalculation.totalOfferAmount / manualCalculation.totalQuantity,
          totalOfferAmount: manualCalculation.totalOfferAmount,
          totalVatAmount: manualCalculation.totalVatAmount,
          totalWithVat: manualCalculation.totalWithVat,
          profitPercentage: manualCalculation.profitPercentage,
          notes,
          calculation: manualCalculation
        })
        
        setManualRequestId(requestId)
        alert('Manuel fatura başarıyla oluşturuldu')
        await loadRequests()
        
        // Faturayı otomatik olarak seç
        const newRequest = requests.find(r => r.id === requestId)
        if (newRequest) {
          setSelectedRequest(newRequest)
        }
      } else {
        throw new Error('Talep oluşturulamadı')
      }
    } catch (e: any) {
      alert('Manuel fatura oluşturulamadı: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleSaveQuote = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.post(`/admin/custom-production-requests/${selectedRequest.id}/proforma-quote`, {
        itemCosts,
        sharedShippingCost,
        profitMargin,
        vatRate,
        unitSalePrice: unitSalePrice, // KDV hariç birim fiyat
        totalOfferAmount: calculation?.totalOfferAmount || 0, // KDV hariç toplam
        totalVatAmount: calculation?.totalVatAmount || 0, // KDV tutarı
        totalWithVat: totalOfferAmount, // KDV dahil toplam (kullanıcının girdiği)
        profitPercentage: profitPercentage,
        notes,
        calculation
      })
      alert('Teklif başarıyla kaydedildi')
      await loadRequests()
    } catch (e: any) {
      alert('Teklif kaydedilemedi: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleRequestRevision = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.put(`/admin/custom-production-requests/${selectedRequest.id}/request-revision`, { 
        revisionNotes: notes || 'Revizyon isteniyor'
      })
      alert('Revizyon talebi gönderildi')
      await loadRequests()
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: 'pending' })
      }
    } catch (e: any) {
      alert('Revizyon talebi gönderilemedi: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.put(`/admin/custom-production-requests/${selectedRequest.id}/approve-proforma`)
      alert('Proforma onaylandı')
      await loadRequests()
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: 'approved' })
      }
    } catch (e: any) {
      alert('Proforma onaylanamadı: ' + (e?.message || 'Bilinmeyen hata'))
    }
  }

  const handleArchive = async () => {
    if (!selectedRequest) {
      alert('Lütfen bir talep seçin')
      return
    }
    
    try {
      await api.put(`/admin/custom-production-requests/${selectedRequest.id}/status`, { 
        status: 'archived' 
      })
      alert('Talep arşivlendi')
      await loadRequests()
      setSelectedRequest(null)
    } catch (e: any) {
      alert('Talep arşivlenemedi')
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedRequest || !calculation) {
      alert('Lütfen bir talep seçin ve hesaplama yapın')
      return
    }

    try {
      // jsPDF'i dinamik olarak import et
      let jsPDF: any
      
      try {
        // Önce default export'u dene
        const module = await import('jspdf')
        console.log('jsPDF modülü yüklendi:', Object.keys(module))
        jsPDF = module.default || module.jsPDF || module
        
        // Eğer hala bir obje ise ve içinde jsPDF varsa
        if (jsPDF && typeof jsPDF !== 'function' && jsPDF.jsPDF) {
          jsPDF = jsPDF.jsPDF
        }
        
        // Eğer hala bir obje ise ve default property varsa
        if (jsPDF && typeof jsPDF !== 'function' && jsPDF.default) {
          jsPDF = jsPDF.default
        }
      } catch (importError: any) {
        console.error('jsPDF import hatası:', importError)
        console.error('Import error details:', importError?.message, importError?.stack)
        throw new Error('jsPDF modülü yüklenemedi: ' + (importError?.message || 'Bilinmeyen hata'))
      }
      
      if (!jsPDF) {
        throw new Error('jsPDF sınıfı bulunamadı')
      }
      
      console.log('jsPDF tipi:', typeof jsPDF)
      console.log('jsPDF is function:', typeof jsPDF === 'function')
      
      // jsPDF constructor kontrolü
      if (typeof jsPDF !== 'function') {
        console.error('jsPDF bir fonksiyon değil:', jsPDF)
        throw new Error('jsPDF bir constructor değil')
      }
      
      const doc = new jsPDF('p', 'mm', 'a4')
      
      // DejaVuSans veya Roboto fontunu yükle (Trendyol kargo fişi ile aynı)
      let customFontName = 'helvetica' // Fallback
      try {
        // Font dosyasını API'den al
        const fontResponse = await fetch('/api/admin/fonts/dejavu-sans')
        if (fontResponse.ok) {
          const fontBlob = await fontResponse.blob()
          const fontArrayBuffer = await fontBlob.arrayBuffer()
          const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)))
          
          // jsPDF'e font ekle
          doc.addFileToVFS('DejaVuSans.ttf', fontBase64)
          doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal')
          doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'bold')
          customFontName = 'DejaVuSans'
          console.log('✅ DejaVuSans fontu yüklendi')
        } else {
          // Roboto'yu dene
          const robotoResponse = await fetch('/api/admin/fonts/roboto')
          if (robotoResponse.ok) {
            const fontBlob = await robotoResponse.blob()
            const fontArrayBuffer = await fontBlob.arrayBuffer()
            const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)))
            
            doc.addFileToVFS('Roboto-Regular.ttf', fontBase64)
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold')
            customFontName = 'Roboto'
            console.log('✅ Roboto fontu yüklendi')
          }
        }
      } catch (fontError) {
        console.warn('⚠️ Custom font yüklenemedi, Helvetica kullanılıyor:', fontError)
      }
      
      // UTF-8 desteği için encoding ayarları
      const encodeUTF8 = (text: string): string => {
        if (!text) return text
        // Türkçe karakterleri doğru şekilde encode et
        try {
          // jsPDF'in Türkçe karakterleri desteklemesi için özel encoding
          return text
        } catch {
          return text
        }
      }
      
      // Font ayarlama helper fonksiyonu
      const setFont = (style: 'normal' | 'bold' | 'italic' = 'normal') => {
        if (customFontName !== 'helvetica') {
          doc.setFont(customFontName, style)
        } else {
          doc.setFont('helvetica', style)
        }
      }
      
      // jsPDF text metodunu UTF-8 destekli wrapper ile sarmala
      const addText = (text: string, x: number, y: number, options?: any) => {
        const encodedText = encodeUTF8(text)
        // Custom font kullan (Türkçe karakter desteği için)
        setFont(options?.bold ? 'bold' : 'normal')
        if (options && options.align) {
          doc.text(encodedText, x, y, options)
        } else {
          doc.text(encodedText, x, y)
        }
      }
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15 // Kargo fişi gibi daha küçük margin
      let yPos = margin

      // Renk tanımları - Kargo fişi ile uyumlu
      const colors = {
        primary: [15, 23, 42],        // Slate-900 (#0f172a)
        primaryLight: [30, 41, 59],   // Slate-800
        secondary: [139, 92, 246],    // Purple-500
        success: [34, 197, 94],       // Green-500
        warning: [234, 179, 8],       // Yellow-500
        danger: [239, 68, 68],        // Red-500
        lightGray: [241, 245, 249],   // Slate-100 (#f1f5f9)
        mediumGray: [148, 163, 184],  // Slate-400 (#94a3b8)
        darkGray: [30, 41, 59],       // Slate-800 (#1e293b)
        borderGray: [226, 232, 240],  // Slate-200 (#e2e8f0)
        textGray: [100, 116, 139],    // Slate-500 (#64748b)
      }

      // Beyaz arka plan
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      
      // Üst başlık bölümü - Kargo fişi gibi beyaz arka plan
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageWidth, 55, 'F')
      
      // Logo ekleme (ortada) - Kargo fişi gibi
      try {
        const logoUrl = window.location.origin + '/logo.jpg'
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('Logo yükleme zaman aşımı')
            resolve()
          }, 2000)
          
          img.onload = () => {
            clearTimeout(timeout)
            try {
              const logoWidth = 120 // Kargo fişi gibi daha büyük
              const logoHeight = (img.height / img.width) * logoWidth
              const logoX = (pageWidth - logoWidth) / 2 // Ortada
              const logoY = (55 - logoHeight) / 2 + 8 // Dikey ortalama
              
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0)
                const imgData = canvas.toDataURL('image/jpeg', 0.9)
                doc.addImage(imgData, 'JPEG', logoX, logoY, logoWidth, logoHeight)
              }
              resolve()
            } catch (error) {
              console.warn('Logo eklenemedi:', error)
              resolve()
            }
          }
          img.onerror = () => {
            clearTimeout(timeout)
            console.warn('Logo yüklenemedi, devam ediliyor...')
            resolve()
          }
          img.src = logoUrl
        })
      } catch (error) {
        console.warn('Logo ekleme hatası:', error)
      }
      
      // Alt çizgi (başlık bölümünü ayıran) - Kargo fişi gibi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, 54, pageWidth - margin, 54)
      
      yPos = 75 // Kargo fişi gibi 75'ten başla

      // Müşteri Bilgileri - Kargo fişi gibi kompakt düzen
      doc.setFontSize(11)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('MÜŞTERİ BİLGİLERİ', margin, yPos)
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, yPos + 15, 280, yPos + 15)
      
      yPos += 20
      doc.setFontSize(9)
      setFont('normal')
      doc.setTextColor(...colors.darkGray)
      
      if (selectedRequest.customerName) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        addText('Ad Soyad:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(8)
        setFont('bold')
        addText(selectedRequest.customerName || '', 85, yPos, { width: 220 })
        yPos += 12
      }

      if (selectedRequest.customerPhone) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        setFont('normal')
        addText('Telefon:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(8)
        addText(selectedRequest.customerPhone || '', 85, yPos, { width: 220 })
        yPos += 12
      }

      if (selectedRequest.customerEmail) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        addText('E-posta:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(7)
        addText(selectedRequest.customerEmail || '', 85, yPos, { width: 220, lineGap: 1 })
        yPos += 13
      }

      if (selectedRequest.companyName) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        addText('Şirket:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(8)
        addText(selectedRequest.companyName || '', 85, yPos, { width: 220 })
        yPos += 12
      }

      yPos += 5

      // Ürün Bilgileri Başlığı - Kargo fişi gibi
      const productStartY = yPos
      doc.setFontSize(10)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('ÜRÜN BİLGİLERİ', margin, yPos)
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, yPos + 12, pageWidth - margin, yPos + 12)
      
      yPos += 18

      // Ürün listesi - Kargo fişi gibi kompakt
      calculation.itemCalculations.forEach((itemCalc, index) => {
        const selectedItem = selectedItems.find(item => item.id === itemCalc.itemId)
        const itemCostsData = itemCosts[itemCalc.itemId] || { unitCost: 0, printingCost: 0, embroideryCost: 0 }
        
        // Sayfa kontrolü
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = margin
        }

        // Ürün adı - Kompakt, tek satır
        doc.setFontSize(7)
        setFont('normal')
        doc.setTextColor(...colors.textGray)
        const productName = itemCalc.productName.length > 60 
          ? itemCalc.productName.substring(0, 57) + '...' 
          : itemCalc.productName
        addText(`${index + 1}. ${productName}`, margin, yPos, { width: 360, lineGap: 0.5 })
        yPos += 13

        // Fiyat bilgileri - Kompakt, tek satır
        doc.setFontSize(6)
        doc.setTextColor(...colors.textGray)
        const costInfo = `Birim: ₺${itemCostsData.unitCost.toFixed(2)} | Baskı: ₺${itemCostsData.printingCost.toFixed(2)} | Nakış: ₺${itemCostsData.embroideryCost.toFixed(2)} | Adet: ${itemCalc.quantity} | Birim Fiyat: ₺${itemCalc.finalUnitPrice.toFixed(2)} | KDV: ₺${itemCalc.vatAmount.toFixed(2)} | Toplam: ₺${itemCalc.totalWithVat.toFixed(2)}`
        addText(costInfo, margin, yPos, { width: 360 })
        yPos += 8

        // Ayırıcı çizgi (son ürün değilse)
        if (index < calculation.itemCalculations.length - 1) {
          yPos += 1
          doc.setDrawColor(...colors.borderGray)
          doc.setLineWidth(0.3)
          doc.line(margin, yPos, pageWidth - margin, yPos)
          yPos += 2
        }
      })
      
      yPos += 5

      // Fiyat Bilgileri Başlığı - Kargo fişi gibi
      let priceYPos = yPos
      doc.setFontSize(10)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('FİYAT BİLGİLERİ', margin, priceYPos)
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, priceYPos + 12, pageWidth - margin, priceYPos + 12)
      
      priceYPos += 18

      // Toplam satırları - Kargo fişi gibi kompakt
      doc.setFontSize(8)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      
      addText('Ara Toplam (KDV Hariç):', margin, priceYPos)
      doc.setTextColor(...colors.primary)
      setFont('bold')
      addText(`₺${calculation.totalOfferAmount.toFixed(2)}`, pageWidth - margin, priceYPos, { align: 'right' })
      priceYPos += 12

      doc.setTextColor(...colors.textGray)
      setFont('normal')
      addText(`KDV (%${calculation.vatRate}):`, margin, priceYPos)
      doc.setTextColor(...colors.warning)
      setFont('bold')
      addText(`₺${calculation.totalVatAmount.toFixed(2)}`, pageWidth - margin, priceYPos, { align: 'right' })
      priceYPos += 12

      // Genel toplam - vurgulu
      doc.setLineWidth(0.5)
      doc.setDrawColor(...colors.borderGray)
      doc.line(margin, priceYPos - 2, pageWidth - margin, priceYPos - 2)
      
      doc.setFontSize(10)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('GENEL TOPLAM (KDV Dahil):', margin, priceYPos + 5)
      doc.setTextColor(...colors.success)
      doc.setFontSize(12)
      addText(`₺${calculation.totalWithVat.toFixed(2)}`, pageWidth - margin, priceYPos + 5, { align: 'right' })
      priceYPos += 20

      // Maliyet özeti - Kargo fişi gibi kompakt
      if (priceYPos > pageHeight - 60) {
        doc.addPage()
        priceYPos = margin
      }

      doc.setFontSize(8)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      addText(`Toplam Maliyet: ₺${calculation.totalCost.toFixed(2)}`, margin, priceYPos)
      addText(`Kâr Marjı: %${profitMargin.toFixed(2)}`, pageWidth / 2 - 20, priceYPos)
      addText(`Kâr: %${calculation.profitPercentage.toFixed(2)}`, pageWidth - margin, priceYPos, { align: 'right' })
      priceYPos += 10
      
      if (sharedShippingCost > 0) {
        addText(`Kargo: ₺${sharedShippingCost.toFixed(2)}`, margin, priceYPos)
        priceYPos += 10
      }

      // Notlar - Kargo fişi gibi kompakt
      if (notes && notes.trim()) {
        if (priceYPos > pageHeight - 50) {
          doc.addPage()
          priceYPos = margin
        }

        priceYPos += 5
        doc.setFontSize(8)
        setFont('bold')
        doc.setTextColor(...colors.primary)
        addText('Notlar:', margin, priceYPos)
        priceYPos += 8
        
        doc.setFontSize(7)
        setFont('normal')
        doc.setTextColor(...colors.textGray)
        
        const encodedNotes = encodeUTF8(notes)
        const noteLines = doc.splitTextToSize(encodedNotes, pageWidth - (margin * 2) - 10)
        noteLines.forEach((line: string) => {
          if (priceYPos > pageHeight - 30) {
            doc.addPage()
            priceYPos = margin + 10
          }
          addText(line, margin, priceYPos)
          priceYPos += 8
        })
      }

      // Alt bilgi bölümü - Footer (Kargo fişi gibi)
      const footerHeight = 40
      let finalFooterY = priceYPos + 10
      
      // Footer sayfa dışına taşmasın
      if (finalFooterY + footerHeight > pageHeight) {
        finalFooterY = pageHeight - footerHeight
      }
      
      doc.setFillColor(...colors.lightGray)
      doc.rect(0, finalFooterY, pageWidth, footerHeight, 'F')
      
      doc.setFontSize(7)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      const invoiceNumber = `PRO-${selectedRequest.requestNumber || selectedRequest.id}`
      addText(`Fatura No: ${invoiceNumber}`, margin, finalFooterY + 6, { align: 'left' })
      
      const now = new Date()
      addText(`Oluşturulma: ${now.toLocaleString('tr-TR')}`, margin, finalFooterY + 16, { align: 'left' })
      
      // Sağ tarafta şirket bilgisi
      doc.setFontSize(8)
      setFont('bold')
      doc.setTextColor(...colors.darkGray)
      addText('Huğlu Outdoor', pageWidth - margin, finalFooterY + 6, { align: 'right' })
      
      doc.setFontSize(6)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      addText('Proforma Fatura', pageWidth - margin, finalFooterY + 16, { align: 'right' })
      
      // Alt bilgi metni
      doc.setFontSize(7)
      doc.setTextColor(...colors.textGray)
      addText(
        'Bu belge bir proforma faturadır ve ödeme belgesi niteliği taşımaz.',
        pageWidth / 2,
        finalFooterY + 28,
        { align: 'center', width: pageWidth - (margin * 2) }
      )

      // PDF'i indir
      const fileName = `proforma-fatura-${selectedRequest.requestNumber || selectedRequest.id}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error)
      console.error('Hata detayı:', error?.stack || error)
      
      // Hata mesajını al
      const errorMessage = error?.message || String(error) || 'Bilinmeyen hata'
      
      // jsPDF yüklü değilse veya başka bir hata varsa, HTML olarak indir
      if (errorMessage.includes('Cannot find module') || 
          errorMessage.includes('jspdf') || 
          errorMessage.includes('jsPDF') ||
          errorMessage.includes('is not a constructor') ||
          errorMessage.includes('Cannot read')) {
        console.log('PDF kütüphanesi hatası, HTML olarak indiriliyor...')
        handleDownloadHTML()
      } else {
        console.error('PDF oluşturma hatası:', errorMessage)
        alert('PDF oluşturulurken bir hata oluştu: ' + errorMessage + '\n\nHTML olarak indiriliyor...')
        handleDownloadHTML()
      }
    }
  }

  const handleDownloadHTML = () => {
    if (!selectedRequest || !calculation) {
      alert('Lütfen bir talep seçin ve hesaplama yapın')
      return
    }

    const html = generateProformaInvoiceHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proforma-fatura-${selectedRequest.requestNumber || selectedRequest.id}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Manuel fatura için PDF indirme
  const handleDownloadManualPDF = async () => {
    if (!manualCalculation || !manualCustomerName) {
      alert('Lütfen fatura bilgilerini doldurun ve hesaplama yapın')
      return
    }

    try {
      let jsPDF: any
      try {
        const module = await import('jspdf')
        jsPDF = module.default || module.jsPDF || module
        if (jsPDF && typeof jsPDF !== 'function' && jsPDF.jsPDF) {
          jsPDF = jsPDF.jsPDF
        }
        if (jsPDF && typeof jsPDF !== 'function' && jsPDF.default) {
          jsPDF = jsPDF.default
        }
      } catch (importError: any) {
        console.error('jsPDF import hatası:', importError)
        throw new Error('jsPDF modülü yüklenemedi: ' + (importError?.message || 'Bilinmeyen hata'))
      }
      
      if (!jsPDF || typeof jsPDF !== 'function') {
        throw new Error('jsPDF bir constructor değil')
      }
      
      const doc = new jsPDF('p', 'mm', 'a4')
      
      // DejaVuSans veya Roboto fontunu yükle (Trendyol kargo fişi ile aynı)
      let customFontName = 'helvetica' // Fallback
      try {
        const fontResponse = await fetch('/api/admin/fonts/dejavu-sans')
        if (fontResponse.ok) {
          const fontBlob = await fontResponse.blob()
          const fontArrayBuffer = await fontBlob.arrayBuffer()
          const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)))
          
          doc.addFileToVFS('DejaVuSans.ttf', fontBase64)
          doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal')
          doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'bold')
          customFontName = 'DejaVuSans'
          console.log('✅ DejaVuSans fontu yüklendi')
        } else {
          const robotoResponse = await fetch('/api/admin/fonts/roboto')
          if (robotoResponse.ok) {
            const fontBlob = await robotoResponse.blob()
            const fontArrayBuffer = await fontBlob.arrayBuffer()
            const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)))
            
            doc.addFileToVFS('Roboto-Regular.ttf', fontBase64)
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold')
            customFontName = 'Roboto'
            console.log('✅ Roboto fontu yüklendi')
          }
        }
      } catch (fontError) {
        console.warn('⚠️ Custom font yüklenemedi, Helvetica kullanılıyor:', fontError)
      }
      
      // Font ayarlama helper fonksiyonu
      const setFont = (style: 'normal' | 'bold' | 'italic' = 'normal') => {
        if (customFontName !== 'helvetica') {
          doc.setFont(customFontName, style)
        } else {
          doc.setFont('helvetica', style)
        }
      }
      
      const encodeUTF8 = (text: string): string => {
        if (!text) return text
        // Türkçe karakterleri doğru şekilde encode et
        try {
          // jsPDF'in Türkçe karakterleri desteklemesi için özel encoding
          return text
        } catch {
          return text
        }
      }
      
      const addText = (text: string, x: number, y: number, options?: any) => {
        const encodedText = encodeUTF8(text)
        // Custom font kullan (Türkçe karakter desteği için)
        setFont(options?.bold ? 'bold' : 'normal')
        if (options && options.align) {
          doc.text(encodedText, x, y, options)
        } else {
          doc.text(encodedText, x, y)
        }
      }
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15 // Kargo fişi gibi daha küçük margin
      let yPos = margin

      // Renk tanımları - Kargo fişi ile uyumlu
      const colors = {
        primary: [15, 23, 42],        // Slate-900 (#0f172a)
        primaryLight: [30, 41, 59],   // Slate-800
        secondary: [139, 92, 246],    // Purple-500
        success: [34, 197, 94],       // Green-500
        warning: [234, 179, 8],       // Yellow-500
        danger: [239, 68, 68],        // Red-500
        lightGray: [241, 245, 249],   // Slate-100 (#f1f5f9)
        mediumGray: [148, 163, 184],  // Slate-400 (#94a3b8)
        darkGray: [30, 41, 59],       // Slate-800 (#1e293b)
        borderGray: [226, 232, 240],  // Slate-200 (#e2e8f0)
        textGray: [100, 116, 139],    // Slate-500 (#64748b)
      }

      // Beyaz arka plan
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      
      // Üst başlık bölümü - Kargo fişi gibi beyaz arka plan
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageWidth, 55, 'F')
      
      // Logo ekleme (ortada) - Kargo fişi gibi
      try {
        const logoUrl = window.location.origin + '/logo.jpg'
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('Logo yükleme zaman aşımı')
            resolve()
          }, 2000)
          
          img.onload = () => {
            clearTimeout(timeout)
            try {
              const logoWidth = 120
              const logoHeight = (img.height / img.width) * logoWidth
              const logoX = (pageWidth - logoWidth) / 2
              const logoY = (55 - logoHeight) / 2 + 8
              
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0)
                const imgData = canvas.toDataURL('image/jpeg', 0.9)
                doc.addImage(imgData, 'JPEG', logoX, logoY, logoWidth, logoHeight)
              }
              resolve()
            } catch (error) {
              console.warn('Logo eklenemedi:', error)
              resolve()
            }
          }
          img.onerror = () => {
            clearTimeout(timeout)
            console.warn('Logo yüklenemedi, devam ediliyor...')
            resolve()
          }
          img.src = logoUrl
        })
      } catch (error) {
        console.warn('Logo ekleme hatası:', error)
      }
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, 54, pageWidth - margin, 54)
      
      yPos = 75

      // Müşteri Bilgileri - Kargo fişi gibi kompakt düzen
      doc.setFontSize(11)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('MÜŞTERİ BİLGİLERİ', margin, yPos)
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, yPos + 15, 280, yPos + 15)
      
      yPos += 20
      doc.setFontSize(9)
      setFont('normal')
      doc.setTextColor(...colors.darkGray)
      
      if (manualCustomerName) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        addText('Ad Soyad:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(8)
        setFont('bold')
        addText(manualCustomerName || '', 85, yPos, { width: 220 })
        yPos += 12
      }

      if (manualCustomerPhone) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        setFont('normal')
        addText('Telefon:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(8)
        addText(manualCustomerPhone || '', 85, yPos, { width: 220 })
        yPos += 12
      }

      if (manualCustomerEmail) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        addText('E-posta:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(7)
        addText(manualCustomerEmail || '', 85, yPos, { width: 220, lineGap: 1 })
        yPos += 13
      }

      if (manualCompanyName) {
        doc.setTextColor(...colors.textGray)
        doc.setFontSize(7)
        addText('Şirket:', margin, yPos)
        doc.setTextColor(...colors.primary)
        doc.setFontSize(8)
        addText(manualCompanyName || '', 85, yPos, { width: 220 })
        yPos += 12
      }

      yPos += 5

      // Ürün Bilgileri Başlığı - Kargo fişi gibi
      const productStartY = yPos
      doc.setFontSize(10)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('ÜRÜN BİLGİLERİ', margin, yPos)
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, yPos + 12, pageWidth - margin, yPos + 12)
      
      yPos += 18

      // Ürün listesi - Kargo fişi gibi kompakt
      manualCalculation.itemCalculations.forEach((itemCalc, index) => {
        const manualItem = manualItems.find(item => parseInt(item.id) === itemCalc.itemId || item.id === `manual-${itemCalc.itemId}`)
        const itemCostsData = manualItem ? manualItemCosts[manualItem.id] || { unitCost: 0, printingCost: 0, embroideryCost: 0 } : { unitCost: 0, printingCost: 0, embroideryCost: 0 }
        
        if (yPos > pageHeight - 100) {
          doc.addPage()
          yPos = margin
        }

        // Ürün adı - Kompakt, tek satır
        doc.setFontSize(7)
        setFont('normal')
        doc.setTextColor(...colors.textGray)
        const productName = itemCalc.productName.length > 60 
          ? itemCalc.productName.substring(0, 57) + '...' 
          : itemCalc.productName
        addText(`${index + 1}. ${productName}`, margin, yPos, { width: 360, lineGap: 0.5 })
        yPos += 13

        // Fiyat bilgileri - Kompakt, tek satır
        doc.setFontSize(6)
        doc.setTextColor(...colors.textGray)
        const costInfo = `Birim: ₺${itemCostsData.unitCost.toFixed(2)} | Baskı: ₺${itemCostsData.printingCost.toFixed(2)} | Nakış: ₺${itemCostsData.embroideryCost.toFixed(2)} | Adet: ${itemCalc.quantity} | Birim Fiyat: ₺${itemCalc.finalUnitPrice.toFixed(2)} | KDV: ₺${itemCalc.vatAmount.toFixed(2)} | Toplam: ₺${itemCalc.totalWithVat.toFixed(2)}`
        addText(costInfo, margin, yPos, { width: 360 })
        yPos += 8

        // Ayırıcı çizgi (son ürün değilse)
        if (index < manualCalculation.itemCalculations.length - 1) {
          yPos += 1
          doc.setDrawColor(...colors.borderGray)
          doc.setLineWidth(0.3)
          doc.line(margin, yPos, pageWidth - margin, yPos)
          yPos += 2
        }
      })
      
      yPos += 5

      // Fiyat Bilgileri Başlığı - Kargo fişi gibi
      let priceYPos = yPos
      doc.setFontSize(10)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('FİYAT BİLGİLERİ', margin, priceYPos)
      
      // Alt çizgi
      doc.setDrawColor(...colors.borderGray)
      doc.setLineWidth(1)
      doc.line(margin, priceYPos + 12, pageWidth - margin, priceYPos + 12)
      
      priceYPos += 18

      // Toplam satırları - Kargo fişi gibi kompakt
      doc.setFontSize(8)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      
      addText('Ara Toplam (KDV Hariç):', margin, priceYPos)
      doc.setTextColor(...colors.primary)
      setFont('bold')
      addText(`₺${manualCalculation.totalOfferAmount.toFixed(2)}`, pageWidth - margin, priceYPos, { align: 'right' })
      priceYPos += 12

      doc.setTextColor(...colors.textGray)
      setFont('normal')
      addText(`KDV (%${manualCalculation.vatRate}):`, margin, priceYPos)
      doc.setTextColor(...colors.warning)
      setFont('bold')
      addText(`₺${manualCalculation.totalVatAmount.toFixed(2)}`, pageWidth - margin, priceYPos, { align: 'right' })
      priceYPos += 12

      // Genel toplam - vurgulu
      doc.setLineWidth(0.5)
      doc.setDrawColor(...colors.borderGray)
      doc.line(margin, priceYPos - 2, pageWidth - margin, priceYPos - 2)
      
      doc.setFontSize(10)
      setFont('bold')
      doc.setTextColor(...colors.primary)
      addText('GENEL TOPLAM (KDV Dahil):', margin, priceYPos + 5)
      doc.setTextColor(...colors.success)
      doc.setFontSize(12)
      addText(`₺${manualCalculation.totalWithVat.toFixed(2)}`, pageWidth - margin, priceYPos + 5, { align: 'right' })
      priceYPos += 20

      // Notlar - Kargo fişi gibi kompakt
      if (notes && notes.trim()) {
        if (priceYPos > pageHeight - 50) {
          doc.addPage()
          priceYPos = margin
        }

        priceYPos += 5
        doc.setFontSize(8)
        setFont('bold')
        doc.setTextColor(...colors.primary)
        addText('Notlar:', margin, priceYPos)
        priceYPos += 8
        
        doc.setFontSize(7)
        setFont('normal')
        doc.setTextColor(...colors.textGray)
        
        const encodedNotes = encodeUTF8(notes)
        const noteLines = doc.splitTextToSize(encodedNotes, pageWidth - (margin * 2) - 10)
        noteLines.forEach((line: string) => {
          if (priceYPos > pageHeight - 30) {
            doc.addPage()
            priceYPos = margin + 10
          }
          addText(line, margin, priceYPos)
          priceYPos += 8
        })
      }

      // Alt bilgi bölümü - Footer (Kargo fişi gibi)
      const footerHeight = 40
      let finalFooterY = priceYPos + 10
      
      if (finalFooterY + footerHeight > pageHeight) {
        finalFooterY = pageHeight - footerHeight
      }
      
      doc.setFillColor(...colors.lightGray)
      doc.rect(0, finalFooterY, pageWidth, footerHeight, 'F')
      
      doc.setFontSize(7)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      const invoiceNumber = manualRequestId ? `MANUAL-${manualRequestId}` : `MANUAL-${Date.now()}`
      addText(`Fatura No: ${invoiceNumber}`, margin, finalFooterY + 6, { align: 'left' })
      
      const invoiceDateObj = manualInvoiceDate ? new Date(manualInvoiceDate) : new Date()
      addText(`Oluşturulma: ${invoiceDateObj.toLocaleString('tr-TR')}`, margin, finalFooterY + 16, { align: 'left' })
      
      // Sağ tarafta şirket bilgisi
      doc.setFontSize(8)
      setFont('bold')
      doc.setTextColor(...colors.darkGray)
      addText('Huğlu Outdoor', pageWidth - margin, finalFooterY + 6, { align: 'right' })
      
      doc.setFontSize(6)
      setFont('normal')
      doc.setTextColor(...colors.textGray)
      addText('Proforma Fatura', pageWidth - margin, finalFooterY + 16, { align: 'right' })
      
      // Alt bilgi metni
      doc.setFontSize(7)
      doc.setTextColor(...colors.textGray)
      addText(
        'Bu belge bir proforma faturadır ve ödeme belgesi niteliği taşımaz.',
        pageWidth / 2,
        finalFooterY + 28,
        { align: 'center', width: pageWidth - (margin * 2) }
      )

      // PDF'i indir
      const fileName = `proforma-fatura-manual-${invoiceNumber}-${manualInvoiceDate || new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error)
      alert('PDF oluşturulurken bir hata oluştu: ' + (error?.message || 'Bilinmeyen hata'))
    }
  }

  const generateProformaInvoiceHTML = (): string => {
    if (!selectedRequest || !calculation) return ''

    const invoiceNumber = `PRO-${selectedRequest.requestNumber || selectedRequest.id}`
    const invoiceDate = new Date().toLocaleDateString('tr-TR')
    
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proforma Fatura - ${invoiceNumber}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      max-width: 210mm;
      margin: 20px auto;
      padding: 20px;
      background: #f8fafc;
      color: #1e293b;
    }
    .invoice-container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 30px -30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header-left p {
      margin: 5px 0 0 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
    }
    .customer-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 30px;
      overflow: hidden;
    }
    .customer-info-header {
      background: #1e40af;
      color: white;
      padding: 12px 15px;
      font-weight: bold;
      font-size: 14px;
    }
    .customer-info-content {
      padding: 15px;
    }
    .customer-info-content ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .customer-info-content li {
      padding: 5px 0;
      color: #334155;
    }
    .products-header {
      background: #1e40af;
      color: white;
      padding: 12px 15px;
      font-weight: bold;
      font-size: 14px;
      border-radius: 8px 8px 0 0;
      margin-bottom: 0;
    }
    .product-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .product-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .product-name {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
      flex: 1;
    }
    .product-quantity {
      background: #22c55e;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    }
    .product-details {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 15px;
    }
    .detail-column {
      display: flex;
      flex-direction: column;
    }
    .detail-label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .detail-value {
      font-size: 14px;
      font-weight: bold;
      color: #1e293b;
    }
    .detail-value.price {
      color: #22c55e;
      font-size: 16px;
    }
    .detail-value.vat {
      color: #f59e0b;
    }
    .detail-value.total {
      color: #ef4444;
      font-size: 16px;
    }
    .totals {
      background: #f8fafc;
      border: 2px solid #1e40af;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-row:last-child {
      border-bottom: none;
    }
    .total-final {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      border-top: 2px solid #1e40af;
      padding-top: 10px;
      margin-top: 10px;
    }
    .notes {
      margin-top: 30px;
      padding: 15px;
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <h1>PROFORMA FATURA</h1>
        <p>Fatura No: ${invoiceNumber}</p>
      </div>
      <div class="header-right">
        <div>Tarih: ${invoiceDate}</div>
      </div>
    </div>

    <div class="customer-info">
      <div class="customer-info-header">MÜŞTERİ BİLGİLERİ</div>
      <div class="customer-info-content">
        <ul>
          <li>• ${selectedRequest.customerName}</li>
          ${selectedRequest.companyName ? `<li>• ${selectedRequest.companyName}</li>` : ''}
          ${selectedRequest.customerEmail ? `<li>• ${selectedRequest.customerEmail}</li>` : ''}
          ${selectedRequest.customerPhone ? `<li>• ${selectedRequest.customerPhone}</li>` : ''}
        </ul>
      </div>
    </div>

    <div class="products-header">ÜRÜN DETAYLARI</div>
    
    ${calculation.itemCalculations.map(itemCalc => {
      const itemCostsData = itemCosts[itemCalc.itemId] || { unitCost: 0, printingCost: 0, embroideryCost: 0 }
      return `
      <div class="product-card">
        <div class="product-header">
          <div class="product-name">${itemCalc.productName}</div>
          <div class="product-quantity">${itemCalc.quantity}</div>
        </div>
        <div class="product-details">
          <div class="detail-column">
            <div class="detail-label">Birim Maliyet</div>
            <div class="detail-value">₺${itemCostsData.unitCost.toFixed(2)}</div>
            <div class="detail-label" style="margin-top: 8px;">Baskı</div>
            <div class="detail-value">₺${itemCostsData.printingCost.toFixed(2)}</div>
            <div class="detail-label" style="margin-top: 8px;">Nakış</div>
            <div class="detail-value">₺${itemCostsData.embroideryCost.toFixed(2)}</div>
          </div>
          <div class="detail-column">
            <div class="detail-label">Birim Fiyat</div>
            <div class="detail-value price">₺${itemCalc.finalUnitPrice.toFixed(2)}</div>
          </div>
          <div class="detail-column">
            <div class="detail-label">KDV (%${calculation.vatRate})</div>
            <div class="detail-value vat">₺${itemCalc.vatAmount.toFixed(2)}</div>
            <div class="detail-label" style="margin-top: 8px;">Toplam</div>
            <div class="detail-value total">₺${itemCalc.totalWithVat.toFixed(2)}</div>
          </div>
        </div>
      </div>
      `
    }).join('')}

    <div class="totals">
      <div class="totals-row">
        <span>Ara Toplam (KDV Hariç):</span>
        <span>₺${calculation.totalOfferAmount.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>KDV (%${calculation.vatRate}):</span>
        <span>₺${calculation.totalVatAmount.toFixed(2)}</span>
      </div>
      <div class="totals-row total-final">
        <span>GENEL TOPLAM (KDV Dahil):</span>
        <span>₺${calculation.totalWithVat.toFixed(2)}</span>
      </div>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #1e40af;">Maliyet Özeti</h3>
      <p>Toplam Maliyet: <strong>₺${calculation.totalCost.toFixed(2)}</strong></p>
      <p>Kâr Marjı: <strong>%${profitMargin.toFixed(2)}</strong></p>
      <p>Kâr Yüzdesi: <strong>%${calculation.profitPercentage.toFixed(2)}</strong></p>
      ${sharedShippingCost > 0 ? `<p>Kargo: <strong>₺${sharedShippingCost.toFixed(2)}</strong></p>` : ''}
    </div>

    ${notes && notes.trim() ? `
    <div class="notes">
      <h3>Notlar</h3>
      <p>${notes.replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Bu belge bir proforma faturadır ve ödeme belgesi niteliği taşımaz.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  const translateStatus = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'pending') return 'Beklemede'
    if (s === 'review') return 'Teklif'
    if (s === 'approved') return 'Onaylandı'
    if (s === 'rejected') return 'Reddedildi'
    if (s === 'archived') return 'Arşivlendi'
    return status
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'pending') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    if (s === 'review') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    if (s === 'approved') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    if (s === 'rejected') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    if (s === 'archived') return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
  }

  // Filtrelenmiş talepler
  const filteredRequests = requests.filter(request => {
    if (searchQuery && !request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !request.customerName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (customerFilter && !request.customerName.toLowerCase().includes(customerFilter.toLowerCase())) {
      return false
    }
    if (dateFilter) {
      const requestDate = new Date(request.createdAt).toISOString().split('T')[0]
      if (requestDate !== dateFilter) return false
    }
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false
    }
    return true
  })

  const totalQuantity = selectedItems.reduce((sum, item) => {
    const sizeDist = item.sizeDistribution
    if (sizeDist) {
      return sum + Object.values(sizeDist).reduce((s: number, q: number) => s + q, 0)
    }
    return sum + item.quantity
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Proforma Fatura
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Talep yönetimi ve teklif oluşturma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetManualInvoice()
              setShowManualInvoiceModal(true)
            }}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Manuel Fatura Oluştur
          </button>
          <button
            onClick={loadRequests}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BÖLÜM 1: Talep Listesi Paneli */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Talep Listesi
            </h2>

            {/* Filtreler */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Müşteri
                </label>
                <input
                  type="text"
                  placeholder="Müşteri adı..."
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Durum
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Beklemede</option>
                  <option value="review">Teklif</option>
                  <option value="approved">Onaylandı</option>
                  <option value="rejected">Reddedildi</option>
                  <option value="archived">Arşivlendi</option>
                </select>
              </div>
            </div>

            {/* Talep Listesi */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Yükleniyor...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Talep bulunamadı
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    onClick={() => handleSelectRequest(request)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all relative ${
                      selectedRequest?.id === request.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {request.requestNumber}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {request.customerName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                          {translateStatus(request.status)}
                        </span>
                        <button
                          onClick={(e) => handleDeleteRequest(request.id, request.requestNumber, e)}
                          disabled={deletingRequestId === request.id}
                          className={`p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors ${
                            deletingRequestId === request.id ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                          }`}
                          title="Talebi Sil"
                        >
                          {deletingRequestId === request.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                      {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* BÖLÜM 2-6: Detay ve İşlem Alanı */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRequest ? (
            <>
              {/* BÖLÜM 2: Talep Detay Alanı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Talep Detayı
                  </h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Müşteri Bilgileri
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Müşteri:</span>
                        <span className="ml-2 text-slate-800 dark:text-slate-200 font-medium">
                          {selectedRequest.customerName}
                        </span>
                      </div>
                      {selectedRequest.companyName && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Şirket:</span>
                          <span className="ml-2 text-slate-800 dark:text-slate-200">
                            {selectedRequest.companyName}
                          </span>
                        </div>
                      )}
                      {selectedRequest.customerEmail && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">E-posta:</span>
                          <span className="ml-2 text-slate-800 dark:text-slate-200">
                            {selectedRequest.customerEmail}
                          </span>
                        </div>
                      )}
                      {selectedRequest.customerPhone && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Telefon:</span>
                          <span className="ml-2 text-slate-800 dark:text-slate-200">
                            {selectedRequest.customerPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ürünler */}
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Ürünler
                    </h3>
                    <div className="space-y-4">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex gap-4">
                            {item.productImage && (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                {item.productName}
                              </h4>
                              
                              {/* Beden Dağılım Tablosu */}
                              {(() => {
                                const sizeDist = item.sizeDistribution
                                if (sizeDist && Object.keys(sizeDist).length > 0) {
                                  return (
                                    <div className="mt-3">
                                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Beden Dağılımı:
                                      </div>
                                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {Object.entries(sizeDist).map(([size, quantity]) => (
                                          <div
                                            key={size}
                                            className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center"
                                          >
                                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{size}</div>
                                            <div className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                              {quantity || 0}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                      Adet: <span className="font-semibold">{item.quantity}</span>
                                    </div>
                                  )
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {selectedItems.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                            Toplam Adet: {totalQuantity}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* BÖLÜM 3: Maliyet Giriş Alanı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Maliyet Girişi
                </h2>
                
                {/* Her ürün için ayrı maliyet girişi */}
                <div className="space-y-6">
                  {selectedItems.map((item) => {
                    const itemQuantity = item.sizeDistribution 
                      ? Object.values(item.sizeDistribution).reduce((s: number, q: number) => s + q, 0)
                      : item.quantity
                    
                    const costs = itemCosts[item.id] || {
                      baseCost: 0,
                      printingCost: 0,
                      embroideryCost: 0,
                      laborCost: 0,
                      packagingCost: 0,
                      shippingCost: 0
                    }
                    
                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            {item.productName}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Adet: {itemQuantity}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Birim Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={costs.unitCost ?? 0}
                              onChange={(e) => handleCostChange(item.id, 'unitCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Birim başına maliyet</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Baskı Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={costs.printingCost ?? 0}
                              onChange={(e) => handleCostChange(item.id, 'printingCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Toplam baskı maliyeti</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Nakış Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={costs.embroideryCost ?? 0}
                              onChange={(e) => handleCostChange(item.id, 'embroideryCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Toplam nakış maliyeti</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Paylaşılan Kargo Maliyeti, KDV ve Kâr Marjı */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Paylaşılan Kargo Maliyeti (Tüm Sipariş İçin)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sharedShippingCost ?? 0}
                        onChange={(e) => handleSharedShippingChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        KDV Oranı (%)
                      </label>
                      <select
                        value={vatRate ?? 10}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {vatRates.map(rate => (
                          <option key={rate} value={rate}>
                            %{rate} KDV
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kâr Marjı (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={profitMargin ?? 0}
                        onChange={(e) => handleProfitMarginChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BÖLÜM 4: Hesaplama Sonuçları */}
              {calculation && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Hesaplama Sonuçları</span>
                  </h2>
                  
                  {/* Her ürün için ayrı hesaplama */}
                  {calculation.itemCalculations.length > 0 && (
                    <div className="space-y-6 mb-8">
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Ürün Detayları</h3>
                      {calculation.itemCalculations.map((itemCalc, idx) => (
                        <div
                          key={itemCalc.itemId}
                          className="p-5 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
                            <h4 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold">
                                #{idx + 1}
                              </span>
                              <span>{itemCalc.productName}</span>
                            </h4>
                          </div>
                          
                          {/* Birim Fiyat Bilgileri */}
                          <div className="mb-5 pb-5 border-b border-slate-200 dark:border-slate-700">
                            <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">Birim Fiyat Bilgileri</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Adet</div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{itemCalc.quantity}</div>
                              </div>
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Birim Fiyat (KDV Hariç)</div>
                                <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                                  ₺{itemCalc.unitPrice.toFixed(2)}
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1 italic">
                                  Birim + Baskı + Nakış + Kargo
                                </div>
                              </div>
                              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                                <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2">Birim Fiyat (KDV Dahil)</div>
                                <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
                                  ₺{itemCalc.finalUnitPrice.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Toplam Maliyet</div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                  ₺{itemCalc.totalCost.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Ürün Toplam Bilgileri */}
                          <div>
                            <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">Ürün Toplam Tutarlar</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
                                <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Ürün Teklif (KDV Hariç)</div>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                  ₺{itemCalc.totalOfferAmount.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                                <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">KDV (%{calculation.vatRate})</div>
                                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                                  ₺{itemCalc.vatAmount.toFixed(2)}
                                </div>
                              </div>
                              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                                <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Toplam (KDV Dahil)</div>
                                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                  ₺{itemCalc.totalWithVat.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Toplam Özet - TÜM ÜRÜNLERİN TOPLAMI */}
                  <div className="pt-6 mt-6 border-t-4 border-purple-500 dark:border-purple-400 bg-gradient-to-r from-purple-50 via-purple-50/50 to-purple-50 dark:from-purple-900/30 dark:via-purple-900/20 dark:to-purple-900/30 rounded-xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                          <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span>GENEL TOPLAM (Tüm Ürünler)</span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                      <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-md">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Toplam Adet</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                          {calculation.totalQuantity}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-md">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Toplam Maliyet</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                          ₺{calculation.totalCost.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 rounded-xl border-2 border-green-400 dark:border-green-600 shadow-lg">
                        <div className="text-xs font-bold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">Toplam Teklif</div>
                        <div className="text-sm text-green-600 dark:text-green-500 mb-1">KDV Hariç</div>
                        <div className="text-3xl font-black text-green-700 dark:text-green-400">
                          ₺{calculation.totalOfferAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/20 rounded-xl border-2 border-orange-400 dark:border-orange-600 shadow-lg">
                        <div className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2 uppercase tracking-wide">Toplam KDV</div>
                        <div className="text-sm text-orange-600 dark:text-orange-500 mb-1">%{calculation.vatRate}</div>
                        <div className="text-3xl font-black text-orange-700 dark:text-orange-400">
                          ₺{calculation.totalVatAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-xl border-4 border-purple-400 dark:border-purple-500 shadow-xl col-span-1 lg:col-span-2">
                        <div className="text-xs font-black text-white mb-2 uppercase tracking-wider">GENEL TOPLAM</div>
                        <div className="text-sm font-semibold text-purple-100 mb-2">KDV Dahil - Tüm Ürünler</div>
                        <div className="text-4xl md:text-5xl font-black text-white leading-tight">
                          ₺{calculation.totalWithVat.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-xl border-2 border-blue-400 dark:border-blue-600 shadow-lg">
                        <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 uppercase tracking-wide">Kâr Yüzdesi</div>
                        <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                          %{calculation.profitPercentage.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BÖLÜM 5: Teklif Oluşturma Alanı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Teklif Oluşturma
                </h2>
                
                <div className="space-y-4">
                  {calculation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-blue-700 dark:text-blue-400 font-medium">Teklif (KDV Hariç)</div>
                          <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                            ₺{calculation.totalOfferAmount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-orange-700 dark:text-orange-400 font-medium">KDV (%{calculation.vatRate})</div>
                          <div className="text-lg font-bold text-orange-800 dark:text-orange-300">
                            ₺{calculation.totalVatAmount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-purple-700 dark:text-purple-400 font-medium">Toplam (KDV Dahil)</div>
                          <div className="text-lg font-bold text-purple-800 dark:text-purple-300">
                            ₺{calculation.totalWithVat.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-green-700 dark:text-green-400 font-medium">Kâr Yüzdesi</div>
                          <div className="text-lg font-bold text-green-800 dark:text-green-300">
                            %{calculation.profitPercentage.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Birim Satış Fiyatı (KDV Hariç) (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={unitSalePrice ?? 0}
                        onChange={(e) => {
                          const value = e.target.value === '' || isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                          setUnitSalePrice(value)
                          if (totalQuantity > 0 && value >= 0 && calculation) {
                            const newTotal = value * totalQuantity
                            const vatAmount = newTotal * (calculation.vatRate / 100)
                            setTotalOfferAmount(newTotal + vatAmount)
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Toplam Teklif Tutarı (KDV Dahil) (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalOfferAmount ?? 0}
                        onChange={(e) => {
                          const value = e.target.value === '' || isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                          setTotalOfferAmount(value)
                          if (totalQuantity > 0 && value >= 0 && calculation) {
                            // KDV dahil toplamdan KDV hariç birim fiyatı hesapla
                            const vatMultiplier = 1 + (calculation.vatRate / 100)
                            const totalWithoutVat = value / vatMultiplier
                            setUnitSalePrice(totalWithoutVat / totalQuantity)
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kâr Yüzdesi (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={(profitPercentage ?? 0).toFixed(2)}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notlar
                    </label>
                    <textarea
                      value={notes ?? ''}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      placeholder="Teklif ile ilgili notlarınızı buraya yazabilirsiniz..."
                    />
                  </div>
                </div>
              </div>

              {/* BÖLÜM 6: Aksiyonlar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Aksiyonlar
                </h2>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF İndir
                  </button>
                  
                  <button
                    onClick={handleSaveQuote}
                    className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Teklif Kaydet
                  </button>
                  
                  <button
                    onClick={handleRequestRevision}
                    className="px-6 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Revizyon İste
                  </button>
                  
                  <button
                    onClick={handleApprove}
                    className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Onayla
                  </button>
                  
                  <button
                    onClick={handleArchive}
                    className="px-6 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Arşivle
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Detayları görüntülemek için bir talep seçin
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Manuel Fatura Oluşturma Modal */}
      <AnimatePresence>
        {showManualInvoiceModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Manuel Fatura Oluştur</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Yeni bir proforma fatura oluşturun
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowManualInvoiceModal(false)
                    resetManualInvoice()
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Müşteri Bilgileri */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Müşteri Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Müşteri Adı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="Müşteri adı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Fatura Tarihi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={manualInvoiceDate}
                        onChange={(e) => setManualInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        E-posta
                      </label>
                      <input
                        type="email"
                        value={manualCustomerEmail}
                        onChange={(e) => setManualCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="0555 123 45 67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Şirket Adı
                      </label>
                      <input
                        type="text"
                        value={manualCompanyName}
                        onChange={(e) => setManualCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        placeholder="Şirket adı"
                      />
                    </div>
                  </div>
                </div>

                {/* Ürünler */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Ürünler
                    </h4>
                    <button
                      onClick={addManualItem}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ürün Ekle
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {manualItems.map((item, index) => (
                      <div key={item.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between mb-4">
                          <h5 className="font-semibold text-slate-800 dark:text-slate-200">Ürün #{index + 1}</h5>
                          <button
                            onClick={() => removeManualItem(item.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Ürün Ara ve Seç <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                value={productSearchQueries[item.id] || item.productName}
                                onChange={(e) => {
                                  const query = e.target.value
                                  updateManualItem(item.id, 'productName', query)
                                  handleProductSearch(item.id, query)
                                }}
                                onFocus={() => {
                                  if (productSearchQueries[item.id] && productSearchQueries[item.id].length >= 2) {
                                    setShowProductDropdowns(prev => ({ ...prev, [item.id]: true }))
                                  }
                                }}
                                onBlur={() => {
                                  // Dropdown'ı kapatmak için kısa bir gecikme
                                  setTimeout(() => {
                                    setShowProductDropdowns(prev => ({ ...prev, [item.id]: false }))
                                  }, 200)
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                placeholder="Ürün ara..."
                              />
                              
                              {/* Ürün Arama Sonuçları Dropdown */}
                              {showProductDropdowns[item.id] && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {productSearchLoading[item.id] ? (
                                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                      Aranıyor...
                                    </div>
                                  ) : productSearchResults[item.id] && productSearchResults[item.id].length > 0 ? (
                                    productSearchResults[item.id].map((product) => (
                                      <div
                                        key={product.id}
                                        onClick={() => selectProduct(item.id, product)}
                                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-200 dark:border-slate-700 last:border-b-0 flex items-center gap-3"
                                      >
                                        {product.image && (
                                          <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-12 h-12 object-cover rounded"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                            {product.name}
                                          </div>
                                          {product.brand && (
                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                              {product.brand}
                                            </div>
                                          )}
                                          {product.price && (
                                            <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                              ₺{(typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0).toFixed(2)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : productSearchQueries[item.id] && productSearchQueries[item.id].length >= 2 ? (
                                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                      Ürün bulunamadı
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            {item.productImage && (
                              <div className="mt-2 flex items-center gap-2">
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="w-10 h-10 object-cover rounded"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {item.productName}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Adet
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateManualItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>
                        
                        {/* Maliyet Girişi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Birim Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={manualItemCosts[item.id]?.unitCost || 0}
                              onChange={(e) => handleManualCostChange(item.id, 'unitCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Baskı Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={manualItemCosts[item.id]?.printingCost || 0}
                              onChange={(e) => handleManualCostChange(item.id, 'printingCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Nakış Maliyeti (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={manualItemCosts[item.id]?.embroideryCost || 0}
                              onChange={(e) => handleManualCostChange(item.id, 'embroideryCost', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {manualItems.length === 0 && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        Henüz ürün eklenmedi. Ürün eklemek için yukarıdaki butonu kullanın.
                      </div>
                    )}
                  </div>
                </div>

                {/* Genel Ayarlar */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Genel Ayarlar
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Paylaşılan Kargo Maliyeti (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sharedShippingCost}
                        onChange={(e) => handleSharedShippingChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        KDV Oranı (%)
                      </label>
                      <select
                        value={vatRate}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {vatRates.map(rate => (
                          <option key={rate} value={rate}>
                            %{rate} KDV
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kâr Marjı (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={profitMargin}
                        onChange={(e) => handleProfitMarginChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notlar
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      placeholder="Fatura ile ilgili notlar..."
                    />
                  </div>
                </div>

                {/* Hesaplama Sonuçları */}
                {manualCalculation && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Hesaplama Sonuçları</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Adet</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{manualCalculation.totalQuantity}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Maliyet</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₺{manualCalculation.totalCost.toFixed(2)}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Toplam Teklif (KDV Hariç)</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">₺{manualCalculation.totalOfferAmount.toFixed(2)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-lg p-4 text-white">
                        <div className="text-sm text-purple-100 mb-1">GENEL TOPLAM (KDV Dahil)</div>
                        <div className="text-3xl font-black">₺{manualCalculation.totalWithVat.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aksiyon Butonları */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex gap-3">
                    {manualCalculation && (
                      <button
                        onClick={handleDownloadManualPDF}
                        className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF İndir
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowManualInvoiceModal(false)
                        resetManualInvoice()
                      }}
                      className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSaveManualInvoice}
                      className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Faturayı Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
