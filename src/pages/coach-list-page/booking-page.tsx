"use client"

import { NavbarDarkComponent } from "../../components/header/navbar-dark-component"
import logger from "@/utils/logger"
import PageHeader from "../../components/header-banner/page-header"
import CoachCard from "./card-list/coach-card-props"
import { useRef, useEffect, useState, useMemo } from "react"
import { FooterComponent } from "../../components/footer/footer-component"
import { useGeolocation } from "../../hooks/useGeolocation"
import { Navigation, MapPin, AlertCircle, Filter } from "lucide-react"
import { PageWrapper } from "../../components/layouts/page-wrapper"
import { Loading } from "@/components/ui/loading"
import { useAppDispatch, useAppSelector } from "../../store/hook"
import { getCoaches } from "../../features/coach/coachThunk"
import type { Coach } from "../../types/coach-type"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SPORT_TYPE_OPTIONS, VIETNAM_CITIES } from "@/utils/constant-value/constant"

const BookingPage = () => {
    const coachesListRef = useRef<HTMLDivElement>(null)
    const dispatch = useAppDispatch()
    const { coaches: coachesData, loading: coachesLoading, error: coachesError } = useAppSelector((state) => state.coach)

    const breadcrumbs = [{ label: "Trang chủ", href: "/" }, { label: "Đặt huấn luyện viên" }]

    // Filter states
    const [selectedSport, setSelectedSport] = useState<string>('all')
    const [selectedLocation, setSelectedLocation] = useState<string>('all')

    // Map Coach data to format expected by CoachCard
    const coaches = useMemo(() => {
        if (!coachesData || !Array.isArray(coachesData)) return []
        return coachesData.map((coach: Coach) => ({
            id: coach.id,
            name: coach.fullName,
            location: coach.location || '', // Use location from Coach type
            description: coach.bio || '',
            rating: coach.rating || 0,
            totalReviews: coach.totalReviews || 0,
            price: coach.hourlyRate ? `${coach.hourlyRate.toLocaleString('vi-VN')}đ/giờ` : '0đ/giờ',
            nextAvailability: null, // Not available in current API
            avatarUrl: coach.avatarUrl,
            sports: coach.sports || '', // Add sports field
        }))
    }, [coachesData])

    const [addressText, setAddressText] = useState<string>("")
    const {
        error: geolocationError,
        loading: geolocationLoading,
        supported: geolocationSupported,
        getCoordinates
    } = useGeolocation()
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    // Leaflet map refs and container id
    const mapContainerId = 'coaches-map-container'
    const mapRef = useRef<any>(null)
    const markersRef = useRef<any[]>([])

    // Normalized coaches for map markers
    // Note: Location data not available in current Coach API response
    // This can be enhanced when location data is added to the API
    const mappedCoaches = useMemo(() => {
        return coaches.map((coach: any) => {
            // Location data not available in current API response
            // Return empty location for now
            return {
                id: coach.id,
                name: coach.name,
                locationText: coach.location || '',
                latitude: undefined,
                longitude: undefined,
            }
        })
    }, [coaches])

    const handleGetLocation = async () => {
        try {
            const coords = await getCoordinates()
            if (coords && coords.lat && coords.lng) {
                setUserLocation({ lat: coords.lat, lng: coords.lng } as any)
                setAddressText(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
            }
        } catch {
            // ignore
        }
    }

    // Fetch coaches using Redux thunk with filters
    useEffect(() => {
        const filters: any = {}
        if (selectedSport !== 'all') {
            filters.sportType = selectedSport
        }
        if (selectedLocation !== 'all') {
            filters.district = selectedLocation
        }
        dispatch(getCoaches(Object.keys(filters).length > 0 ? filters : undefined))
    }, [dispatch, selectedSport, selectedLocation])

    // Initialize Leaflet map once (copied pattern from field list page)
    useEffect(() => {
        ; (async () => {
            try {
                const hasLeaflet = typeof (window as any).L !== 'undefined'
                if (!hasLeaflet) {
                    await new Promise<void>((resolve) => {
                        if (!document.getElementById('leaflet-css')) {
                            const link = document.createElement('link')
                            link.id = 'leaflet-css'
                            link.rel = 'stylesheet'
                            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
                            link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
                            link.crossOrigin = ''
                            document.head.appendChild(link)
                        }
                        const scriptId = 'leaflet-js'
                        if (document.getElementById(scriptId)) {
                            resolve()
                            return
                        }
                        const script = document.createElement('script')
                        script.id = scriptId
                        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
                        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
                        script.crossOrigin = ''
                        script.onload = () => resolve()
                        document.body.appendChild(script)
                    })
                }
                const L: any = (window as any).L
                if (!mapRef.current) {
                    const container = document.getElementById(mapContainerId)
                    if (!container) return
                    mapRef.current = L.map(mapContainerId).setView([16.0471, 108.2062], 12)
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19,
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(mapRef.current)
                }
            } catch (e) {
                logger.error('Failed to initialize map', e)
            }
        })()
    }, [])

    // Update markers when coaches or user location changes
    useEffect(() => {
        const L: any = (window as any).L
        if (!L || !mapRef.current) return

        // Fix default marker icon
        const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
        L.Marker.prototype.options.icon = defaultIcon

        // Clear old markers
        markersRef.current.forEach(m => m.remove && m.remove())
        markersRef.current = []

        const bounds = L.latLngBounds([])

        // User location marker
        if (userLocation && userLocation.lat && userLocation.lng) {
            const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
                radius: 6,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.9
            }).addTo(mapRef.current)
            userMarker.bindPopup('Vị trí của bạn')
            markersRef.current.push(userMarker)
            bounds.extend([userLocation.lat, userLocation.lng])
        }

        // Coach markers
        mappedCoaches.forEach((c) => {
            if (c.latitude != null && c.longitude != null) {
                const marker = L.marker([c.latitude, c.longitude], {
                    icon: defaultIcon
                }).addTo(mapRef.current)
                const popupHtml = `
                    <div style="min-width: 160px">
                        <div style="font-weight:600;margin-bottom:4px">${c.name}</div>
                        <div style="font-size:12px;color:#4b5563;">${c.locationText || ''}</div>
                    </div>
                `
                marker.bindPopup(popupHtml)
                markersRef.current.push(marker)
                bounds.extend([c.latitude, c.longitude])
            }
        })

        if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds.pad(0.2))
        }
    }, [mappedCoaches, userLocation])



    return (
        <div className="min-h-screen">
            <style>{`
                /* Custom scrollbar styles */
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }

                /* Smooth scroll snap behavior */
                .scroll-snap-start {
                    scroll-snap-align: start;
                }

                /* Custom scroll container */
                .custom-scroll-container {
                    scroll-behavior: smooth;
                    overflow-y: auto;
                }

            {/* Map container specific styles */}
                .map-container {
                    position: relative;
                    height: 40vh;
                    overflow: hidden;
                }
                @media (min-width: 1024px) {
                    .map-container {
                        position: sticky;
                        top: 0;
                        height: 1078px;
                    }
                }
            `}</style>
            <NavbarDarkComponent />
            <PageWrapper>
                <PageHeader title="Đặt huấn luyện viên" breadcrumbs={breadcrumbs} />

                {/* Main container with flexbox layout */}
                <div className="px-4 min-h-screen">
                    <div className="flex flex-col-reverse lg:flex-row gap-6 items-start">
                        {/* Left Panel - Coaches List */}
                        <div className="w-full lg:w-[60%] bg-white flex flex-col min-h-[50vh] lg:h-screen">
                            {/* Filters */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">Lọc theo:</span>
                                    </div>
                                    <Select value={selectedSport} onValueChange={setSelectedSport}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="Tất cả môn" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SPORT_TYPE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Tất cả khu vực" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px] overflow-y-auto">
                                                <SelectItem value="all">Tất cả khu vực</SelectItem>
                                                {VIETNAM_CITIES.map((city) => (
                                                    <SelectItem key={city} value={city}>
                                                        {city}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            {/* Geolocation UI (copied from field list style) */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <Navigation className="w-4 h-4" />
                                            Tìm HLV gần tôi
                                        </h3>
                                        {geolocationSupported ? (
                                            <button
                                                onClick={handleGetLocation}
                                                disabled={geolocationLoading}
                                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                                            >
                                                {geolocationLoading ? (
                                                    <>
                                                        <Loading size={16} className="mr-2" />
                                                        Đang lấy vị trí...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Navigation className="w-4 h-4" />
                                                        Lấy vị trí của tôi
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Trình duyệt không hỗ trợ định vị</span>
                                            </div>
                                        )}
                                        {userLocation && (
                                            <div className="flex items-center gap-2 text-sm text-green-600">
                                                <MapPin className="w-4 h-4" />
                                                <span>
                                                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                                </span>
                                            </div>
                                        )}
                                        {geolocationError && (
                                            <div className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>{geolocationError.message}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div
                                ref={coachesListRef}
                                className="flex-1 overflow-y-auto scrollbar-hide"
                                style={{
                                    scrollBehavior: "smooth",
                                    scrollSnapType: "y mandatory"
                                }}
                            >
                                <div className="space-y-4">
                                    {coachesLoading && (
                                        <div className="flex flex-col items-center justify-center p-12 gap-4 border-2 border-dashed border-gray-200 rounded-xl">
                                            <Loading size={40} className="text-green-600" />
                                            <div className="text-gray-500 font-medium">Đang tải danh sách huấn luyện viên...</div>
                                        </div>
                                    )}
                                    {coachesError && <div className="text-red-500">{coachesError.message || 'Lỗi khi lấy danh sách huấn luyện viên'}</div>}
                                    {!coachesLoading && !coachesError && coaches.length === 0 && (
                                        <div>Không có huấn luyện viên nào.</div>
                                    )}
                                    {!coachesLoading && !coachesError && coaches.map((coach, index) => (
                                        <div key={coach.id || index} className="scroll-snap-start">
                                            <CoachCard
                                                id={coach.id}
                                                name={coach.name}
                                                location={coach.location}
                                                description={coach.description}
                                                rating={coach.rating}
                                                reviews={coach.totalReviews}
                                                price={coach.price}
                                                nextAvailability={coach.nextAvailability ?? ''}
                                                avatarUrl={coach.avatarUrl}
                                                sports={coach.sports}
                                            />

                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Map (4/10 columns) */}
                        <div className="w-full lg:w-[40%] relative">
                            <div className="mb-3 p-3 bg-white border border-gray-200 rounded-md text-sm text-gray-700 lg:absolute lg:top-4 lg:z-10 bg-white/90">
                                {addressText ? `Địa chỉ: ${addressText}` : 'Chọn vị trí để xem trên bản đồ'}
                            </div>
                            <div className="lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] w-full">
                                <div id={mapContainerId} className="map-container relative w-full border-0 m-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </PageWrapper>

            {/* Footer để đảm bảo có thể scroll */}
            <FooterComponent />
        </div>
    )
}

export default BookingPage