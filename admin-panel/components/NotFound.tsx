'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Home, 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  RefreshCw,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Settings
} from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const quickActions = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      description: 'Ana sayfaya dön',
      action: () => router.push('/dashboard'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    { 
      icon: Package, 
      label: 'Ürünler', 
      description: 'Ürün yönetimi',
      action: () => router.push('/dashboard?tab=products'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    { 
      icon: Users, 
      label: 'Müşteriler', 
      description: 'Müşteri yönetimi',
      action: () => router.push('/dashboard?tab=customers'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    { 
      icon: ShoppingCart, 
      label: 'Siparişler', 
      description: 'Sipariş takibi',
      action: () => router.push('/dashboard?tab=orders'),
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    { 
      icon: BarChart3, 
      label: 'Analitik', 
      description: 'Raporlar ve istatistikler',
      action: () => router.push('/dashboard?tab=analytics'),
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    { 
      icon: Settings, 
      label: 'Ayarlar', 
      description: 'Sistem ayarları',
      action: () => router.push('/dashboard?tab=settings'),
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ]

  const floatingShapes = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: Math.random() * 100 + 50,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 2
  }))

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 relative overflow-hidden">
      {/* Floating Background Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        {floatingShapes.map((shape) => (
          <motion.div
            key={shape.id}
            className="absolute rounded-full bg-gradient-to-r from-blue-200/20 to-purple-200/20"
            style={{
              width: shape.size,
              height: shape.size,
              left: `${shape.x}%`,
              top: `${shape.y}%`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: shape.duration,
              delay: shape.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl w-full text-center"
        >
          {/* 404 Number */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring", bounce: 0.4 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <h1 className="text-9xl md:text-[12rem] font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent leading-none">
                404
              </h1>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-4 -right-4 w-8 h-8 text-blue-500"
              >
                <AlertTriangle className="w-full h-full" />
              </motion.div>
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Sayfa Bulunamadı
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Aradığınız sayfa mevcut değil veya taşınmış olabilir. 
              Aşağıdaki seçeneklerden birini kullanarak devam edebilirsiniz.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Geri Dön</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Ana Sayfa</span>
            </motion.button>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.action}
                className={`${action.color} text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <action.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.label}</div>
                    <div className="text-xs opacity-80">{action.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* Search Suggestion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-12 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Search className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Hızlı Arama</span>
            </div>
            <p className="text-sm text-slate-500">
              Aradığınızı bulamadınız mı? Header'daki arama kutusunu kullanarak 
              ürün, müşteri veya sipariş arayabilirsiniz.
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-slate-400">
              Sorun devam ederse{' '}
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                sayfayı yenileyin
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
