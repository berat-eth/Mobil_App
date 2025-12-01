'use client';

import { useState } from 'react';
import { api, ApiResponse } from '@/lib/api';
import { Search, Globe, CheckCircle2, AlertCircle, XCircle, Loader2, ExternalLink, BarChart3, Image, Link2, FileText, Zap, TrendingUp, Shield, Eye } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar } from 'recharts';
import { motion } from 'framer-motion';

interface SEOAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  h1Count: number;
  h1Tags: string[];
  h2Count: number;
  h2Tags: string[];
  imagesCount: number;
  imagesWithoutAlt: number;
  linksCount: number;
  internalLinks: number;
  externalLinks: number;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  schemaMarkup: boolean;
  mobileFriendly: boolean;
  loadTime?: number;
  statusCode: number;
  wordCount: number;
  issues: string[];
  score: number;
}

export default function SEO() {
  const [url, setUrl] = useState('https://hugluoutdoor.com');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Lütfen bir URL girin');
      return;
    }

    // URL formatını düzelt
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await api.post<ApiResponse<SEOAnalysis>>('/admin/seo/analyze', { url: finalUrl });
      
      if (response.success && response.data) {
        setAnalysis(response.data);
      } else {
        setError('SEO analizi yapılamadı. Lütfen geçerli bir URL girin.');
      }
    } catch (err: any) {
      console.error('SEO analizi hatası:', err);
      setError(err.message || 'SEO analizi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return ['#10b981', '#059669'];
    if (score >= 60) return ['#f59e0b', '#d97706'];
    return ['#ef4444', '#dc2626'];
  };

  // Pie chart için bağlantı verisi
  const getLinksData = (analysis: SEOAnalysis) => {
    return [
      { name: 'İç Bağlantı', value: analysis.internalLinks, color: '#3b82f6' },
      { name: 'Dış Bağlantı', value: analysis.externalLinks, color: '#8b5cf6' },
    ];
  };

  // Bar chart için içerik verisi
  const getContentData = (analysis: SEOAnalysis) => {
    return [
      { name: 'H1', value: analysis.h1Count, ideal: 1, color: '#3b82f6' },
      { name: 'H2', value: analysis.h2Count, ideal: 3, color: '#8b5cf6' },
      { name: 'Görsel', value: analysis.imagesCount, ideal: 5, color: '#10b981' },
    ];
  };

  // Radial chart için skor verisi
  const getRadialData = (score: number) => {
    return [{ name: 'SEO Skoru', value: score, fill: getScoreGradient(score)[0] }];
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                SEO Analiz Paneli
              </h1>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Web sitenizin SEO durumunu analiz edin
              </p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-slate-400 dark:text-gray-400" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://hugluoutdoor.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Analiz Et</span>
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Overall Score - Dairesel Chart */}
            <div className={`rounded-2xl border-2 p-8 ${getScoreBgColor(analysis.score)} shadow-lg`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6" />
                    SEO Performans Skoru
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                    Genel performans değerlendirmesi ve öneriler
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Genel Skor</span>
                      <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                        {analysis.score}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.score}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          analysis.score >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          analysis.score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="relative w-64 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="60%"
                        outerRadius="90%"
                        data={getRadialData(analysis.score)}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={10}
                          fill={getScoreGradient(analysis.score)[0]}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getScoreColor(analysis.score)}`}>
                          {analysis.score}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-gray-400 mt-1">/ 100</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{analysis.wordCount}</span>
                </div>
                <p className="text-sm opacity-90">Kelime Sayısı</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <Image className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{analysis.imagesCount}</span>
                </div>
                <p className="text-sm opacity-90">Toplam Görsel</p>
                {analysis.imagesWithoutAlt > 0 && (
                  <p className="text-xs opacity-75 mt-1">⚠️ {analysis.imagesWithoutAlt} alt text yok</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <Link2 className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{analysis.linksCount}</span>
                </div>
                <p className="text-sm opacity-90">Toplam Bağlantı</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <Zap className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{analysis.loadTime || 'N/A'}</span>
                </div>
                <p className="text-sm opacity-90">Yükleme Süresi (ms)</p>
              </motion.div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title & Meta */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Temel Bilgiler
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                        Sayfa Başlığı
                      </label>
                      <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                        {analysis.title ? `${analysis.title.length}/60` : '0/60'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((analysis.title?.length || 0) / 60 * 100, 100)}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${
                          analysis.title && analysis.title.length >= 30 && analysis.title.length <= 60
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white font-medium">
                      {analysis.title || 'Bulunamadı'}
                    </p>
                    {analysis.title && (
                      <div className="mt-2 flex items-center gap-1">
                        {analysis.title.length >= 30 && analysis.title.length <= 60 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs text-slate-600 dark:text-gray-400">
                          {analysis.title.length >= 30 && analysis.title.length <= 60
                            ? 'İdeal uzunluk ✓'
                            : 'İdeal uzunluk 30-60 karakter arası'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                        Meta Açıklama
                      </label>
                      <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                        {analysis.metaDescription ? `${analysis.metaDescription.length}/160` : '0/160'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((analysis.metaDescription?.length || 0) / 160 * 100, 100)}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${
                          analysis.metaDescription && analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white">
                      {analysis.metaDescription || 'Bulunamadı'}
                    </p>
                    {analysis.metaDescription && (
                      <div className="mt-2 flex items-center gap-1">
                        {analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs text-slate-600 dark:text-gray-400">
                          {analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160
                            ? 'İdeal uzunluk ✓'
                            : 'İdeal uzunluk 120-160 karakter arası'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
                      Meta Keywords
                    </label>
                    <p className="mt-1 text-sm text-slate-900 dark:text-white">
                      {analysis.metaKeywords || 'Bulunamadı'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Technical SEO */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Teknik SEO
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-600 dark:text-gray-400">HTTP Durum Kodu</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        analysis.statusCode === 200 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {analysis.statusCode}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Mobil Uyumlu</span>
                      {analysis.mobileFriendly ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Evet</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-xs text-red-600 dark:text-red-400 font-semibold">Hayır</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-600 dark:text-gray-400">Schema Markup</span>
                      {analysis.schemaMarkup ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400 block mb-1">Canonical URL</span>
                    <span className="text-xs text-slate-900 dark:text-white break-all">
                      {analysis.canonicalUrl || 'Bulunamadı'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400 block mb-1">Robots</span>
                    <span className="text-xs text-slate-900 dark:text-white">
                      {analysis.robots || 'Bulunamadı'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Content Analysis & Links Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* İçerik Analizi - Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    İçerik Analizi
                  </h3>
                </div>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getContentData(analysis)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <span className="text-sm text-slate-600 dark:text-gray-400">H1 Etiketleri</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{analysis.h1Count}</span>
                  </div>
                  {analysis.h1Tags.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-blue-500">
                      {analysis.h1Tags.slice(0, 3).map((tag, idx) => (
                        <p key={idx} className="text-xs text-slate-600 dark:text-gray-400 py-1">
                          • {tag}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <span className="text-sm text-slate-600 dark:text-gray-400">H2 Etiketleri</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{analysis.h2Count}</span>
                  </div>
                </div>
              </motion.div>

              {/* Bağlantı Dağılımı - Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Link2 className="w-5 h-5 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Bağlantı Dağılımı
                  </h3>
                </div>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getLinksData(analysis)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getLinksData(analysis).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-slate-600 dark:text-gray-400">İç Bağlantı</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{analysis.internalLinks}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm text-slate-600 dark:text-gray-400">Dış Bağlantı</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{analysis.externalLinks}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <span className="text-sm text-slate-600 dark:text-gray-400">Toplam Bağlantı</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{analysis.linksCount}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Görsel Analizi */}
            {analysis.imagesCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Image className="w-5 h-5 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Görsel Analizi
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                      {analysis.imagesCount}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">Toplam Görsel</div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    analysis.imagesWithoutAlt === 0
                      ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
                      : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20'
                  }`}>
                    <div className={`text-2xl font-bold mb-1 ${
                      analysis.imagesWithoutAlt === 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {analysis.imagesWithoutAlt}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">Alt Text Eksik</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {analysis.imagesCount - analysis.imagesWithoutAlt}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">Alt Text Var</div>
                  </div>
                </div>
                {analysis.imagesWithoutAlt > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {analysis.imagesWithoutAlt} görselde alt text eksik. SEO için tüm görsellere alt text ekleyin.
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Open Graph */}
            {(analysis.ogTitle || analysis.ogDescription || analysis.ogImage) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Open Graph (Sosyal Medya Önizleme)
                  </h3>
                </div>
                <div className="space-y-4">
                  {analysis.ogTitle && (
                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">OG Title</span>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{analysis.ogTitle}</p>
                    </div>
                  )}
                  {analysis.ogDescription && (
                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">OG Description</span>
                      <p className="mt-1 text-sm text-slate-900 dark:text-white">{analysis.ogDescription}</p>
                    </div>
                  )}
                  {analysis.ogImage && (
                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide block mb-2">OG Image</span>
                      <div className="mt-2">
                        <img
                          src={analysis.ogImage}
                          alt="OG Image"
                          className="max-w-md h-auto rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border-2 border-red-200 dark:border-red-700 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                    Tespit Edilen Sorunlar ({analysis.issues.length})
                  </h3>
                </div>
                <ul className="space-y-3">
                  {analysis.issues.map((issue, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border-l-4 border-red-400"
                    >
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-700 dark:text-red-300">{issue}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
