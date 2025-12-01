'use client'

import React from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTheme } from '@/lib/ThemeContext'
import { TrendingUp, Activity, AlertTriangle } from 'lucide-react'

interface SnortChartsProps {
  statsData: Array<{ date: string; total: number; high: number; medium: number; low: number; alerts: number; dropped: number }>
  protocolData: Array<{ protocol: string; count: number }>
  topAttackers: Array<{ ip: string; count: number; high: number; medium: number; low: number; location?: any }>
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

export default function SnortCharts({ statsData, protocolData, topAttackers }: SnortChartsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className={`rounded-xl shadow-lg p-3 ${isDark ? 'bg-slate-800 text-slate-100 border border-slate-700' : 'bg-white text-slate-800 border border-slate-200'}`}>
        <p className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Zaman Bazlı Trend Grafiği */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Zaman Bazlı Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={statsData}>
            <defs>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} />
            <XAxis dataKey="date" stroke={isDark ? '#cbd5e1' : '#94a3b8'} />
            <YAxis stroke={isDark ? '#cbd5e1' : '#94a3b8'} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="high" stackId="1" stroke="#ef4444" fill="url(#colorHigh)" name="Yüksek" />
            <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="url(#colorMedium)" name="Orta" />
            <Area type="monotone" dataKey="low" stackId="1" stroke="#3b82f6" fill="url(#colorLow)" name="Düşük" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Protokol Dağılımı */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Protokol Dağılımı</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={protocolData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ protocol, percent }) => `${protocol} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {protocolData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Aksiyon Dağılımı */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Aksiyon Dağılımı</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statsData.length > 0 ? [statsData.reduce((acc, curr) => ({
              alerts: acc.alerts + curr.alerts,
              dropped: acc.dropped + curr.dropped
            }), { alerts: 0, dropped: 0 })] : []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f0f0f0'} />
              <XAxis dataKey="name" stroke={isDark ? '#cbd5e1' : '#94a3b8'} />
              <YAxis stroke={isDark ? '#cbd5e1' : '#94a3b8'} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="alerts" fill="#f59e0b" name="Uyarılar" />
              <Bar dataKey="dropped" fill="#ef4444" name="Engellenen" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Attackers */}
      {topAttackers && topAttackers.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">En Çok Saldırı Yapan IP'ler</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">IP Adresi</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Konum</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Toplam</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Yüksek</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Orta</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Düşük</th>
                </tr>
              </thead>
              <tbody>
                {topAttackers.map((attacker, index) => (
                  <tr key={attacker.ip} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono text-sm text-slate-800 dark:text-slate-200">{attacker.ip}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                      {attacker.location?.country || 'Unknown'} {attacker.location?.city ? `- ${attacker.location.city}` : ''}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">{attacker.count}</td>
                    <td className="p-3 text-right text-red-600 dark:text-red-400">{attacker.high}</td>
                    <td className="p-3 text-right text-orange-600 dark:text-orange-400">{attacker.medium}</td>
                    <td className="p-3 text-right text-blue-600 dark:text-blue-400">{attacker.low}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

