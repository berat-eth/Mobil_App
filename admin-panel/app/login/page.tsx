'use client'

import { useState, Suspense } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ShoppingBag, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { userService } from '../../lib/services/userService'

const ForestBackground = dynamic(() => import('@/components/ForestBackground'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-green-900 to-slate-900" />
})

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const isFormValid = (formData.email || '').trim().length > 0 && (formData.password || '').trim().length > 0
  const [btnShift, setBtnShift] = useState(0)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    try {
      if (!isFormValid) { setIsLoading(false); return }
      const res = await userService.login({
        email: formData.email,
        password: formData.password,
      })

      if ((res as any)?.success) {
        try { 
          sessionStorage.setItem('adminLoggedIn', '1')
          // 2FA devre dışı - direkt dashboard'a yönlendir
          sessionStorage.setItem('twoFAValidated', '1')
        } catch {}
        router.push('/dashboard')
      } else {
        setErrorMsg((res as any)?.message || 'Giriş başarısız')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Beklenmeyen bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-green-900 to-slate-900" />}>
        <ForestBackground />
      </Suspense>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 relative z-10">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="px-0 py-0" style={{ width: 'auto' }}>
              <Image src="/logo.jpg" alt="Huğlu Outdoor" width={260} height={76} priority style={{ objectFit: 'contain' }} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">Hoş Geldiniz</h2>
            <p className="text-slate-500 text-base">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="E-posta"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Şifre"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-600">Beni Hatırla</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              onMouseEnter={() => { if (!isFormValid) setBtnShift((s)=> s === 0 ? 120 : -s) }}
              style={{ transform: `translateX(${btnShift}px)` }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          {errorMsg && (
            <div className="mt-4 text-sm text-red-600 text-center">{errorMsg}</div>
          )}
        </div>

        
      </motion.div>
    </div>
  )
}
