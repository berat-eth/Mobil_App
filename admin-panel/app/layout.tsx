import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/lib/ThemeContext'
import CSRFProvider from '@/components/CSRFProvider'

export const metadata: Metadata = {
  title: 'E-Ticaret Admin Paneli',
  description: 'Modern e-ticaret yönetim paneli',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>
        <ThemeProvider>
          <CSRFProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
