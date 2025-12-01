import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'
import { CSRF_TOKEN_COOKIE } from '@/lib/csrf'

/**
 * CSRF Token Generation Endpoint
 * GET /api/csrf-token
 * 
 * Yeni bir CSRF token oluşturur ve cookie'ye kaydeder
 */
export async function GET() {
  const token = generateCSRFToken()
  
  const response = NextResponse.json({ 
    success: true, 
    token 
  })
  
  // Cookie'ye token'ı kaydet
  // SameSite=Strict ile CSRF koruması
  // Secure flag: HTTPS'de true, HTTP'de false
  const isSecure = process.env.NODE_ENV === 'production'
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false, // Client-side'da okunabilir olmalı (double-submit pattern)
    secure: isSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600 // 1 saat
  })
  
  return response
}

