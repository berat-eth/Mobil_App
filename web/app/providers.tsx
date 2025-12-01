'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import WhatsAppWrapper from '@/components/WhatsAppWrapper'
import MaintenanceMode from '@/components/MaintenanceMode'
import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MaintenanceMode />
        {children}
        <WhatsAppWrapper />
      </AuthProvider>
    </ThemeProvider>
  )
}

