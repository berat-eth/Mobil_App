import { NextRequest, NextResponse } from 'next/server'
import { 
  validateEmail, 
  validatePhone, 
  validateName, 
  validateQuantity,
  sanitizeInput,
  sanitizeFileName,
  validateFileUpload 
} from '@/utils/validation'

// Rate limiting için basit in-memory store
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = 5 // 5 istek
  const window = 60 * 60 * 1000 // 1 saat

  const record = requestCounts.get(ip)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + window })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // IP adresini al
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Rate limiting kontrolü
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderdiniz. Lütfen 1 saat sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Honeypot kontrolü - bot koruması
    if (body.honeypot && body.honeypot !== '') {
      return NextResponse.json(
        { error: 'Invalid request.' },
        { status: 400 }
      )
    }

    // Validasyon kontrolleri
    if (!validateName(body.name)) {
      return NextResponse.json(
        { error: 'Geçersiz ad soyad.' },
        { status: 400 }
      )
    }

    if (!validateEmail(body.email)) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta adresi.' },
        { status: 400 }
      )
    }

    if (!validatePhone(body.phone)) {
      return NextResponse.json(
        { error: 'Geçersiz telefon numarası.' },
        { status: 400 }
      )
    }

    if (!body.productType || body.productType.trim() === '') {
      return NextResponse.json(
        { error: 'Ürün tipi seçilmelidir.' },
        { status: 400 }
      )
    }

    if (!body.quantity || body.quantity.trim() === '') {
      return NextResponse.json(
        { error: 'Adet bilgisi gereklidir.' },
        { status: 400 }
      )
    }

    if (!validateQuantity(body.quantity)) {
      return NextResponse.json(
        { error: 'Geçersiz adet. Lütfen 1 ile 100.000 arasında bir sayı girin.' },
        { status: 400 }
      )
    }

    // Veriyi sanitize et
    const sanitizedData = {
      name: sanitizeInput(body.name),
      email: sanitizeInput(body.email),
      phone: sanitizeInput(body.phone),
      company: sanitizeInput(body.company || ''),
      productType: sanitizeInput(body.productType),
      quantity: sanitizeInput(body.quantity),
      budget: sanitizeInput(body.budget || ''),
      description: sanitizeInput(body.description || ''),
      embroidery: Boolean(body.embroidery),
      printing: Boolean(body.printing),
      wholesale: Boolean(body.wholesale),
      fabricProvidedByCustomer: Boolean(body.fabricProvidedByCustomer),
      embroideryDetails: sanitizeInput(body.embroideryDetails || ''),
      printingDetails: sanitizeInput(body.printingDetails || ''),
      sizeDistribution: sanitizeInput(body.sizeDistribution || ''),
      timestamp: new Date().toISOString(),
      ip: ip
    }

    // Backend'e veriyi gönder
    // API_BASE_URL zaten /api ile bitiyor, backend endpoint /api/quote-requests
    // Bu yüzden API_BASE_URL'den /api'yi çıkarıp tekrar /api/quote-requests ekliyoruz
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api'
    const backendBaseUrl = baseUrl.replace(/\/api$/, '') // /api'yi kaldır
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f'
    
    try {
      const backendResponse = await fetch(`${backendBaseUrl}/api/quote-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(sanitizedData),
      })

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}))
        console.error('Backend quote request error:', errorData)
        // Backend hatası olsa bile kullanıcıya başarı mesajı göster (güvenlik)
      }
    } catch (backendError) {
      console.error('Backend connection error:', backendError)
      // Backend bağlantı hatası olsa bile kullanıcıya başarı mesajı göster
    }

    console.log('Teklif talebi alındı:', {
      email: sanitizedData.email,
      productType: sanitizedData.productType,
      timestamp: sanitizedData.timestamp
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Teklifiniz başarıyla alındı. En kısa sürede size dönüş yapacağız.' 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Teklif API hatası:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    )
  }
}

// OPTIONS isteği için CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
