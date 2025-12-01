'use client'

import { useEffect } from 'react'
import { getCSRFTokenFromCookie, setCSRFTokenCookie } from '@/lib/csrf'

/**
 * CSRF Token Provider
 * Sayfa yüklendiğinde CSRF token'ı alır veya yeni bir token oluşturur
 */
export default function CSRFProvider() {
  useEffect(() => {
    // Sayfa yüklendiğinde CSRF token kontrolü
    const initializeCSRF = async () => {
      // Mevcut token var mı kontrol et
      const existingToken = getCSRFTokenFromCookie()
      
      if (!existingToken) {
        // Token yoksa yeni bir token al
        try {
          const response = await fetch('/api/csrf-token')
          if (response.ok) {
            const data = await response.json()
            if (data.token) {
              setCSRFTokenCookie(data.token)
            }
          }
        } catch (error) {
          console.warn('CSRF token alınamadı:', error)
        }
      }
    }
    
    initializeCSRF()
  }, [])
  
  return null // Bu component görsel bir şey render etmez
}

