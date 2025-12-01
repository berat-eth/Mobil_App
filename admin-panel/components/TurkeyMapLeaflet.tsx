'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet default icon sorununu çöz
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Minimalist icon oluştur
const createMinimalistIcon = (isSelected: boolean) => {
  const color = isSelected ? '#3b82f6' : '#6b7280'
  const size = isSelected ? 12 : 8
  
  return L.divIcon({
    className: 'minimalist-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

interface TurkeyMapLeafletProps {
  onCitySelect?: (city: string) => void
  selectedCity?: string
  className?: string
}

// Türkiye sınırları GeoJSON verisi (basitleştirilmiş)
const turkeyGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Türkiye" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [26.0, 36.0], [44.0, 36.0], [44.0, 42.0], [26.0, 42.0], [26.0, 36.0]
        ]]
      }
    }
  ]
}

// Şehir verileri
const cities = [
  { name: 'İstanbul', lat: 41.0082, lng: 28.9784, id: 'istanbul' },
  { name: 'Ankara', lat: 39.9334, lng: 32.8597, id: 'ankara' },
  { name: 'İzmir', lat: 38.4192, lng: 27.1287, id: 'izmir' },
  { name: 'Bursa', lat: 40.1826, lng: 29.0665, id: 'bursa' },
  { name: 'Antalya', lat: 36.8969, lng: 30.7133, id: 'antalya' },
  { name: 'Adana', lat: 37.0000, lng: 35.3213, id: 'adana' },
  { name: 'Konya', lat: 37.8746, lng: 32.4932, id: 'konya' },
  { name: 'Gaziantep', lat: 37.0662, lng: 37.3833, id: 'gaziantep' },
  { name: 'Mersin', lat: 36.8000, lng: 34.6333, id: 'mersin' },
  { name: 'Diyarbakır', lat: 37.9144, lng: 40.2306, id: 'diyarbakir' },
  { name: 'Samsun', lat: 41.2928, lng: 36.3313, id: 'samsun' },
  { name: 'Denizli', lat: 37.7765, lng: 29.0864, id: 'denizli' },
  { name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969, id: 'sanliurfa' },
  { name: 'Eskişehir', lat: 39.7767, lng: 30.5206, id: 'eskisehir' },
  { name: 'Malatya', lat: 38.3552, lng: 38.3095, id: 'malatya' },
  { name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371, id: 'kahramanmaras' },
  { name: 'Erzurum', lat: 39.9334, lng: 41.2767, id: 'erzurum' },
  { name: 'Van', lat: 38.4891, lng: 43.4089, id: 'van' },
  { name: 'Batman', lat: 37.8812, lng: 41.1351, id: 'batman' },
  { name: 'Elazığ', lat: 38.6810, lng: 39.2264, id: 'elazig' },
  { name: 'Trabzon', lat: 41.0027, lng: 39.7168, id: 'trabzon' },
  { name: 'Ordu', lat: 40.9839, lng: 37.8764, id: 'ordu' },
  { name: 'Afyon', lat: 38.7507, lng: 30.5567, id: 'afyon' },
  { name: 'Kayseri', lat: 38.7312, lng: 35.4787, id: 'kayseri' },
  { name: 'Zonguldak', lat: 41.4564, lng: 31.7987, id: 'zonguldak' },
  { name: 'Sivas', lat: 39.7477, lng: 37.0179, id: 'sivas' },
  { name: 'Mardin', lat: 37.3212, lng: 40.7245, id: 'mardin' },
  { name: 'Balıkesir', lat: 39.6484, lng: 27.8826, id: 'balikesir' },
  { name: 'Hatay', lat: 36.4018, lng: 36.3498, id: 'hatay' },
  { name: 'Manisa', lat: 38.6191, lng: 27.4289, id: 'manisa' },
  { name: 'Kırıkkale', lat: 39.8468, lng: 33.4988, id: 'kirikkale' },
  { name: 'Çorum', lat: 40.5506, lng: 34.9556, id: 'corum' },
  { name: 'Aydın', lat: 37.8560, lng: 27.8416, id: 'aydin' },
  { name: 'Muğla', lat: 37.2153, lng: 28.3636, id: 'mugla' },
  { name: 'Tekirdağ', lat: 40.9833, lng: 27.5167, id: 'tekirdag' },
  { name: 'Sakarya', lat: 40.7889, lng: 30.4053, id: 'sakarya' },
  { name: 'Bilecik', lat: 40.1501, lng: 29.9833, id: 'bilecik' },
  { name: 'Çanakkale', lat: 40.1553, lng: 26.4142, id: 'canakkale' },
  { name: 'Edirne', lat: 41.6771, lng: 26.5557, id: 'edirne' },
  { name: 'Kırklareli', lat: 41.7350, lng: 27.2256, id: 'kirklareli' },
  { name: 'Uşak', lat: 38.6821, lng: 29.4082, id: 'usak' },
  { name: 'Isparta', lat: 37.7648, lng: 30.5566, id: 'isparta' },
  { name: 'Burdur', lat: 37.7206, lng: 30.2906, id: 'burdur' },
  { name: 'Aksaray', lat: 38.3687, lng: 34.0370, id: 'aksaray' },
  { name: 'Nevşehir', lat: 38.6939, lng: 34.6857, id: 'nevsehir' },
  { name: 'Kırşehir', lat: 39.1425, lng: 34.1709, id: 'kirsehir' },
  { name: 'Yozgat', lat: 39.8181, lng: 34.8147, id: 'yozgat' },
  { name: 'Çankırı', lat: 40.6013, lng: 33.6134, id: 'cankiri' },
  { name: 'Kastamonu', lat: 41.3887, lng: 33.7827, id: 'kastamonu' },
  { name: 'Sinop', lat: 42.0231, lng: 35.1531, id: 'sinop' },
  { name: 'Amasya', lat: 40.6499, lng: 35.8353, id: 'amasya' },
  { name: 'Tokat', lat: 40.3167, lng: 36.5500, id: 'tokat' },
  { name: 'Giresun', lat: 40.9128, lng: 38.3895, id: 'giresun' },
  { name: 'Rize', lat: 41.0201, lng: 40.5234, id: 'rize' },
  { name: 'Artvin', lat: 41.1828, lng: 41.8183, id: 'artvin' },
  { name: 'Ardahan', lat: 41.1105, lng: 42.7022, id: 'ardahan' },
  { name: 'Kars', lat: 40.6013, lng: 43.0975, id: 'kars' },
  { name: 'Ağrı', lat: 39.7191, lng: 43.0503, id: 'agri' },
  { name: 'Iğdır', lat: 39.9200, lng: 44.0048, id: 'igdir' },
  { name: 'Tunceli', lat: 39.1079, lng: 39.5401, id: 'tunceli' },
  { name: 'Bingöl', lat: 38.8847, lng: 40.4982, id: 'bingol' },
  { name: 'Muş', lat: 38.9462, lng: 41.7539, id: 'mus' },
  { name: 'Bitlis', lat: 38.3938, lng: 42.1232, id: 'bitlis' },
  { name: 'Siirt', lat: 37.9274, lng: 41.9403, id: 'siirt' },
  { name: 'Hakkari', lat: 37.5833, lng: 43.7333, id: 'hakkari' },
  { name: 'Şırnak', lat: 37.4187, lng: 42.4918, id: 'sirnak' },
  { name: 'Adıyaman', lat: 37.7636, lng: 38.2789, id: 'adiyaman' },
  { name: 'Osmaniye', lat: 37.0742, lng: 36.2478, id: 'osmaniye' },
  { name: 'Kilis', lat: 36.7184, lng: 37.1212, id: 'kilis' },
  { name: 'Bartın', lat: 41.6344, lng: 32.3375, id: 'bartin' },
  { name: 'Karabük', lat: 41.2061, lng: 32.6204, id: 'karabuk' },
  { name: 'Düzce', lat: 40.8438, lng: 31.1565, id: 'duzce' },
  { name: 'Bolu', lat: 40.7395, lng: 31.6060, id: 'bolu' },
  { name: 'Yalova', lat: 40.6500, lng: 29.2667, id: 'yalova' },
  { name: 'Kocaeli', lat: 40.8533, lng: 29.8815, id: 'kocaeli' }
]

