import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes - authentication gerektiren sayfalar
const protectedRoutes = ['/dashboard', '/admin-logs', '/2fa']

// Public routes - authentication gerektirmeyen sayfalar
const publicRoutes = ['/login', '/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public route'lar için middleware'i atla
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Protected route kontrolü
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isProtectedRoute) {
    // 2FA sayfası için özel kontrol - login yapılmışsa izin ver
    if (pathname === '/2fa') {
      const adminLoggedIn = request.cookies.get('adminLoggedIn')?.value
      // Cookie'de login bilgisi varsa kontrol et, yoksa client-side kontrolüne bırak
      if (adminLoggedIn === '1') {
        return NextResponse.next()
      }
      // Cookie yoksa da geç - client-side kontrolü yapacak
      return NextResponse.next()
    }

    // Diğer protected route'lar için cookie kontrolü
    // Not: SessionStorage client-side'da kontrol ediliyor
    // Middleware server-side çalıştığı için sessionStorage'a erişemiyor
    // Bu yüzden cookie yoksa bile geçmesine izin veriyoruz - client-side kontrolü yapacak
    const authToken = request.cookies.get('authToken')?.value
    const adminLoggedIn = request.cookies.get('adminLoggedIn')?.value
    const twoFAValidated = request.cookies.get('twoFAValidated')?.value

    // Cookie'ler varsa ve geçerliyse izin ver
    if (authToken && adminLoggedIn === '1' && twoFAValidated === '1') {
      return NextResponse.next()
    }

    // Cookie yoksa veya geçersizse, client-side kontrolüne bırak
    // Dashboard sayfasında sessionStorage kontrolü yapılıyor
    // Middleware sadece cookie varsa kontrol eder, yoksa client-side'a bırakır
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

