'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productsApi, customProductionApi } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: number;
  name: string;
  image?: string;
  images?: string | string[];
  price: number;
}

interface DesignElement {
  id: string;
  type: 'logo' | 'text' | 'shape';
  content: string; // URL for logo, text for text, shape type for shape
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | 'lighter';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  rotation?: number;
  zIndex?: number;
  shadow?: boolean;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowColor?: string;
  borderRadius?: number;
}

export default function DesignEditorPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id ? Number(params.id) : null
  
  const [product, setProduct] = useState<Product | null>(null)
  const [productImages, setProductImages] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [elements, setElements] = useState<DesignElement[]>([])
  const [history, setHistory] = useState<DesignElement[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showTextInput, setShowTextInput] = useState(false)
  const [showShapeMenu, setShowShapeMenu] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [textColor, setTextColor] = useState('#000000')
  const [textSize, setTextSize] = useState(24)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold' | 'lighter'>('normal')
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [zoom, setZoom] = useState(100)
  
  // Canvas boyutunu container'a göre hesapla
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current && typeof window !== 'undefined') {
        const container = canvasContainerRef.current
        const rect = container.getBoundingClientRect()
        const padding = 40
        const availableWidth = rect.width - padding
        const availableHeight = rect.height - padding
        
        // Mobil için daha küçük, desktop için daha büyük boyutlar
        const isMobile = window.innerWidth < 768
        const minWidth = isMobile ? 600 : 1200
        const minHeight = isMobile ? 600 : 1200
        const maxWidth = isMobile ? 800 : 2000
        const maxHeight = isMobile ? 800 : 2000
        
        setCanvasSize({ 
          width: Math.min(Math.max(availableWidth, minWidth), maxWidth), 
          height: Math.min(Math.max(availableHeight, minHeight), maxHeight)
        })
      }
    }

    // İlk yüklemede ve resize'da güncelle
    if (typeof window !== 'undefined') {
      const timer = setTimeout(updateCanvasSize, 100)
      window.addEventListener('resize', updateCanvasSize)
      
      return () => {
        clearTimeout(timer)
        window.removeEventListener('resize', updateCanvasSize)
      }
    }
  }, [])
  const [showGrid, setShowGrid] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [sizes, setSizes] = useState<Record<string, number>>({
    'XS': 0,
    'S': 0,
    'M': 0,
    'L': 0,
    'XL': 0,
    '2XL': 0,
    '3XL': 0,
    '4XL': 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [skipDesign, setSkipDesign] = useState(false)
  const [fabricProvidedByCustomer, setFabricProvidedByCustomer] = useState(false)
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  
  const { user } = useAuth()
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 600 })

  // Undo/Redo functions
  const saveToHistory = (newElements: DesignElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newElements])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setElements([...history[newIndex]])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setElements([...history[newIndex]])
    }
  }

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
    

    // İlk durumu history'ye kaydet
    if (elements.length === 0 && history.length === 0) {
      setHistory([[]])
      setHistoryIndex(0)
    }
  }, [productId])

  // User bilgilerini personalInfo'ya otomatik doldur
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      })
    }
  }, [user])

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      } else if (e.key === 'Delete' && selectedElement) {
        e.preventDefault()
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement, historyIndex, history])

  const loadProduct = async () => {
    if (!productId) return
    
    try {
      setLoading(true)
      const response = await productsApi.getProductById(productId)
      
      if (response.success && response.data) {
        const productData = response.data
        setProduct(productData)
        
        // Tüm görselleri yükle
        let images: string[] = [];
        if (productData.images) {
          if (typeof productData.images === 'string') {
            try {
              const parsed = JSON.parse(productData.images);
              images = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              images = [productData.images];
            }
          } else if (Array.isArray(productData.images)) {
            images = productData.images;
          }
        }
        
        // Ana resmi ekle (eğer images'da yoksa)
        if (productData.image && !images.includes(productData.image)) {
          images.unshift(productData.image);
        } else if (productData.image && !images.length) {
          images = [productData.image];
        }
        
        setProductImages(images);
        setSelectedImageIndex(0);
      }
    } catch (error) {
      console.error('Ürün yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Sadece resim dosyalarını kabul et
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seçin')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      const newElement: DesignElement = {
        id: `logo-${Date.now()}`,
        type: 'logo',
        content: imageUrl,
        x: canvasSize.width / 2 - 50,
        y: canvasSize.height / 2 - 50,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: elements.length
      }
      const newElements = [...elements, newElement]
      setElements(newElements)
      setSelectedElement(newElement.id)
      saveToHistory(newElements)
    }
    reader.readAsDataURL(file)
  }

  const handleAddText = () => {
    if (!textInput.trim()) return

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: textInput,
      x: canvasSize.width / 2 - 50,
      y: canvasSize.height / 2,
      width: 200,
      height: 40,
      fontSize: textSize,
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      textAlign: textAlign,
      color: textColor,
      rotation: 0,
      zIndex: elements.length,
      opacity: 1,
      shadow: false
    }
    const newElements = [...elements, newElement]
    setElements(newElements)
    setSelectedElement(newElement.id)
    setTextInput('')
    setShowTextInput(false)
    saveToHistory(newElements)
  }

  const handleAddShape = (shapeType: 'circle' | 'square' | 'line' | 'triangle' | 'star' | 'arrow' | 'ellipse') => {
    // Şekil boyutlarını belirle
    let width = 100
    let height = 100
    
    if (shapeType === 'line') {
      width = 100
      height = 5
    } else if (shapeType === 'arrow') {
      width = 80
      height = 80
    } else if (shapeType === 'triangle') {
      width = 100
      height = 100
    } else if (shapeType === 'star') {
      width = 100
      height = 100
    } else if (shapeType === 'ellipse') {
      width = 120
      height = 80
    }
    
    const newElement: DesignElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      content: shapeType,
      x: canvasSize.width / 2 - width / 2,
      y: canvasSize.height / 2 - height / 2,
      width: width,
      height: height,
      color: '#000000',
      backgroundColor: shapeType === 'line' ? '#000000' : '#FF0000',
      borderColor: '#000000',
      borderWidth: 2,
      rotation: 0,
      zIndex: elements.length,
      opacity: 1
    }
    const newElements = [...elements, newElement]
    setElements(newElements)
    setSelectedElement(newElement.id)
    setShowShapeMenu(false)
    saveToHistory(newElements)
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    setSelectedElement(elementId)
    setIsDragging(true)
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y

    const newElements = elements.map(el => 
      el.id === selectedElement 
        ? { ...el, x: Math.max(0, Math.min(x, canvasSize.width - el.width)), y: Math.max(0, Math.min(y, canvasSize.height - el.height)) }
        : el
    )
    setElements(newElements)
  }

  const handleMouseUp = () => {
    if (isDragging && selectedElement) {
      // Sürükleme bitince history'ye kaydet
      saveToHistory([...elements])
    }
    setIsDragging(false)
  }

  const handleDelete = () => {
    if (selectedElement) {
      const newElements = elements.filter(el => el.id !== selectedElement)
      setElements(newElements)
      setSelectedElement(null)
      saveToHistory(newElements)
    }
  }

  const handleResize = (elementId: string, delta: number) => {
    const newElements = elements.map(el => {
      if (el.id === elementId) {
        const newWidth = Math.max(20, Math.min(el.width + delta, canvasSize.width - el.x))
        const newHeight = el.type === 'logo' || el.type === 'shape'
          ? (el.height * newWidth / el.width) 
          : el.height
        return { ...el, width: newWidth, height: newHeight }
      }
      return el
    })
    setElements(newElements)
    saveToHistory(newElements)
  }

  const handleRotate = (elementId: string, delta: number) => {
    const newElements = elements.map(el => {
      if (el.id === elementId) {
        return { ...el, rotation: (el.rotation || 0) + delta }
      }
      return el
    })
    setElements(newElements)
    saveToHistory(newElements)
  }

  const handleUpdateElement = (elementId: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    )
    setElements(newElements)
    saveToHistory(newElements)
  }

  const handleMoveLayer = (elementId: string, direction: 'up' | 'down') => {
    const elementIndex = elements.findIndex(el => el.id === elementId)
    if (elementIndex === -1) return

    const newElements = [...elements]
    const targetIndex = direction === 'up' ? elementIndex + 1 : elementIndex - 1
    
    if (targetIndex >= 0 && targetIndex < elements.length) {
      [newElements[elementIndex], newElements[targetIndex]] = [newElements[targetIndex], newElements[elementIndex]]
      newElements.forEach((el, idx) => {
        el.zIndex = idx
      })
      setElements(newElements)
      saveToHistory(newElements)
    }
  }

  const handleExport = async () => {
    if (!canvasRef.current) return

    try {
      // Önce orijinal görseli yükleyip boyutunu al
      let originalImageWidth = canvasSize.width
      let originalImageHeight = canvasSize.height
      
      if (productImages.length > 0 && productImages[selectedImageIndex]) {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          img.onload = () => {
            originalImageWidth = img.naturalWidth
            originalImageHeight = img.naturalHeight
            resolve(null)
          }
          img.onerror = reject
          img.src = productImages[selectedImageIndex]
        })
      }

      // html2canvas kullanarak canvas'ı görüntüye dönüştür
      // Yüksek çözünürlük için scale'i dinamik yap
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: Math.max(2, Math.min(originalImageWidth / canvasSize.width, originalImageHeight / canvasSize.height, 4)),
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: originalImageWidth || canvasSize.width,
        height: originalImageHeight || canvasSize.height,
        windowWidth: originalImageWidth || canvasSize.width,
        windowHeight: originalImageHeight || canvasSize.height,
      })

      // Canvas'ı blob'a dönüştür ve indir
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `tasarim-${productId || 'urun'}-${Date.now()}.png`
          document.body.appendChild(a)
          a.click()
          // Element'in hala body'de olup olmadığını kontrol et
          if (a && a.parentNode === document.body) {
            document.body.removeChild(a)
          }
          URL.revokeObjectURL(url)
        }
      }, 'image/png', 1.0) // Maximum kalite
    } catch (error) {
      console.error('Export hatası:', error)
      alert('Tasarım export edilirken bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  const getTotalQuantity = () => {
    return Object.values(sizes).reduce((sum, qty) => sum + qty, 0)
  }

  // Toplu beden girişi
  const handleBulkSizeInput = (value: string) => {
    const numValue = value === '' || isNaN(Number(value)) ? 0 : Math.max(0, Number(value))
    const newSizes: Record<string, number> = {}
    Object.keys(sizes).forEach(size => {
      newSizes[size] = numValue
    })
    setSizes(newSizes)
  }

  const handleSubmitOrder = async () => {
    if (!user || !product || !productId) {
      alert('Lütfen önce giriş yapın')
      router.push('/giris')
      return
    }

    const totalQuantity = getTotalQuantity()
    if (totalQuantity === 0) {
      alert('Lütfen en az bir adet beden seçin')
      return
    }

    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      // Tasarım verilerini hazırla
      const designData = {
        elements: elements,
        canvasSize: canvasSize
      }

      // Tasarım görüntüsünü export et (base64) - sadece skipDesign false ise
      let designImage = null
      if (!skipDesign && canvasRef.current && elements.length > 0) {
        try {
          // Orijinal görsel boyutunu al
          let originalImageWidth = canvasSize.width
          let originalImageHeight = canvasSize.height
          
          if (productImages.length > 0 && productImages[selectedImageIndex]) {
            const img = new window.Image()
            img.crossOrigin = 'anonymous'
            await new Promise((resolve, reject) => {
              img.onload = () => {
                originalImageWidth = img.naturalWidth
                originalImageHeight = img.naturalHeight
                resolve(null)
              }
              img.onerror = resolve // Hata olsa bile devam et
              img.src = productImages[selectedImageIndex]
            })
          }

          const html2canvas = (await import('html2canvas')).default
          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: null,
            scale: Math.max(2, Math.min(originalImageWidth / canvasSize.width, originalImageHeight / canvasSize.height, 4)),
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: originalImageWidth || canvasSize.width,
            height: originalImageHeight || canvasSize.height,
          })
          designImage = canvas.toDataURL('image/png')
        } catch (error) {
          console.error('Tasarım görüntüsü oluşturulamadı:', error)
        }
      }

      // Beden bilgilerini hazırla
      const sizeQuantities = Object.entries(sizes)
        .filter(([_, qty]) => qty > 0)
        .map(([size, qty]) => ({ size, quantity: qty }))

      // Customizations objesi - productId'yi de ekle (fallback için)
      const customizations = skipDesign ? {
        productId: productId, // Fallback için productId ekle
        sizes: sizeQuantities,
        skipDesign: true,
        fabricProvidedByCustomer: fabricProvidedByCustomer
      } : {
        productId: productId, // Fallback için productId ekle
        design: designData,
        designImage: designImage,
        sizes: sizeQuantities,
        fabricProvidedByCustomer: fabricProvidedByCustomer
      }

      // Custom production request oluştur
      const response = await customProductionApi.createRequest({
        userId: user.id,
        items: [{
          productId: productId,
          quantity: totalQuantity,
          customizations: customizations,
          productPrice: product.price
        }],
        customerName: personalInfo.name || user?.name || '',
        customerEmail: personalInfo.email || user?.email || '',
        customerPhone: personalInfo.phone || user?.phone || '',
        notes: `Tasarım Editöründen Oluşturuldu. Bedenler: ${sizeQuantities.map(s => `${s.size}: ${s.quantity}`).join(', ')}${fabricProvidedByCustomer ? '\nKumaş müşteri tarafından karşılanacak.' : ''}${personalInfo.address ? `\nAdres: ${personalInfo.address}` : ''}`
      })

      if (response.success) {
        setSubmitSuccess(true)
        setTimeout(() => {
          router.push('/panel/teklifler')
        }, 2000)
      } else {
        const errorMsg = response.message || 'Bilinmeyen hata'
        console.error('Talep oluşturma hatası:', errorMsg, response)
        alert('Talep oluşturulurken bir hata oluştu: ' + errorMsg)
      }
    } catch (error) {
      console.error('Talep oluşturma hatası:', error)
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
      alert('Talep oluşturulurken bir hata oluştu: ' + errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedElementData = elements.find(el => el.id === selectedElement)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 min-w-0">
              <Link href="/panel/urunler" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium truncate">
                Ürünler
              </Link>
              <span className="material-symbols-outlined text-xs sm:text-sm text-gray-400 flex-shrink-0">chevron_right</span>
              {product && (
                <>
                  <Link href={`/urunler/${product.id}`} className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium truncate max-w-[100px] sm:max-w-none">
                    <span className="hidden sm:inline">
                      {product.name.length > 30 ? product.name.substring(0, 30) + '...' : product.name}
                    </span>
                    <span className="sm:hidden">Ürün</span>
                  </Link>
                  <span className="material-symbols-outlined text-xs sm:text-sm text-gray-400 flex-shrink-0">chevron_right</span>
                </>
              )}
              <span className="text-gray-900 dark:text-white font-bold truncate">Tasarım Editörü</span>
            </nav>

            {/* Product Info */}
            {product && (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-right hidden lg:block">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ürün</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{product.name}</p>
                </div>
                <Link
                  href={`/urunler/${product.id}`}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">arrow_back</span>
                  <span className="hidden sm:inline">Geri</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 sm:gap-6">
          {/* Left Sidebar - Product Images */}
          <div className="space-y-4 hidden lg:block">
            {/* Product Images Gallery */}
            {productImages.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-24">
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                  {productImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`group relative w-full aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImageIndex === idx
                          ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${product?.name || 'Ürün'} - Görsel ${idx + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                      {selectedImageIndex === idx && (
                        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                          <div className="bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                            <span className="material-symbols-outlined text-lg">check</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <span className="text-xs text-white font-medium">#{idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="space-y-3 sm:space-y-4 lg:col-span-1">
            {/* Modern Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-2 sm:p-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto">
                {/* Undo/Redo Controls */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Geri Al (Ctrl+Z)"
                  >
                    <span className="material-symbols-outlined text-lg">undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Yinele (Ctrl+Y)"
                  >
                    <span className="material-symbols-outlined text-lg">redo</span>
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Logo Upload */}
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow transition-all cursor-pointer text-sm">
                    <span className="material-symbols-outlined text-base">image</span>
                    <span>Logo</span>
                  </div>
                </label>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Text Input */}
                {!showTextInput ? (
                  <button
                    onClick={() => setShowTextInput(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-sm hover:shadow transition-all text-sm"
                  >
                    <span className="material-symbols-outlined text-base">text_fields</span>
                    <span>Yazı</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Yazı..."
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times</option>
                      <option value="Courier New">Courier</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Playfair Display">Playfair Display</option>
                    </select>
                    <button
                      onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                      className={`p-1.5 rounded-md transition-all ${
                        fontWeight === 'bold'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                      title="Kalın"
                    >
                      <span className="material-symbols-outlined text-base">format_bold</span>
                    </button>
                    <button
                      onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                      className={`p-1.5 rounded-md transition-all ${
                        fontStyle === 'italic'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                      title="İtalik"
                    >
                      <span className="material-symbols-outlined text-base">format_italic</span>
                    </button>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-8 w-10 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                    />
                    <input
                      type="number"
                      value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                      min="12"
                      max="144"
                      className="w-14 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Size"
                    />
                    <button
                      onClick={handleAddText}
                      className="px-3 py-1.5 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition-all text-xs"
                    >
                      Ekle
                    </button>
                    <button
                      onClick={() => {
                        setShowTextInput(false)
                        setTextInput('')
                      }}
                      className="px-3 py-1.5 bg-gray-400 text-white font-medium rounded-md hover:bg-gray-500 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Shape Menu */}
                {!showShapeMenu ? (
                  <button
                    onClick={() => setShowShapeMenu(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-lg hover:from-teal-600 hover:to-cyan-600 shadow-sm hover:shadow transition-all text-sm"
                  >
                    <span className="material-symbols-outlined text-base">shape_line</span>
                    <span>Şekil</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 flex-wrap">
                    <button
                      onClick={() => handleAddShape('circle')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Daire"
                    >
                      <span className="material-symbols-outlined text-base">circle</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('square')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Kare"
                    >
                      <span className="material-symbols-outlined text-base">square</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('ellipse')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Elips"
                    >
                      <span className="material-symbols-outlined text-base">radio_button_unchecked</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('triangle')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Üçgen"
                    >
                      <span className="material-symbols-outlined text-base">change_history</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('star')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Yıldız"
                    >
                      <span className="material-symbols-outlined text-base">star</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('arrow')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Ok"
                    >
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('line')}
                      className="p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="Çizgi"
                    >
                      <span className="material-symbols-outlined text-base">horizontal_rule</span>
                    </button>
                    <button
                      onClick={() => setShowShapeMenu(false)}
                      className="px-2 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Delete Button */}
                {selectedElement && (
                  <>
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                    <button
                      onClick={handleDelete}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-sm hover:shadow"
                      title="Sil (Delete)"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </>
                )}

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-1.5 text-gray-700 dark:text-gray-300 rounded hover:bg-white dark:hover:bg-gray-600 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">remove</span>
                  </button>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[2.5rem] text-center px-1">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-1.5 text-gray-700 dark:text-gray-300 rounded hover:bg-white dark:hover:bg-gray-600 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                  <button
                    onClick={() => setZoom(100)}
                    className="px-2 py-1 text-gray-700 dark:text-gray-300 rounded hover:bg-white dark:hover:bg-gray-600 transition-all text-xs font-medium ml-1"
                  >
                    100%
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Grid Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Grid</span>
                </label>

                {/* Layers Toggle */}
                <button
                  onClick={() => setShowLayers(!showLayers)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                    showLayers 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">layers</span>
                  <span>Katmanlar</span>
                </button>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow transition-all text-sm"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span>İndir</span>
                </button>

                <div className="flex-1"></div>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

                {/* Order Form Button */}
                <button
                  onClick={() => {
                    setShowOrderForm(true)
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white font-medium rounded-lg hover:from-purple-600 hover:via-pink-600 hover:to-red-600 shadow-sm hover:shadow transition-all text-sm"
                >
                  <span className="material-symbols-outlined text-base">shopping_cart</span>
                  <span>Talep Oluştur</span>
                </button>
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Canvas Header */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg sm:text-xl">palette</span>
                  <span>Tasarım Alanı</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="hidden sm:inline">Canvas: {Math.round(canvasSize.width)} × {Math.round(canvasSize.height)}px</span>
                  <span className="sm:hidden">{Math.round(canvasSize.width)}×{Math.round(canvasSize.height)}</span>
                </div>
              </div>

              {/* Canvas Container */}
              <div
                ref={canvasContainerRef}
                className="relative overflow-auto bg-gray-100 dark:bg-gray-900/50"
                style={{ 
                  height: 'calc(100vh - 280px)', 
                  minHeight: '400px',
                  maxHeight: 'calc(100vh - 280px)',
                }}
              >
                <div
                  ref={canvasRef}
                  className="relative bg-white dark:bg-gray-800 mx-auto shadow-2xl border border-gray-200 dark:border-gray-700"
                  style={{
                    width: `${canvasSize.width}px`,
                    height: `${canvasSize.height}px`,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    marginTop: '20px',
                    marginBottom: `${Math.max(20, canvasSize.height * (zoom / 100 - 1) + 20)}px`,
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Grid Background */}
                  {showGrid && (
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, #9ca3af 1px, transparent 1px),
                          linear-gradient(to bottom, #9ca3af 1px, transparent 1px)
                        `,
                        backgroundSize: '25px 25px'
                      }}
                    />
                  )}

                  {/* Product Image Background - En altta */}
                  {productImages.length > 0 && productImages[selectedImageIndex] && (
                    <div className="absolute inset-0" style={{ zIndex: 0 }}>
                      <img
                        src={productImages[selectedImageIndex]}
                        alt={product?.name || 'Ürün görseli'}
                        className="w-full h-full object-contain"
                        style={{ 
                          width: '100%', 
                          height: '100%',
                          objectFit: 'contain'
                        }}
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {/* Design Elements - Görselin üstünde */}
                  {elements.map((element) => (
                    <div
                      key={element.id}
                      onClick={() => setSelectedElement(element.id)}
                      onMouseDown={(e) => handleMouseDown(e, element.id)}
                      className={`absolute cursor-move transition-all ${
                        selectedElement === element.id
                          ? 'ring-2 ring-blue-500 ring-offset-2'
                          : ''
                      }`}
                      style={{
                        left: `${element.x}px`,
                        top: `${element.y}px`,
                        width: `${element.width}px`,
                        height: `${element.height}px`,
                        transform: `rotate(${element.rotation || 0}deg)`,
                        zIndex: 10 + (element.zIndex || 0) + (selectedElement === element.id ? 100 : 0),
                        opacity: element.opacity || 1,
                        pointerEvents: 'auto',
                        filter: element.shadow 
                          ? `drop-shadow(${element.shadowOffsetX || 2}px ${element.shadowOffsetY || 2}px ${element.shadowBlur || 5}px ${element.shadowColor || 'rgba(0,0,0,0.3)'})`
                          : 'none'
                      }}
                    >
                      {element.type === 'logo' ? (
                        <img
                          src={element.content}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      ) : element.type === 'text' ? (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            fontSize: `${element.fontSize || 24}px`,
                            fontFamily: element.fontFamily || 'Arial',
                            fontWeight: element.fontWeight || 'normal',
                            fontStyle: element.fontStyle || 'normal',
                            textAlign: element.textAlign || 'center',
                            color: element.color || '#000000',
                            textShadow: element.shadow ? '2px 2px 4px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(255,255,255,0.8)',
                            justifyContent: element.textAlign === 'left' ? 'flex-start' : 
                                           element.textAlign === 'right' ? 'flex-end' : 'center'
                          }}
                        >
                          {element.content}
                        </div>
                      ) : element.type === 'shape' ? (
                        <div
                          className="w-full h-full relative"
                          style={{
                            backgroundColor: element.content === 'line' ? element.backgroundColor || '#000000' : 'transparent',
                            borderColor: element.borderColor || '#000000',
                            borderWidth: `${element.borderWidth || 2}px`,
                            borderStyle: 'solid',
                            borderRadius: element.content === 'circle' || element.content === 'ellipse' 
                              ? '50%' 
                              : element.borderRadius 
                                ? `${element.borderRadius}px` 
                                : '0',
                          }}
                        >
                          {element.content === 'triangle' && (
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <polygon
                                points="50,10 90,90 10,90"
                                fill={element.backgroundColor || '#FF0000'}
                                stroke={element.borderColor || '#000000'}
                                strokeWidth={element.borderWidth || 2}
                              />
                            </svg>
                          )}
                          {element.content === 'star' && (
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                              <polygon
                                points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
                                fill={element.backgroundColor || '#FF0000'}
                                stroke={element.borderColor || '#000000'}
                                strokeWidth={element.borderWidth || 2}
                              />
                            </svg>
                          )}
                          {element.content === 'arrow' && (
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                              <path
                                d="M 10 50 L 70 50 M 70 50 L 50 30 M 70 50 L 50 70"
                                stroke={element.borderColor || '#000000'}
                                strokeWidth={element.borderWidth || 2}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {element.content === 'line' && (
                            <div className="w-full h-full bg-current" style={{ color: element.backgroundColor || '#000000' }} />
                          )}
                          {(element.content === 'circle' || element.content === 'square' || element.content === 'ellipse') && (
                            <div 
                              className="w-full h-full" 
                              style={{ 
                                backgroundColor: element.backgroundColor || '#FF0000',
                                borderRadius: element.content === 'circle' || element.content === 'ellipse' 
                                  ? '50%' 
                                  : element.borderRadius 
                                    ? `${element.borderRadius}px` 
                                    : '0'
                              }} 
                            />
                          )}
                        </div>
                      ) : null}
                      
                      {/* Selection Indicator - Modern */}
                      {selectedElement === element.id && (
                        <>
                          {/* Corner Handles */}
                          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                          <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                          <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                          {/* Edge Handles */}
                          <div className="absolute top-1/2 -left-1.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-y-1/2"></div>
                          <div className="absolute top-1/2 -right-1.5 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-y-1/2"></div>
                          <div className="absolute -top-1.5 left-1/2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2"></div>
                          <div className="absolute -bottom-1.5 left-1/2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2"></div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Controls */}
          <div className="hidden lg:block space-y-4">
            {/* Selected Element Controls */}
            {selectedElementData && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 sticky top-24">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">tune</span>
                  <span>Öğe Ayarları</span>
                </h3>
                
                <div className="space-y-3">
                  {/* Size Control */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Boyut
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => selectedElement && handleResize(selectedElement, -10)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="flex-1 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 py-1.5 rounded-md">
                        {Math.round(selectedElementData.width)}px
                      </span>
                      <button
                        onClick={() => selectedElement && handleResize(selectedElement, 10)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Rotation Control */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Döndürme
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => selectedElement && handleRotate(selectedElement, -5)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">rotate_left</span>
                      </button>
                      <span className="flex-1 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 py-1.5 rounded-md">
                        {Math.round(selectedElementData.rotation || 0)}°
                      </span>
                      <button
                        onClick={() => selectedElement && handleRotate(selectedElement, 5)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">rotate_right</span>
                      </button>
                    </div>
                  </div>

                  {/* Text-specific Controls */}
                  {selectedElementData.type === 'text' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                          Font Boyutu
                        </label>
                        <input
                          type="number"
                          value={selectedElementData.fontSize || 24}
                          onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { fontSize: Number(e.target.value) })}
                          min="12"
                          max="144"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                          Metin Rengi
                        </label>
                        <input
                          type="color"
                          value={selectedElementData.color || '#000000'}
                          onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { color: e.target.value })}
                          className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  {/* Shape-specific Controls */}
                  {selectedElementData.type === 'shape' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                          Arka Plan Rengi
                        </label>
                        <input
                          type="color"
                          value={selectedElementData.backgroundColor || '#FF0000'}
                          onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { backgroundColor: e.target.value })}
                          className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                          Kenar Rengi
                        </label>
                        <input
                          type="color"
                          value={selectedElementData.borderColor || '#000000'}
                          onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { borderColor: e.target.value })}
                          className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                          Kenar Kalınlığı
                        </label>
                        <input
                          type="number"
                          value={selectedElementData.borderWidth || 2}
                          onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { borderWidth: Number(e.target.value) })}
                          min="0"
                          max="20"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Opacity Control */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Opaklık: {Math.round((selectedElementData.opacity || 1) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedElementData.opacity || 1}
                      onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { opacity: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Shadow Controls */}
                  <div>
                    <label className="flex items-center gap-2 mb-1.5">
                      <input
                        type="checkbox"
                        checked={selectedElementData.shadow || false}
                        onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { 
                          shadow: e.target.checked,
                          shadowBlur: e.target.checked ? (selectedElementData.shadowBlur || 5) : 0,
                          shadowOffsetX: e.target.checked ? (selectedElementData.shadowOffsetX || 2) : 0,
                          shadowOffsetY: e.target.checked ? (selectedElementData.shadowOffsetY || 2) : 0,
                          shadowColor: e.target.checked ? (selectedElementData.shadowColor || 'rgba(0,0,0,0.3)') : 'rgba(0,0,0,0)'
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Gölge</span>
                    </label>
                    {selectedElementData.shadow && (
                      <div className="mt-2 space-y-2 pl-6">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">
                            Gölge Bulanıklığı: {selectedElementData.shadowBlur || 5}px
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={selectedElementData.shadowBlur || 5}
                            onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { shadowBlur: Number(e.target.value) })}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">
                            X Ofseti: {selectedElementData.shadowOffsetX || 2}px
                          </label>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            value={selectedElementData.shadowOffsetX || 2}
                            onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { shadowOffsetX: Number(e.target.value) })}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">
                            Y Ofseti: {selectedElementData.shadowOffsetY || 2}px
                          </label>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            value={selectedElementData.shadowOffsetY || 2}
                            onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { shadowOffsetY: Number(e.target.value) })}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1">
                            Gölge Rengi
                          </label>
                          <input
                            type="color"
                            value={selectedElementData.shadowColor?.replace('rgba(', '').replace(')', '').split(',')[0] === '0' && selectedElementData.shadowColor?.includes('rgba') 
                              ? '#000000' 
                              : selectedElementData.shadowColor?.replace('rgba(', '').replace(')', '') || '#000000'}
                            onChange={(e) => {
                              const hex = e.target.value
                              const r = parseInt(hex.slice(1, 3), 16)
                              const g = parseInt(hex.slice(3, 5), 16)
                              const b = parseInt(hex.slice(5, 7), 16)
                              selectedElement && handleUpdateElement(selectedElement, { shadowColor: `rgba(${r},${g},${b},0.3)` })
                            }}
                            className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Border Radius Control - Sadece şekiller için */}
                  {selectedElementData.type === 'shape' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                        Kenar Yumuşatma: {selectedElementData.borderRadius || 0}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={selectedElementData.borderRadius || 0}
                        onChange={(e) => selectedElement && handleUpdateElement(selectedElement, { borderRadius: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  )}

                  {/* Layer Controls */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Katman Sırası
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => selectedElement && handleMoveLayer(selectedElement, 'down')}
                        className="flex-1 px-2 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center"
                        title="Aşağı Taşı"
                      >
                        <span className="material-symbols-outlined text-base">arrow_downward</span>
                      </button>
                      <button
                        onClick={() => selectedElement && handleMoveLayer(selectedElement, 'up')}
                        className="flex-1 px-2 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center"
                        title="Yukarı Taşı"
                      >
                        <span className="material-symbols-outlined text-base">arrow_upward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">shopping_cart</span>
                Talep Oluştur
              </h2>
              <button
                onClick={() => setShowOrderForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">check_circle</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Talep Başarıyla Oluşturuldu!</h3>
                  <p className="text-gray-600 dark:text-gray-400">Teklifler sayfasına yönlendiriliyorsunuz...</p>
                </div>
              ) : (
                <>
                  {/* Skip Design Checkbox */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipDesign}
                        onChange={(e) => setSkipDesign(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          Tasarım yapmadan devam et
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Bu seçeneği işaretlerseniz, tasarım editöründe tasarım yapmak zorunlu değildir. Sadece beden ve adet bilgileri ile talep oluşturabilirsiniz.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Product Info */}
                  {product && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{product.name}</h3>
                    </div>
                  )}

                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">person</span>
                      Şahıs Bilgileri
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Ad Soyad
                        </label>
                        <input
                          type="text"
                          value={personalInfo.name}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ad Soyad"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={personalInfo.email}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Email adresi"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          value={personalInfo.phone}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Telefon numarası"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Adres
                        </label>
                        <textarea
                          value={personalInfo.address}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Adres bilgisi"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kumaş Alanı */}
                  <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-all has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 dark:has-[:checked]:bg-orange-900/20">
                      <input
                        type="checkbox"
                        checked={fabricProvidedByCustomer}
                        onChange={(e) => setFabricProvidedByCustomer(e.target.checked)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">checkroom</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Kumaş benim tarafımdan karşılanacak</span>
                      </div>
                    </label>
                    {fabricProvidedByCustomer && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">info</span>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Kumaş Temini</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Kumaşınızı kendiniz temin edecekseniz, lütfen kumaş özelliklerini (tip, renk, gramaj vb.) notlar bölümünde belirtiniz.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Size Quantities */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">straighten</span>
                        Beden ve Adet Seçimi
                      </h3>
                    </div>
                    
                    {/* Toplu Sayı Girişi */}
                    <div className="mb-4 flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        Tüm Bedenlere:
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        onChange={(e) => handleBulkSizeInput(e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.keys(sizes).map((size) => (
                        <div key={size} className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {size}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={sizes[size]}
                            onChange={(e) => setSizes({ ...sizes, [size]: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        Toplam Adet: <span className="text-lg">{getTotalQuantity()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowOrderForm(false)}
                      className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      disabled={isSubmitting}
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting || getTotalQuantity() === 0}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin inline-block mr-2">sync</span>
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined inline-block mr-2">send</span>
                          Talebi Oluştur
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}