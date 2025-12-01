'use client'

import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, User, Bell, Lock, Globe, Palette, Database, Mail, Smartphone, Shield, Save, Eye, EyeOff, UserPlus, Edit, Trash2, CheckCircle, XCircle, X, Brain, TestTube2, Wrench } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'
import { aiProvidersService, type AIProvider, type AIProviderConfig } from '@/lib/services/ai-providers'

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile')
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showAddAdminModal, setShowAddAdminModal] = useState(false)
    const [showEditAdminModal, setShowEditAdminModal] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<any>(null)
    const [adminUsers, setAdminUsers] = useState([] as Array<{ id: number; name: string; email: string; role: string; status: 'Aktif' | 'Pasif'; lastLogin: string; permissions: string[] }>)
    const [adminUsersLoading, setAdminUsersLoading] = useState(false)
    const [adminFormData, setAdminFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        isActive: true,
        permissions: [] as string[]
    })
    const [adminFormLoading, setAdminFormLoading] = useState(false)
    const [adminFormMessage, setAdminFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Available permissions
    const availablePermissions = [
        { key: 'products', label: 'Ürün Yönetimi' },
        { key: 'orders', label: 'Sipariş Yönetimi' },
        { key: 'customers', label: 'Müşteri Yönetimi' },
        { key: 'reports', label: 'Raporlar' },
        { key: 'settings', label: 'Ayarlar' },
        { key: 'all', label: 'Tüm Yetkiler' }
    ]

    // Form States
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        avatar: ''
    })

    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: false,
        smsNotifications: false,
        pushNotifications: false,
        orderUpdates: false,
        marketingEmails: false,
        securityAlerts: false,
        weeklyReports: false
    })

    const [securitySettings, setSecuritySettings] = useState({
        twoFactorAuth: false,
        sessionTimeout: '30',
        loginAlerts: false,
        ipWhitelist: false
    })

    // AI İçgörüleri Ayarları
    const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
        enabled: false,
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000
    })
    const [aiApiKey, setAiApiKey] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiTestMessage, setAiTestMessage] = useState<string | null>(null)
    const [availableModels, setAvailableModels] = useState<string[]>([])

    // Bakım Modu State
    const [maintenanceMode, setMaintenanceMode] = useState({
        webEnabled: false,
        mobileEnabled: false,
        message: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
        estimatedEndTime: ''
    })
    const [maintenanceLoading, setMaintenanceLoading] = useState(false)
    const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)

    // Bakım modu durumunu yükle
    useEffect(() => {
        const loadMaintenanceStatus = async () => {
            try {
                const res = await api.get<any>('/maintenance/status')
                if (res?.data) {
                    setMaintenanceMode({
                        webEnabled: res.data.webEnabled !== undefined ? res.data.webEnabled : (res.data.enabled || false),
                        mobileEnabled: res.data.mobileEnabled !== undefined ? res.data.mobileEnabled : (res.data.enabled || false),
                        message: res.data.message || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
                        estimatedEndTime: res.data.estimatedEndTime || ''
                    })
                }
            } catch (e) {
                console.error('Bakım modu durumu yüklenemedi:', e)
            }
        }
        loadMaintenanceStatus()
    }, [])

    // Web bakım modu toggle
    const toggleWebMaintenance = async () => {
        setMaintenanceLoading(true)
        setMaintenanceMessage(null)
        try {
            const newWebEnabled = !maintenanceMode.webEnabled
            const res = await api.post<ApiResponse<any>>('/admin/maintenance/toggle', {
                webEnabled: newWebEnabled,
                message: maintenanceMode.message,
                estimatedEndTime: maintenanceMode.estimatedEndTime || null
            })
            if (res?.success) {
                setMaintenanceMode({
                    ...maintenanceMode,
                    webEnabled: newWebEnabled
                })
                setMaintenanceMessage(res.message || `Web bakım modu ${newWebEnabled ? 'açıldı' : 'kapatıldı'}`)
            }
        } catch (e: any) {
            setMaintenanceMessage(e?.message || 'Web bakım modu ayarı kaydedilemedi')
        } finally {
            setMaintenanceLoading(false)
        }
    }

    // Mobil bakım modu toggle
    const toggleMobileMaintenance = async () => {
        setMaintenanceLoading(true)
        setMaintenanceMessage(null)
        try {
            const newMobileEnabled = !maintenanceMode.mobileEnabled
            const res = await api.post<ApiResponse<any>>('/admin/maintenance/toggle', {
                mobileEnabled: newMobileEnabled,
                message: maintenanceMode.message,
                estimatedEndTime: maintenanceMode.estimatedEndTime || null
            })
            if (res?.success) {
                setMaintenanceMode({
                    ...maintenanceMode,
                    mobileEnabled: newMobileEnabled
                })
                setMaintenanceMessage(res.message || `Mobil bakım modu ${newMobileEnabled ? 'açıldı' : 'kapatıldı'}`)
            }
        } catch (e: any) {
            setMaintenanceMessage(e?.message || 'Mobil bakım modu ayarı kaydedilemedi')
        } finally {
            setMaintenanceLoading(false)
        }
    }

    // Bakım modu mesajını güncelle
    const updateMaintenanceMessage = async () => {
        setMaintenanceLoading(true)
        setMaintenanceMessage(null)
        try {
            const res = await api.post<ApiResponse<any>>('/admin/maintenance/toggle', {
                webEnabled: maintenanceMode.webEnabled,
                mobileEnabled: maintenanceMode.mobileEnabled,
                message: maintenanceMode.message,
                estimatedEndTime: maintenanceMode.estimatedEndTime || null
            })
            if (res?.success) {
                setMaintenanceMessage('Bakım modu mesajı güncellendi')
            }
        } catch (e: any) {
            setMaintenanceMessage(e?.message || 'Bakım modu mesajı güncellenemedi')
        } finally {
            setMaintenanceLoading(false)
        }
    }

    useEffect(() => {
        const loadAiConfig = async () => {
            try {
                const cfg = await aiProvidersService.getConfig()
                setAiConfig({
                    enabled: !!cfg.enabled,
                    provider: (cfg.provider || 'openai') as AIProvider,
                    model: cfg.model || 'gpt-4o-mini',
                    temperature: cfg.temperature ?? 0.7,
                    maxTokens: cfg.maxTokens ?? 2000
                })
            } catch {}
        }
        loadAiConfig()
    }, [])

    // Admin Logs (read-only) state
    const [adminLogs, setAdminLogs] = useState<any[]>([])
    const [adminLogsLoading, setAdminLogsLoading] = useState(false)
    const [adminLogsError, setAdminLogsError] = useState<string | null>(null)
    const [adminLogsAccess, setAdminLogsAccess] = useState(false)
    const [adminLogsCode, setAdminLogsCode] = useState('')

    const loadAdminLogs = async () => {
        setAdminLogsLoading(true)
        setAdminLogsError(null)
        try {
            const res = await api.get<any>('/admin/security/login-attempts', { range: 30 })
            setAdminLogs((res as any)?.data || [])
        } catch (e: any) {
            setAdminLogsError(e?.message || 'Yönetici logları yüklenemedi')
        } finally {
            setAdminLogsLoading(false)
        }
    }

    const [appearanceSettings, setAppearanceSettings] = useState({
        theme: 'light',
        language: 'tr',
        dateFormat: 'DD/MM/YYYY',
        currency: 'TRY',
        timezone: 'Europe/Istanbul'
    })

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [profileLoading, setProfileLoading] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Load profile data
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await api.get<ApiResponse<any>>('/admin/profile')
                if (response.success && response.data) {
                    setProfileData({
                        name: response.data.name || '',
                        email: response.data.email || '',
                        phone: response.data.phone || '',
                        role: response.data.role || 'admin',
                        avatar: ''
                    })
                }
            } catch (error) {
                console.error('Profil bilgileri yüklenemedi:', error)
            }
        }
        loadProfile()
    }, [])

    // Load admin users
    const loadAdminUsers = async () => {
        setAdminUsersLoading(true)
        try {
            const response = await api.get<ApiResponse<any[]>>('/admin/users/admins')
            if (response.success && response.data) {
                setAdminUsers(response.data.map((admin: any) => ({
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    status: admin.status as 'Aktif' | 'Pasif',
                    lastLogin: admin.lastLogin,
                    permissions: admin.permissions || []
                })))
            }
        } catch (error) {
            console.error('Admin kullanıcıları yüklenemedi:', error)
        } finally {
            setAdminUsersLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'admin-users') {
            loadAdminUsers()
        }
    }, [activeTab])

    // Handle add admin
    const handleAddAdmin = async () => {
        if (!adminFormData.name || !adminFormData.email || (!editingAdmin && !adminFormData.password)) {
            setAdminFormMessage({ type: 'error', text: 'Ad, e-posta ve şifre alanları zorunludur' })
            return
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(adminFormData.email)) {
            setAdminFormMessage({ type: 'error', text: 'Geçerli bir e-posta adresi girin' })
            return
        }

        setAdminFormLoading(true)
        setAdminFormMessage(null)
        try {
            if (editingAdmin) {
                // Update admin
                const response = await api.put<ApiResponse<any>>(`/admin/users/${editingAdmin.id}`, {
                    name: adminFormData.name,
                    email: adminFormData.email,
                    role: adminFormData.role,
                    isActive: adminFormData.isActive,
                    permissions: adminFormData.permissions
                })
                if (response.success) {
                    setAdminFormMessage({ type: 'success', text: 'Admin kullanıcı güncellendi' })
                    setShowEditAdminModal(false)
                    setEditingAdmin(null)
                    resetAdminForm()
                    await loadAdminUsers()
                } else {
                    setAdminFormMessage({ type: 'error', text: response.message || 'Admin kullanıcı güncellenemedi' })
                }
            } else {
                // Create admin
                const response = await api.post<ApiResponse<any>>('/admin/users', {
                    name: adminFormData.name,
                    email: adminFormData.email,
                    password: adminFormData.password,
                    role: adminFormData.role,
                    isActive: adminFormData.isActive,
                    permissions: adminFormData.permissions
                })
                if (response.success) {
                    setAdminFormMessage({ type: 'success', text: 'Admin kullanıcı oluşturuldu' })
                    setShowAddAdminModal(false)
                    resetAdminForm()
                    await loadAdminUsers()
                } else {
                    setAdminFormMessage({ type: 'error', text: response.message || 'Admin kullanıcı oluşturulamadı' })
                }
            }
        } catch (error: any) {
            setAdminFormMessage({ type: 'error', text: error?.message || 'İşlem başarısız' })
        } finally {
            setAdminFormLoading(false)
        }
    }

    // Handle delete admin
    const handleDeleteAdmin = async (id: number) => {
        if (!confirm('Bu admin kullanıcıyı silmek istediğinizden emin misiniz?')) {
            return
        }

        try {
            const response = await api.delete<ApiResponse<any>>(`/admin/users/${id}`)
            if (response.success) {
                alert('Admin kullanıcı silindi')
                await loadAdminUsers()
            } else {
                alert(response.message || 'Admin kullanıcı silinemedi')
            }
        } catch (error: any) {
            alert(error?.message || 'Admin kullanıcı silinemedi')
        }
    }

    // Handle edit admin
    const handleEditAdmin = (admin: any) => {
        setEditingAdmin(admin)
        setAdminFormData({
            name: admin.name,
            email: admin.email,
            password: '',
            role: admin.role,
            isActive: admin.status === 'Aktif',
            permissions: admin.permissions || []
        })
        setShowEditAdminModal(true)
        setAdminFormMessage(null)
    }

    // Reset admin form
    const resetAdminForm = () => {
        setAdminFormData({
            name: '',
            email: '',
            password: '',
            role: 'admin',
            isActive: true,
            permissions: []
        })
        setAdminFormMessage(null)
        setEditingAdmin(null)
    }

    // Toggle permission
    const togglePermission = (permission: string) => {
        if (permission === 'all') {
            if (adminFormData.permissions.includes('all')) {
                setAdminFormData({ ...adminFormData, permissions: [] })
            } else {
                setAdminFormData({ ...adminFormData, permissions: ['all'] })
            }
        } else {
            const newPermissions = adminFormData.permissions.includes(permission)
                ? adminFormData.permissions.filter(p => p !== permission && p !== 'all')
                : [...adminFormData.permissions.filter(p => p !== 'all'), permission]
            setAdminFormData({ ...adminFormData, permissions: newPermissions })
        }
    }

    // Update profile
    const handleUpdateProfile = async () => {
        if (!profileData.name || !profileData.email) {
            setProfileMessage({ type: 'error', text: 'Ad ve e-posta alanları zorunludur' })
            return
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(profileData.email)) {
            setProfileMessage({ type: 'error', text: 'Geçerli bir e-posta adresi girin' })
            return
        }

        setProfileLoading(true)
        setProfileMessage(null)
        try {
            const response = await api.put<ApiResponse<any>>('/admin/profile', {
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone
            })
            if (response.success) {
                setProfileMessage({ type: 'success', text: 'Profil başarıyla güncellendi' })
            } else {
                setProfileMessage({ type: 'error', text: response.message || 'Profil güncellenemedi' })
            }
        } catch (error: any) {
            setProfileMessage({ type: 'error', text: error?.message || 'Profil güncellenemedi' })
        } finally {
            setProfileLoading(false)
        }
    }

    // Change password
    const handleChangePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            setProfileMessage({ type: 'error', text: 'Mevcut ve yeni şifre alanları zorunludur' })
            return
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setProfileMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor' })
            return
        }

        if (passwordData.newPassword.length < 6) {
            setProfileMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır' })
            return
        }

        setPasswordLoading(true)
        setProfileMessage(null)
        try {
            const response = await api.post<ApiResponse<any>>('/admin/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            })
            if (response.success) {
                setProfileMessage({ type: 'success', text: 'Şifre başarıyla değiştirildi' })
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                setProfileMessage({ type: 'error', text: response.message || 'Şifre değiştirilemedi' })
            }
        } catch (error: any) {
            setProfileMessage({ type: 'error', text: error?.message || 'Şifre değiştirilemedi' })
        } finally {
            setPasswordLoading(false)
        }
    }

    const tabs = [
        { id: 'profile', label: 'Profil Bilgileri', icon: User },
        { id: 'admin-users', label: 'Admin Kullanıcılar', icon: Shield },
        { id: 'notifications', label: 'Bildirimler', icon: Bell },
        { id: 'security', label: 'Güvenlik', icon: Lock },
        { id: 'appearance', label: 'Görünüm', icon: Palette },
        { id: 'ai-insights-settings', label: 'AI İçgörüleri', icon: Brain },
        { id: 'system', label: 'Sistem', icon: Database },
    ]

    const saveSettings = () => {
        alert('Ayarlar başarıyla kaydedildi!')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                        Ayarlar
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Sistem ve hesap ayarlarınızı yönetin</p>
                </div>
                <button
                    onClick={saveSettings}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-shadow"
                >
                    <Save className="w-5 h-5" />
                    <span>Değişiklikleri Kaydet</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-4 space-y-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white shadow-lg'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
                        {/* Profil Bilgileri */}
                        {activeTab === 'profile' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Profil Bilgileri</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Kişisel bilgilerinizi güncelleyin</p>
                                </div>

                                <div className="flex items-center space-x-6 mb-6">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {profileData.avatar || '👤'}
                                    </div>
                                    <div>
                                        <button className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors text-sm font-medium">
                                            Fotoğraf Değiştir
                                        </button>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">JPG, PNG veya GIF (Max. 2MB)</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Ad Soyad
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Telefon
                                        </label>
                                        <input
                                            type="tel"
                                            value={profileData.phone}
                                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Rol
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.role}
                                            placeholder="Belirtilmemiş"
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* Success/Error Messages */}
                                {profileMessage && (
                                    <div className={`p-4 rounded-xl ${
                                        profileMessage.type === 'success' 
                                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
                                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                                    }`}>
                                        {profileMessage.text}
                                    </div>
                                )}

                                {/* Save Profile Button */}
                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={profileLoading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        {profileLoading ? 'Kaydediliyor...' : 'Profil Bilgilerini Kaydet'}
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Şifre Değiştir</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Mevcut Şifre
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Yeni Şifre
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Yeni Şifre (Tekrar)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleChangePassword}
                                            disabled={passwordLoading}
                                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                            {passwordLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Admin Kullanıcılar */}
                        {activeTab === 'admin-users' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Admin Kullanıcı Yönetimi</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Sistem yöneticilerini ve yetkilerini yönetin</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            resetAdminForm()
                                            setShowAddAdminModal(true)
                                        }}
                                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white rounded-xl hover:shadow-lg transition-shadow"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        <span>Yeni Admin Ekle</span>
                                    </button>
                                </div>

                                {adminUsers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                            <p className="text-sm text-blue-600 mb-1">Toplam Admin</p>
                                            <p className="text-3xl font-bold text-blue-700">{adminUsers.length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                            <p className="text-sm text-green-600 mb-1">Aktif</p>
                                            <p className="text-3xl font-bold text-green-700">{adminUsers.filter(u => u.status === 'Aktif').length}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                                            <p className="text-sm text-red-600 mb-1">Pasif</p>
                                            <p className="text-3xl font-bold text-red-700">{adminUsers.filter(u => u.status === 'Pasif').length}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm">Henüz admin kullanıcı bulunmuyor.</div>
                                )}

                                {adminUsers.length > 0 ? (
                                    <div className="space-y-4">
                                        {adminUsers.map((admin, index) => (
                                            <motion.div
                                                key={admin.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-center justify-between gap-6 flex-wrap">
                                                    <div className="flex items-center space-x-4 flex-1">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                                            {admin.name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">{admin.name}</h4>
                                                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${admin.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {admin.status === 'Aktif' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                                                                    {admin.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 mb-2">{admin.email}</p>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                                                                    {admin.role}
                                                                </span>
                                                                <span>Son Giriş: {admin.lastLogin}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Yetkiler</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {admin.permissions.length > 0 ? (
                                                                    admin.permissions.map((perm, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                                                            {availablePermissions.find(p => p.key === perm)?.label || perm}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">Yetki tanımlanmamış</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleEditAdmin(admin)}
                                                                className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                                title="Düzenle"
                                                            >
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteAdmin(admin.id)}
                                                                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                                title="Sil"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-600 dark:text-slate-400">Listelenecek admin bulunamadı.</div>
                                )}

                                {/* Yeni Admin Ekleme Modal */}
                                <AnimatePresence>
                                    {showAddAdminModal && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                            onClick={() => {
                                                setShowAddAdminModal(false)
                                                setShowEditAdminModal(false)
                                                resetAdminForm()
                                            }}
                                        >
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.9, opacity: 0 }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full"
                                            >
                                                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                                        {editingAdmin ? 'Admin Kullanıcı Düzenle' : 'Yeni Admin Kullanıcı Ekle'}
                                                    </h3>
                                                    <button
                                                        onClick={() => {
                                                            setShowAddAdminModal(false)
                                                            setShowEditAdminModal(false)
                                                            resetAdminForm()
                                                        }}
                                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                                                    </button>
                                                </div>

                                                <div className="p-6 space-y-4">
                                                    {adminFormMessage && (
                                                        <div className={`p-4 rounded-xl ${
                                                            adminFormMessage.type === 'success' 
                                                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
                                                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                                                        }`}>
                                                            {adminFormMessage.text}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ad Soyad</label>
                                                            <input 
                                                                type="text" 
                                                                value={adminFormData.name}
                                                                onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300" 
                                                                placeholder="Ahmet Yılmaz" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">E-posta</label>
                                                            <input 
                                                                type="email" 
                                                                value={adminFormData.email}
                                                                onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300" 
                                                                placeholder="admin@example.com" 
                                                            />
                                                        </div>
                                                        {!editingAdmin && (
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Şifre</label>
                                                                <input 
                                                                    type="password" 
                                                                    value={adminFormData.password}
                                                                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                                                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300" 
                                                                    placeholder="••••••••" 
                                                                />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rol</label>
                                                            <select 
                                                                value={adminFormData.role}
                                                                onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value })}
                                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                                                            >
                                                                <option value="admin">Admin</option>
                                                                <option value="superadmin">Super Admin</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Durum</label>
                                                            <select 
                                                                value={adminFormData.isActive ? 'Aktif' : 'Pasif'}
                                                                onChange={(e) => setAdminFormData({ ...adminFormData, isActive: e.target.value === 'Aktif' })}
                                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                                                            >
                                                                <option value="Aktif">Aktif</option>
                                                                <option value="Pasif">Pasif</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Yetkiler</label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {availablePermissions.map((perm) => (
                                                                <label key={perm.key} className="flex items-center space-x-2 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={adminFormData.permissions.includes(perm.key)}
                                                                        onChange={() => togglePermission(perm.key)}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" 
                                                                    />
                                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{perm.label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex space-x-3 pt-4">
                                                        <button 
                                                            onClick={handleAddAdmin}
                                                            disabled={adminFormLoading}
                                                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {adminFormLoading ? 'Kaydediliyor...' : (editingAdmin ? 'Güncelle' : 'Admin Ekle')}
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setShowAddAdminModal(false)
                                                                setShowEditAdminModal(false)
                                                                resetAdminForm()
                                                            }}
                                                            className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                                                        >
                                                            İptal
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Bildirimler */}
                        {activeTab === 'notifications' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Bildirim Ayarları</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Hangi bildirimleri almak istediğinizi seçin</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">Email Bildirimleri</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Seçili değil</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.emailNotifications}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">SMS Bildirimleri</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Seçili değil</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.smsNotifications}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">Push Bildirimleri</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Seçili değil</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.pushNotifications}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Bildirim Tercihleri</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.orderUpdates}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, orderUpdates: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Sipariş güncellemeleri</span>
                                        </label>
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.marketingEmails}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, marketingEmails: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Pazarlama emailları</span>
                                        </label>
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.securityAlerts}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, securityAlerts: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Güvenlik uyarıları</span>
                                        </label>
                                        <label className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings.weeklyReports}
                                                onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReports: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700">Haftalık raporlar</span>
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Güvenlik */}
                        {activeTab === 'security' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Güvenlik Ayarları</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Hesabınızın güvenliğini artırın</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">İki Faktörlü Doğrulama</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Ekstra güvenlik katmanı ekleyin</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.twoFactorAuth}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">Giriş Uyarıları</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Yeni giriş yapıldığında bildirim alın</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.loginAlerts}
                                                onChange={(e) => setSecuritySettings({ ...securitySettings, loginAlerts: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Oturum Zaman Aşımı (dakika)
                                        </label>
                                        <select
                                            value={securitySettings.sessionTimeout}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-300"
                                        >
                                            <option value="15">15 dakika</option>
                                            <option value="30">30 dakika</option>
                                            <option value="60">1 saat</option>
                                            <option value="120">2 saat</option>
                                        </select>
                                    </div>
                                </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Aktif Oturumlar</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Oturum bilgisi bulunmuyor.</p>
                                    </div>
                            </motion.div>
                        )}

                        {/* Görünüm */}
                        {activeTab === 'appearance' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Görünüm Ayarları</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Arayüz tercihlerinizi özelleştirin</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-3">
                                            Tema
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <button
                                                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'light' })}
                                                className={`p-4 border-2 rounded-xl transition-all ${appearanceSettings.theme === 'light'
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="w-full h-20 bg-white dark:bg-slate-800 rounded-lg mb-2 border border-slate-200 dark:border-slate-700"></div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Açık</p>
                                            </button>
                                            <button
                                                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'dark' })}
                                                className={`p-4 border-2 rounded-xl transition-all ${appearanceSettings.theme === 'dark'
                                                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className="w-full h-20 bg-slate-800 rounded-lg mb-2"></div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Koyu</p>
                                            </button>
                                            <button
                                                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: 'auto' })}
                                                className={`p-4 border-2 rounded-xl transition-all ${appearanceSettings.theme === 'auto'
                                                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className="w-full h-20 bg-gradient-to-r from-white to-slate-800 rounded-lg mb-2"></div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Otomatik</p>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Dil
                                        </label>
                                        <select
                                            value={appearanceSettings.language}
                                            onChange={(e) => setAppearanceSettings({ ...appearanceSettings, language: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="tr">Türkçe</option>
                                            <option value="en">English</option>
                                            <option value="de">Deutsch</option>
                                            <option value="fr">Français</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Tarih Formatı
                                            </label>
                                            <select
                                                value={appearanceSettings.dateFormat}
                                                onChange={(e) => setAppearanceSettings({ ...appearanceSettings, dateFormat: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                            >
                                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Para Birimi
                                            </label>
                                            <select
                                                value={appearanceSettings.currency}
                                                onChange={(e) => setAppearanceSettings({ ...appearanceSettings, currency: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                            >
                                                <option value="TRY">₺ TRY</option>
                                                <option value="USD">$ USD</option>
                                                <option value="EUR">€ EUR</option>
                                                <option value="GBP">£ GBP</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Saat Dilimi
                                        </label>
                                        <select
                                            value={appearanceSettings.timezone}
                                            onChange={(e) => setAppearanceSettings({ ...appearanceSettings, timezone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                                            <option value="Europe/London">Londra (GMT+0)</option>
                                            <option value="America/New_York">New York (GMT-5)</option>
                                            <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Sistem */}
                        {activeTab === 'system' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Sistem Ayarları</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Sistem ve veritabanı ayarları</p>
                                </div>

                                {/* Bakım Modu */}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <Wrench className={`w-6 h-6 ${(maintenanceMode.webEnabled || maintenanceMode.mobileEnabled) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                            <div>
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-100">Bakım Modu</h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Web ve mobil uygulamayı bakım moduna al</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Web Bakım Modu */}
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg mb-3">
                                        <div className="flex items-center space-x-3">
                                            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">Web Sitesi</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Web sitesini bakım moduna al</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={maintenanceMode.webEnabled}
                                                onChange={toggleWebMaintenance}
                                                disabled={maintenanceLoading}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600 dark:peer-checked:bg-amber-500"></div>
                                        </label>
                                    </div>

                                    {/* Mobil Bakım Modu */}
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg mb-4">
                                        <div className="flex items-center space-x-3">
                                            <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-100">Mobil Uygulama</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Mobil uygulamayı bakım moduna al</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={maintenanceMode.mobileEnabled}
                                                onChange={toggleMobileMaintenance}
                                                disabled={maintenanceLoading}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600 dark:peer-checked:bg-amber-500"></div>
                                        </label>
                                    </div>

                                    {(maintenanceMode.webEnabled || maintenanceMode.mobileEnabled) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-4 mt-4 pt-4 border-t border-amber-200 dark:border-amber-800"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Bakım Mesajı
                                                </label>
                                                <textarea
                                                    value={maintenanceMode.message}
                                                    onChange={(e) => setMaintenanceMode({ ...maintenanceMode, message: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
                                                    rows={3}
                                                    placeholder="Sistem bakımda. Lütfen daha sonra tekrar deneyin."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Tahmini Bitiş Zamanı (Opsiyonel)
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={maintenanceMode.estimatedEndTime}
                                                    onChange={(e) => setMaintenanceMode({ ...maintenanceMode, estimatedEndTime: e.target.value })}
                                                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={updateMaintenanceMessage}
                                                    disabled={maintenanceLoading}
                                                    className="px-4 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors disabled:opacity-50 text-sm font-medium"
                                                >
                                                    {maintenanceLoading ? 'Kaydediliyor...' : 'Mesajı Güncelle'}
                                                </button>
                                                {maintenanceMessage && (
                                                    <span className="text-sm text-slate-600 dark:text-slate-400">{maintenanceMessage}</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {(maintenanceMode.webEnabled || maintenanceMode.mobileEnabled) && (
                                        <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                ⚠️ Bakım modu aktif: {maintenanceMode.webEnabled && 'Web'} {maintenanceMode.webEnabled && maintenanceMode.mobileEnabled && 've'} {maintenanceMode.mobileEnabled && 'Mobil'} kullanıcıları bakım ekranını görecek.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                        <Database className="w-8 h-8 text-slate-700 dark:text-slate-400 mb-3" />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Veritabanı</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Durum bilgisi bulunmuyor.</p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                        <Globe className="w-8 h-8 text-slate-700 dark:text-slate-400 mb-3" />
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">API Durumu</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Durum bilgisi bulunmuyor.</p>
                                    </div>
                                </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Sistem Bilgileri</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Versiyon</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100">-</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Son Güncelleme</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100">-</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">Sunucu Durumu</span>
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium">Bilinmiyor</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Yönetici Logları (giriş kodu: 8466) */}
                                <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Yönetici Logları</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Admin giriş denemeleri (salt okunur)</p>
                                        </div>
                                    </div>
                                    {!adminLogsAccess ? (
                                        <div className="p-6">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Giriş Kodu</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="password"
                                                    value={adminLogsCode}
                                                    onChange={(e)=> setAdminLogsCode(e.target.value)}
                                                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300"
                                                    placeholder="••••"
                                                />
                                                <button
                                                    onClick={()=>{
                                                        if (adminLogsCode === '8466') {
                                                            setAdminLogsAccess(true)
                                                            loadAdminLogs()
                                                        }
                                                    }}
                                                    className="px-4 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600"
                                                >Giriş</button>
                                            </div>
                                            {adminLogsCode && adminLogsCode !== '8466' && (
                                                <p className="text-sm text-red-600 dark:text-red-400 mt-2">Geçersiz kod</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-0">
                                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                                                <div>
                                                    Son 30 gün · {adminLogsLoading ? 'Yükleniyor...' : `${adminLogs.length} kayıt`}
                                                </div>
                                                <button onClick={loadAdminLogs} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300">Yenile</button>
                                            </div>
                                            {adminLogsError && (
                                                <div className="p-4 text-sm text-red-600 dark:text-red-400">{adminLogsError}</div>
                                            )}
                                            <div className="max-h-80 overflow-auto">
                                                {adminLogs.length === 0 && !adminLogsLoading ? (
                                                    <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Kayıt bulunamadı.</div>
                                                ) : (
                                                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {adminLogs.map((l:any)=> (
                                                            <li key={l.id} className="p-4 text-sm">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="font-medium text-slate-800 dark:text-slate-100">{l.username || '—'}</div>
                                                                    <div className={`text-xs px-2 py-0.5 rounded ${l.severity==='high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{l.eventType}</div>
                                                                </div>
                                                                <div className="mt-1 text-slate-600 dark:text-slate-400">IP: {l.ip || '—'}</div>
                                                                <div className="mt-1 text-slate-500 dark:text-slate-400 text-xs">{l.timestamp}</div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                                    <h4 className="font-semibold text-red-800 dark:text-red-400 mb-2">Tehlikeli Bölge</h4>
                                    <p className="text-sm text-red-700 dark:text-red-400 mb-4">Bu işlemler geri alınamaz</p>
                                    <div className="space-y-3">
                                            <div className="text-sm text-red-700 dark:text-red-400">Aksiyonlar yapılandırılmadı.</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* AI İçgörüleri Ayarları */}
                        {activeTab === 'ai-insights-settings' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">AI İçgörüleri</h3>
                                        <p className="text-slate-500 text-sm">AI içgörüleri özelliği kaldırıldı. Sadece Ollama desteklenmektedir.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-sm text-slate-700">
                                            <span>Aktif</span>
                                            <input
                                                type="checkbox"
                                                checked={aiConfig.enabled}
                                                onChange={(e)=> setAiConfig({ ...aiConfig, enabled: e.target.checked })}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 dark:bg-slate-900">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        ChatGPT, Claude, Gemini ve AnythingLLM entegrasyonları kaldırıldı. Sadece Ollama desteklenmektedir.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        
                    </div>
                </div>
            </div>
        </div>
    )
}
