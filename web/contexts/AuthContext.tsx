'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, userApi } from '@/utils/api'
import { authHelpers } from '@/utils/auth'
import type { User, LoginResponse } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  register: (userData: { name: string; email: string; password: string; phone?: string }) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize user from localStorage
  useEffect(() => {
    const savedUser = authHelpers.getUser()
    if (savedUser) {
      setUser(savedUser)
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password) as LoginResponse
      console.log('Login response:', response)
      if (response.success && response.data) {
        authHelpers.saveUser(response.data)
        setUser(response.data)
      } else {
        const errorMessage = response.message || 'Giriş başarısız. Email veya şifre hatalı olabilir.'
        console.error('Login failed:', errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error('Login error details:', error)
      // API hatası ise mesajı direkt geçir, değilse genel mesaj
      if (error instanceof Error) {
        throw error
      } else if (error?.message) {
        throw new Error(error.message)
      } else {
        throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.')
      }
    }
  }, [])

  const googleLogin = useCallback(async (idToken: string) => {
    try {
      const response = await authApi.googleLogin(idToken) as LoginResponse
      if (response.success && response.data) {
        authHelpers.saveUser(response.data)
        setUser(response.data)
      } else {
        throw new Error(response.message || 'Google girişi başarısız')
      }
    } catch (error) {
      throw error
    }
  }, [])

  const register = useCallback(async (userData: { name: string; email: string; password: string; phone?: string }) => {
    try {
      const response = await authApi.register(userData) as LoginResponse
      if (response.success && response.data) {
        authHelpers.saveUser(response.data)
        setUser(response.data)
      } else {
        throw new Error(response.message || 'Kayıt başarısız')
      }
    } catch (error) {
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    authHelpers.logout()
    setUser(null)
  }, [])

  const updateUser = useCallback(async (userData: Partial<User>) => {
    if (!user?.id) return
    try {
      const response = await userApi.updateProfile(user.id, userData as any)
      if (response.success && response.data) {
        const updatedUser = { ...user, ...response.data }
        authHelpers.saveUser(updatedUser)
        setUser(updatedUser)
      } else {
        throw new Error('Profil güncelleme başarısız')
      }
    } catch (error) {
      throw error
    }
  }, [user])

  const refreshUser = useCallback(async () => {
    if (!user?.id) return
    try {
      const response = await userApi.getProfile(user.id)
      if (response.success && response.data) {
        authHelpers.saveUser(response.data)
        setUser(response.data)
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yenilenemedi:', error)
    }
  }, [user])

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    googleLogin,
    register,
    logout,
    updateUser,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

