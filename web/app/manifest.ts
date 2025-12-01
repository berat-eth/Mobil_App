import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Huğlu Tekstil',
    short_name: 'Huğlu Tekstil',
    description: 'Özel İş Kıyafetleri ve Üniforma Üretimi',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8b5cf6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