// Harita sınırlarını ayarlayan komponent
function MapBounds({ onMapReady }: { onMapReady: () => void }) {
  const map = useMap()
  const boundsSet = useRef(false)
  
  useEffect(() => {
    // Haritanın tamamen yüklendiğinden emin ol
    if (map && map.getContainer() && !boundsSet.current) {
      const container = map.getContainer()
      if (!container) return
      
      try {
        // Harita tamamen hazır olduğunda
        map.whenReady(() => {
          setTimeout(() => {
            try {
              // Container'ın boyutlarını kontrol et
              const containerRect = container.getBoundingClientRect()
              if (containerRect.width > 0 && containerRect.height > 0) {
                map.invalidateSize()
                
                setTimeout(() => {
                  try {
                    map.fitBounds([
                      [35.0, 25.0], // Güneybatı köşe
                      [42.0, 45.0]  // Kuzeydoğu köşe
                    ], { padding: [20, 20] })
                    
                    boundsSet.current = true
                    onMapReady()
                  } catch (error) {
                    console.warn('Map fitBounds hatası:', error)
                    onMapReady()
                  }
                }, 150)
              } else {
                onMapReady()
              }
            } catch (error) {
              console.warn('Map size kontrolü hatası:', error)
              onMapReady()
            }
          }, 100)
        })
      } catch (error) {
        console.warn('Map whenReady hatası:', error)
        onMapReady()
      }
    }
  }, [map, onMapReady])
  
  return null
}

