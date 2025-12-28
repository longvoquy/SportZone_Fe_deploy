"use client"

import { FieldOwnerDashboardLayout } from "../../../components/layouts/field-owner-dashboard-layout"
import OwnerFieldCard from "./owner-field-card"
import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "../../../store/hook"
import { getMyFields } from "../../../features/field/fieldThunk"
import { Filter } from "lucide-react"
import { SportType } from "@/components/enums/ENUMS"
import { getFieldPinIcon } from "@/utils/fieldPinIcon"
import logger from "@/utils/logger"

// Constants
const DEFAULT_FILTERS = {
    name: "",
    sportType: "" as SportType | string,
    isActive: undefined as boolean | undefined,
    page: 1,
    limit: 10
}

const MAP_CENTER: [number, number] = [16.0471, 108.2062] // Da Nang
const MAP_ZOOM = 12

// Helper function to normalize location
const normalizeLocation = (rawLocation: any): string => {
    if (typeof rawLocation === 'string' && rawLocation.trim()) {
        return rawLocation
    }

    if (rawLocation && typeof rawLocation === 'object') {
        const address = rawLocation.address
        const geo = rawLocation.geo
        const lat = geo?.latitude ?? geo?.lat
        const lng = geo?.longitude ?? geo?.lng

        if (typeof address === 'string' && address.trim()) {
            return address
        }
        if (lat != null && lng != null) {
            return `${lat}, ${lng}`
        }
    }

    return 'Địa chỉ không xác định'
}

// Helper function to extract coordinates
const extractCoordinates = (field: any) => {
    // Try location.geo.coordinates first (GeoJSON format: [longitude, latitude])
    if (field?.location?.geo?.coordinates && Array.isArray(field.location.geo.coordinates)) {
        const [lng, lat] = field.location.geo.coordinates
        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
            return { lat, lng }
        }
    }

    // Fallback to other possible formats
    const lat = field.latitude ?? field.lat ?? field?.geo?.lat ?? field?.geo?.latitude
    const lng = field.longitude ?? field.lng ?? field?.geo?.lng ?? field?.geo?.longitude

    return {
        lat: typeof lat === 'number' && !isNaN(lat) ? lat : null,
        lng: typeof lng === 'number' && !isNaN(lng) ? lng : null,
    }
}

