'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Users, TrendingUp, Target, CheckCircle2, Clock, X, Plus, Search, Filter, 
  Mail, Phone, Calendar, MapPin, Building2, DollarSign, ArrowRight, 
  Edit, Trash2, Eye, ArrowUpDown, MoreVertical, FileText, MessageSquare,
  Briefcase, UserPlus, Activity as ActivityIcon, BarChart3, PieChart, Zap, AlertCircle,
  Star, RefreshCw, Download, ChevronRight, ChevronLeft, Save, Tag
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDDMMYYYY } from '@/lib/date'
import { crmService, type Lead, type Opportunity, type Task, type Activity, type Contact, type CRMStats } from '@/lib/services/crmService'
import { api } from '@/lib/api'
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import { useTheme } from '@/lib/ThemeContext'

type ViewMode = 'dashboard' | 'leads' | 'opportunities' | 'tasks' | 'contacts' | 'pipeline' | 'kanban' | 'reports' | 'google-maps'

export default function CRM() {
  const { theme } = useTheme()
  const [activeView, setActiveView] = useState<ViewMode>('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Kanban drag state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null)

  // Stats
  const [stats, setStats] = useState<CRMStats | null>(null)
  const [pipelineData, setPipelineData] = useState<Array<{ stage: string; count: number; value: number }>>([])

  // Data
  const [leads, setLeads] = useState<Lead[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [googleMapsData, setGoogleMapsData] = useState<any[]>([])
  const [googleMapsTotal, setGoogleMapsTotal] = useState(0)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [googleMapsSearchQuery, setGoogleMapsSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Lead | Opportunity | Task | Contact | null>(null)

  // Form states
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({})
  const [opportunityForm, setOpportunityForm] = useState<Partial<Opportunity>>({})
  const [taskForm, setTaskForm] = useState<Partial<Task>>({})
  const [contactForm, setContactForm] = useState<Partial<Contact>>({})
  const [activityForm, setActivityForm] = useState<Partial<Activity>>({})

  // Load data
  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (activeView === 'leads') loadLeads()
    else if (activeView === 'opportunities') loadOpportunities()
    else if (activeView === 'tasks') loadTasks()
    else if (activeView === 'contacts') loadContacts()
    else if (activeView === 'pipeline') loadPipeline()
    else if (activeView === 'google-maps') loadGoogleMapsData()
  }, [activeView, filterStatus, currentPage])

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [statsRes, pipelineRes] = await Promise.all([
        crmService.getCRMStats().catch(() => ({ success: true, data: null })),
        crmService.getPipelineData().catch(() => ({ success: true, data: [] }))
      ])
      if ((statsRes as any)?.success) setStats((statsRes as any).data)
      if ((pipelineRes as any)?.success) setPipelineData((pipelineRes as any).data || [])
    } catch (err: any) {
      setError(err?.message || 'Veri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadLeads = async () => {
    try {
      setLoading(true)
      const response = await crmService.getLeads(currentPage, 20, filterStatus !== 'all' ? filterStatus : undefined)
      if ((response as any)?.success) {
        setLeads((response as any).data?.leads || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Leads yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadOpportunities = async () => {
    try {
      setLoading(true)
      const response = await crmService.getOpportunities(currentPage, 20, filterStatus !== 'all' ? filterStatus : undefined)
      if ((response as any)?.success) {
        setOpportunities((response as any).data?.opportunities || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Opportunities yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await crmService.getTasks(currentPage, 20, filterStatus !== 'all' ? filterStatus : undefined)
      if ((response as any)?.success) {
        setTasks((response as any).data?.tasks || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Tasks yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      setLoading(true)
      const response = await crmService.getContacts(currentPage, 20)
      if ((response as any)?.success) {
        setContacts((response as any).data?.contacts || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Contacts yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadPipeline = async () => {
    try {
      setLoading(true)
      const [oppsRes, pipelineRes] = await Promise.all([
        crmService.getOpportunities(1, 100),
        crmService.getPipelineData()
      ])
      if ((oppsRes as any)?.success) {
        setOpportunities((oppsRes as any).data?.opportunities || [])
      }
      if ((pipelineRes as any)?.success) {
        setPipelineData((pipelineRes as any).data || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Pipeline yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadGoogleMapsData = async (page = 1, search = '', searchTerm = '') => {
    try {
      setLoading(true)
      const res = await crmService.getGoogleMapsScrapedData(page, 50, search, searchTerm)
      if ((res as any)?.success) {
        setGoogleMapsData((res as any).data?.items || [])
        setGoogleMapsTotal((res as any).data?.total || 0)
      }
    } catch (err: any) {
      setError(err?.message || 'AI Müşteri Bulucu verileri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToLead = async (id: number) => {
    try {
      setLoading(true)
      await crmService.convertScrapedDataToLead(id)
      await loadGoogleMapsData()
      await loadLeads()
      alert('Lead başarıyla oluşturuldu!')
    } catch (err: any) {
      alert(err?.message || 'Lead oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteScrapedData = async (id: number) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return
    try {
      setLoading(true)
      await crmService.deleteScrapedData(id)
      await loadGoogleMapsData()
    } catch (err: any) {
      alert(err?.message || 'Kayıt silinemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLead = async () => {
    try {
      setLoading(true)
      await crmService.createLead(leadForm as any)
      setShowLeadModal(false)
      setLeadForm({})
      await loadLeads()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Lead oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLead = async (id: number) => {
    if (!confirm('Bu lead\'i silmek istediğinizden emin misiniz?')) return
    try {
      setLoading(true)
      await crmService.deleteLead(id)
      await loadLeads()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Lead silinemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTaskStatus = async (taskId: number, newStatus: Task['status']) => {
    try {
      await crmService.updateTask(taskId, { status: newStatus })
      await loadTasks()
    } catch (err: any) {
      alert(err?.message || 'Görev durumu güncellenemedi')
    }
  }

  const handleUpdateOpportunityStage = async (oppId: number, newStage: Opportunity['stage']) => {
    try {
      await crmService.updateOpportunity(oppId, { stage: newStage })
      await loadOpportunities()
      await loadPipeline()
    } catch (err: any) {
      alert(err?.message || 'Fırsat aşaması güncellenemedi')
    }
  }

  const handleCreateContact = async () => {
    try {
      setLoading(true)
      await crmService.createContact(contactForm as any)
      setShowContactModal(false)
      setContactForm({})
      await loadContacts()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Kişi oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateContact = async () => {
    if (!selectedItem || !('id' in selectedItem)) return
    try {
      setLoading(true)
      await crmService.updateContact((selectedItem as Contact).id, contactForm)
      setShowContactModal(false)
      setContactForm({})
      setSelectedItem(null)
      await loadContacts()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Kişi güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Bu kişiyi silmek istediğinizden emin misiniz?')) return
    try {
      setLoading(true)
      await crmService.deleteContact(id)
      await loadContacts()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Kişi silinemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOpportunity = async () => {
    try {
      setLoading(true)
      await crmService.createOpportunity(opportunityForm as any)
      setShowOpportunityModal(false)
      setOpportunityForm({})
      await loadOpportunities()
      await loadPipeline()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Opportunity oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOpportunity = async () => {
    if (!selectedItem || !('id' in selectedItem)) return
    try {
      setLoading(true)
      await crmService.updateOpportunity((selectedItem as Opportunity).id, opportunityForm)
      setShowOpportunityModal(false)
      setOpportunityForm({})
      setSelectedItem(null)
      await loadOpportunities()
      await loadPipeline()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Fırsat güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedItem || !('id' in selectedItem)) return
    try {
      setLoading(true)
      await crmService.updateTask((selectedItem as Task).id, taskForm)
      setShowTaskModal(false)
      setTaskForm({})
      setSelectedItem(null)
      await loadTasks()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Görev güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async () => {
    try {
      setLoading(true)
      await crmService.createTask(taskForm as any)
      setShowTaskModal(false)
      setTaskForm({})
      await loadTasks()
      await loadDashboard()
    } catch (err: any) {
      alert(err?.message || 'Task oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      qualified: 'bg-green-100 text-green-700 border-green-200',
      converted: 'bg-purple-100 text-purple-700 border-purple-200',
      lost: 'bg-red-100 text-red-700 border-red-200',
      pending: 'bg-orange-100 text-orange-700 border-orange-200',
      'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      'prospecting': 'bg-slate-100 text-slate-700 border-slate-200',
      'qualification': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'proposal': 'bg-blue-100 text-blue-700 border-blue-200',
      'negotiation': 'bg-purple-100 text-purple-700 border-purple-200',
      'closed-won': 'bg-green-100 text-green-700 border-green-200',
      'closed-lost': 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    }
    return colors[priority] || 'bg-slate-100 text-slate-700'
  }

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Toplam Leads</p>
              <p className="text-3xl font-bold mt-2">{stats?.totalLeads || 0}</p>
            </div>
            <UserPlus className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Aktif Fırsatlar</p>
              <p className="text-3xl font-bold mt-2">{stats?.totalOpportunities || 0}</p>
            </div>
            <Target className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Pipeline Değeri</p>
              <p className="text-3xl font-bold mt-2">₺{stats?.pipelineValue?.toLocaleString() || 0}</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Dönüşüm Oranı</p>
              <p className="text-3xl font-bold mt-2">%{stats?.conversionRate?.toFixed(1) || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>
      </div>

      {/* Pipeline Visualization */}
      {pipelineData.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-slate-200 dark:border-dark-border">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Sales Pipeline</h3>
          <div className="space-y-4">
            {pipelineData.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                  {stage.stage.replace('-', ' ')}
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-8 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stage.count / (stats?.totalOpportunities || 1)) * 100}%` }}
                    transition={{ delay: idx * 0.1 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {stage.count} fırsat • ₺{stage.value.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => { setShowLeadModal(true); setLeadForm({}) }}
          className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border hover:shadow-lg transition-shadow text-left group"
        >
          <UserPlus className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">Yeni Lead</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Potansiyel müşteri ekle</p>
        </button>

        <button
          onClick={() => { setShowOpportunityModal(true); setOpportunityForm({}) }}
          className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border hover:shadow-lg transition-shadow text-left group"
        >
          <Target className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">Yeni Fırsat</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Satış fırsatı oluştur</p>
        </button>

        <button
          onClick={() => { setShowTaskModal(true); setTaskForm({}) }}
          className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border hover:shadow-lg transition-shadow text-left group"
        >
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">Yeni Görev</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Takip görevi ekle</p>
        </button>
      </div>
    </div>
  )

  // Leads View
  const renderLeads = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Leads ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="new">Yeni</option>
            <option value="contacted">İletişime Geçildi</option>
            <option value="qualified">Nitelendirildi</option>
            <option value="converted">Dönüştürüldü</option>
            <option value="lost">Kaybedildi</option>
          </select>
        </div>
        <button
          onClick={() => { setShowLeadModal(true); setLeadForm({}) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Lead
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İsim</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İletişim</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kaynak</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Değer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</div>
                    {lead.company && <div className="text-sm text-slate-500 dark:text-slate-400">{lead.company}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600 dark:text-slate-300">{lead.email}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{lead.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                      {lead.status === 'new' && 'Yeni'}
                      {lead.status === 'contacted' && 'İletişimde'}
                      {lead.status === 'qualified' && 'Nitelendirildi'}
                      {lead.status === 'converted' && 'Dönüştürüldü'}
                      {lead.status === 'lost' && 'Kaybedildi'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{lead.source}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {lead.value ? `₺${lead.value.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedItem(lead); setLeadForm(lead); setShowLeadModal(true) }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Opportunities View (similar structure)
  const renderOpportunities = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Fırsatlar ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Tüm Aşamalar</option>
            <option value="prospecting">Keşif</option>
            <option value="qualification">Nitelendirme</option>
            <option value="proposal">Teklif</option>
            <option value="negotiation">Müzaker</option>
            <option value="closed-won">Kazanıldı</option>
            <option value="closed-lost">Kaybedildi</option>
          </select>
        </div>
        <button
          onClick={() => { setShowOpportunityModal(true); setOpportunityForm({}) }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Fırsat
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunities.map((opp) => (
          <motion.div
            key={opp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">{opp.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{opp.contactName}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(opp.stage)}`}>
                {opp.stage.replace('-', ' ')}
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Değer:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">₺{opp.value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Olasılık:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">%{opp.probability}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Beklenen Kapanış:</span>
                <span className="text-slate-900 dark:text-slate-100">{formatDDMMYYYY(opp.expectedCloseDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setSelectedItem(opp); setOpportunityForm(opp); setShowOpportunityModal(true) }}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                Düzenle
              </button>
              <button
                onClick={() => crmService.deleteOpportunity(opp.id).then(() => loadOpportunities())}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )

  // Tasks View (Kanban style)
  const renderTasks = () => {
    const groupedTasks = {
      pending: tasks.filter(t => t.status === 'pending'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      completed: tasks.filter(t => t.status === 'completed'),
      cancelled: tasks.filter(t => t.status === 'cancelled'),
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Görev Kanban</h3>
          <button
            onClick={() => { setShowTaskModal(true); setTaskForm({}) }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Görev
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <div key={status} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {status === 'pending' && 'Bekleyen'}
                  {status === 'in-progress' && 'Devam Eden'}
                  {status === 'completed' && 'Tamamlanan'}
                  {status === 'cancelled' && 'İptal Edilen'}
                </h4>
                <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold">
                  {statusTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {statusTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    drag
                    className="bg-white dark:bg-dark-card rounded-lg p-4 border border-slate-200 dark:border-dark-border cursor-move hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{task.title}</h5>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{task.description}</p>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {formatDDMMYYYY(task.dueDate)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Contacts View
  const renderContacts = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Kişiler ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={() => { setShowContactModal(true); setContactForm({}); setSelectedItem(null) }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Kişi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{contact.name}</h4>
                {contact.title && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{contact.title}</p>}
                {contact.company && (
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 mt-2">
                    <Building2 className="w-4 h-4" />
                    {contact.company}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Mail className="w-4 h-4" />
                  {contact.email}
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4" />
                  {contact.phone}
                </div>
              )}
              {contact.address && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{contact.address}</span>
                </div>
              )}
              {contact.city && (
                <div className="text-xs text-slate-500 dark:text-slate-400 ml-6">{contact.city}</div>
              )}
            </div>
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {contact.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setSelectedItem(contact); setContactForm(contact); setShowContactModal(true) }}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                Düzenle
              </button>
              <button
                onClick={() => handleDeleteContact(contact.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      {contacts.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Henüz kişi eklenmemiş</p>
        </div>
      )}
    </div>
  )

  // Google Maps Scraped Data View
  const renderGoogleMaps = () => {
    const handleSearchChange = (value: string) => {
      setGoogleMapsSearchQuery(value);
      
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Debounce search - wait 500ms after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        loadGoogleMapsData(1, value);
      }, 500);
    };

    const handleSearchSubmit = () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      loadGoogleMapsData(1, googleMapsSearchQuery);
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="İşletme ara..."
                value={googleMapsSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 transition-all"
              />
            </div>
            <button
              onClick={handleSearchSubmit}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              <Search className="w-4 h-4" />
              Ara
            </button>
          </div>
          <button
            onClick={() => {
              setGoogleMapsSearchQuery('');
              loadGoogleMapsData(1, '');
            }}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşletme Adı</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Telefon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Web Sitesi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Arama Terimi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kazıma Tarihi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {googleMapsData.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{item.businessName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {item.phoneNumber ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-300">{item.phoneNumber}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.website ? (
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {item.website}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{item.searchTerm || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {item.scrapedAt ? formatDDMMYYYY(new Date(item.scrapedAt)) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConvertToLead(item.id)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                        title="CRM Lead'e dönüştür"
                      >
                        Lead Yap
                      </button>
                      <button
                        onClick={() => handleDeleteScrapedData(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {googleMapsData.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Henüz AI Müşteri Bulucu verisi bulunmuyor</p>
          <p className="text-sm mt-2">AI Müşteri Bulucu'dan veri kazıyın</p>
        </div>
      )}
      {googleMapsTotal > 0 && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Toplam {googleMapsTotal} kayıt
        </div>
      )}
      </div>
    );
  };

  // Pipeline View
  const renderPipeline = () => {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost']
    const groupedOpps = stages.reduce((acc, stage) => {
      acc[stage] = opportunities.filter(o => o.stage === stage)
      return acc
    }, {} as Record<string, Opportunity[]>)

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Sales Pipeline</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fırsatları aşamalarına göre görüntüleyin</p>
          </div>
          <button
            onClick={() => { setShowOpportunityModal(true); setOpportunityForm({}); setSelectedItem(null) }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Fırsat
          </button>
        </div>

        {/* Pipeline Summary */}
        {pipelineData.length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-slate-200 dark:border-dark-border">
            <h4 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">Pipeline Özeti</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pipelineData.map((stage, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{stage.stage}</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stage.count}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">₺{stage.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {stages.map((stage) => {
            const stageOpps = groupedOpps[stage] || []
            const stageTotal = stageOpps.reduce((sum, o) => sum + o.value, 0)
            return (
              <div key={stage} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 min-w-[200px]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 capitalize">
                    {stage.replace('-', ' ')}
                  </h4>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs">
                    {stageOpps.length}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  ₺{stageTotal.toLocaleString()}
                </div>
                <div className="space-y-2">
                  {stageOpps.map((opp) => (
                    <motion.div
                      key={opp.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={() => {}}
                      className="bg-white dark:bg-dark-card rounded-lg p-3 border border-slate-200 dark:border-dark-border cursor-move hover:shadow-md"
                    >
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">{opp.name}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{opp.contactName}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          ₺{opp.value.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">%{opp.probability}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Kanban View (for Opportunities)
  const renderKanban = () => {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost']
    const groupedOpps = stages.reduce((acc, stage) => {
      acc[stage] = opportunities.filter(o => o.stage === stage)
      return acc
    }, {} as Record<string, Opportunity[]>)

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Kanban Görünümü</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fırsatları sürükle-bırak ile yönetin</p>
          </div>
          <button
            onClick={() => { setShowOpportunityModal(true); setOpportunityForm({}); setSelectedItem(null) }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Fırsat
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageOpps = groupedOpps[stage] || []
            const stageTotal = stageOpps.reduce((sum, o) => sum + o.value, 0)
            return (
              <div
                key={stage}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 min-w-[250px]"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('bg-slate-100', 'dark:bg-slate-700')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-slate-100', 'dark:bg-slate-700')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('bg-slate-100', 'dark:bg-slate-700')
                  if (draggedOpportunity) {
                    handleUpdateOpportunityStage(draggedOpportunity.id, stage as Opportunity['stage'])
                    setDraggedOpportunity(null)
                  }
                }}
              >
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-50 dark:bg-slate-800 pb-2">
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 capitalize">
                    {stage.replace('-', ' ')}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold">
                      {stageOpps.length}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ₺{stageTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {stageOpps.map((opp) => (
                    <motion.div
                      key={opp.id}
                      draggable
                      onDragStart={() => setDraggedOpportunity(opp)}
                      onDragEnd={() => setDraggedOpportunity(null)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-dark-card rounded-lg p-4 border border-slate-200 dark:border-dark-border cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-sm text-slate-900 dark:text-slate-100 flex-1">{opp.name}</h5>
                        <button
                          onClick={() => { setSelectedItem(opp); setOpportunityForm(opp); setShowOpportunityModal(true) }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                      {opp.contactName && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{opp.contactName}</div>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          ₺{opp.value.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          %{opp.probability}
                        </span>
                      </div>
                      {opp.expectedCloseDate && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                          <Calendar className="w-3 h-3" />
                          {formatDDMMYYYY(opp.expectedCloseDate)}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {stageOpps.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                      Boş
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Reports View
  const renderReports = () => {
    // Chart data preparation
    const leadStatusData = [
      { name: 'Yeni', value: leads.filter(l => l.status === 'new').length, color: '#3b82f6' },
      { name: 'İletişimde', value: leads.filter(l => l.status === 'contacted').length, color: '#eab308' },
      { name: 'Nitelendirildi', value: leads.filter(l => l.status === 'qualified').length, color: '#10b981' },
      { name: 'Dönüştürüldü', value: leads.filter(l => l.status === 'converted').length, color: '#8b5cf6' },
      { name: 'Kaybedildi', value: leads.filter(l => l.status === 'lost').length, color: '#ef4444' },
    ]

    const stageData = pipelineData.map(s => ({
      name: s.stage,
      count: s.count,
      value: s.value,
    }))

    const opportunityValueByStage = opportunities.reduce((acc, opp) => {
      const stage = opp.stage || 'prospecting'
      acc[stage] = (acc[stage] || 0) + opp.value
      return acc
    }, {} as Record<string, number>)

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      return {
        month: date.toLocaleDateString('tr-TR', { month: 'short' }),
        leads: Math.floor(Math.random() * 20) + 5,
        opportunities: Math.floor(Math.random() * 10) + 2,
        value: Math.floor(Math.random() * 50000) + 10000,
      }
    })

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">CRM Raporları</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detaylı analiz ve istatistikler</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Raporu İndir
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Leads</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats?.totalLeads || 0}</p>
              </div>
              <UserPlus className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pipeline Değeri</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  ₺{(stats?.pipelineValue || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Dönüşüm Oranı</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  %{stats?.conversionRate?.toFixed(1) || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Ortalama Fırsat</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  ₺{(stats?.averageDealSize || 0).toLocaleString()}
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Status Distribution */}
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Lead Durum Dağılımı</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={leadStatusData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline Value by Stage */}
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Pipeline Değeri (Aşamalara Göre)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f0f0f0'} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
                <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Aylık Trendler</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f0f0f0'} />
                <XAxis dataKey="month" stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
                <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="leads" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="opportunities" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline Count by Stage */}
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Fırsat Sayısı (Aşamalara Göre)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f0f0f0'} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
                <YAxis stroke={theme === 'dark' ? '#cbd5e1' : '#94a3b8'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
                    border: 'none',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Stats Table */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 border border-slate-200 dark:border-dark-border">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Detaylı İstatistikler</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Metrik</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Değer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Toplam Leads</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats?.totalLeads || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Sistemdeki toplam lead sayısı</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Aktif Fırsatlar</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats?.totalOpportunities || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Açık durumda olan fırsat sayısı</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Toplam Kişiler</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats?.totalContacts || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">CRM'deki toplam kişi sayısı</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Aktif Görevler</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{stats?.activeTasks || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Bekleyen ve devam eden görevler</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Pipeline Değeri</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">₺{(stats?.pipelineValue || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Tüm açık fırsatların toplam değeri</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Dönüşüm Oranı</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">%{stats?.conversionRate?.toFixed(2) || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Dönüştürülen leads / Toplam leads</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Ortalama Fırsat Değeri</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">₺{(stats?.averageDealSize || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Açık fırsatların ortalama değeri</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString?: string | null): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  // Helper function to format date for date input
  const formatDateForDateInput = (dateString?: string | null): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }

  // Modals
  const renderLeadModal = () => (
    <AnimatePresence>
      {showLeadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowLeadModal(false); setLeadForm({}); setSelectedItem(null) }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedItem ? 'Lead Düzenle' : 'Yeni Lead'}
                </h3>
                <button 
                  onClick={() => { setShowLeadModal(false); setLeadForm({}); setSelectedItem(null) }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">İsim *</label>
                  <input
                    type="text"
                    value={leadForm.name || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                    placeholder="İsim Soyisim"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={leadForm.email || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                    placeholder="ornek@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={leadForm.phone || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Şirket</label>
                  <input
                    type="text"
                    value={leadForm.company || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                    placeholder="Şirket Adı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Durum</label>
                  <select
                    value={leadForm.status || 'new'}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="new">Yeni</option>
                    <option value="contacted">İletişime Geçildi</option>
                    <option value="qualified">Nitelendirildi</option>
                    <option value="converted">Dönüştürüldü</option>
                    <option value="lost">Kaybedildi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kaynak</label>
                  <input
                    type="text"
                    value={leadForm.source || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    placeholder="Web, Telefon, Referans..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Değer (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={leadForm.value || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value ? Number(e.target.value) : 0 })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notlar</label>
                <textarea
                  value={leadForm.notes || ''}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                  placeholder="Notlarınızı buraya yazın..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => { setShowLeadModal(false); setLeadForm({}); setSelectedItem(null) }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (!leadForm.name) {
                    alert('İsim alanı zorunludur')
                    return
                  }
                  if (selectedItem && 'id' in selectedItem) {
                    crmService.updateLead((selectedItem as Lead).id, leadForm).then(() => {
                      setShowLeadModal(false)
                      setLeadForm({})
                      setSelectedItem(null)
                      loadLeads()
                      loadDashboard()
                    }).catch((err: any) => alert(err?.message || 'Lead güncellenemedi'))
                  } else {
                    handleCreateLead()
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedItem ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Contact Modal
  const renderContactModal = () => (
    <AnimatePresence>
      {showContactModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowContactModal(false); setContactForm({}); setSelectedItem(null) }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedItem ? 'Kişi Düzenle' : 'Yeni Kişi'}
                </h3>
                <button 
                  onClick={() => { setShowContactModal(false); setContactForm({}); setSelectedItem(null) }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">İsim *</label>
                  <input
                    type="text"
                    value={contactForm.name || ''}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="İsim Soyisim"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={contactForm.email || ''}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="ornek@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={contactForm.phone || ''}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Şirket</label>
                  <input
                    type="text"
                    value={contactForm.company || ''}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="Şirket Adı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ünvan</label>
                  <input
                    type="text"
                    value={contactForm.title || ''}
                    onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="Ünvan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Şehir</label>
                  <input
                    type="text"
                    value={contactForm.city || ''}
                    onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="Şehir"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adres</label>
                <textarea
                  value={contactForm.address || ''}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  placeholder="Adres bilgileri..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notlar</label>
                <textarea
                  value={contactForm.notes || ''}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  placeholder="Notlarınızı buraya yazın..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => { setShowContactModal(false); setContactForm({}); setSelectedItem(null) }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (!contactForm.name) {
                    alert('İsim alanı zorunludur')
                    return
                  }
                  selectedItem ? handleUpdateContact() : handleCreateContact()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedItem ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Opportunity Modal
  const renderOpportunityModal = () => (
    <AnimatePresence>
      {showOpportunityModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowOpportunityModal(false); setOpportunityForm({}); setSelectedItem(null) }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedItem ? 'Fırsat Düzenle' : 'Yeni Fırsat'}
                </h3>
                <button 
                  onClick={() => { setShowOpportunityModal(false); setOpportunityForm({}); setSelectedItem(null) }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">İsim *</label>
                  <input
                    type="text"
                    value={opportunityForm.name || ''}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                    placeholder="Fırsat Adı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Aşama</label>
                  <select
                    value={opportunityForm.stage || 'prospecting'}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, stage: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="prospecting">Keşif</option>
                    <option value="qualification">Nitelendirme</option>
                    <option value="proposal">Teklif</option>
                    <option value="negotiation">Müzaker</option>
                    <option value="closed-won">Kazanıldı</option>
                    <option value="closed-lost">Kaybedildi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Değer (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={opportunityForm.value || ''}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, value: e.target.value ? Number(e.target.value) : 0 })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Olasılık (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={opportunityForm.probability || 0}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, probability: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Beklenen Kapanış Tarihi</label>
                  <input
                    type="date"
                    value={formatDateForDateInput(opportunityForm.expectedCloseDate)}
                    onChange={(e) => setOpportunityForm({ ...opportunityForm, expectedCloseDate: e.target.value || undefined })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Açıklama</label>
                <textarea
                  value={opportunityForm.description || ''}
                  onChange={(e) => setOpportunityForm({ ...opportunityForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white"
                  placeholder="Fırsat açıklaması..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => { setShowOpportunityModal(false); setOpportunityForm({}); setSelectedItem(null) }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (!opportunityForm.name) {
                    alert('İsim alanı zorunludur')
                    return
                  }
                  if (!opportunityForm.value || opportunityForm.value <= 0) {
                    alert('Değer alanı zorunludur ve 0\'dan büyük olmalıdır')
                    return
                  }
                  selectedItem ? handleUpdateOpportunity() : handleCreateOpportunity()
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedItem ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Task Modal
  const renderTaskModal = () => (
    <AnimatePresence>
      {showTaskModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowTaskModal(false); setTaskForm({}); setSelectedItem(null) }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {selectedItem ? 'Görev Düzenle' : 'Yeni Görev'}
                </h3>
                <button 
                  onClick={() => { setShowTaskModal(false); setTaskForm({}); setSelectedItem(null) }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Başlık *</label>
                  <input
                    type="text"
                    value={taskForm.title || ''}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                    placeholder="Görev başlığı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Durum</label>
                  <select
                    value={taskForm.status || 'pending'}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="pending">Bekleyen</option>
                    <option value="in-progress">Devam Eden</option>
                    <option value="completed">Tamamlanan</option>
                    <option value="cancelled">İptal Edilen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Öncelik</label>
                  <select
                    value={taskForm.priority || 'medium'}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bitiş Tarihi</label>
                  <input
                    type="datetime-local"
                    value={formatDateForInput(taskForm.dueDate)}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value || undefined })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">İlişkili Tip</label>
                  <select
                    value={taskForm.relatedType || 'other'}
                    onChange={(e) => setTaskForm({ ...taskForm, relatedType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="lead">Lead</option>
                    <option value="opportunity">Fırsat</option>
                    <option value="contact">Kişi</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Açıklama</label>
                <textarea
                  value={taskForm.description || ''}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                  placeholder="Görev açıklaması..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => { setShowTaskModal(false); setTaskForm({}); setSelectedItem(null) }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  if (!taskForm.title) {
                    alert('Başlık alanı zorunludur')
                    return
                  }
                  selectedItem ? handleUpdateTask() : handleCreateTask()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedItem ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">CRM Yönetimi</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Müşteri ilişkileri ve satış yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboard}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-dark-border">
        {(['dashboard', 'leads', 'opportunities', 'tasks', 'contacts', 'google-maps', 'pipeline', 'kanban', 'reports'] as ViewMode[]).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeView === view
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {view === 'dashboard' && 'Dashboard'}
            {view === 'leads' && 'Leads'}
            {view === 'opportunities' && 'Fırsatlar'}
            {view === 'tasks' && 'Görevler'}
            {view === 'contacts' && 'Kişiler'}
            {view === 'google-maps' && 'AI Müşteri Bulucu'}
            {view === 'pipeline' && 'Pipeline'}
            {view === 'kanban' && 'Kanban'}
            {view === 'reports' && 'Raporlar'}
          </button>
        ))}
      </div>

      {/* Content */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && (
        <>
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'leads' && renderLeads()}
          {activeView === 'opportunities' && renderOpportunities()}
          {activeView === 'tasks' && renderTasks()}
          {activeView === 'contacts' && renderContacts()}
          {activeView === 'google-maps' && renderGoogleMaps()}
          {activeView === 'pipeline' && renderPipeline()}
          {activeView === 'kanban' && renderKanban()}
          {activeView === 'reports' && renderReports()}
        </>
      )}

      {/* Modals */}
      {renderLeadModal()}
      {renderContactModal()}
      {renderOpportunityModal()}
      {renderTaskModal()}
    </div>
  )
}

