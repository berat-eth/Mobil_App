'use client'

import { useEffect, useState } from 'react'
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Minus, ArrowLeftRight, X, Save, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface Balance {
  id: number
  customer: string
  balance: number
  lastTransaction: string
  date: string
  type: 'credit' | 'debit'
}

interface Transaction {
  id: number
  customerId: number
  type: 'add' | 'remove' | 'transfer'
  amount: number
  description: string
  date: string
  fromCustomer?: string
  toCustomer?: string
}

export default function CustomerCare() {
  const [balances, setBalances] = useState<Balance[]>([])

  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'remove' | 'transfer' | 'history'>('add')
  const [selectedCustomer, setSelectedCustomer] = useState<Balance | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transferTo, setTransferTo] = useState('')

  const openModal = (type: 'add' | 'remove' | 'transfer' | 'history', customer: Balance) => {
    setModalType(type)
    setSelectedCustomer(customer)
    setAmount('')
    setDescription('')
    setTransferTo('')
    setShowModal(true)
  }

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      try {
        const res = await api.get<any>('/admin/wallets')
        if (alive && (res as any)?.success && Array.isArray((res as any).data)) {
          const list = (res as any).data as any[]
          setBalances(list.map((w:any)=>({ id: w.id, customer: w.customerName || w.customer || `#${w.userId}` , balance: Number(w.balance||0), lastTransaction: '', date: w.updatedAt || w.createdAt || '', type: 'credit' })))
        } else {
          setBalances([])
        }
      } catch { setBalances([]) }
    })()
    return ()=>{ alive = false }
  }, [])

  const handleTransaction = async () => {
    if (!selectedCustomer || !amount) {
      alert('Lütfen tüm alanları doldurun!')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Geçerli bir tutar girin!')
      return
    }

    const newTransaction: Transaction = {
      id: Date.now(),
      customerId: selectedCustomer.id,
      type: modalType as 'add' | 'remove' | 'transfer',
      amount: amountNum,
      description: description || 'İşlem açıklaması yok',
      date: new Date().toLocaleString('tr-TR')
    }

    if (modalType === 'add') {
      try {
        await api.post('/admin/wallets/add', { userId: selectedCustomer.id, amount: amountNum, description })
        setBalances(balances.map(b => b.id === selectedCustomer.id ? { ...b, balance: b.balance + amountNum, lastTransaction: `+₺${amountNum}`, type: 'credit' } : b))
        alert(`✅ ${selectedCustomer.customer} hesabına ₺${amountNum} eklendi!`)
      } catch { alert('İşlem başarısız') }
    } else if (modalType === 'remove') {
      if (selectedCustomer.balance < amountNum) {
        alert('❌ Yetersiz bakiye!')
        return
      }
      try {
        await api.post('/admin/wallets/remove', { userId: selectedCustomer.id, amount: amountNum, description })
        setBalances(balances.map(b => b.id === selectedCustomer.id ? { ...b, balance: b.balance - amountNum, lastTransaction: `-₺${amountNum}`, type: 'debit' } : b))
        alert(`✅ ${selectedCustomer.customer} hesabından ₺${amountNum} çıkarıldı!`)
      } catch { alert('İşlem başarısız') }
    } else if (modalType === 'transfer') {
      if (!transferTo) {
        alert('Lütfen transfer yapılacak müşteriyi seçin!')
        return
      }
      if (selectedCustomer.balance < amountNum) {
        alert('❌ Yetersiz bakiye!')
        return
      }
      
      try {
        await api.post('/admin/wallets/transfer', { fromUserId: selectedCustomer.id, toUserId: parseInt(transferTo), amount: amountNum, description })
        setBalances(balances.map(b => {
          if (b.id === selectedCustomer.id) { return { ...b, balance: b.balance - amountNum, lastTransaction: `-₺${amountNum}`, type: 'debit' } }
          if (b.id === parseInt(transferTo)) { return { ...b, balance: b.balance + amountNum, lastTransaction: `+₺${amountNum}`, type: 'credit' } }
          return b
        }))
        const toCustomer = balances.find(b => b.id === parseInt(transferTo))
        newTransaction.fromCustomer = selectedCustomer.customer
        newTransaction.toCustomer = toCustomer?.customer
        alert(`✅ ${selectedCustomer.customer} → ${toCustomer?.customer} transfer tamamlandı!`)
      } catch { alert('İşlem başarısız') }
    }

    setTransactions([newTransaction, ...transactions])
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Müşteri Bakiyeleri</h2>
        <p className="text-slate-500 mt-1">Müşteri cüzdan bakiyelerini yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Toplam Bakiye</p>
          <p className="text-3xl font-bold text-green-600">
            ₺{balances.reduce((sum, b) => sum + b.balance, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Aktif Cüzdanlar</p>
          <p className="text-3xl font-bold text-blue-600">{balances.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Bu Ay Yükleme</p>
          <p className="text-3xl font-bold text-purple-600">₺0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-slate-500 text-sm mb-2">Bu Ay Harcama</p>
          <p className="text-3xl font-bold text-orange-600">₺0</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Müşteri</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Bakiye</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Son İşlem</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-800">{item.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">₺{item.balance.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {item.type === 'credit' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={item.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                        {item.lastTransaction}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => openModal('add', item)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        title="Bakiye Ekle"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openModal('remove', item)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Bakiye Çıkar"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openModal('transfer', item)}
                        className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Transfer"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openModal('history', item)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Geçmiş"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* İşlem Modal */}
      <AnimatePresence>
        {showModal && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">
                  {modalType === 'add' && '💰 Bakiye Ekle'}
                  {modalType === 'remove' && '💸 Bakiye Çıkar'}
                  {modalType === 'transfer' && '🔄 Transfer Yap'}
                  {modalType === 'history' && '📜 İşlem Geçmişi'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Müşteri Bilgisi */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Müşteri</p>
                      <p className="font-bold text-slate-800">{selectedCustomer.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Mevcut Bakiye</p>
                      <p className="text-2xl font-bold text-green-600">₺{selectedCustomer.balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {modalType !== 'history' && (
                  <>
                    {/* Tutar */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tutar (₺) *
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Transfer için hedef müşteri */}
                    {modalType === 'transfer' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Transfer Yapılacak Müşteri *
                        </label>
                        <select
                          value={transferTo}
                          onChange={(e) => setTransferTo(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Müşteri Seçin</option>
                          {balances
                            .filter(b => b.id !== selectedCustomer.id)
                            .map(b => (
                              <option key={b.id} value={b.id}>
                                {b.customer} (₺{b.balance.toLocaleString()})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Açıklama */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Açıklama
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="İşlem açıklaması girin..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* Önizleme */}
                    {amount && (
                      <div className={`rounded-xl p-4 border-2 ${
                        modalType === 'add' ? 'bg-green-50 border-green-200' :
                        modalType === 'remove' ? 'bg-red-50 border-red-200' :
                        'bg-purple-50 border-purple-200'
                      }`}>
                        <p className="text-sm font-medium text-slate-700 mb-2">İşlem Önizleme:</p>
                        <div className="space-y-1 text-sm">
                          {modalType === 'add' && (
                            <>
                              <p className="text-slate-600">Mevcut: ₺{selectedCustomer.balance.toLocaleString()}</p>
                              <p className="text-green-600 font-bold">+ ₺{parseFloat(amount).toLocaleString()}</p>
                              <p className="text-slate-800 font-bold border-t border-slate-300 pt-1">
                                Yeni Bakiye: ₺{(selectedCustomer.balance + parseFloat(amount)).toLocaleString()}
                              </p>
                            </>
                          )}
                          {modalType === 'remove' && (
                            <>
                              <p className="text-slate-600">Mevcut: ₺{selectedCustomer.balance.toLocaleString()}</p>
                              <p className="text-red-600 font-bold">- ₺{parseFloat(amount).toLocaleString()}</p>
                              <p className="text-slate-800 font-bold border-t border-slate-300 pt-1">
                                Yeni Bakiye: ₺{(selectedCustomer.balance - parseFloat(amount)).toLocaleString()}
                              </p>
                              {selectedCustomer.balance < parseFloat(amount) && (
                                <p className="text-red-600 text-xs mt-2">⚠️ Yetersiz bakiye!</p>
                              )}
                            </>
                          )}
                          {modalType === 'transfer' && transferTo && (
                            <>
                              <p className="text-slate-600">{selectedCustomer.customer}: ₺{selectedCustomer.balance.toLocaleString()}</p>
                              <p className="text-purple-600 font-bold">→ ₺{parseFloat(amount).toLocaleString()}</p>
                              <p className="text-slate-600">
                                {balances.find(b => b.id === parseInt(transferTo))?.customer}: 
                                ₺{balances.find(b => b.id === parseInt(transferTo))?.balance.toLocaleString()}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Butonlar */}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleTransaction}
                        className={`flex-1 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-shadow font-medium flex items-center justify-center ${
                          modalType === 'add' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                          modalType === 'remove' ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                          'bg-gradient-to-r from-purple-600 to-pink-600'
                        }`}
                      >
                        <Save className="w-5 h-5 mr-2" />
                        {modalType === 'add' && 'Bakiye Ekle'}
                        {modalType === 'remove' && 'Bakiye Çıkar'}
                        {modalType === 'transfer' && 'Transfer Yap'}
                      </button>
                      <button
                        onClick={() => setShowModal(false)}
                        className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                      >
                        İptal
                      </button>
                    </div>
                  </>
                )}

                {/* İşlem Geçmişi */}
                {modalType === 'history' && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transactions
                      .filter(t => t.customerId === selectedCustomer.id)
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className={`p-4 rounded-xl border-l-4 ${
                            transaction.type === 'add' ? 'bg-green-50 border-green-500' :
                            transaction.type === 'remove' ? 'bg-red-50 border-red-500' :
                            'bg-purple-50 border-purple-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              transaction.type === 'add' ? 'bg-green-200 text-green-800' :
                              transaction.type === 'remove' ? 'bg-red-200 text-red-800' :
                              'bg-purple-200 text-purple-800'
                            }`}>
                              {transaction.type === 'add' ? '➕ Ekleme' :
                               transaction.type === 'remove' ? '➖ Çıkarma' : '🔄 Transfer'}
                            </span>
                            <span className="text-xs text-slate-500">{transaction.date}</span>
                          </div>
                          <p className="font-bold text-slate-800 mb-1">
                            {transaction.type === 'add' ? '+' : '-'}₺{transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-slate-600">{transaction.description}</p>
                          {transaction.fromCustomer && transaction.toCustomer && (
                            <p className="text-xs text-purple-600 mt-2">
                              {transaction.fromCustomer} → {transaction.toCustomer}
                            </p>
                          )}
                        </div>
                      ))}
                    
                    {transactions.filter(t => t.customerId === selectedCustomer.id).length === 0 && (
                      <div className="text-center py-8">
                        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Henüz işlem geçmişi yok</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