const OwnerFieldListPage = () => {
    const dispatch = useAppDispatch()
    const { fields, loading, error, pagination } = useAppSelector((state) => state.field)

    const [filters, setFilters] = useState(DEFAULT_FILTERS)
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastFiltersRef = useRef<string>("")
    const isInitialMount = useRef(true)

    // Map refs
    const mapContainerId = 'owner-fields-map-container'
    const mapRef = useRef<any>(null)
    const markersRef = useRef<any[]>([])

    // Transform fields data - memoized to avoid recalculation
    const transformedFields = useMemo(() => {
        return fields.map((field: any) => {
            const coords = extractCoordinates(field)

            return {
                id: field.id,
                name: field.name,
                location: normalizeLocation(field.location ?? field.address),
                description: field.description || 'Mô tả không có sẵn',
                rating: field.rating ?? 0,
                reviews: field.totalReviews ?? field.totalBookings ?? 0,
                price: field.price || `${field.basePrice || 0}k/h`,
                nextAvailability: field.isActive !== false ? 'Có sẵn' : 'Không có sẵn',
                sportType: field.sportType || 'unknown',
                imageUrl: field.imageUrl || field.images?.[0] || '/placeholder-field.jpg',
                isActive: field.isActive !== false,
                latitude: coords.lat,
                longitude: coords.lng,
            }
        })
    }, [fields])

    // Fetch fields with debounce - only when filters change
    useEffect(() => {
        const filtersKey = JSON.stringify(filters)

        // Skip nếu là lần mount đầu tiên và đã có data với filters mặc định
        if (isInitialMount.current) {
            isInitialMount.current = false
            // Nếu đã có data trong store và filters đang ở mặc định, không fetch lại
            if (fields.length > 0 && filtersKey === JSON.stringify(DEFAULT_FILTERS)) {
                lastFiltersRef.current = filtersKey
                return
            }
        }

        // Skip if filters haven't changed
        if (filtersKey === lastFiltersRef.current) {
            return
        }

        // Clear previous timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        // Update last filters immediately to prevent duplicate calls
        lastFiltersRef.current = filtersKey

        // Debounce API call
        debounceTimeoutRef.current = setTimeout(() => {
            dispatch(getMyFields({
                ...filters,
                sportType: filters.sportType as any
            }))
        }, 300) // Reduced from 500ms to 300ms for better UX

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [dispatch, filters, fields.length])

    // Initialize map once
    useEffect(() => {
        const loadLeaflet = async () => {
            // Check if Leaflet is already loaded
            if (typeof (window as any).L !== 'undefined') {
                initMap()
                return
            }

            // Load CSS
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link')
                link.id = 'leaflet-css'
                link.rel = 'stylesheet'
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
                link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
                link.crossOrigin = ''
                document.head.appendChild(link)
            }

            // Load JS
            const scriptId = 'leaflet-js'
            if (document.getElementById(scriptId)) {
                return
            }

            const script = document.createElement('script')
            script.id = scriptId
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
            script.crossOrigin = ''
            script.onload = initMap
            document.body.appendChild(script)
        }

        const initMap = () => {
            const L: any = (window as any).L
            if (!L || mapRef.current) return

            const container = document.getElementById(mapContainerId)
            if (!container) return

            try {
                mapRef.current = L.map(mapContainerId).setView(MAP_CENTER, MAP_ZOOM)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(mapRef.current)
            } catch (e) {
                logger.error('Failed to initialize map', e)
            }
        }

        loadLeaflet()
    }, [])

    // Update map markers when fields change
    useEffect(() => {
        const L: any = (window as any).L
        if (!L || !mapRef.current) {
            return
        }

        // Clear old markers
        markersRef.current.forEach(marker => {
            try {
                marker.remove?.()
            } catch (e) {
                logger.error('Error removing marker:', e)
            }
        })
        markersRef.current = []

        const bounds = L.latLngBounds([])
        let hasValidMarkers = false

        // Add markers for fields with coordinates
        transformedFields.forEach((field) => {
            if (field.latitude != null && field.longitude != null &&
                !isNaN(field.latitude) && !isNaN(field.longitude)) {
                try {
                    const marker = L.marker([field.latitude, field.longitude], {
                        icon: getFieldPinIcon(field.sportType, L)
                    }).addTo(mapRef.current)

                    const popupHtml = `
                        <div style="min-width: 160px">
                            <div style="font-weight:600;margin-bottom:4px">${field.name}</div>
                            <div style="font-size:12px;color:#4b5563;">${field.location}</div>
                            ${field.price ? `<div style="font-size:12px;margin-top:4px;color:#065f46">Giá: ${field.price}</div>` : ''}
                            <div style="font-size:12px;margin-top:4px;color:#059669">Trạng thái: ${field.nextAvailability}</div>
                        </div>
                    `
                    marker.bindPopup(popupHtml)
                    markersRef.current.push(marker)
                    bounds.extend([field.latitude, field.longitude])
                    hasValidMarkers = true
                } catch (e) {
                    logger.error('Error adding marker for field:', field.name, e)
                }
            } else {
                logger.debug('Field missing coordinates', { name: field.name });
            }
        })

        if (hasValidMarkers && bounds.isValid()) {
            try {
                mapRef.current.fitBounds(bounds.pad(0.2))
            } catch (e) {
                logger.error('Error fitting bounds:', e)
            }
        } else if (transformedFields.length > 0) {
            logger.debug('No valid markers found for fields');
        }
    }, [transformedFields])

    // Filter handlers
    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, name: e.target.value, page: 1 }))
    }, [])

    const handleSportTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, sportType: e.target.value, page: 1 }))
    }, [])

    const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({
            ...prev,
            isActive: e.target.value === "" ? undefined : e.target.value === "true",
            page: 1
        }))
    }, [])

    const handlePageChange = useCallback((newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }))
    }, [])

    const totalPages = pagination ? Math.ceil(pagination.total / filters.limit) : 0

    return (
        <div className="min-h-screen">
            <style>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scroll-snap-start {
                    scroll-snap-align: start;
                }
            `}</style>

            <FieldOwnerDashboardLayout>
                <div className="px-4 min-h-screen">
                    <div className="flex gap-6 items-start">
                        {/* Left Panel - Fields List */}
                        <div className="flex-[6] bg-white flex flex-col h-screen">
                            {/* Filters */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Danh sách sân thể thao
                                    </h3>
                                    <div className="text-sm text-gray-600">
                                        Tổng cộng: {pagination?.total || 0} sân
                                    </div>
                                </div>

                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm theo tên sân..."
                                            value={filters.name}
                                            onChange={handleNameChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={filters.sportType}
                                            onChange={handleSportTypeChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Tất cả loại sân</option>
                                            <option value="football">Bóng đá</option>
                                            <option value="tennis">Tennis</option>
                                            <option value="badminton">Cầu lông</option>
                                            <option value="pickleball">Pickleball</option>
                                            <option value="basketball">Bóng rổ</option>
                                            <option value="volleyball">Bóng chuyền</option>
                                            <option value="swimming">Bơi lội</option>
                                            <option value="gym">Gym</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={filters.isActive === undefined ? "" : filters.isActive.toString()}
                                            onChange={handleStatusChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Tất cả trạng thái</option>
                                            <option value="true">Đang hoạt động</option>
                                            <option value="false">Tạm dừng</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Fields List */}
                            <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollBehavior: "smooth" }}>
                                {loading && (
                                    <div className="space-y-4 p-4">
                                        {[1, 2, 3].map((item) => (
                                            <div key={item} className="animate-pulse">
                                                <div className="flex bg-white rounded-lg shadow p-4">
                                                    <div className="w-32 h-32 bg-gray-300 rounded-lg"></div>
                                                    <div className="ml-4 flex-1">
                                                        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                                                        <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                                                        <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                                                        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
                                        <strong className="font-bold">Lỗi!</strong>
                                        <span className="block sm:inline"> {error.message}</span>
                                    </div>
                                )}

                                {!loading && !error && transformedFields.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 text-lg">Không có sân thể thao nào.</p>
                                    </div>
                                )}

                                {!loading && !error && transformedFields.length > 0 && (
                                    <div className="space-y-4 p-4">
                                        {transformedFields.map((field, index) => (
                                            <div key={field.id || index} className="scroll-snap-start">
                                                <OwnerFieldCard
                                                    id={field.id}
                                                    name={field.name}
                                                    location={field.location}
                                                    description={field.description}
                                                    rating={field.rating}
                                                    reviews={field.reviews}
                                                    price={field.price}
                                                    nextAvailability={field.nextAvailability}
                                                    sportType={field.sportType}
                                                    imageUrl={field.imageUrl}
                                                    isActive={field.isActive}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                {!loading && totalPages > 1 && (
                                    <div className="flex justify-center mt-6 space-x-2 pb-4">
                                        <button
                                            onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                                            disabled={filters.page === 1}
                                            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300 hover:bg-green-700 transition-colors"
                                        >
                                            Trang trước
                                        </button>
                                        <span className="px-4 py-2 bg-gray-100 rounded flex items-center">
                                            Trang {filters.page} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => handlePageChange(filters.page + 1)}
                                            disabled={filters.page >= totalPages}
                                            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300 hover:bg-green-700 transition-colors"
                                        >
                                            Trang sau
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel - Map */}
                        <div className="flex-[4] relative">
                            <div className="sticky top-16 h-[calc(100vh-4rem)] w-full">
                                <div id={mapContainerId} className="absolute h-full w-full p-0 border-0 m-0 left-0 top-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </FieldOwnerDashboardLayout>
        </div>
    )
}

export default OwnerFieldListPage