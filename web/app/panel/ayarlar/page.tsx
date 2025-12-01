'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { userApi } from '@/utils/api'

interface UserSettings {
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    orderUpdates: boolean
    promotions: boolean
  }
  preferences: {
    language: 'tr' | 'en'
    theme: 'light' | 'dark' | 'auto'
    currency: 'TRY' | 'USD' | 'EUR'
  }
  privacy: {
    profileVisibility: 'public' | 'private'
    showEmail: boolean
    showPhone: boolean
    dataSharing: boolean
  }
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      orderUpdates: true,
      promotions: false
    },
    preferences: {
      language: 'tr',
      theme: 'auto',
      currency: 'TRY'
    },
    privacy: {
      profileVisibility: 'private',
      showEmail: false,
      showPhone: false,
      dataSharing: false
    }
  })

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = () => {
    // localStorage'dan ayarları yükle
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Ayarlar yüklenemedi:', e)
      }
    }

    // Tema ayarını kontrol et
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      setSettings(prev => ({
        ...prev,
        preferences: { ...prev.preferences, theme: savedTheme as 'light' | 'dark' | 'auto' }
      }))
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // localStorage'a kaydet
      localStorage.setItem('userSettings', JSON.stringify(settings))
      
      // Tema ayarını uygula
      if (settings.preferences.theme === 'auto') {
        localStorage.removeItem('theme')
        // Sistem temasını kontrol et
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)
      } else {
        localStorage.setItem('theme', settings.preferences.theme)
        document.documentElement.classList.toggle('dark', settings.preferences.theme === 'dark')
      }

      // Backend'e kaydet (eğer API varsa)
      // await userApi.updateSettings(user?.id, settings)

      alert('Ayarlar başarıyla kaydedildi')
    } catch (error) {
      console.error('Ayarlar kaydedilemedi:', error)
      alert('Ayarlar kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          Hesap Ayarları
        </h1>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">
            {saving ? 'sync' : 'save'}
          </span>
          {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>
      </div>

      {/* Bildirim Tercihleri */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">notifications</span>
          Bildirim Tercihleri
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">E-posta Bildirimleri</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sipariş durumu ve önemli güncellemeler için e-posta al</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => updateSetting('notifications', 'email', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">SMS Bildirimleri</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Kargo ve teslimat bilgileri için SMS al</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.sms}
              onChange={(e) => updateSetting('notifications', 'sms', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Push Bildirimleri</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tarayıcı bildirimleri al</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) => updateSetting('notifications', 'push', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Sipariş Güncellemeleri</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sipariş durumu değişikliklerinde bildirim al</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.orderUpdates}
              onChange={(e) => updateSetting('notifications', 'orderUpdates', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Kampanya ve İndirimler</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Özel teklifler ve kampanyalar hakkında bildirim al</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.promotions}
              onChange={(e) => updateSetting('notifications', 'promotions', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Tercihler */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-purple-600 dark:text-purple-400">tune</span>
          Tercihler
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Dil
            </label>
            <select
              value={settings.preferences.language}
              onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tema
            </label>
            <select
              value={settings.preferences.theme}
              onChange={(e) => {
                updateSetting('preferences', 'theme', e.target.value)
                // Tema değişikliğini hemen uygula
                if (e.target.value === 'auto') {
                  localStorage.removeItem('theme')
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  document.documentElement.classList.toggle('dark', prefersDark)
                } else {
                  localStorage.setItem('theme', e.target.value)
                  document.documentElement.classList.toggle('dark', e.target.value === 'dark')
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="light">Açık</option>
              <option value="dark">Koyu</option>
              <option value="auto">Sistem</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Para Birimi
            </label>
            <select
              value={settings.preferences.currency}
              onChange={(e) => updateSetting('preferences', 'currency', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="TRY">₺ Türk Lirası (TRY)</option>
              <option value="USD">$ US Dollar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gizlilik Ayarları */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">lock</span>
          Gizlilik Ayarları
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Profil Görünürlüğü
            </label>
            <select
              value={settings.privacy.profileVisibility}
              onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="private">Özel</option>
              <option value="public">Herkese Açık</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Profil bilgilerinizin kimler tarafından görülebileceğini belirleyin
            </p>
          </div>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">E-posta Adresini Göster</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Profilinizde e-posta adresiniz görünsün</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.showEmail}
              onChange={(e) => updateSetting('privacy', 'showEmail', e.target.checked)}
              className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Telefon Numarasını Göster</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Profilinizde telefon numaranız görünsün</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.showPhone}
              onChange={(e) => updateSetting('privacy', 'showPhone', e.target.checked)}
              className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Veri Paylaşımı</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">İyileştirme amaçlı anonim veri paylaşımına izin ver</p>
            </div>
            <input
              type="checkbox"
              checked={settings.privacy.dataSharing}
              onChange={(e) => updateSetting('privacy', 'dataSharing', e.target.checked)}
              className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

