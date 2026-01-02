import React, { useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation, MapPin } from "lucide-react"
import L from "leaflet"
import { getFieldPinIcon } from "@/utils/fieldPinIcon"

interface LocationCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  addressText: string
  geoCoords?: [number, number] | null // [lng, lat]
  sportType?: string
}

export const LocationCard: React.FC<LocationCardProps> = ({ refObj, id, addressText, geoCoords, sportType }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.id = "leaflet-css"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const hasSize = () => {
      if (!mapContainerRef.current) return false
      const rect = mapContainerRef.current.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return
      const map = L.map(mapContainerRef.current, {
        center: [10.776889, 106.700806],
        zoom: 13,
        doubleClickZoom: false,
        zoomControl: true,
      })

      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      })
      tileLayer.addTo(map)

      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
      ;(L as any).Marker.prototype.options.icon = defaultIcon

      mapRef.current = map
      
      // Debounced resize handler to prevent map shaking
      const handleResize = () => {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }
        resizeTimeoutRef.current = setTimeout(() => {
          const anyMap = map as any
          if (anyMap && !anyMap._destroyed) {
            map.invalidateSize(false)
          }
        }, 150)
      }
      
      // Initial size validation
      setTimeout(() => {
        const anyMap = map as any
        if (anyMap && !anyMap._destroyed) {
          map.invalidateSize(false)
        }
      }, 100)
      
      // Listen to window resize
      window.addEventListener('resize', handleResize)
      
      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize)
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }
      }
    }

    if (!hasSize()) {
      setTimeout(() => {
        if (hasSize()) initializeMap()
      }, 250)
    } else {
      initializeMap()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let lat: number | null = null
    let lon: number | null = null
    if (geoCoords && Number.isFinite(geoCoords[0]) && Number.isFinite(geoCoords[1])) {
      lon = geoCoords[0]
      lat = geoCoords[1]
    }
    if (lat == null || lon == null) return
    
    // Debounce map updates to prevent shaking during scroll
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      if (!map || (map as any)._destroyed) return
      
      const fieldIcon = getFieldPinIcon(sportType, L)
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lon], {
          icon: fieldIcon
        }).addTo(map)
      } else {
        markerRef.current.setLatLng([lat, lon])
        markerRef.current.setIcon(fieldIcon)
      }
      
      // Use setView instead of flyTo to prevent animation that can cause shaking
      const currentZoom = map.getZoom()
      map.setView([lat, lon], Math.max(currentZoom, 14), { animate: false })
    }, 200)
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [geoCoords, sportType])

  const handleOpenMaps = () => {
    if (geoCoords) {
      const [lng, lat] = geoCoords
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
      return
    }
    if (addressText) window.open(`https://www.google.com/maps/search/${encodeURIComponent(addressText)}`, "_blank")
  }

  return (
    <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white scroll-mt-24">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Vị trí</CardTitle>
          <Button type="button" variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-500 bg-transparent" onClick={handleOpenMaps}>
            <Navigation className="h-4 w-4 mr-2" />
            Chỉ đường
          </Button>
        </div>
      </CardHeader>
      <hr className="border-t border-gray-300 my-0 mx-6" />
      <CardContent className="pt-6 space-y-4">
            {/* Address Display */}
            {addressText && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="bg-green-600 p-2 rounded-lg flex-shrink-0">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 text-sm mb-1">Địa chỉ sân</h4>
                  <p className="text-sm text-green-700">{addressText}</p>
                </div>
              </div>
            )}
            
            {/* Map Container */}
            <div className="h-96 rounded-lg relative overflow-hidden border border-gray-200 bg-gray-50">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
            </div>
      </CardContent>
    </Card>
  )
}

export default LocationCard


