'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { validateEmail } from '@/utils/validation'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          prompt: () => void
          renderButton: (element: HTMLElement, config: { theme: string; size: string; width?: number }) => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { login, googleLogin, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/panel')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    // Google Identity Services yükle
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleSignIn,
        })
      }
    }

    return () => {
      // Script'in hala head'de olup olmadığını kontrol et
      if (script && script.parentNode === document.head) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleGoogleSignIn = async (response: { credential: string }) => {
    try {
      setLoading(true)
      setError('')
      await googleLogin(response.credential)
      router.push('/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google girişi başarısız')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email ve şifre gereklidir')
      return
    }

    if (!validateEmail(email)) {
      setError('Geçerli bir email adresi giriniz')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      router.push('/panel')
    } catch (err: any) {
      console.error('Login error:', err)
      // Daha detaylı hata mesajı göster
      let errorMessage = 'Giriş başarısız'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Image
                src="/assets/logo.png"
                alt="Huğlu Tekstil Logo"
                width={150}
                height={60}
                className="h-16 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
              Hoş Geldiniz
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Hesabınıza giriş yapın
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                placeholder="ornek@email.com"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Giriş yapılıyor...
                </span>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            <span className="px-4 text-sm text-gray-500 dark:text-gray-400">veya</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          {/* Google Sign In */}
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="mb-6">
              <div id="google-signin-button" className="flex justify-center"></div>
              {typeof window !== 'undefined' && window.google && (
                // GÜVENLİK: Script içeriği statik kod, XSS riski yok
                // Google OAuth API çağrısı - güvenli
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.google.accounts.id.renderButton(
                        document.getElementById('google-signin-button'),
                        { theme: 'outline', size: 'large', width: 300 }
                      );
                    `,
                  }}
                />
              )}
            </div>
          )}

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hesabınız yok mu?{' '}
              <Link href="/kayit" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Kayıt Ol
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              ← Ana sayfaya dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

