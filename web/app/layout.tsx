import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Providers from './providers'
import { sanitizeJSONLD } from '@/utils/xss-sanitizer'

export const metadata: Metadata = {
  metadataBase: new URL('https://huglutekstil.com'),
  title: {
    default: 'Outdoor Giyim Toptan | Özel Üretim Outdoor Mont & Teknik Giyim | Huğlu Tekstil',
    template: '%s | Huğlu Tekstil - Outdoor Giyim Toptan'
  },
  description: 'Outdoor giyim toptan satış, özel üretim outdoor mont, softshell mont, polar mont, teknik giyim üreticisi. Toptan outdoor kıyafet, kamp giyim, kurumsal outdoor mont üretimi. Logo baskılı outdoor ürün, az adet özel üretim. Türkiye\'nin güvenilir outdoor giyim tedarikçisi.',
  authors: [{ name: 'Huğlu Tekstil' }],
  creator: 'Huğlu Tekstil',
  publisher: 'Huğlu Tekstil',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://huglutekstil.com',
    siteName: 'Huğlu Tekstil - Outdoor Giyim Toptan',
    title: 'Outdoor Giyim Toptan | Özel Üretim Outdoor Mont & Teknik Giyim',
    description: 'Outdoor giyim toptan satış, özel üretim outdoor mont, softshell mont, polar mont üretimi. Toptan outdoor kıyafet, kamp giyim, kurumsal outdoor mont. Logo baskılı outdoor ürün üretimi. Türkiye\'nin güvenilir outdoor giyim tedarikçisi.',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'Huğlu Tekstil Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Outdoor Giyim Toptan | Özel Üretim Outdoor Mont',
    description: 'Outdoor giyim toptan satış, özel üretim outdoor mont, softshell mont, polar mont üretimi. Toptan outdoor kıyafet, kamp giyim.',
    images: ['/assets/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/assets/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
          data-noprefetch
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="canonical" href="https://huglutekstil.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#1173d4" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: sanitizeJSONLD({
              '@context': 'https://schema.org',
              '@type': 'ManufacturingBusiness',
              name: 'Huğlu Tekstil - Outdoor Giyim Toptan Üretici',
              image: 'https://huglutekstil.com/assets/logo.png',
              '@id': 'https://huglutekstil.com',
              url: 'https://huglutekstil.com',
              telephone: '+90-530-312-58-13',
              description: 'Outdoor giyim toptan satış, özel üretim outdoor mont, softshell mont, polar mont, teknik giyim üreticisi. Toptan outdoor kıyafet, kamp giyim, kurumsal outdoor mont üretimi.',
              areaServed: 'TR',
              serviceType: ['Outdoor Giyim Toptan', 'Özel Üretim Outdoor Mont', 'Teknik Giyim Üretimi', 'Kurumsal Outdoor Kıyafet'],
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'KOMEK, 43173.SK SİTESİ NO:20',
                addressLocality: 'Beyşehir',
                addressRegion: 'Konya',
                postalCode: '42700',
                addressCountry: 'TR'
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 37.85,
                longitude: 31.7
              },
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '07:30',
                closes: '17:30'
              },
              sameAs: [
                'https://www.facebook.com/hugluoutdoor',
                'https://www.instagram.com/hugluoutdoor'
              ]
            })
          }}
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark font-sans">
        <Script
          id="material-symbols-check"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
                  document.fonts.ready.then(function() {
                    // Font yüklendi, ek işlem gerekmiyor
                  }).catch(function() {
                    // Font yüklenemedi, sessizce devam et
                  });
                }
              })();
            `,
          }}
        />
        <Providers>
          {children}
        </Providers>
        <Script id="service-worker" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator && 'requestIdleCallback' in window) {
              requestIdleCallback(function() {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  // Eski service worker'ları temizle
                  registrations.forEach(function(registration) {
                    registration.unregister();
                  });
                  // Yeni service worker'ı register et
                  navigator.serviceWorker.register('/sw.js', {
                    updateViaCache: 'none'
                  }).then(function(registration) {
                    // Background'da güncelleme kontrolü yap
                    if (registration.update) {
                      registration.update();
                    }
                  }).catch(function(err) {
                    // Sessizce hata yakala
                  });
                });
              }, { timeout: 2000 });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
