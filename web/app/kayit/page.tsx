'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { validateEmail, validatePhone, validateName } from '@/utils/validation'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    cookies: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/panel')
    }
  }, [isAuthenticated, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreements({
      ...agreements,
      [e.target.name]: e.target.checked,
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Tüm alanlar gereklidir')
      return
    }

    if (!validateName(formData.name)) {
      setError('Geçerli bir isim giriniz (en az 2 karakter)')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Geçerli bir email adresi giriniz')
      return
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setError('Geçerli bir telefon numarası giriniz')
      return
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    if (!agreements.terms) {
      setError('Kullanım koşullarını kabul etmelisiniz')
      return
    }

    if (!agreements.privacy) {
      setError('Gizlilik politikasını kabul etmelisiniz')
      return
    }

    try {
      setLoading(true)
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      })
      router.push('/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız')
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
              Hesap Oluştur
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Yeni hesap oluşturun ve hemen başlayın
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Ad Soyad
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                placeholder="Ahmet Yılmaz"
                required
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                placeholder="ornek@email.com"
                required
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Telefon (Opsiyonel)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                placeholder="0530 123 45 67"
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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Şifre Tekrar
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-outlined">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Agreement Checkboxes */}
            <div className="space-y-3 pt-2">
              {/* Terms of Use */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreements.terms}
                  onChange={handleAgreementChange}
                  className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-400"
                  disabled={loading}
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <Link href="/kullanim-kosullari" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    Kullanım Koşullarını
                  </Link>
                  {' '}okudum ve kabul ediyorum <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Privacy Policy */}
              <div className="flex items-start gap-3">
                <input
                  id="privacy"
                  name="privacy"
                  type="checkbox"
                  checked={agreements.privacy}
                  onChange={handleAgreementChange}
                  className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-400"
                  disabled={loading}
                  required
                />
                <label htmlFor="privacy" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <Link href="/gizlilik" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    Gizlilik Politikasını
                  </Link>
                  {' '}okudum ve kabul ediyorum <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Cookie Policy */}
              <div className="flex items-start gap-3">
                <input
                  id="cookies"
                  name="cookies"
                  type="checkbox"
                  checked={agreements.cookies}
                  onChange={handleAgreementChange}
                  className="mt-1 w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-400"
                  disabled={loading}
                />
                <label htmlFor="cookies" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <Link href="/cerez-politikasi" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    Çerez Politikasını
                  </Link>
                  {' '}okudum ve kabul ediyorum
                </label>
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
                  Kayıt yapılıyor...
                </span>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Zaten hesabınız var mı?{' '}
              <Link href="/giris" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Giriş Yap
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              ← Ana sayfaya dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

