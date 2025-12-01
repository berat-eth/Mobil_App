import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Tüm _next path'lerini direkt geç - middleware müdahalesi yok
  if (pathname.startsWith('/_next/')) {
    const response = NextResponse.next()
    
    // Sadece cache headers ekle, CSP ve diğer güvenlik header'ları ekleme
    if (
      pathname.startsWith('/_next/static') ||
      pathname.startsWith('/_next/image')
    ) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      )
    }
    
    return response
  }

  const response = NextResponse.next()

  // TÜM HTML sayfaları için cache'i devre dışı bırak (sadece static asset'ler değil)
  // Eğer path bir dosya uzantısı içermiyorsa (HTML sayfası), cache'i bypass et
  const isHtmlPage = !pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|json|xml|txt|pdf)$/i)
  
  if (isHtmlPage) {
    response.headers.set(
      'Cache-Control',
      'no-cache, no-store, must-revalidate, max-age=0'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('X-Accel-Expires', '0') // Nginx için
  }

  // Cache headers for static assets
  if (pathname.startsWith('/assets')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    )
  }

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  // Content Security Policy - Next.js internal path'leri için izin ver
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      "img-src 'self' data: https: blob: https://static.ticimax.cloud https://*.ticimax.cloud",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https: https://wa.me https://api.huglutekstil.com  https://static.ticimax.cloud https://*.ticimax.cloud https://accounts.google.com",
      "frame-src 'self' https://www.google.com https://accounts.google.com https://www.dhlecommerce.com.tr",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|_next/webpack|_next/webpack-hmr|favicon.ico).*)',
  ],
}
