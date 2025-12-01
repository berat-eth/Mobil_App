'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useState } from 'react'

export default function Iletisim() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    honeypot: '' // Bot koruması için
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    // Honeypot kontrolü - bot ise gönderme
    if (formData.honeypot !== '') {
      console.log('Bot detected')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/iletisim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || 'Mesajınız başarıyla gönderildi!')
        // Formu temizle
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          honeypot: ''
        })
      } else {
        alert(data.error || 'Bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } catch (error) {
      console.error('Form gönderim hatası:', error)
      alert('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-grow px-4 md:px-10 lg:px-20 py-16">
        <div className="max-w-[1400px] mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/30 mb-6">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">contact_mail</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">İletişim</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Bize Ulaşın
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Sorularınız, talepleriniz veya özel siparişleriniz için bizimle iletişime geçmekten çekinmeyin
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 mb-16">
            {/* İletişim Bilgileri */}
            <div className="space-y-6">
              {[
                {
                  icon: 'location_on',
                  title: 'Adres',
                  content: 'KOMEK, Huğlu, 43173.SK SİTESİ NO:20, 42700 Beyşehir/Konya',
                  gradient: 'from-blue-500 to-cyan-500'
                },
                {
                  icon: 'call',
                  title: 'Telefon',
                  content: '0530 312 58 13',
                  link: 'tel:+905303125813',
                  gradient: 'from-purple-500 to-pink-500'
                },
                {
                  icon: 'mail',
                  title: 'E-posta',
                  content: 'info@hugluoutdoor.com',
                  link: 'mailto:info@hugluoutdoor.com',
                  gradient: 'from-orange-500 to-red-500'
                },
                {
                  icon: 'schedule',
                  title: 'Çalışma Saatleri',
                  content: 'Hafta içi: 07:30 - 17:30',
                  gradient: 'from-green-500 to-emerald-500'
                }
              ].map((item, i) => (
                <div key={i} className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="material-symbols-outlined text-white text-2xl">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg">{item.title}</p>
                      {item.link ? (
                        <a href={item.link} className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                          {item.content}
                        </a>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-300">{item.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* İletişim Formu */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <span className="material-symbols-outlined text-white text-2xl">mail</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Mesaj Gönderin</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Adınız Soyadınız <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Adınız ve soyadınız"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      E-posta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e-posta@adresiniz.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Telefon <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+90 555 123 45 67"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Konu (Opsiyonel)</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Konu"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Mesajınız <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Mesajınızı buraya yazın..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors resize-none"
                    required
                  />
                </div>

                {/* Honeypot field - Bot koruması */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={formData.honeypot}
                    onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  {isSubmitting ? (
                    <>
                      <span>Gönderiliyor...</span>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    </>
                  ) : (
                    <>
                      <span>Mesajı Gönder</span>
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Harita */}
          <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                <span className="material-symbols-outlined text-white text-2xl">map</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Atölyemizin Konumu</h2>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <div className="h-[400px] w-full">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d202081.12586154795!2d31.58504840067316!3d37.68404172477694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14c52b33668b81cb%3A0x3f8e0c193c9d5c17!2sHu%C4%9Flu%20Outdoor!5e0!3m2!1str!2str!4v1761295809929!5m2!1str!2str"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
