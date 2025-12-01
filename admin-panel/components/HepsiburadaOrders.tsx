'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, Search, Loader2, X, User, Mail, Phone, 
  Calendar, DollarSign, Package, MapPin, Code, FileJson, 
  Receipt, FileText, Download, ExternalLink, Printer, RefreshCw, Upload, CheckCircle, Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface MarketplaceOrder {
  id: number
  provider?: string
  externalOrderId: string
  totalAmount: number
  status: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  city?: string
  district?: string
  fullAddress?: string
  syncedAt?: string
  createdAt: string
  updatedAt?: string
  orderData?: any // JSON data from marketplace API
  cargoTrackingNumber?: string
  cargoProviderName?: string
  barcode?: string
  cargoSlipPrintedAt?: string
  items?: Array<{
    id: number
    productName: string
    quantity: number
    price: number
    productImage?: string
    productSku?: string
    itemData?: any // JSON data from item
    option1?: string
    option2?: string
  }>
}

export default function HepsiburadaOrders() {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [showInvoicesModal, setShowInvoicesModal] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [invoiceLink, setInvoiceLink] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)
  // cargoSlipGenerated state'ini kaldırdık, artık backend'den gelecek

  useEffect(() => {
    // Debounce: Filtre değişikliklerinde 500ms bekle
    const timeoutId = setTimeout(() => {
      loadOrders()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [statusFilter, startDate, endDate])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      
      const response = await api.get<ApiResponse<MarketplaceOrder[]>>('/admin/hepsiburada-orders', params)
      if (response.success && response.data) {
        setOrders(response.data)
        // Toplam sipariş sayısını ve tutarını al
        const responseWithTotal = response as any
        if (responseWithTotal.total !== undefined) {
          setTotalOrders(responseWithTotal.total)
        } else {
          setTotalOrders(response.data.length)
        }
        if (responseWithTotal.totalAmount !== undefined) {
          setTotalAmount(responseWithTotal.totalAmount)
        } else {
          // Fallback: Frontend'de hesapla
          const calculatedTotal = response.data.reduce((sum, order) => {
            return sum + (parseFloat(String(order.totalAmount || 0)))
          }, 0)
          setTotalAmount(calculatedTotal)
        }
      }
    } catch (err: any) {
      setError('Siparişler yüklenemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setRefreshMessage(null)
      setError(null)
      
      // Önce Hepsiburada entegrasyonunu bul
      const integrationsResponse = await api.get<ApiResponse<any[]>>('/admin/integrations')
      if (!integrationsResponse.success || !integrationsResponse.data) {
        throw new Error('Entegrasyonlar yüklenemedi')
      }
      
      const hepsiburadaIntegration = integrationsResponse.data.find(
        (int: any) => int.provider === 'Hepsiburada' && int.type === 'marketplace'
      )
      
      if (!hepsiburadaIntegration || !hepsiburadaIntegration.id) {
        return
      }
      
      // Siparişleri Hepsiburada'dan çek
      const syncResponse = await api.post<ApiResponse<{ synced: number; skipped: number; total: number; errors?: any[] }>>(
        `/admin/integrations/${hepsiburadaIntegration.id}/sync-orders`,
        {}
      )
      
      if (syncResponse.success && syncResponse.data) {
        const { synced, skipped, total } = syncResponse.data
        setRefreshMessage(`${synced} sipariş senkronize edildi, ${skipped} sipariş atlandı (Toplam: ${total})`)
        
        // Siparişleri yeniden yükle
        await loadOrders()
        
        // Mesajı 5 saniye sonra temizle
        setTimeout(() => setRefreshMessage(null), 5000)
      } else {
        throw new Error(syncResponse.message || 'Sipariş çekme başarısız')
      }
    } catch (err: any) {
      setError('Siparişler yenilenemedi: ' + (err.message || 'Bilinmeyen hata'))
      setRefreshMessage(null)
    } finally {
      setRefreshing(false)
    }
  }

  const handleOrderClick = async (order: MarketplaceOrder) => {
    setSelectedOrder(order)
    setShowOrderDetailModal(true)
    setSelectedInvoiceId(null)
    setInvoiceLink('')
    
    // Faturaları yükle
    try {
      const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
      if (response.success && response.data && response.data.length > 0) {
        setInvoices(response.data)
        // İlk faturayı varsayılan olarak seç
        setSelectedInvoiceId(response.data[0].id)
      }
    } catch (err: any) {
      console.error('Faturalar yüklenemedi:', err)
    }
  }

  const handleShowInvoices = async () => {
    try {
      setInvoicesLoading(true)
      const response = await api.get<ApiResponse<any[]>>('/admin/invoices')
      if (response.success && response.data) {
        setInvoices(response.data)
        setShowInvoicesModal(true)
      }
    } catch (err: any) {
      console.error('Faturalar yüklenemedi:', err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  const handleGenerateCargoSlip = async () => {
    if (!selectedOrder) return
    
    // API base URL'i api utility'sinden al (tutarlılık için)
    // api utility'sinin baseUrl'ini kullan
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
    
    try {
      
      // Fatura linki veya seçili fatura kontrolü
      let invoiceUrl = ''
      
      if (invoiceLink && invoiceLink.trim()) {
        // Fatura linki girilmişse onu kullan
        invoiceUrl = invoiceLink.trim()
      } else if (selectedInvoiceId) {
        // Seçili faturayı bul
        const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId)
        if (!selectedInvoice) {
          alert('Seçili fatura bulunamadı.')
          return
        }
        
        // Direkt PDF dosyasına erişim için download URL'i oluştur
        if (selectedInvoice.id) {
          // Admin endpoint ile direkt dosya indirme
          invoiceUrl = `${API_BASE_URL}/admin/invoices/${selectedInvoice.id}/download`
        } else if (selectedInvoice.shareUrl) {
          // Share URL varsa download endpoint'ine yönlendir
          invoiceUrl = `${selectedInvoice.shareUrl}/download`
        }
      } else {
        alert('Lütfen bir fatura seçin veya fatura linki girin.')
        return
      }

      // Kargo bilgilerini al - Hepsiburada siparişlerinde direkt tabloda saklanıyor
      const cargoProviderName = (selectedOrder as any).cargoProviderName || ''
      // Barkod alanı Kargo Kodu ve EAN-128 barkod olarak kullanılacak
      const barcode = (selectedOrder as any).barcode || ''
      
      // Debug: Kargo bilgilerini logla
      console.log('🔍 Kargo Fişi Debug:', {
        orderId: selectedOrder.id,
        externalOrderId: selectedOrder.externalOrderId,
        cargoProviderName,
        barcode,
        provider: 'hepsiburada',
        apiBaseUrl: API_BASE_URL,
        selectedOrder: selectedOrder
      })

      // Backend'e istek gönder (blob response için doğrudan fetch)
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
      const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
      const token = sessionStorage.getItem('authToken') || ''
      
      const requestUrl = `${API_BASE_URL}/admin/generate-cargo-slip`
      console.log('🔍 API Request URL:', requestUrl)
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          invoiceUrl: invoiceUrl,
          cargoTrackingNumber: '', // Kargo Kodu artık barkod olacak, bu alan boş
          cargoProviderName: cargoProviderName,
          barcode: barcode, // Kargo Kodu ve EAN-128 için barkod
          customerName: selectedOrder.customerName,
          customerEmail: selectedOrder.customerEmail,
          customerPhone: selectedOrder.customerPhone,
          customerAddress: selectedOrder.shippingAddress || selectedOrder.fullAddress,
          city: selectedOrder.city,
          district: selectedOrder.district,
          provider: 'hepsiburada', // Hepsiburada siparişi olduğunu belirt
          // Ürün bilgilerini gönder (option1, option2, quantity dahil)
          items: (selectedOrder.items || []).map(item => {
            // itemData'yı parse et (JSON string ise)
            let itemData = null;
            try {
              if (item.itemData) {
                itemData = typeof item.itemData === 'string' ? JSON.parse(item.itemData) : item.itemData;
              }
            } catch (e) {
              console.warn('itemData parse hatası:', e);
            }
            
            return {
            productName: item.productName || '',
              productSku: item.productSku || '',
              option1: item.option1 || itemData?.['Seçenek 1'] || itemData?.option1 || '',
              option2: item.option2 || itemData?.['Seçenek 2'] || itemData?.option2 || '',
              quantity: item.quantity || 1,
              price: item.price || itemData?.['Faturalandırılacak Satış Fiyatı'] || 0
            };
          })
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kargo-fisi-${selectedOrder.externalOrderId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Kargo fişi başarıyla indirildi, siparişleri yeniden yükle (veritabanından cargoSlipPrintedAt bilgisi gelecek)
        await loadOrders()
      } else {
        const errorText = await response.text()
        let errorMessage = 'Bilinmeyen hata'
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        alert('Kargo fişi oluşturulamadı: ' + errorMessage)
      }
    } catch (error: any) {
      console.error('Kargo fişi oluşturma hatası:', error)
      alert('Kargo fişi oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      processing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      completed: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
    }
    return labels[status] || status
  }

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(`"${orderNumber}" siparişini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      setDeletingOrderId(orderId)
      setError(null)

      const response = await api.delete<ApiResponse<any>>(`/admin/hepsiburada-orders/${orderId}`)

      if (response.success) {
        setUploadSuccess('Sipariş başarıyla silindi')
        await loadOrders()
        setTimeout(() => setUploadSuccess(null), 3000)
      } else {
        throw new Error(response.message || 'Sipariş silinemedi')
      }
    } catch (err: any) {
      setError('Sipariş silinirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setDeletingOrderId(null)
    }
  }

  // Türkçe sayı formatını parse et (1.200,00 → 1200.00)
  const parseTurkishNumber = (value: string): number => {
    if (!value || !value.trim()) return 0
    
    const trimmed = value.trim()
    
    // Türkçe format: binlik ayırıcı nokta, ondalık ayırıcı virgül (örn: 1.200,00)
    // Önce binlik ayırıcıları (noktaları) kaldır, sonra virgülü noktaya çevir
    let normalized = trimmed
    
    // Virgül varsa (ondalık kısım var)
    if (normalized.includes(',')) {
      // Son virgülden önceki noktaları kaldır (binlik ayırıcılar)
      const parts = normalized.split(',')
      if (parts.length === 2) {
        const integerPart = parts[0].replace(/\./g, '') // Binlik ayırıcıları kaldır
        const decimalPart = parts[1]
        normalized = `${integerPart}.${decimalPart}`
      }
    } else {
      // Virgül yoksa, tüm noktaları kaldır (binlik ayırıcılar)
      normalized = normalized.replace(/\./g, '')
    }
    
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }

  // Sayıyı Türkçe formata çevir (1200.00 → 1.200,00)
  const formatTurkishNumber = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0,00'
    
    // Türkçe format: binlik ayırıcı nokta, ondalık ayırıcı virgül
    return numValue.toFixed(2)
      .replace('.', ',') // Ondalık ayırıcıyı virgüle çevir
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.') // Binlik ayırıcıları ekle
  }

  // Fatura ismini düzelt - encoding sorunlarını çöz
  const fixInvoiceFileName = (fileName: string): string => {
    if (!fileName) return ''
    
    try {
      // Önce URL decode dene
      let decoded = fileName
      try {
        decoded = decodeURIComponent(fileName)
      } catch {
        decoded = fileName
      }
      
      // ISO-8859-1 → UTF-8 encoding sorunlarını düzelt
      // Yaygın bozuk karakterleri düzelt (daha kapsamlı)
      const encodingFixes: Array<[RegExp, string]> = [
        // Büyük harfler
        [/Å/g, 'A'], [/Ä/g, 'A'], [/Ã/g, 'A'], [/À/g, 'A'], [/Á/g, 'A'], [/Â/g, 'A'],
        [/Ç/g, 'C'], [/Ã/g, 'C'],
        [/È/g, 'E'], [/É/g, 'E'], [/Ê/g, 'E'], [/Ë/g, 'E'], [/Ä/g, 'E'], [/Ã/g, 'E'],
        [/Ì/g, 'I'], [/Í/g, 'I'], [/Î/g, 'I'], [/Ï/g, 'I'], [/Ä/g, 'I'], [/Ã/g, 'I'],
        [/Ò/g, 'O'], [/Ó/g, 'O'], [/Ô/g, 'O'], [/Õ/g, 'O'], [/Ö/g, 'O'], [/Ä/g, 'O'], [/Ã/g, 'O'],
        [/Ù/g, 'U'], [/Ú/g, 'U'], [/Û/g, 'U'], [/Ü/g, 'U'], [/Ä/g, 'U'], [/Ã/g, 'U'],
        [/Ý/g, 'Y'], [/Ä/g, 'Y'], [/Ã/g, 'Y'],
        [/Å/g, 'S'], [/Ş/g, 'S'],
        [/Ğ/g, 'G'], [/Ä/g, 'G'], [/Ã/g, 'G'],
        // Küçük harfler
        [/å/g, 'a'], [/ä/g, 'a'], [/ã/g, 'a'], [/à/g, 'a'], [/á/g, 'a'], [/â/g, 'a'],
        [/ç/g, 'c'], [/ã/g, 'c'],
        [/è/g, 'e'], [/é/g, 'e'], [/ê/g, 'e'], [/ë/g, 'e'], [/ä/g, 'e'], [/ã/g, 'e'],
        [/ì/g, 'i'], [/í/g, 'i'], [/î/g, 'i'], [/ï/g, 'i'], [/ä/g, 'i'], [/ã/g, 'i'], [/ı/g, 'i'],
        [/ò/g, 'o'], [/ó/g, 'o'], [/ô/g, 'o'], [/õ/g, 'o'], [/ö/g, 'o'], [/ä/g, 'o'], [/ã/g, 'o'],
        [/ù/g, 'u'], [/ú/g, 'u'], [/û/g, 'u'], [/ü/g, 'u'], [/ä/g, 'u'], [/ã/g, 'u'],
        [/ý/g, 'y'], [/ÿ/g, 'y'], [/ä/g, 'y'], [/ã/g, 'y'],
        [/å/g, 's'], [/ş/g, 's'],
        [/ğ/g, 'g'], [/ä/g, 'g'], [/ã/g, 'g'],
        // Özel durumlar ve kelimeler
        [/BÄRÄ°NCÄ°/g, 'BIRINCI'],
        [/ÃOMER/g, 'COMER'],
        [/ÅDENAY/g, 'ADENAY'],
        [/ÅDINGIR/g, 'ADINGIR'],
        [/Ä°/g, 'I'], // Ä° → I
        [/Ä±/g, 'i'], // Ä± → i
      ]
      
      // Encoding düzeltmelerini uygula
      let fixed = decoded
      for (const [pattern, replacement] of encodingFixes) {
        fixed = fixed.replace(pattern, replacement)
      }
      
      return fixed
    } catch (error) {
      console.error('Fatura ismi düzeltme hatası:', error)
      return fileName
    }
  }

  // Barkod alanını normalize et - bilimsel notasyonu tam sayıya çevir (formatlamadan, ham haliyle)
  const normalizeBarcode = (barcode: string): string => {
    if (!barcode || !barcode.trim()) return ''
    
    const trimmed = barcode.trim()
    
    // Bilimsel notasyon kontrolü (örn: 6,25541E+13 veya 6.25541E+13)
    const scientificNotationRegex = /^([\d,\.]+)[eE]([\+\-]?\d+)$/
    const match = trimmed.match(scientificNotationRegex)
    
    if (match) {
      const base = match[1].replace(',', '.') // Virgülü noktaya çevir
      const exponent = parseInt(match[2], 10)
      
      // Sayıyı parse et
      const baseNum = parseFloat(base)
      if (!isNaN(baseNum) && !isNaN(exponent)) {
        // Bilimsel notasyonu hesapla
        const result = baseNum * Math.pow(10, exponent)
        
        // Formatlamadan, tam sayı olarak string'e çevir (ondalık kısmı yoksa)
        // Büyük sayılar için güvenli yöntem: Number.isInteger kontrolü ve toString
        if (Number.isInteger(result)) {
          // Formatlamadan, direkt string'e çevir
          return result.toString()
        }
        // Ondalıklı sayıysa (olması beklenmez ama yine de) - formatlamadan
        return result.toString()
      }
    }
    
    // Normal string olarak döndür (bilimsel notasyon değilse) - hiçbir formatlama yapmadan, ham haliyle
    return trimmed
  }

  // CSV Parse fonksiyonu - Hepsiburada formatına özel
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    // Başlık satırını al
    const headers = lines[0].split(';').map(h => h.trim())
    
    // Veri satırlarını parse et
    const orders: any[] = []
    const orderMap = new Map<string, any>() // Paket numarasına göre grupla
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(';')
      // Eğer kolon sayısı çok azsa (3'ten az) atla, yoksa devam et (eksik kolonlar boş string olur)
      if (values.length < 3) continue
      
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })
      
      // Paket numarası ve kalem numarası
      const packageNumber = row['Paket Numarası'] || ''
      const orderNumber = row['Sipariş Numarası'] || ''
      const itemNumber = row['Kalem Numarası']
      
      // Paket numarası yoksa, sipariş numarasını kullan (fallback)
      // Eğer ikisi de yoksa, satır numarası ile benzersiz bir ID oluştur (hiçbir sipariş atlanmasın)
      const groupKey = packageNumber || orderNumber || `csv-row-${i}-${Date.now()}`
      
      // Paket numarası ve sipariş numarası yoksa bile devam et (fallback ID ile)
      // if (!packageNumber && !orderNumber) continue // KALDIRILDI - hiçbir sipariş atlanmasın
      
      // Aynı paket numarasına sahip sipariş zaten varsa, sadece item ekle
      if (orderMap.has(groupKey)) {
        const existingOrder = orderMap.get(groupKey)
        if (!existingOrder.items) existingOrder.items = []
        
        existingOrder.items.push({
          itemNumber: itemNumber,
          productName: row['Ürün Adı'] || '',
          productSku: row['Satıcı Stok Kodu'] || '',
          hepsiburadaProductCode: row['Hepsiburada Ürün Kodu'] || '',
          option1: row['Seçenek 1'] || '',
          option2: row['Seçenek 2'] || '',
          quantity: parseInt(row['Adet'] || '1', 10) || 1,
          price: parseTurkishNumber(row['Faturalandırılacak Satış Fiyatı'] || '0'),
          listingPrice: parseTurkishNumber(row['Listeleme Fiyatı'] || '0'),
          unitPrice: parseTurkishNumber(row['Faturalandırılacak Birim Satış Fiyatı'] || '0'),
          commission: parseTurkishNumber(row['Komisyon Tutarı (KDV Dahil)'] || '0'),
          taxRate: parseTurkishNumber(row['KDV(%)'] || '0'),
          category: row['Kategori'] || '',
        })
        
        // Toplam tutarı güncelle
        existingOrder.totalAmount += parseTurkishNumber(row['Faturalandırılacak Satış Fiyatı'] || '0')
        
        // Eğer farklı sipariş numaraları varsa, externalOrderId'yi birleştir
        if (orderNumber && !existingOrder.externalOrderId.includes(orderNumber)) {
          existingOrder.externalOrderId = `${existingOrder.externalOrderId}, ${orderNumber}`
        }
      } else {
        // Yeni sipariş oluştur
        const orderDate = row['Sipariş Tarihi'] || ''
        let parsedDate = new Date()
        if (orderDate) {
          // DD-MM-YYYY HH:MM:SS formatını parse et
          const dateParts = orderDate.split(' ')
          if (dateParts.length >= 1) {
            const dateStr = dateParts[0]
            const timeStr = dateParts[1] || '00:00:00'
            const [day, month, year] = dateStr.split('-')
            if (day && month && year) {
              parsedDate = new Date(`${year}-${month}-${day}T${timeStr}`)
            }
          }
        }
        
        const order = {
          externalOrderId: orderNumber || packageNumber || `CSV-ROW-${i}`, // Sipariş numarası yoksa paket numarasını kullan, o da yoksa fallback ID
          packageNumber: packageNumber,
          customerName: row['Alıcı'] || '',
          customerEmail: row['Alıcı Mail Adresi'] || '',
          shippingAddress: row['Teslimat Adresi'] || '',
          city: row['Şehir'] || '',
          district: row['Semt'] || '',
          invoiceAddress: row['Fatura Adresi'] || '',
          cargoProviderName: row['Kargo Firması'] || '',
          cargoTrackingNumber: row['Kargo Takip No'] || '',
          barcode: normalizeBarcode(row['Barkod'] || ''),
          orderDate: parsedDate.toISOString(),
          deliveryDate: row['Kargoya Son Teslim Tarihi'] || '',
          deliveryType: row['Teslimat Tipi'] || '',
          packageStatus: row['Paket Durumu'] || 'Gönderime Hazır',
          status: row['Paket Durumu'] === 'Gönderime Hazır' ? 'pending' : 
                  row['Paket Durumu']?.toLowerCase().includes('teslim') ? 'completed' : 'processing',
          totalAmount: parseTurkishNumber(row['Faturalandırılacak Satış Fiyatı'] || '0'),
          currency: row['Para Birimi'] || 'TRY',
          customerType: row['Müşteri Tipi'] || '',
          isHepsiLogistic: row['Hepsilojistik Siparişi mi?'] === 'Evet',
          isReturned: row['İade edildi mi?'] === 'Evet',
          items: [{
            itemNumber: itemNumber,
            productName: row['Ürün Adı'] || '',
            productSku: row['Satıcı Stok Kodu'] || '',
            hepsiburadaProductCode: row['Hepsiburada Ürün Kodu'] || '',
            option1: row['Seçenek 1'] || '',
            option2: row['Seçenek 2'] || '',
          quantity: parseInt(row['Adet'] || '1', 10) || 1,
          price: parseTurkishNumber(row['Faturalandırılacak Satış Fiyatı'] || '0'),
          listingPrice: parseTurkishNumber(row['Listeleme Fiyatı'] || '0'),
          unitPrice: parseTurkishNumber(row['Faturalandırılacak Birim Satış Fiyatı'] || '0'),
          commission: parseTurkishNumber(row['Komisyon Tutarı (KDV Dahil)'] || '0'),
          taxRate: parseTurkishNumber(row['KDV(%)'] || '0'),
            category: row['Kategori'] || '',
          }],
          rawData: row // Tüm ham veriyi sakla
        }
        
        orderMap.set(groupKey, order)
      }
    }
    
    return Array.from(orderMap.values())
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Sadece CSV dosyalarını kabul et
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setError('Lütfen CSV dosyası seçin')
      return
    }
    
    try {
      setUploading(true)
      setError(null)
      setUploadSuccess(null)
      
      // Dosyayı oku
      const text = await file.text()
      
      // CSV'yi parse et
      const parsedOrders = parseCSV(text)
      
      if (parsedOrders.length === 0) {
        setError('CSV dosyasında geçerli sipariş bulunamadı')
        return
      }
      
      // Backend'e gönder
      const response = await api.post<ApiResponse<{ imported: number; skipped: number; errors?: string[] }>>(
        '/admin/hepsiburada-orders/import',
        {
          orders: parsedOrders
        }
      )
      
      if (response.success && response.data) {
        const { imported, skipped, errors } = response.data
        setUploadSuccess(`${imported} sipariş başarıyla yüklendi${skipped > 0 ? `, ${skipped} sipariş atlandı` : ''}`)
        if (errors && errors.length > 0) {
          setError(`Bazı hatalar oluştu: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
        }
        
        // Siparişleri yeniden yükle
        await loadOrders()
        
        // Modal'ı kapat
        setShowUploadModal(false)
        
        // Başarı mesajını 5 saniye sonra temizle
        setTimeout(() => setUploadSuccess(null), 5000)
      } else {
        throw new Error(response.message || 'Sipariş yükleme başarısız')
      }
    } catch (err: any) {
      setError('CSV yükleme hatası: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setUploading(false)
      // Input'u temizle
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.externalOrderId.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Hepsiburada Siparişleri
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Hepsiburada'dan gelen siparişleri görüntüleyin ve yönetin
                  {totalOrders > 0 && (
                    <span className="ml-2 font-semibold text-purple-600 dark:text-purple-400">
                      (Toplam: {totalOrders} sipariş • {formatTurkishNumber(totalAmount)} TRY)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={uploading || loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors font-medium"
                title="CSV Dosyasından Sipariş Yükle"
              >
                <Upload className="w-4 h-4" />
                CSV Yükle
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors font-medium"
                title="Siparişleri Hepsiburada'dan Yeniden Çek"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Yenileniyor...' : 'Yenile'}
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}
          {refreshMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {refreshMessage}
            </motion.div>
          )}
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {uploadSuccess}
            </motion.div>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sipariş numarası, müşteri adı veya e-posta ile ara..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="processing">İşleniyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>
            </div>
            {/* Tarih Filtresi */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Başlangıç:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Bitiş:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">Henüz Hepsiburada siparişi bulunmuyor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        🛒 {order.externalOrderId}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                        Hepsiburada
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.cargoSlipPrintedAt && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 flex items-center gap-1">
                          <Printer className="w-3 h-3" />
                          Kargo Gişi Yazıldı
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {order.customerName && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                          <span>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerEmail && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{order.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(order.createdAt || order.syncedAt || Date.now()).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatTurkishNumber(order.totalAmount || 0)} TRY</span>
                      </div>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Sipariş Öğeleri ({order.items.length})
                        </p>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div key={item.id || `item-${order.id}-${idx}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span>{item.productName}</span>
                              <span className="text-slate-400">x{item.quantity}</span>
                              <span className="ml-auto font-medium">{formatTurkishNumber(item.price || 0)} TRY</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              +{order.items.length - 3} ürün daha
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteOrder(order.id, order.externalOrderId)
                    }}
                    disabled={deletingOrderId === order.id}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Siparişi Sil"
                  >
                    {deletingOrderId === order.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        <AnimatePresence>
          {showOrderDetailModal && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowOrderDetailModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Sipariş Detayı
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        🛒 Hepsiburada - {selectedOrder.externalOrderId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleShowInvoices}
                        className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Faturaları Görüntüle"
                      >
                        <Receipt className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleGenerateCargoSlip}
                        className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        title="Kargo Fişi Oluştur"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowJsonModal(true)
                        }}
                        className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="JSON Verisini Görüntüle"
                      >
                        <FileJson className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowOrderDetailModal(false)
                          setSelectedOrder(null)
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Fatura Seçimi */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Fatura Bilgileri</h3>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                      {/* Fatura Linki */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Fatura Linki (Opsiyonel)
                        </label>
                        <input
                          type="text"
                          value={invoiceLink}
                          onChange={(e) => {
                            setInvoiceLink(e.target.value)
                            if (e.target.value.trim()) {
                              setSelectedInvoiceId(null)
                            }
                          }}
                          placeholder="https://api.zerodaysoftware.tr/api/invoices/share/..."
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {invoiceLink && invoiceLink.trim() && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Fatura linki girildi. Bu link QR kodda kullanılacak.
                          </p>
                        )}
                      </div>
                      
                      {/* Fatura Seçimi - Link girildiğinde devre dışı */}
                      {invoices.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Kargo Fişi için Fatura Seçimi
                          </label>
                          <select
                            value={selectedInvoiceId || ''}
                            onChange={(e) => {
                              setSelectedInvoiceId(Number(e.target.value))
                              if (e.target.value) {
                                setInvoiceLink('')
                              }
                            }}
                            disabled={!!(invoiceLink && invoiceLink.trim())}
                            className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              invoiceLink && invoiceLink.trim() 
                                ? 'opacity-50 cursor-not-allowed' 
                                : ''
                            }`}
                          >
                            <option value="">Fatura Seçiniz</option>
                            {invoices.map((invoice) => (
                              <option key={invoice.id} value={invoice.id}>
                                {invoice.invoiceNumber || `Fatura #${invoice.id}`} 
                                {invoice.fileName && ` - ${fixInvoiceFileName(invoice.fileName)}`}
                                {invoice.totalAmount && ` (${formatTurkishNumber(invoice.totalAmount)} ${invoice.currency || 'TRY'})`}
                              </option>
                            ))}
                          </select>
                          {selectedInvoiceId && !invoiceLink && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                              Seçili fatura kargo fişindeki QR kodda kullanılacak
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Müşteri Bilgileri */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Müşteri Bilgileri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.customerName && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Ad Soyad</label>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedOrder.customerName}</p>
                        </div>
                      )}
                      {selectedOrder.customerEmail && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">E-posta</label>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedOrder.customerEmail}</p>
                        </div>
                      )}
                      {selectedOrder.customerPhone && (
                        <div>
                          <label className="text-sm text-slate-600 dark:text-slate-400">Telefon</label>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedOrder.customerPhone}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm text-slate-600 dark:text-slate-400">Durum</label>
                        <p className="text-slate-900 dark:text-white font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                            {getStatusLabel(selectedOrder.status)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Adres Bilgileri */}
                  {(selectedOrder.shippingAddress || selectedOrder.city || selectedOrder.district) && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Teslimat Adresi</h3>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                        <p className="text-slate-900 dark:text-white">
                          {selectedOrder.shippingAddress || selectedOrder.fullAddress}
                        </p>
                        {(selectedOrder.city || selectedOrder.district) && (
                          <p className="text-slate-600 dark:text-slate-400 mt-2">
                            {selectedOrder.district && `${selectedOrder.district}, `}{selectedOrder.city}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sipariş Öğeleri */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Sipariş Öğeleri ({selectedOrder.items.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item, idx) => (
                          <div
                            key={item.id || `item-${selectedOrder.id}-${idx}`}
                            className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            {item.productImage && (
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                              {item.productSku && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">SKU: {item.productSku}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-600 dark:text-slate-400">Adet: {item.quantity}</p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {formatTurkishNumber(item.price || 0)} TRY
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Toplam: {formatTurkishNumber((Number(item.price || 0) * item.quantity))} TRY
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toplam Tutar */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">Toplam Tutar</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatTurkishNumber(selectedOrder.totalAmount || 0)} TRY
                      </span>
                    </div>
                  </div>

                   {/* Kargo Bilgileri */}
                   {(() => {
                     // Hepsiburada siparişlerinde kargo bilgileri direkt tabloda saklanıyor
                     const cargoTrackingNumber = (selectedOrder as any).cargoTrackingNumber
                     const cargoProviderName = (selectedOrder as any).cargoProviderName
                     const barcode = (selectedOrder as any).barcode
                     const packageNumber = (selectedOrder as any).packageNumber
                     
                     // Hepsiburada siparişi kontrolü - bu sayfa sadece Hepsiburada siparişleri için
                     // Bu sayfada olduğumuz için tüm siparişler Hepsiburada siparişidir
                     const isHepsiburada = true
                     
                     if (!cargoTrackingNumber && !cargoProviderName && !barcode && !packageNumber) return null
                     
                     return (
                       <div>
                         <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Kargo Bilgileri</h3>
                         <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                           {cargoProviderName && (
                             <div>
                               <label className="text-sm text-slate-600 dark:text-slate-400">Kargo Firması</label>
                               <p className="text-slate-900 dark:text-white font-medium">
                                 {cargoProviderName}
                               </p>
                             </div>
                           )}
                           {cargoTrackingNumber && (
                             <div>
                               <label className="text-sm text-slate-600 dark:text-slate-400">Kargo Kodu</label>
                               <p className="text-slate-900 dark:text-white font-medium">
                                 {cargoTrackingNumber}
                               </p>
                             </div>
                           )}
                           {/* Barkod bilgisi sadece Hepsiburada siparişlerinde göster */}
                           {isHepsiburada && barcode && (
                             <div>
                               <label className="text-sm text-slate-600 dark:text-slate-400">Barkod</label>
                               <p className="text-slate-900 dark:text-white font-medium font-mono">
                                 {barcode}
                               </p>
                             </div>
                           )}
                         </div>
                       </div>
                     )
                   })()}

                  {/* Sipariş Tarihleri */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400">Oluşturulma Tarihi</label>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {new Date(selectedOrder.createdAt || selectedOrder.syncedAt || Date.now()).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400">Güncelleme Tarihi</label>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {selectedOrder.updatedAt 
                          ? new Date(selectedOrder.updatedAt).toLocaleString('tr-TR')
                          : new Date(selectedOrder.createdAt || selectedOrder.syncedAt || Date.now()).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* JSON Data Modal */}
        <AnimatePresence>
          {showJsonModal && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowJsonModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Code className="w-6 h-6" />
                        JSON Verisi
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Sipariş: {selectedOrder.externalOrderId}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowJsonModal(false)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap break-words">
                      {(() => {
                        try {
                          const jsonData = selectedOrder.orderData 
                            ? (typeof selectedOrder.orderData === 'string' 
                                ? JSON.parse(selectedOrder.orderData)
                                : selectedOrder.orderData)
                            : null
                          
                          if (!jsonData) {
                            return 'JSON verisi bulunamadı'
                          }
                          
                          return JSON.stringify(jsonData, null, 2)
                        } catch (error) {
                          return `JSON parse hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                        }
                      })()}
                    </pre>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        try {
                          const jsonData = selectedOrder.orderData 
                            ? (typeof selectedOrder.orderData === 'string' 
                                ? JSON.parse(selectedOrder.orderData)
                                : selectedOrder.orderData)
                            : null
                          
                          if (jsonData) {
                            const jsonString = JSON.stringify(jsonData, null, 2)
                            navigator.clipboard.writeText(jsonString)
                            alert('JSON verisi panoya kopyalandı!')
                          }
                        } catch (error) {
                          alert('Kopyalama hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FileJson className="w-4 h-4" />
                      Kopyala
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Invoices Modal */}
        <AnimatePresence>
          {showInvoicesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowInvoicesModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6" />
                        PDF Faturalar
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Sisteme yüklenmiş tüm faturalar
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowInvoicesModal(false)
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {invoicesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">Henüz fatura yüklenmemiş</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {invoice.invoiceNumber || `Fatura #${invoice.id}`}
                                </h3>
                                {invoice.fileName && (
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {fixInvoiceFileName(invoice.fileName)}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {invoice.customerName && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Müşteri</label>
                                    <p className="text-slate-900 dark:text-white">{invoice.customerName}</p>
                                  </div>
                                )}
                                {invoice.totalAmount && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Tutar</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {formatTurkishNumber(invoice.totalAmount)} {invoice.currency || 'TRY'}
                                    </p>
                                  </div>
                                )}
                                {invoice.invoiceDate && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Tarih</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}
                                    </p>
                                  </div>
                                )}
                                {invoice.fileSize && (
                                  <div>
                                    <label className="text-slate-600 dark:text-slate-400">Boyut</label>
                                    <p className="text-slate-900 dark:text-white">
                                      {(invoice.fileSize / 1024).toFixed(2)} KB
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {(() => {
                                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.zerodaysoftware.tr/api'
                                const token = sessionStorage.getItem('authToken') || ''
                                const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
                                const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'huglu-admin-2024-secure-key-CHANGE-THIS'
                                
                                // Admin endpoint ile direkt PDF erişimi
                                const viewUrl = invoice.id 
                                  ? `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                                  : invoice.shareUrl 
                                    ? `${invoice.shareUrl}/download`
                                    : null
                                
                                const downloadUrl = invoice.id
                                  ? `${API_BASE_URL}/admin/invoices/${invoice.id}/download`
                                  : invoice.shareUrl
                                    ? `${invoice.shareUrl}/download`
                                    : null

                                if (!viewUrl || !downloadUrl) return null

                                return (
                                  <>
                                    <button
                                      onClick={() => {
                                        // PDF'i yeni sekmede aç
                                        fetch(viewUrl, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'X-API-Key': API_KEY,
                                            'X-Admin-Key': ADMIN_KEY
                                          }
                                        })
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob)
                                            window.open(url, '_blank')
                                            setTimeout(() => window.URL.revokeObjectURL(url), 100)
                                          })
                                          .catch(err => {
                                            console.error('PDF görüntüleme hatası:', err)
                                            alert('PDF görüntülenemedi')
                                          })
                                      }}
                                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      title="Görüntüle"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        // PDF'i indir
                                        fetch(downloadUrl, {
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'X-API-Key': API_KEY,
                                            'X-Admin-Key': ADMIN_KEY
                                          }
                                        })
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = invoice.fileName || `fatura-${invoice.id}.pdf`
                                            document.body.appendChild(a)
                                            a.click()
                                            window.URL.revokeObjectURL(url)
                                            document.body.removeChild(a)
                                          })
                                          .catch(err => {
                                            console.error('PDF indirme hatası:', err)
                                            alert('PDF indirilemedi')
                                          })
                                      }}
                                      className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                      title="İndir"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CSV Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !uploading && setShowUploadModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-6 h-6" />
                        CSV Dosyası Yükle
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Hepsiburada sipariş CSV dosyasını yükleyin
                      </p>
                    </div>
                    <button
                      onClick={() => !uploading && setShowUploadModal(false)}
                      disabled={uploading}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">CSV Format Gereksinimleri:</h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>Dosya formatı: CSV (noktalı virgül ile ayrılmış)</li>
                      <li>İlk satır başlık satırı olmalı</li>
                      <li>Gerekli kolonlar: Sipariş Numarası, Alıcı, Teslimat Adresi, Ürün Adı, Adet, Fiyat</li>
                      <li>Tarih formatı: DD-MM-YYYY HH:MM:SS</li>
                      <li>Fiyat formatı: 150,0000 (virgül ile ondalık ayırıcı)</li>
                    </ul>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="csv-upload-input"
                    />
                    <label
                      htmlFor="csv-upload-input"
                      className={`cursor-pointer flex flex-col items-center gap-4 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                          <div>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              Dosya yükleniyor...
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Lütfen bekleyin
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                            <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              CSV Dosyası Seçin
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Veya dosyayı buraya sürükleyip bırakın
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

