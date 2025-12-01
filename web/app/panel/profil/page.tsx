'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { validateEmail, validatePhone, validateName } from '@/utils/validation'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
    taxOffice: '',
    taxNumber: '',
    tradeRegisterNumber: '',
    website: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        companyName: user.companyName || '',
        taxOffice: user.taxOffice || '',
        taxNumber: user.taxNumber || '',
        tradeRegisterNumber: user.tradeRegisterNumber || '',
        website: user.website || '',
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
    setSuccess('')
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateName(formData.name)) {
      setError('Geçerli bir isim giriniz')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Geçerli bir email adresi giriniz')
      return
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setError('Geçerli bir telefon numarası giriniz')
      return
    }

    try {
      setLoading(true)
      const updateData: any = { ...formData }
      
      if (showPasswordFields && passwordData.newPassword) {
        if (passwordData.newPassword.length < 6) {
          setError('Yeni şifre en az 6 karakter olmalıdır')
          setLoading(false)
          return
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setError('Yeni şifreler eşleşmiyor')
          setLoading(false)
          return
        }
        updateData.currentPassword = passwordData.currentPassword
        updateData.newPassword = passwordData.newPassword
      }

      await updateUser(updateData)
      setSuccess('Profil başarıyla güncellendi')
      setShowPasswordFields(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-6">
          Profil Bilgilerim
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Ad Soyad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
              required
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
              placeholder="0530 123 45 67"
              disabled={loading}
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Adres
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
              disabled={loading}
            />
          </div>

          {/* Company Information Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">business</span>
              Şirket Bilgileri
            </h3>
            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Şirket Adı
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  placeholder="Şirket adınızı giriniz"
                  disabled={loading}
                />
              </div>

              {/* Tax Office and Tax Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="taxOffice" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Vergi Dairesi
                  </label>
                  <input
                    id="taxOffice"
                    name="taxOffice"
                    type="text"
                    value={formData.taxOffice}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    placeholder="Vergi dairesi adı"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="taxNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Vergi Numarası
                  </label>
                  <input
                    id="taxNumber"
                    name="taxNumber"
                    type="text"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    placeholder="Vergi numaranız"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Trade Register Number */}
              <div>
                <label htmlFor="tradeRegisterNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ticari Sicil Numarası
                </label>
                <input
                  id="tradeRegisterNumber"
                  name="tradeRegisterNumber"
                  type="text"
                  value={formData.tradeRegisterNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  placeholder="Ticari sicil numaranız"
                  disabled={loading}
                />
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Web Sitesi
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  placeholder="https://example.com"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Şifre Değiştir</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordFields(!showPasswordFields)
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showPasswordFields ? 'İptal' : 'Şifremi Değiştir'}
              </button>
            </div>

            {showPasswordFields && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Mevcut Şifre
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Yeni Şifre
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Yeni Şifre Tekrar
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                Kaydediliyor...
              </span>
            ) : (
              'Değişiklikleri Kaydet'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

