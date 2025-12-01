'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// CSS'i sadece client-side'da yükle
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css')
}

// Leaflet'i dinamik olarak yükle (SSR hatası için)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface SnortMapProps {
  logs: Array<{
    sourceIp: string
    destIp: string
    priority: 'high' | 'medium' | 'low'
    location?: {
      lat: number | null
      lon: number | null
      country: string
      city: string
    }
  }>
}

export default function SnortMap({ logs }: SnortMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then(L => {
        // Leaflet icon sorununu düzelt
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
        setLeafletLoaded(true)
      })
      setMapReady(true)
    }
  }, [])

  // IP'leri grupla ve konum bilgilerini topla
  const ipLocations = new Map<string, { lat: number; lon: number; count: number; priority: string; ips: string[] }>()

  logs.forEach(log => {
    if (log.location?.lat && log.location?.lon) {
      const key = `${log.location.lat},${log.location.lon}`
      if (!ipLocations.has(key)) {
        ipLocations.set(key, {
          lat: log.location.lat,
          lon: log.location.lon,
          count: 0,
          priority: log.priority,
          ips: []
        })
      }
      const loc = ipLocations.get(key)!
      loc.count++
      if (!loc.ips.includes(log.sourceIp)) {
        loc.ips.push(log.sourceIp)
      }
    }
  })

  const markers = Array.from(ipLocations.values())

  if (!mapReady || !leafletLoaded || markers.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400 text-center py-12">
          {markers.length === 0 ? 'Harita için konum verisi bulunamadı' : 'Harita yükleniyor...'}
        </p>
      </div>
    )
  }

  // Merkez noktayı hesapla
  const centerLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length
  const centerLon = markers.reduce((sum, m) => sum + m.lon, 0) / markers.length
  const center: [number, number] = [centerLat, centerLon]

  const getMarkerColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">IP Lokasyon Haritası</h3>
      <div className="h-[500px] rounded-xl overflow-hidden">
        <MapContainer
          center={center}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={[marker.lat, marker.lon]}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-sm mb-1">
                    {marker.ips.length} IP adresi
                  </p>
                  <p className="text-xs text-slate-600 mb-2">
                    {marker.count} log kaydı
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {marker.ips.slice(0, 3).map(ip => (
                      <span key={ip} className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {ip}
                      </span>
                    ))}
                    {marker.ips.length > 3 && (
                      <span className="text-xs text-slate-500">+{marker.ips.length - 3} daha</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

