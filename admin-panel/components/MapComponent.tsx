'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface LiveUser {
  id: string
  userId?: number
  sessionId: string
  city: string
  country: string
  latitude?: number
  longitude?: number
  device: string
  os: string
  page: string
  userName?: string
  userPhone?: string
}

interface MapComponentProps {
  users: LiveUser[]
}

export default function MapComponent({ users }: MapComponentProps) {
  // Calculate center based on users' locations
  const getCenter = () => {
    const usersWithLocation = users.filter(u => u.latitude && u.longitude)
    if (usersWithLocation.length === 0) {
      return [39.9334, 32.8597] // Türkiye merkezi
    }
    
    const avgLat = usersWithLocation.reduce((sum, u) => sum + (u.latitude || 0), 0) / usersWithLocation.length
    const avgLng = usersWithLocation.reduce((sum, u) => sum + (u.longitude || 0), 0) / usersWithLocation.length
    return [avgLat, avgLng]
  }

  const center = getCenter()
  const usersWithLocation = users.filter(u => u.latitude && u.longitude)

  // Set zoom based on number of users
  const getZoom = () => {
    if (usersWithLocation.length === 0) return 6
    if (usersWithLocation.length === 1) return 10
    if (usersWithLocation.length <= 3) return 8
    return 6
  }

  return (
    <MapContainer
      center={center as [number, number]}
      zoom={getZoom()}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {usersWithLocation.map((user) => (
        <Marker
          key={user.id || user.sessionId}
          position={[user.latitude!, user.longitude!]}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="font-semibold text-sm mb-2 text-slate-800">
                {user.userName || (user.userId ? `Kullanıcı #${user.userId}` : 'Misafir')}
              </div>
              {user.userPhone && (
                <div className="text-xs text-slate-600 mb-1">
                  📱 {user.userPhone}
                </div>
              )}
              <div className="text-xs text-slate-500 mb-1">
                📍 {user.city}, {user.country}
              </div>
              <div className="text-xs text-slate-500 mb-1">
                💻 {user.device} • {user.os}
              </div>
              <div className="text-xs text-slate-500">
                🌐 {user.page || '/'}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

