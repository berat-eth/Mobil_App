'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supportApi } from '@/utils/api'

export default function SupportPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    
    try {
      setSubmitting(true)
      await supportApi.createTicket({
        userId: user.id,
        subject: formData.subject,
        category: formData.category,
        message: formData.message,
      })
      setSubmitted(true)
      setFormData({ subject: '', message: '', category: 'general' })
    } catch (error) {
      console.error('Destek talebi oluşturulamadı:', error)
      alert('Destek talebi oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-green-600 dark:text-green-400 mb-4">
            check_circle
          </span>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-2">
            Destek Talebi Gönderildi
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-6">
            Talebiniz alınmıştır. En kısa sürede size geri dönüş yapacağız.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            Yeni Talep Oluştur
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
        Destek Merkezi
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Bir sorunuz mu var? Size yardımcı olmak için buradayız. Destek talebinizi oluşturun, en kısa sürede size geri dönüş yapacağız.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
              required
              disabled={submitting}
            >
              <option value="general">Genel Soru</option>
              <option value="order">Sipariş</option>
              <option value="payment">Ödeme</option>
              <option value="product">Ürün</option>
              <option value="technical">Teknik Destek</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Konu <span className="text-red-500">*</span>
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
              placeholder="Destek talebinizin konusu"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Mesaj <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={8}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
              placeholder="Sorununuzu veya talebinizi detaylı olarak açıklayın..."
              required
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                Gönderiliyor...
              </span>
            ) : (
              'Destek Talebi Gönder'
            )}
          </button>
        </form>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400 mb-3 block">
            email
          </span>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Email</h3>
          <a href="mailto:info@huglutekstil.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            info@huglutekstil.com
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400 mb-3 block">
            phone
          </span>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">Telefon</h3>
          <a href="tel:+905303125813" className="text-green-600 dark:text-green-400 hover:underline">
            +90 530 312 58 13
          </a>
        </div>
      </div>
    </div>
  )
}

