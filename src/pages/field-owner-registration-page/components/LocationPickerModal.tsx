import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Search } from 'lucide-react'
import { Loading } from '@/components/ui/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import logger from '@/utils/logger'

// Types
interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (address: string, coordinates: { lat: number; lng: number }) => void
  initialAddress?: string
  initialCoordinates?: { lat: number; lng: number }
}

interface GeocodingResult {
  lat: number
  lon: number
  display_name: string
}

// Constants
const DEFAULT_CENTER: [number, number] = [10.776889, 106.700806] // Ho Chi Minh City
const MAP_CONFIG = {
  zoom: 13,
  maxZoom: 19,
  flyToZoom: 14,
  flyToDuration: 1.2,
  flyToEaseLinearity: 0.25,
}

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search'

// Utility functions
const parseLatLngFromString = (input: string): [number, number] | null => {
  const latLngMatch = input.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/)
  if (!latLngMatch) return null

  const lat = parseFloat(latLngMatch[1])
  const lng = parseFloat(latLngMatch[2])

  return !Number.isNaN(lat) && !Number.isNaN(lng) ? [lat, lng] : null
}

const buildSearchCandidates = (input: string): string[] => {
  const postalRegex = /\b\d{5,6}\b/g
  const withoutPostal = input.replace(postalRegex, '').trim()

  const baseVariants = [input, withoutPostal].filter(Boolean)
  const withCountry = baseVariants.flatMap((v) => [
    v,
    `${v}, Việt Nam`,
    `${v}, Vietnam`,
  ])

  return Array.from(new Set(withCountry))
}

const searchLocation = async (query: string): Promise<GeocodingResult | null> => {
  const candidates = buildSearchCandidates(query)

  for (const candidate of candidates) {
    try {
      const url = `${NOMINATIM_BASE_URL}?format=jsonv2&limit=5&addressdetails=1&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(candidate)}`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) continue

      const data: Array<{
        lat: string
        lon: string
        display_name: string
        importance?: number
      }> = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        const best = data
          .slice()
          .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0]
        const lat = parseFloat(best.lat)
        const lon = parseFloat(best.lon)

        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          return { lat, lon, display_name: best.display_name }
        }
      }
    } catch (error) {
      logger.warn(`Failed to search for: ${candidate}`, error)
      continue
    }
  }

  return null
}

const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    return data.display_name ?? null
  } catch {
    return null
  }
}

