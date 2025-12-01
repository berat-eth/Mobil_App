import { NextRequest, NextResponse } from 'next/server'
import { 
  validateEmail, 
  validatePhone, 
  validateName,
  sanitizeInput 
} from '@/utils/validation'

// Rate limiting için basit in-memory store
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = 3 // 3 istek
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

    if (!body.message || body.message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Mesaj en az 10 karakter olmalıdır.' },
        { status: 400 }
      )
    }

    // Veriyi sanitize et
    const sanitizedData = {
      name: sanitizeInput(body.name),
      email: sanitizeInput(body.email),
      phone: sanitizeInput(body.phone),
      subject: sanitizeInput(body.subject || ''),
      message: sanitizeInput(body.message),
      timestamp: new Date().toISOString(),
      ip: ip
    }

    // TODO: Burada veriyi veritabanına kaydet veya e-posta gönder
    // Örnek: await sendEmail(sanitizedData)
    // Örnek: await saveToDatabase(sanitizedData)

    console.log('İletişim formu alındı:', {
      email: sanitizedData.email,
      subject: sanitizedData.subject,
      timestamp: sanitizedData.timestamp
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.' 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('İletişim API hatası:', error)
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
