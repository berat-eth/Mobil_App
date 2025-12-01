'use client'

import { useState, useEffect } from 'react'
import { Star, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle, Brain, BarChart3, AlertTriangle, TrendingUp, Target, Eye, RefreshCw, X, Image as ImageIcon, Video } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Review {
  id: number
  productId?: number
  productName?: string
  productImage?: string
  userId?: number
  userName?: string
  userEmail?: string
  userPhone?: string
  rating: number
  comment: string
  date: string
  createdAt?: string
  status: 'pending' | 'approved' | 'rejected'
  helpful?: number
  media?: Array<{
    id: number
    mediaType: 'image' | 'video'
    mediaUrl: string
    thumbnailUrl?: string
    displayOrder?: number
  }>
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const { api } = await import('@/lib/api')
      const response = await api.get<any>('/admin/reviews')
      const data = response as any
      
      if (data.success && Array.isArray(data.data)) {
        const formattedReviews = data.data.map((r: any) => ({
          id: r.id,
          productId: r.productId,
          productName: r.productName || 'Bilinmeyen Ürün',
          productImage: r.productImage,
          userId: r.userId,
          userName: r.userName || 'Anonim',
          userEmail: r.userEmail,
          userPhone: r.userPhone,
          rating: r.rating,
          comment: r.comment || '',
          date: new Date(r.createdAt || r.date).toLocaleDateString('tr-TR'),
          createdAt: r.createdAt,
          status: r.status || 'approved',
          helpful: r.helpful || 0,
          media: r.media || []
        }))
        setReviews(formattedReviews)
      } else {
        setReviews([])
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const approve = async (id: number) => {
    try {
      const { api } = await import('@/lib/api')
      await api.put(`/admin/reviews/${id}/status`, { status: 'approved' })
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    } catch (error) {
      console.error('Error approving review:', error)
    }
  }

  const reject = async (id: number) => {
    try {
      const { api } = await import('@/lib/api')
      await api.put(`/admin/reviews/${id}/status`, { status: 'rejected' })
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'rejected' } : r))
    } catch (error) {
      console.error('Error rejecting review:', error)
    }
  }

  const deleteReview = async (id: number) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    
    try {
      const { api } = await import('@/lib/api')
      await api.delete(`/admin/reviews/${id}`)
      setReviews(reviews.filter(r => r.id !== id))
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const performAIAnalysis = async () => {
    setAiLoading(true)
    try {
      // Simulated AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock AI analysis data for reviews
      const analysisData = {
        insights: [
          {
            type: 'warning',
            title: 'Düşük Yorum Oranı',
            description: 'Yorum oranı %3.2 - sektör ortalaması %8-12',
            impact: 'high',
            recommendation: 'Yorum teşvik kampanyaları düzenleyin'
          },
          {
            type: 'opportunity',
            title: 'Pozitif Sentiment Artışı',
            description: 'Son 30 günde pozitif yorumlar %25 arttı',
            impact: 'medium',
            recommendation: 'Bu trendi sürdürmek için ürün kalitesini koruyun'
          },
          {
            type: 'trend',
            title: 'En Çok Yorumlanan Kategoriler',
            description: 'Outdoor giyim kategorisi %45 daha fazla yorum alıyor',
            impact: 'medium',
            recommendation: 'Bu kategorideki ürünleri öne çıkarın'
          }
        ],
        recommendations: [
          'Yorum teşvik e-postaları gönderin',
          'Yorum yapan müşterilere indirim kuponu verin',
          'Yorum moderasyon sürecini hızlandırın',
          'Müşteri memnuniyet anketleri düzenleyin'
        ],
        stats: {
          totalReviews: reviews.length,
          averageRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0,
          pendingReviews: reviews.filter(r => r.status === 'pending').length,
          approvalRate: reviews.length > 0 ? ((reviews.filter(r => r.status === 'approved').length / reviews.length) * 100).toFixed(1) : 0,
          topRatedProduct: 'Outdoor Mont',
          sentimentScore: 78
        }
      }
      
      setAiAnalysisData(analysisData)
      setShowAIAnalysis(true)
    } catch (error) {
      console.error('AI Analysis error:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
      />
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Değerlendirme & Yorum Yönetimi</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Müşteri yorumlarını yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadReviews}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
          <button
            onClick={performAIAnalysis}
            disabled={aiLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl flex items-center hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Brain className="w-5 h-5 mr-2" />
            )}
            {aiLoading ? 'Analiz Ediliyor...' : 'YZ Analiz'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Yorum</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{reviews.length}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Onay Bekleyen</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{reviews.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Ortalama Puan</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} ⭐
          </p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Faydalı Bulunma</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{reviews.reduce((sum, r) => sum + (r.helpful || 0), 0)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Yorumlar</h3>
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {review.userName?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{review.userName || 'Anonim'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{review.productName || 'Bilinmeyen Ürün'}</p>
                      {review.userEmail && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">{review.userEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-slate-500 dark:text-slate-400">{review.date}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-3">{review.comment}</p>
                  
                  {/* Medya dosyaları (görsel ve video) */}
                  {review.media && review.media.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {review.media.map((mediaItem) => (
                        <div key={mediaItem.id} className="relative">
                          {mediaItem.mediaType === 'video' ? (
                            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                              <Video className="w-6 h-6 text-slate-500" />
                            </div>
                          ) : (
                            <img
                              src={mediaItem.thumbnailUrl || mediaItem.mediaUrl}
                              alt="Review media"
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm">
                    {review.helpful !== undefined && review.helpful > 0 && (
                      <span className="flex items-center text-slate-500 dark:text-slate-400">
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {review.helpful} faydalı
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      review.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                      review.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                    }`}>
                      {review.status === 'approved' ? 'Onaylandı' :
                       review.status === 'pending' ? 'Beklemede' : 'Reddedildi'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approve(review.id)}
                        className="p-2 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-800/40 rounded-lg transition-colors"
                        title="Onayla"
                      >
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </button>
                      <button
                        onClick={() => reject(review.id)}
                        className="p-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/40 rounded-lg transition-colors"
                        title="Reddet"
                      >
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="p-2 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {showAIAnalysis && aiAnalysisData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAIAnalysis(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">YZ Yorum Analizi</h3>
                    <p className="text-slate-500 dark:text-slate-400">Yapay zeka destekli yorum analizi ve öneriler</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIAnalysis(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {aiAnalysisData.stats.totalReviews}
                    </div>
                    <div className="text-sm text-blue-600">Toplam Yorum</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {aiAnalysisData.stats.averageRating} ⭐
                    </div>
                    <div className="text-sm text-green-600">Ortalama Puan</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">
                      {aiAnalysisData.stats.pendingReviews}
                    </div>
                    <div className="text-sm text-yellow-600">Onay Bekleyen</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      %{aiAnalysisData.stats.sentimentScore}
                    </div>
                    <div className="text-sm text-purple-600">Sentiment Skoru</div>
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    AI İçgörüleri
                  </h4>
                  <div className="space-y-4">
                    {aiAnalysisData.insights.map((insight: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border ${
                          insight.type === 'warning' ? 'bg-red-50 border-red-200' :
                          insight.type === 'opportunity' ? 'bg-green-50 border-green-200' :
                          'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            insight.type === 'warning' ? 'bg-red-100 text-red-600' :
                            insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                             insight.type === 'opportunity' ? <Eye className="w-4 h-4" /> :
                             <TrendingUp className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-800 mb-1">{insight.title}</h5>
                            <p className="text-slate-600 text-sm mb-2">{insight.description}</p>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                                insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {insight.impact === 'high' ? 'Yüksek' : insight.impact === 'medium' ? 'Orta' : 'Düşük'} Etki
                              </span>
                              <span className="text-xs text-slate-500">{insight.recommendation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    AI Önerileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiAnalysisData.recommendations.map((rec: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Detaylı İstatistikler</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Onay Oranı</span>
                      <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">%{aiAnalysisData.stats.approvalRate}</div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">En Çok Yorumlanan Ürün</span>
                      <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">{aiAnalysisData.stats.topRatedProduct}</div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Sentiment Durumu</span>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">Pozitif</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setShowAIAnalysis(false)}
                    className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to AI Insights page
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('goto-tab', { detail: { tab: 'ai-insights' } }))
                      }
                      setShowAIAnalysis(false)
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                  >
                    Detaylı Analiz
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
