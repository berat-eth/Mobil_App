'use client'

import { useEffect, useState } from 'react'
import { Wallet, Search, Filter, Plus, TrendingUp, TrendingDown, Download, ArrowUpDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { walletService } from '@/lib/services'

export default function UserWallets() {
  const [wallets, setWallets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ totalBalance: number; totalCredit: number; totalDebit: number } | null>(null)
  const [sortKey, setSortKey] = useState<'name' | 'balance' | 'email'>('balance')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [txLoading, setTxLoading] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)
  const [adjustNote, setAdjustNote] = useState<string>('')
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [txSearch, setTxSearch] = useState('')
  const [txPage, setTxPage] = useState(1)
  const [txPageSize, setTxPageSize] = useState(10)
  const [txSortKey, setTxSortKey] = useState<'date' | 'amount' | 'type'>('date')
  const [txSortDir, setTxSortDir] = useState<'asc' | 'desc'>('desc')
  const formatDateDDMMYYYY = (value: any) => {
    const d = new Date(value || 0)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

  const translateStatus = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (s.includes('pending') || s === 'awaiting') return 'Beklemede'
    if (s.includes('complete') || s === 'completed' || s === 'success') return 'Tamamlandı'
    if (s.includes('cancel')) return 'İptal'
    if (s.includes('reject') || s === 'failed' || s.includes('fail')) return 'Başarısız'
    if (s.includes('process')) return 'İşleniyor'
    return s ? s : '-'
  }

  const getRecipient = (tx: any) => {
    // Yaygın alan denemeleri
    return (
      tx?.toUserEmail ||
      tx?.toEmail ||
      tx?.recipientEmail ||
      tx?.receiverEmail ||
      tx?.toUserName ||
      tx?.recipient ||
      tx?.targetUserEmail ||
      '-'
    )
  }

  const fetchWallets = async () => {
    try {
      setLoading(true)
      setError(null)
      const [listRes, sumRes] = await Promise.all([
        api.get<any>('/admin/wallets'),
        api.get<any>('/admin/wallets/summary')
      ])
      if ((listRes as any)?.success && (listRes as any).data) setWallets((listRes as any).data)
      if ((sumRes as any)?.success && (sumRes as any).data) setSummary((sumRes as any).data)
      else setWallets([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cüzdanlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWallets() }, [])
  const toggleSort = (key: 'name' | 'balance' | 'email') => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const exportCsv = () => {
    const header = ['Kullanıcı','Email','Bakiye','Para Birimi']
    const rows = wallets.map(w => [w.userName||'', w.userEmail||'', Number(w.balance||0).toFixed(2), w.currency||'TRY'])
    const csv = [header, ...rows].map(r => r.map(v => String(v).replaceAll('"','""')).map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kullanici-cuzdanlari-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filtered = wallets.filter(w => `${w.userName||''} ${w.userEmail||''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  const sorted = filtered.sort((a,b) => {
    let va: any, vb: any
    if (sortKey === 'balance') { va = Number(a.balance||0); vb = Number(b.balance||0) }
    else if (sortKey === 'name') { va = (a.userName||'').toLowerCase(); vb = (b.userName||'').toLowerCase() }
    else { va = (a.userEmail||'').toLowerCase(); vb = (b.userEmail||'').toLowerCase() }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageItems = sorted.slice((page-1)*pageSize, (page-1)*pageSize + pageSize)


  const openTransactions = async (wallet: any) => {
    try {
      setSelectedWallet(wallet)
      setShowTxModal(true)
      setTxLoading(true)
      setTxTypeFilter('all'); setTxSearch(''); setTxPage(1); setTxSortKey('date'); setTxSortDir('desc')
      const res = await walletService.getTransactions(wallet.userId, 1, 100)
      if (res.success && (res as any).data?.transactions) setTransactions((res as any).data.transactions)
      else setTransactions([])
    } catch (e) {
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  const submitAdjust = async (sign: 1 | -1) => {
    if (!selectedWallet) return
    const amt = parseFloat(adjustAmount)
    if (isNaN(amt) || amt <= 0) {
      setAdjustError('Geçerli bir tutar girin')
      return
    }
    try {
      setAdjustLoading(true)
      setAdjustError(null)
      if (sign > 0) {
        await api.post('/admin/wallets/add', {
          userId: selectedWallet.userId,
          amount: amt,
          description: adjustNote || 'Admin balance increase'
        })
      } else {
        await api.post('/admin/wallets/remove', {
          userId: selectedWallet.userId,
          amount: amt,
          description: adjustNote || 'Admin balance decrease'
        })
      }
      await fetchWallets()
      await openTransactions(selectedWallet)
      setAdjustAmount('')
      setAdjustNote('')
    } catch (e: any) {
      setAdjustError(e?.message || 'İşlem başarısız')
    } finally {
      setAdjustLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kullanıcı Cüzdanları</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Müşteri bakiyelerini görüntüleyin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-lg p-6 text-white">
          <Wallet className="w-8 h-8 mb-3" />
          <p className="text-blue-100 text-sm">Toplam Bakiye</p>
          <p className="text-3xl font-bold">₺{Number(summary?.totalBalance||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-2xl shadow-lg p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-3" />
          <p className="text-green-100 text-sm">Toplam Yükleme</p>
          <p className="text-3xl font-bold">₺{Number(summary?.totalCredit||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-700 dark:to-orange-800 rounded-2xl shadow-lg p-6 text-white">
          <TrendingDown className="w-8 h-8 mb-3" />
          <p className="text-orange-100 text-sm">Toplam Harcama</p>
          <p className="text-3xl font-bold">₺{Number(summary?.totalDebit||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cüzdan ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleSort('balance')} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors">
              Bakiye <ArrowUpDown className="inline w-4 h-4 ml-1" />
            </button>
            <button onClick={() => toggleSort('name')} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors">
              İsim <ArrowUpDown className="inline w-4 h-4 ml-1" />
            </button>
            <button onClick={() => toggleSort('email')} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors">
              Email <ArrowUpDown className="inline w-4 h-4 ml-1" />
            </button>
            <button onClick={exportCsv} className="px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:opacity-90 dark:hover:bg-slate-600 text-sm flex items-center transition-colors">
              <Download className="w-4 h-4 mr-2" /> Dışa Aktar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_,i) => (
              <div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">{error}</div>
        ) : (
        <div className="space-y-3">
          {pageItems.map((wallet, index) => (
            <motion.div
              key={wallet.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{wallet.userName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{wallet.userEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">₺{Number(wallet.balance||0).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{wallet.currency || 'TRY'}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => openTransactions(wallet)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  İşlemleri Gör
                </button>
              </div>
            </motion.div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-slate-600 dark:text-slate-300">Toplam {sorted.length} cüzdan</div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Önceki</button>
              <span className="text-sm text-slate-700 dark:text-slate-300">{page}/{totalPages}</span>
              <button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Sonraki</button>
              <select value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)); setPage(1) }} className="ml-2 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {[10,20,50].map(n => (<option key={n} value={n}>{n}/sayfa</option>))}
              </select>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Transactions Modal */}
      {showTxModal && selectedWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTxModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card z-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Hesap Hareketleri</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedWallet.userName} • Bakiye: ₺{Number(selectedWallet.balance||0).toFixed(2)}</p>
              </div>
              <button onClick={() => setShowTxModal(false)} className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Kapat</button>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center space-x-2">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Tutar"
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg w-40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg flex-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  disabled={adjustLoading}
                  onClick={() => submitAdjust(1)}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Bakiye Ekle
                </button>
                <button
                  disabled={adjustLoading}
                  onClick={() => submitAdjust(-1)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Bakiye Düş
                </button>
                {adjustError && <span className="text-sm text-red-600 dark:text-red-400 ml-2">{adjustError}</span>}
              </div>
              {/* Filters */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <select value={txTypeFilter} onChange={(e)=>{ setTxTypeFilter(e.target.value as any); setTxPage(1) }} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                    <option value="all">Tümü</option>
                    <option value="credit">Yükleme</option>
                    <option value="debit">Harcama</option>
                  </select>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input value={txSearch} onChange={(e)=>{ setTxSearch(e.target.value); setTxPage(1) }} placeholder="İşlem ara..." className="pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{ setTxSortKey('date'); setTxSortDir(d=> d==='asc'?'desc':'asc') }} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Tarih</button>
                  <button onClick={()=>{ setTxSortKey('amount'); setTxSortDir(d=> d==='asc'?'desc':'asc') }} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Tutar</button>
                  <button onClick={()=>{ setTxSortKey('type'); setTxSortDir(d=> d==='asc'?'desc':'asc') }} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Tür</button>
                  <button onClick={() => {
                    const header = ['Tarih','Tür','Tutar','Açıklama','Durum']
                    const rows = (transactions||[]).map(tx => [tx.createdAt||tx.date||'', tx.type||'', Number(tx.amount||0).toFixed(2), tx.description||'', tx.status||'-'])
                    const csv = [header, ...rows].map(r => r.map(v => String(v).replaceAll('"','""')).map(v => `"${v}"`).join(',')).join('\n')
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `cuzdan-islemleri-${selectedWallet.userId}-${new Date().toISOString().slice(0,10)}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }} className="px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm flex items-center hover:opacity-90 dark:hover:bg-slate-600 transition-colors"><Download className="w-4 h-4 mr-2"/>Dışa Aktar</button>
                </div>
              </div>

              {txLoading ? (
                <div className="space-y-2">
                  {Array.from({length:6}).map((_,i)=> (
                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />
                  ))}
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tür</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Alıcı</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tutar</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Açıklama</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {(() => {
                      const filteredTx = (transactions||[])
                        .filter(tx => txTypeFilter==='all' ? true : tx.type === txTypeFilter)
                        .filter(tx => (tx.description||'').toLowerCase().includes(txSearch.toLowerCase()))
                      const sortedTx = filteredTx.sort((a:any,b:any) => {
                        if (txSortKey === 'amount') {
                          const va = Number(a.amount||0), vb = Number(b.amount||0)
                          return txSortDir==='asc' ? va - vb : vb - va
                        } else if (txSortKey === 'type') {
                          const va = (a.type||'').localeCompare(b.type||'')
                          return txSortDir==='asc' ? va : -va
                        }
                        const da = new Date(a.createdAt||a.date||0).getTime()
                        const db = new Date(b.createdAt||b.date||0).getTime()
                        return txSortDir==='asc' ? da - db : db - da
                      })
                      const total = sortedTx.length
                      const start = (txPage-1)*txPageSize
                      const pageTx = sortedTx.slice(start, start + txPageSize)
                      return (
                        <>
                          {pageTx.map((tx:any, idx:number) => (
                            <tr key={`${idx}-${tx.createdAt||tx.date||''}`} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{formatDateDDMMYYYY(tx.createdAt || tx.date)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type==='credit' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : tx.type==='debit' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>{tx.type==='credit'?'Yükleme': tx.type==='debit' ? 'Harcama' : 'Transfer'}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{(String(tx.type||'').toLowerCase()==='transfer') ? getRecipient(tx) : '-'}</td>
                              <td className={`px-4 py-3 text-sm font-semibold ${tx.type==='credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>₺{Number(tx.amount||0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{tx.description || '-'}</td>
                              <td className="px-4 py-3 text-sm">
                                {(() => {
                                  const s = String(tx.status||'').toLowerCase()
                                  const badgeClass = s.includes('complete') || s==='completed' || s==='success' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : s.includes('pending') || s==='awaiting' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : s.includes('cancel') ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : s.includes('reject') || s==='failed' || s.includes('fail') ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  return <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>{translateStatus(tx.status)}</span>
                                })()}
                              </td>
                            </tr>
                          ))}
                          {total === 0 && (
                            <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">İşlem bulunamadı</td></tr>
                          )}
                          <tr>
                            <td colSpan={6} className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-600 dark:text-slate-300">Toplam {total} işlem</div>
                                <div className="flex items-center gap-2">
                                  <button disabled={txPage<=1} onClick={()=> setTxPage(p=> Math.max(1, p-1))} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Önceki</button>
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{txPage}/{Math.max(1, Math.ceil(total/txPageSize))}</span>
                                  <button disabled={txPage>=Math.ceil(total/txPageSize)} onClick={()=> setTxPage(p=> p+1)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Sonraki</button>
                                  <select value={txPageSize} onChange={(e)=>{ setTxPageSize(parseInt(e.target.value)); setTxPage(1) }} className="ml-2 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                    {[10,20,50].map(n => (<option key={n} value={n}>{n}/sayfa</option>))}
                                  </select>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
