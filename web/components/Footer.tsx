'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 text-gray-200 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 mx-auto max-w-[1920px]">
        {/* Main Footer Content */}
        <div className="pt-20 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-12 xl:gap-16">
            {/* Company Info & Logo */}
            <div className="lg:col-span-1 space-y-6">
              <p className="text-sm text-gray-300 leading-relaxed">
                Özel iş kıyafetlerinde güvenilir çözüm ortağınız. Kalite, konfor ve şıklığı bir araya getiriyoruz.
              </p>
              <div className="pt-2 border-t border-gray-500/50">
                <p className="text-xs text-gray-400 leading-relaxed italic">
                  Huğlu Tekstil, bir{' '}
                  <a
                    href="https://huglu.com.tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-300 underline transition-colors"
                  >
                    Huğlu Av tüfekleri Kooperatifi
                  </a>{' '}
                  markasıdır.
                </p>
              </div>
              
              {/* Social Media */}
              <div className="flex items-center gap-4 pt-2">
                <a
                  href="https://www.facebook.com/hugluoutdoor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-3 bg-gradient-to-br from-gray-600/60 to-gray-700/60 hover:from-blue-500 hover:to-blue-600 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-blue-500/50 hover:-translate-y-1 border border-gray-500/30 hover:border-blue-400/50"
                  aria-label="Facebook"
                >
                  <svg
                    className="h-6 w-6 text-gray-200 group-hover:text-white transition-all duration-300 group-hover:drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      clipRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      fillRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/hugluoutdoor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-3 bg-gradient-to-br from-gray-600/60 to-gray-700/60 hover:from-pink-500 hover:via-purple-500 hover:to-pink-500 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-pink-500/50 hover:-translate-y-1 border border-gray-500/30 hover:border-pink-400/50"
                  aria-label="Instagram"
                >
                  <svg
                    className="h-6 w-6 text-gray-200 group-hover:text-white transition-all duration-300 group-hover:drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      clipRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.08 2.465c.636-.247 1.363-.416 2.427-.465C9.53 2.013 9.884 2 12.315 2zM12 8.118a4.882 4.882 0 100 9.764 4.882 4.882 0 000-9.764zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"
                      fillRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://wa.me/905303125813"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-3 bg-gradient-to-br from-gray-600/60 to-gray-700/60 hover:from-green-400 hover:to-green-500 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-green-500/50 hover:-translate-y-1 border border-gray-500/30 hover:border-green-400/50"
                  aria-label="WhatsApp"
                >
                  <span className="material-symbols-outlined text-gray-200 group-hover:text-white transition-all duration-300 text-2xl group-hover:drop-shadow-lg">
                    chat
                  </span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
                  explore
                </span>
                Hızlı Bağlantılar
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="group flex items-center gap-3 text-sm text-gray-300 hover:text-purple-300 transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all text-purple-400 group-hover:drop-shadow-lg">
                      arrow_forward
                    </span>
                    <span className="group-hover:font-medium">Ana Sayfa</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/urunler"
                    className="group flex items-center gap-3 text-sm text-gray-300 hover:text-purple-300 transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all text-purple-400 group-hover:drop-shadow-lg">
                      arrow_forward
                    </span>
                    <span className="group-hover:font-medium">Ürünler</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/hakkimizda"
                    className="group flex items-center gap-3 text-sm text-gray-300 hover:text-purple-300 transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all text-purple-400 group-hover:drop-shadow-lg">
                      arrow_forward
                    </span>
                    <span className="group-hover:font-medium">Hakkımızda</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/galeri"
                    className="group flex items-center gap-3 text-sm text-gray-300 hover:text-purple-300 transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all text-purple-400 group-hover:drop-shadow-lg">
                      arrow_forward
                    </span>
                    <span className="group-hover:font-medium">Galeri</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/teklif-al"
                    className="group flex items-center gap-3 text-sm text-gray-300 hover:text-purple-300 transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all text-purple-400 group-hover:drop-shadow-lg">
                      arrow_forward
                    </span>
                    <span className="group-hover:font-medium">Teklif Al</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/iletisim"
                    className="group flex items-center gap-3 text-sm text-gray-300 hover:text-purple-300 transition-all duration-200 hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all text-purple-400 group-hover:drop-shadow-lg">
                      arrow_forward
                    </span>
                    <span className="group-hover:font-medium">İletişim</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                  contact_mail
                </span>
                İletişim Bilgileri
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-300 text-2xl mt-0.5 flex-shrink-0 drop-shadow-md group-hover:drop-shadow-lg transition-all">
                    location_on
                  </span>
                  <span className="text-sm text-gray-300 leading-relaxed">
                    KOMEK, Huğlu, 43173.SK SİTESİ NO:20<br />
                    42700 Beyşehir/Konya
                  </span>
                </li>
                <li>
                  <a
                    href="tel:+905303125813"
                    className="flex items-center gap-3 text-sm text-gray-300 hover:text-blue-300 transition-all duration-200 group hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-blue-300 text-2xl group-hover:scale-110 group-hover:drop-shadow-lg transition-all">
                      phone
                    </span>
                    <span className="group-hover:underline group-hover:font-medium">0530 312 58 13</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@hugluoutdoor.com"
                    className="flex items-center gap-3 text-sm text-gray-300 hover:text-blue-300 transition-all duration-200 group hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-blue-300 text-2xl group-hover:scale-110 group-hover:drop-shadow-lg transition-all">
                      email
                    </span>
                    <span className="group-hover:underline group-hover:font-medium break-all">info@hugluoutdoor.com</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/905303125813"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-gray-300 hover:text-green-300 transition-all duration-200 group hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-green-300 text-2xl group-hover:scale-110 group-hover:drop-shadow-lg transition-all">
                      chat
                    </span>
                    <span className="group-hover:underline group-hover:font-medium">WhatsApp Destek</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Newsletter */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl bg-gradient-to-br from-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-lg">
                  gavel
                </span>
                Yasal
              </h3>
              <ul className="space-y-3 mb-6">
                <li>
                  <Link
                    href="/gizlilik"
                    className="text-sm text-gray-300 hover:text-pink-300 transition-all duration-200 inline-flex items-center gap-2 group hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base text-pink-400 group-hover:scale-110 group-hover:drop-shadow-lg transition-all">
                      lock
                    </span>
                    <span className="group-hover:font-medium">Gizlilik Politikası</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kullanim-kosullari"
                    className="text-sm text-gray-300 hover:text-pink-300 transition-all duration-200 inline-flex items-center gap-2 group hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base text-pink-400 group-hover:scale-110 group-hover:drop-shadow-lg transition-all">
                      description
                    </span>
                    <span className="group-hover:font-medium">Kullanım Koşulları</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cerez-politikasi"
                    className="text-sm text-gray-300 hover:text-pink-300 transition-all duration-200 inline-flex items-center gap-2 group hover:translate-x-1"
                  >
                    <span className="material-symbols-outlined text-base text-pink-400 group-hover:scale-110 group-hover:drop-shadow-lg transition-all">
                      cookie
                    </span>
                    <span className="group-hover:font-medium">Çerez Politikası</span>
                  </Link>
                </li>
              </ul>

              {/* Trust Badge */}
              <div className="p-4 bg-gradient-to-br from-blue-700/40 to-purple-700/40 border border-blue-400/30 rounded-xl backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-yellow-300 text-2xl drop-shadow-lg animate-pulse">
                    verified
                  </span>
                  <span className="text-sm font-bold text-white">Güvenli Alışveriş</span>
                </div>
                <p className="text-xs text-gray-300">SSL sertifikalı güvenli ödeme sistemi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Statement */}
        <div className="border-t border-gray-600/50 pt-8 pb-6">
          <div className="flex flex-col items-center text-center gap-4">
            <Link href="/" className="inline-block">
              <Image
                src="/assets/logo.png"
                alt="Huğlu Tekstil Logo"
                width={180}
                height={72}
                className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                quality={85}
                loading="lazy"
              />
            </Link>
            <p className="text-sm text-gray-400 font-medium">
              Huğlu Tekstil, bir{' '}
              <a
                href="https://huglu.com.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 font-semibold hover:text-blue-300 underline transition-colors"
              >
                Huğlu Av tüfekleri Kooperatifi
              </a>{' '}
              markasıdır.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-600/50 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-gray-400">
              <p>© {currentYear} Huğlu Tekstil.</p>
              <p className="hidden md:block">Tüm hakları saklıdır.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm text-gray-400">
              <span className="flex items-center gap-2 group">
                <span className="material-symbols-outlined text-base text-gray-300 group-hover:text-purple-300 group-hover:scale-110 transition-all drop-shadow-md">
                  code
                </span>
                <span className="group-hover:text-gray-300 transition-colors">Made with ❤️ in Konya</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