export default function TurkeyMapLeaflet({ onCitySelect, selectedCity, className = '' }: TurkeyMapLeafletProps) {
  const [mounted, setMounted] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMapReady = useCallback(() => {
    // Harita tamamen yüklendiğinde marker'ları göster
    setTimeout(() => setMapReady(true), 100)
  }, [])

  if (!mounted) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600 dark:text-slate-400">Harita yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} relative`}>
      <MapContainer
        center={[39.0, 35.0]}
        zoom={6}
        className="h-full w-full rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ height: '400px', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <MapBounds onMapReady={handleMapReady} />
        
        {/* Tile Layer - Minimalist OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="minimalist-tiles"
        />
        
        {/* Türkiye sınırları - Minimalist */}
        {mapReady && (
          <GeoJSON
            data={turkeyGeoJSON as any}
            style={{
              fillColor: '#ffffff',
              weight: 1,
              opacity: 0.8,
              color: '#d1d5db',
              dashArray: '2',
              fillOpacity: 0.05
            }}
          />
        )}
        
        {/* Şehir markerları - Minimalist - Sadece harita hazır olduğunda render et */}
        {mapReady && cities.map((city) => (
          <Marker
            key={city.id}
            position={[city.lat, city.lng]}
            icon={createMinimalistIcon(selectedCity === city.name)}
            eventHandlers={{
              click: () => {
                if (onCitySelect) {
                  onCitySelect(city.name)
                }
              }
            }}
          >
            <Popup className="minimalist-popup">
              <div className="text-center p-2">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">{city.name}</h3>
                <button
                  onClick={() => {
                    if (onCitySelect) {
                      onCitySelect(city.name)
                    }
                  }}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Seç
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Seçilen şehir bilgisi - Minimalist */}
      {selectedCity && (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-md shadow-sm p-2 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Seçilen: <span className="text-slate-800 dark:text-slate-200">{selectedCity}</span>
          </p>
        </div>
      )}
    </div>
  )
}
