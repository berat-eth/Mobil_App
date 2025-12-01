'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ShieldCheck, KeyRound } from 'lucide-react'

export default function TwoFAPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), { ssr: false })

  useEffect(() => {
    // Giriş yapılmadıysa login'e dön
    if (typeof window === 'undefined') return
    try {
      const logged = sessionStorage.getItem('adminLoggedIn') === '1'
      if (!logged) {
        router.replace('/login')
        return
      }
    } catch {}
  }, [router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    try {
      // Sabit doğrulama kodu: 190566
      if (code.trim() === '190566') {
        try { sessionStorage.setItem('twoFAValidated', '1') } catch {}
        router.replace('/dashboard')
        return
      }
      setErrorMsg('Kod geçersiz. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <ThreeBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/30 relative z-10"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">İki Aşamalı Doğrulama</h1>
        <p className="text-center text-slate-500 mb-6">Lütfen doğrulama kodunu giriniz</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Doğrulama Kodu</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest text-center text-lg"
                placeholder="••••••"
              />
            </div>
          </div>
          {errorMsg && <div className="text-red-600 text-sm text-center">{errorMsg}</div>}
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Geri dön
          </button>
        </div>
      </motion.div>
    </div>
  )
}


