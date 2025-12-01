'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  
  // Sayfa yüklendiğinde localStorage'dan tema tercihini al
  useEffect(() => {
    // SSR kontrolü
    if (typeof window === 'undefined') return
    
    const savedTheme = localStorage.getItem('theme') as Theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    // localStorage'da kayıtlı tema varsa onu kullan, yoksa sistem tercihini kontrol et
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else if (prefersDark) {
      setTheme('dark')
      document.documentElement.classList.add('dark')
    }
  }, [])
  
  // Tema değiştiğinde localStorage'a kaydet ve HTML'e dark class'ını ekle/kaldır
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Tema context'ini kullanmak için custom hook
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme hook must be used within a ThemeProvider')
  }
  return context
}