export function LocationPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialAddress = '',
  initialCoordinates,
}: LocationPickerModalProps) {
  // State
  const [searchQuery, setSearchQuery] = useState(initialAddress)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState(initialAddress)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number
    lng: number
  } | null>(initialCoordinates || null)

  // Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return

    let initTimer: NodeJS.Timeout

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return

      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (!mapContainerRef.current || mapRef.current) return

        try {
          const map = L.map(mapContainerRef.current, {
            center: initialCoordinates
              ? [initialCoordinates.lat, initialCoordinates.lng]
              : DEFAULT_CENTER,
            zoom: MAP_CONFIG.zoom,
            zoomControl: true,
          })

          // Add tile layer with error handling
          const tileLayer = L.tileLayer(TILE_LAYER_URL, {
            attribution: '© OpenStreetMap contributors',
            maxZoom: MAP_CONFIG.maxZoom,
            errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          })

          tileLayer.addTo(map)

          // Add error event listener
          tileLayer.on('tileerror', (error) => {
            logger.error('[LocationPickerModal] Tile loading error:', error)
          })

          // Fix default marker icon
          const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          })
          L.Marker.prototype.options.icon = defaultIcon

          // Create a draggable marker
          const marker = L.marker(
            initialCoordinates
              ? [initialCoordinates.lat, initialCoordinates.lng]
              : DEFAULT_CENTER,
            { draggable: true, icon: defaultIcon }
          ).addTo(map)

          // Handle drag end -> update state
          marker.on('dragend', async () => {
            const pos = marker.getLatLng()
            const address = await reverseGeocode(pos.lat, pos.lng)
            setSelectedCoordinates({ lat: pos.lat, lng: pos.lng })
            setSelectedAddress(address || '')
            setSearchQuery(address || '')
          })

          // Attach click handler to map
          const handleMapClick = async (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng
            marker.setLatLng([lat, lng])
            const address = await reverseGeocode(lat, lng)
            setSelectedCoordinates({ lat, lng })
            setSelectedAddress(address || '')
            setSearchQuery(address || '')
          }
          map.on('click', handleMapClick)

          markerRef.current = marker
          mapRef.current = map

          // Invalidate size multiple times to ensure map renders correctly
          // After Dialog animation completes and container has proper size
          const invalidateSizes = [100, 300, 500, 700, 1000]
          invalidateSizes.forEach((delay) => {
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize()
              }
            }, delay)
          })

          logger.debug('[LocationPickerModal] Map initialized successfully')
        } catch (error) {
          logger.error('[LocationPickerModal] Error initializing map:', error)
        }
      })
    }

    // Wait for Dialog animation to complete before initializing map
    // Dialog animation typically takes 200-300ms, wait longer to be safe
    initTimer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return

      // Check if container has dimensions
      const container = mapContainerRef.current
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        logger.warn('[LocationPickerModal] Map container has no dimensions, retrying...')
        // Retry after a short delay
        setTimeout(() => {
          if (!mapContainerRef.current || mapRef.current) return
          initializeMap()
        }, 200)
        return
      }

      initializeMap()
    }, 400)

    return () => {
      clearTimeout(initTimer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [isOpen, initialCoordinates])

  // Invalidate size when modal opens (in case map was already initialized)
  useEffect(() => {
    if (!mapRef.current || !isOpen) return

    // Invalidate multiple times to ensure map renders correctly
    const invalidateTimers = [100, 300, 500, 700, 1000].map((delay) =>
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
        }
      }, delay)
    )

    return () => {
      invalidateTimers.forEach((timer) => clearTimeout(timer))
    }
  }, [isOpen])

  // Update map position
  const updateMapPosition = useCallback(
    (lat: number, lng: number, address: string) => {
      if (!mapRef.current || !markerRef.current) return

      setSelectedCoordinates({ lat, lng })
      setSelectedAddress(address)
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), MAP_CONFIG.flyToZoom), {
        duration: MAP_CONFIG.flyToDuration,
        easeLinearity: MAP_CONFIG.flyToEaseLinearity,
      })
    },
    []
  )

  // Handle search
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim()
    if (!query || !mapRef.current || !markerRef.current) return

    setIsSearching(true)

    try {
      // Check if input is direct lat,lng coordinates
      const coordinates = parseLatLngFromString(query)
      if (coordinates) {
        const [lat, lng] = coordinates
        updateMapPosition(lat, lng, query)
        return
      }

      // Search using geocoding service
      const result = await searchLocation(query)

      if (result) {
        updateMapPosition(result.lat, result.lon, result.display_name)
      } else {
        alert('Không tìm thấy địa điểm phù hợp')
      }
    } catch (error) {
      logger.error('Geocoding error:', error)
      alert('Có lỗi xảy ra khi tìm kiếm địa điểm')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, updateMapPosition])

  // Handle confirm
  const handleConfirm = () => {
    if (selectedCoordinates && selectedAddress) {
      onSelect(selectedAddress, selectedCoordinates)
      onClose()
    } else {
      alert('Vui lòng chọn một địa điểm trên bản đồ')
    }
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialAddress)
      setSelectedAddress(initialAddress)
      setSelectedCoordinates(initialCoordinates || null)
    }
  }, [isOpen, initialAddress, initialCoordinates])

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl w-full p-0 max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Chọn địa điểm cơ sở vật chất</DialogTitle>
          <DialogDescription>
            Tìm kiếm hoặc click trên bản đồ để chọn vị trí
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label>Địa chỉ</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập địa chỉ hoặc tọa độ (lat, lng)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
              >
                {isSearching ? (
                  <Loading size={16} />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Map */}
          <div className="space-y-2">
            <Label>Bản đồ</Label>
            <div className="h-96 rounded-lg relative overflow-hidden border bg-gray-100">
              <div
                ref={mapContainerRef}
                className="absolute inset-0 z-0 w-full h-full"
                style={{ minHeight: '384px' }}
              />
              {/* Map Overlay - pointer-events-none để không chặn click events */}
              <div className="absolute top-2 left-2 bg-white/95 backdrop-blur p-3 rounded shadow-lg max-w-xs z-[1000] pointer-events-none">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">
                      {selectedAddress || 'Chưa chọn địa điểm'}
                    </p>
                    {selectedCoordinates && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Location Info */}
          {selectedCoordinates && (
            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900">Địa điểm đã chọn</p>
                  <p className="text-sm text-blue-700 mt-1 break-words">
                    {selectedAddress}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Tọa độ: {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedCoordinates}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

