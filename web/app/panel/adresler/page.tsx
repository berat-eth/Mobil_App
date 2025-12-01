'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { addressApi } from '@/utils/api'
import type { UserAddress } from '@/lib/types'
import { validatePhone } from '@/utils/validation'

export default function AddressesPage() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    addressType: 'shipping' as 'shipping' | 'billing',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    isDefault: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadAddresses()
    }
  }, [user])

  const loadAddresses = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const response = await addressApi.getAddresses(user.id)
      if (response.success && response.data) {
        setAddresses(response.data as UserAddress[])
      }
    } catch (error) {
      console.error('Adresler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value,
    })
    setError('')
  }

  const resetForm = () => {
    setFormData({
      addressType: 'shipping',
      fullName: '',
      phone: '',
      address: '',
      city: '',
      district: '',
      postalCode: '',
      isDefault: false,
    })
    setShowAddForm(false)
    setEditingId(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
      setError('Tüm zorunlu alanları doldurunuz')
      return
    }

    if (!validatePhone(formData.phone)) {
      setError('Geçerli bir telefon numarası giriniz')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      if (editingId) {
        await addressApi.updateAddress(editingId, formData)
      } else {
        await addressApi.createAddress({
          ...formData,
          userId: user.id,
        })
      }

      await loadAddresses()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adres kaydedilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (address: UserAddress) => {
    setFormData({
      addressType: address.addressType,
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      district: address.district || '',
      postalCode: address.postalCode || '',
      isDefault: address.isDefault,
    })
    setEditingId(address.id)
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return
    try {
      await addressApi.deleteAddress(id)
      await loadAddresses()
    } catch (error) {
      console.error('Adres silinemedi:', error)
      alert('Adres silinemedi. Lütfen tekrar deneyin.')
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await addressApi.setDefaultAddress(id)
      await loadAddresses()
    } catch (error) {
      console.error('Varsayılan adres ayarlanamadı:', error)
      alert('Varsayılan adres ayarlanamadı. Lütfen tekrar deneyin.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Adreslerim
        </h1>
        <button
          onClick={() => {
            resetForm()
            setShowAddForm(true)
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Adres Ekle
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Adres Tipi
                </label>
                <select
                  name="addressType"
                  value={formData.addressType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  disabled={submitting}
                >
                  <option value="shipping">Teslimat Adresi</option>
                  <option value="billing">Fatura Adresi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  İl <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  İlçe
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Posta Kodu
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Adres <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                required
                disabled={submitting}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={submitting}
              />
              <label htmlFor="isDefault" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Varsayılan adres olarak ayarla
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses List */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-600 dark:text-blue-400 mb-4">
            sync
          </span>
          <p className="text-gray-600 dark:text-gray-400">Adresler yükleniyor...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            location_on
          </span>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Henüz adres eklenmemiş</p>
          <button
            onClick={() => {
              resetForm()
              setShowAddForm(true)
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            İlk Adresinizi Ekleyin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {address.isDefault && (
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded-full mb-2">
                      Varsayılan
                    </span>
                  )}
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{address.fullName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{address.phone}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">
                  {address.addressType === 'shipping' ? 'Teslimat' : 'Fatura'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 mb-1">{address.address}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {address.district && `${address.district}, `}
                  {address.city}
                  {address.postalCode && ` ${address.postalCode}`}
                </p>
              </div>

              <div className="flex gap-2">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="flex-1 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    Varsayılan Yap
                  </button>
                )}
                <button
                  onClick={() => handleEdit(address)}
                  className="flex-1 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

