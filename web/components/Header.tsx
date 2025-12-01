'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import UserMenu from './UserMenu'
import { useTheme } from '@/contexts/ThemeContext'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  
  // Ana sayfa mı kontrol et
  const isHomePage = pathname === '/'

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          
          // Ana sayfada scroll durumunu kontrol et
          if (isHomePage) {
            setIsScrolled(currentScrollY > 50)
          }
          
          if (currentScrollY < 10) {
            setIsVisible(true)
          } else if (currentScrollY > lastScrollYRef.current) {
            // Aşağı kaydırma - header'ı gizle
            setIsVisible(false)
          } else {
            // Yukarı kaydırma - header'ı göster
            setIsVisible(true)
          }
          
          lastScrollYRef.current = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomePage])
  
  // Ana sayfada transparent (scroll edilmediğinde), diğer sayfalarda her zaman beyaz
  const isTransparent = isHomePage && !isScrolled

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isTransparent ? 'bg-transparent' : 'bg-white dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50'}`}>
      <div className="px-4 md:px-10 lg:px-20 mx-auto">
        <div className="flex items-center justify-between py-2">
          <Link href="/" className="group flex items-center">
            <Image
              src="/assets/logo.png"
              alt="Huğlu Tekstil Logo"
              width={193}
              height={77}
              className="h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              priority
              quality={90}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-1">
              <Link className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isTransparent ? 'text-white hover:text-purple-300 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} href="/urunler">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">shopping_bag</span>
                  Katalog
                </span>
              </Link>
              <Link className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isTransparent ? 'text-white hover:text-purple-300 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} href="/hakkimizda">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">info</span>
                  Hakkımızda
                </span>
              </Link>
              <Link className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isTransparent ? 'text-white hover:text-purple-300 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} href="/galeri">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">photo_library</span>
                  Galeri
                </span>
              </Link>
              <Link className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isTransparent ? 'text-white hover:text-purple-300 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} href="/mobil-uygulama">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">smartphone</span>
                  Mobil Uygulama
                </span>
              </Link>
              <Link className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isTransparent ? 'text-white hover:text-purple-300 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} href="/teklif-al">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">request_quote</span>
                  Teklif Al
                </span>
              </Link>
              <Link className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${isTransparent ? 'text-white hover:text-purple-300 hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} href="/iletisim">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">contact_mail</span>
                  İletişim
                </span>
              </Link>
            </nav>
            {/* Dark Mode Switcher - Sadece anasayfada göster */}
            {isHomePage && (
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all ${isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
                title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
              >
                <span className="material-symbols-outlined text-xl">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            )}
            <UserMenu isTransparent={isTransparent} />
          </div>

          <div className="md:hidden flex items-center gap-2">
            {/* Dark Mode Switcher - Mobil - Sadece anasayfada göster */}
            {isHomePage && (
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all ${isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
                title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
              >
                <span className="material-symbols-outlined text-xl">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            )}
            <UserMenu isTransparent={isTransparent} />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-2 rounded-lg transition-all ${isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <span className="material-symbols-outlined text-2xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <nav className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2">
              <Link className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2" href="/urunler">
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                Katalog
              </Link>
              <Link className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2" href="/hakkimizda">
                <span className="material-symbols-outlined text-lg">info</span>
                Hakkımızda
              </Link>
              <Link className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2" href="/galeri">
                <span className="material-symbols-outlined text-lg">photo_library</span>
                Galeri
              </Link>
              <Link className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2" href="/mobil-uygulama">
                <span className="material-symbols-outlined text-lg">smartphone</span>
                Mobil Uygulama
              </Link>
              <Link className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2" href="/teklif-al">
                <span className="material-symbols-outlined text-lg">request_quote</span>
                Teklif Al
              </Link>
              <Link className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2" href="/iletisim">
                <span className="material-symbols-outlined text-lg">contact_mail</span>
                İletişim
              </Link>
            </nav>
            {/* Dark Mode Switcher - Mobil Menü İçinde */}
            {isHomePage && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                <button
                  onClick={toggleTheme}
                  className="w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2"
                  aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                  {theme === 'dark' ? 'Açık Mod' : 'Koyu Mod'}
                </button>
              </div>
            )}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-2">
              <UserMenu isTransparent={false} />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
