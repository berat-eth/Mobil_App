'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // localStorage'dan tema tercihini oku
    const savedTheme = localStorage.getItem('theme') as Theme | null
    // Sistem tercihini kontrol et
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initialTheme = savedTheme || systemTheme
    
    setThemeState(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    // DOM'un hazır olduğundan emin ol
    if (typeof document === 'undefined') return
    
    const root = document.documentElement
    if (!root) return
    
    try {
      if (newTheme === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
      }
    } catch (error) {
      // DOM manipülasyonu hatası - sessizce devam et
      console.warn('Theme uygulanırken hata:', error)
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Hydration hatası önlemek için
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  // ThemeProvider yoksa fallback hook kullan (SSR ve edge case'ler için)
  if (context === undefined) {
    // Client-side'da useState ile state tut
    const [fallbackTheme, setFallbackTheme] = useState<Theme>(() => {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme') as Theme | null
        if (savedTheme) return savedTheme
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    })

    // Tema değişikliğini uygula
    useEffect(() => {
      if (typeof document !== 'undefined') {
        const root = document.documentElement
        if (fallbackTheme === 'dark') {
          root.classList.add('dark')
          root.classList.remove('light')
        } else {
          root.classList.add('light')
          root.classList.remove('dark')
        }
      }
    }, [fallbackTheme])

    return {
      theme: fallbackTheme,
      toggleTheme: () => {
        const newTheme = fallbackTheme === 'light' ? 'dark' : 'light'
        setFallbackTheme(newTheme)
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme', newTheme)
        }
      },
      setTheme: (newTheme: Theme) => {
        setFallbackTheme(newTheme)
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme', newTheme)
        }
      }
    }
  }
  return context
}

