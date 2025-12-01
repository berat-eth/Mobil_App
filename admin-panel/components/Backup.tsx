'use client'

import { useEffect, useState } from 'react'
import { Download, Upload, Database, Clock, CheckCircle, AlertTriangle, HardDrive, Cloud, RefreshCw, Trash2, Calendar, X, Save, FileText, FileCode, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface BackupItem {
  id: number
  name: string
  date: string
  size: string
  type: 'auto' | 'manual'
  status: 'completed' | 'in-progress' | 'failed'
  format: 'json' | 'sql'
  fileType: string
}

const BACKUP_PASSWORD = 'Hk@145362..'

export default function Backup() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [backups, setBackups] = useState<BackupItem[]>([])

  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [backupFrequency, setBackupFrequency] = useState('daily')
  const [showFtpModal, setShowFtpModal] = useState(false)
  const [backupFormat, setBackupFormat] = useState<'json' | 'sql'>('json')
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [ftpData, setFtpData] = useState({
    host: '',
    port: '21',
    username: '',
    password: '',
    directory: '/backups'
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    if (password === BACKUP_PASSWORD) {
      setIsAuthenticated(true)
      setPassword('')
    } else {
      setPasswordError('Hatalı şifre! Lütfen tekrar deneyin.')
      setPassword('')
    }
  }

  const reloadBackups = async () => {
    // Sunucuda list endpoint yoksa, tek "son oluşturulan" yedeği lokal listede tutarız
    // Gelecekte /admin/backups gibi bir uç nokta eklendiğinde burası güncellenebilir
  }

  const handleCreateBackup = async (format: 'json' | 'sql' = backupFormat) => {
    try {
      setIsCreatingBackup(true)
      
      if (format === 'sql') {
        // SQL yedek oluştur
        const res = await api.get<any>('/admin/backup/sql')
        if (res && typeof window !== 'undefined') {
          const sqlString = res.sql || res.data || '-- SQL Backup\n-- No data available'
          const blob = new Blob([sqlString], { type: 'application/sql;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          a.href = url
          a.download = `backup-${timestamp}.sql`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          const sizeKb = Math.max(1, Math.round(sqlString.length / 1024))
          const item: BackupItem = {
            id: Date.now(),
            name: `SQL Yedek - ${new Date().toLocaleDateString('tr-TR')}`,
            date: new Date().toLocaleString('tr-TR'),
            size: `${sizeKb} KB`,
            type: 'manual',
            status: 'completed',
            format: 'sql',
            fileType: 'SQL Database'
          }
          setBackups([item, ...backups])
        }
      } else {
        // JSON yedek oluştur
        const res = await api.get<any>('/admin/backup')
        if (res && typeof window !== 'undefined') {
          const jsonString = JSON.stringify(res, null, 2)
          const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          a.href = url
          a.download = `backup-${timestamp}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          const sizeKb = Math.max(1, Math.round(jsonString.length / 1024))
          const item: BackupItem = {
            id: Date.now(),
            name: `JSON Yedek - ${new Date().toLocaleDateString('tr-TR')}`,
            date: new Date().toLocaleString('tr-TR'),
            size: `${sizeKb} KB`,
            type: 'manual',
            status: 'completed',
            format: 'json',
            fileType: 'JSON Data'
          }
          setBackups([item, ...backups])
        }
      }
    } catch (e:any) {
      alert(e?.message || 'Yedek oluşturulamadı')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleDownload = async (backup: BackupItem) => {
    try {
      if (backup.format === 'sql') {
        const res = await api.get<any>('/admin/backup/sql')
        if (res && typeof window !== 'undefined') {
          const sqlString = res.sql || res.data || '-- SQL Backup\n-- No data available'
          const blob = new Blob([sqlString], { type: 'application/sql;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const safeName = backup?.name?.replace(/\s+/g, '-').toLowerCase() || 'backup'
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          a.href = url
          a.download = `${safeName}-${timestamp}.sql`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      } else {
        const res = await api.get<any>('/admin/backup')
        if (res && typeof window !== 'undefined') {
          const jsonString = JSON.stringify(res, null, 2)
          const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const safeName = backup?.name?.replace(/\s+/g, '-').toLowerCase() || 'backup'
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          a.href = url
          a.download = `${safeName}-${timestamp}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }
    } catch (e:any) {
      alert(e?.message || 'İndirme başarısız')
    }
  }

  const handleRestore = async (backup: BackupItem) => {
    if (!confirm(`${backup.name} geri yüklensin mi? Bu işlem mevcut verilerin üzerine yazacaktır.`)) return
    try {
      // Not: Geri yükleme çok riskli; backend tarafında /api/admin/restore POST mevcut (kısmi kesik)
      // Örnek payload: { data: { ... } } – gerçek senaryoda dosya içeriği gönderilmeli
      await api.post<any>('/admin/restore', { data: {} })
      alert('Geri yükleme isteği gönderildi')
    } catch (e:any) {
      alert(e?.message || 'Geri yükleme başarısız')
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('Bu yedeği silmek istediğinizden emin misiniz?')) {
      setBackups(backups.filter(b => b.id !== id))
    }
  }

  useEffect(()=>{ reloadBackups() }, [])

  // Şifre koruması - sayfa içeriğini göster
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700"
        >
          <div className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
              Veri Yedekleme
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
              Bu sayfaya erişmek için şifre gereklidir
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                  placeholder="Şifrenizi girin"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow"
              >
                Giriş Yap
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Veri Yedekleme</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Verilerinizi yedekleyin ve geri yükleyin</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFormatModal(true)}
            disabled={isCreatingBackup}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            {isCreatingBackup ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Yedekleniyor...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Yeni Yedek Oluştur
              </>
            )}
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Format:</span>
            <select
              value={backupFormat}
              onChange={(e) => setBackupFormat(e.target.value as 'json' | 'sql')}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            >
              <option value="json">JSON</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 card-hover border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Toplam Yedek</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{backups.length}</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 card-hover border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Toplam Boyut</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">9.5 GB</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 card-hover border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Son Yedek</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">2 gün önce</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5 card-hover border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Bulut Depolama</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">45%</p>
        </div>
      </div>

      {/* FTP Settings */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">FTP Sunucu Ayarları</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                FTP Sunucu Adresi *
              </label>
              <input
                type="text"
                placeholder="ftp.example.com"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Port
              </label>
              <input
                type="number"
                placeholder="21"
                defaultValue="21"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                placeholder="username"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Şifre *
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Uzak Dizin
            </label>
            <input
              type="text"
              placeholder="/backups"
              defaultValue="/backups"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">Otomatik FTP Yedekleme</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Her yedekten sonra FTP'ye gönder</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium">
              Bağlantıyı Test Et
            </button>
            <button className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:shadow-lg transition-shadow font-medium">
              Kaydet ve Gönder
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Güvenlik Notu:</p>
                <p>FTP bağlantı bilgileri şifrelenmiş olarak saklanır. SFTP kullanmanızı öneririz.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Otomatik Yedekleme Ayarları</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">Otomatik Yedekleme</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Düzenli aralıklarla otomatik yedek al</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Yedekleme Sıklığı
              </label>
              <select
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
                disabled={!autoBackup}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 dark:text-slate-100"
              >
                <option value="hourly">Her Saat</option>
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Yedekleme Konumu
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-600 transition-colors bg-white dark:bg-slate-800">
                  <input type="radio" name="location" defaultChecked className="w-4 h-4 text-blue-600" />
                  <Cloud className="w-5 h-5 mx-3 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Bulut Depolama</span>
                </label>
                <label className="flex items-center p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-600 transition-colors bg-white dark:bg-slate-800">
                  <input type="radio" name="location" className="w-4 h-4 text-blue-600" />
                  <HardDrive className="w-5 h-5 mx-3 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Yerel Sunucu</span>
                </label>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium">
              Ayarları Kaydet
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Hızlı İşlemler</h3>
          
          <div className="space-y-4">
            <button onClick={() => handleCreateBackup('json')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">JSON Yedek</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Tüm verileri JSON formatında</p>
                </div>
              </div>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">→</span>
            </button>

            <button onClick={() => handleCreateBackup('sql')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">SQL Yedek</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Veritabanını SQL formatında</p>
                </div>
              </div>
              <span className="text-green-600 dark:text-green-400 font-semibold">→</span>
            </button>

            <button 
              onClick={() => setShowFtpModal(true)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">FTP'ye Gönder</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Yedeği uzak sunucuya aktar</p>
                </div>
              </div>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">→</span>
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-all">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Zamanlanmış Yedek</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Belirli tarihte yedek al</p>
                </div>
              </div>
              <span className="text-orange-600 dark:text-orange-400 font-semibold">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Yedek Geçmişi</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Yedek Adı</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Format</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Boyut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {backups.map((backup, index) => (
                <motion.tr
                  key={backup.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {backup.format === 'sql' ? (
                        <FileCode className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{backup.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      backup.format === 'sql' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      {backup.format === 'sql' ? 'SQL' : 'JSON'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{backup.date}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{backup.size}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      backup.type === 'auto' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}>
                      {backup.type === 'auto' ? 'Otomatik' : 'Manuel'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium ${
                      backup.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      backup.status === 'in-progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {backup.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {backup.status === 'in-progress' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {backup.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                      <span>
                        {backup.status === 'completed' ? 'Tamamlandı' :
                         backup.status === 'in-progress' ? 'Devam Ediyor' : 'Başarısız'}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(backup)}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
                        title="İndir"
                      >
                        <Download className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleRestore(backup)}
                        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors group"
                        title="Geri Yükle"
                      >
                        <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-green-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                        title="Sil"
                      >
                        <Trash2 className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Format Selection Modal */}
      <AnimatePresence>
        {showFormatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFormatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Yedek Formatı Seç</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Hangi formatta yedek almak istiyorsunuz?</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <button
                  onClick={() => {
                    setBackupFormat('json')
                    setShowFormatModal(false)
                    handleCreateBackup('json')
                  }}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">JSON Format</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Tüm verileri JSON formatında yedekle</p>
                    </div>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">→</span>
                </button>

                <button
                  onClick={() => {
                    setBackupFormat('sql')
                    setShowFormatModal(false)
                    handleCreateBackup('sql')
                  }}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border border-green-200 dark:border-green-800 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <FileCode className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">SQL Format</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Veritabanını SQL formatında yedekle</p>
                    </div>
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-semibold">→</span>
                </button>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">Format Farkları:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>JSON:</strong> Tüm uygulama verileri (kullanıcılar, ürünler, ayarlar)</li>
                        <li>• <strong>SQL:</strong> Sadece veritabanı yapısı ve verileri</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FTP Modal */}
      <AnimatePresence>
        {showFtpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFtpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">FTP Sunucuya Gönder</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Yedeği uzak sunucuya aktarın</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFtpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Gönderilecek Yedek
                  </label>
                  <select className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100">
                    {backups.map(backup => (
                      <option key={backup.id} value={backup.id}>
                        {backup.name} - {backup.size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      FTP Sunucu Adresi *
                    </label>
                    <input
                      type="text"
                      value={ftpData.host}
                      onChange={(e) => setFtpData({ ...ftpData, host: e.target.value })}
                      placeholder="ftp.example.com"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={ftpData.port}
                      onChange={(e) => setFtpData({ ...ftpData, port: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Kullanıcı Adı *
                    </label>
                    <input
                      type="text"
                      value={ftpData.username}
                      onChange={(e) => setFtpData({ ...ftpData, username: e.target.value })}
                      placeholder="username"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Şifre *
                    </label>
                    <input
                      type="password"
                      value={ftpData.password}
                      onChange={(e) => setFtpData({ ...ftpData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Uzak Dizin
                  </label>
                  <input
                    type="text"
                    value={ftpData.directory}
                    onChange={(e) => setFtpData({ ...ftpData, directory: e.target.value })}
                    placeholder="/backups"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">Protokol Seçenekleri:</p>
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                          <input type="radio" name="protocol" defaultChecked className="text-blue-600" />
                          <span>FTP (Port 21)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                          <input type="radio" name="protocol" className="text-blue-600" />
                          <span>SFTP (Port 22) - Önerilen</span>
                        </label>
                        <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                          <input type="radio" name="protocol" className="text-blue-600" />
                          <span>FTPS (Port 990)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    onClick={async () => {
                      try {
                        const resp = await api.post<any>('/admin/ftp-backup/test', {
                          host: ftpData.host,
                          port: Number(ftpData.port) || 21,
                          user: ftpData.username,
                          password: ftpData.password,
                          remoteDir: ftpData.directory
                        })
                        if ((resp as any)?.success) alert('Bağlantı başarılı'); else alert((resp as any)?.message || 'Bağlantı başarısız')
                      } catch (e:any) {
                        alert(e?.message || 'Bağlantı testi başarısız')
                      }
                    }}
                    className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    Bağlantıyı Test Et
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Config'i kaydet
                        await api.post<any>('/admin/ftp-backup/config', {
                          enabled: true,
                          host: ftpData.host,
                          port: Number(ftpData.port) || 21,
                          user: ftpData.username,
                          password: ftpData.password,
                          remoteDir: ftpData.directory
                        })
                        // Çalıştır
                        const run = await api.post<any>('/admin/ftp-backup/run', {
                          host: ftpData.host,
                          port: Number(ftpData.port) || 21,
                          user: ftpData.username,
                          password: ftpData.password,
                          remoteDir: ftpData.directory
                        })
                        if ((run as any)?.success) alert('Yedek FTP\'ye gönderildi'); else alert((run as any)?.message || 'Gönderim başarısız')
                        setShowFtpModal(false)
                      } catch (e:any) {
                        alert(e?.message || 'Gönderim yapılamadı')
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Gönder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
