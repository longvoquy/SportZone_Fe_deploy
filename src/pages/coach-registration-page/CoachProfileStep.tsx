import { useState, useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/ui/loading";
import {
    Dumbbell,
    MapPin,
    Award,
    Wallet,
    FileText,
    History,
    Search,
    Info
} from "lucide-react"
import { SportType } from "@/components/enums/ENUMS"
import type { CreateCoachRegistrationPayload } from "@/features/coach-registration"
import logger from "@/utils/logger"

interface CoachProfileStepProps {
    formData: CreateCoachRegistrationPayload
    updateFormData: (data: Partial<CreateCoachRegistrationPayload>) => void
}

const SPORT_LABELS: Record<string, string> = {
    [SportType.FOOTBALL]: "Bóng đá",
    [SportType.TENNIS]: "Quần vợt",
    [SportType.BADMINTON]: "Cầu lông",
    [SportType.PICKLEBALL]: "Pickleball",
    [SportType.BASKETBALL]: "Bóng rổ",
    [SportType.VOLLEYBALL]: "Bóng chuyền",
    [SportType.SWIMMING]: "Bơi lội",
    [SportType.GYM]: "Gym",
}

// Map constants
const DEFAULT_CENTER: [number, number] = [10.776889, 106.700806] // Ho Chi Minh City
const MAP_CONFIG = {
    zoom: 13,
    maxZoom: 19,
    flyToZoom: 14,
    flyToDuration: 1.2,
    flyToEaseLinearity: 0.25,
}

const TILE_LAYER_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"

// Utility functions
interface GeocodingResult {
    lat: number
    lon: number
    display_name: string
}

const parseLatLngFromString = (input: string): [number, number] | null => {
    const latLngMatch = input.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/)
    if (!latLngMatch) return null

    const lat = parseFloat(latLngMatch[1])
    const lng = parseFloat(latLngMatch[2])

    return !Number.isNaN(lat) && !Number.isNaN(lng) ? [lat, lng] : null
}

const buildSearchCandidates = (input: string): string[] => {
    const postalRegex = /\b\d{5,6}\b/g
    const withoutPostal = input.replace(postalRegex, "").trim()

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
                headers: { Accept: "application/json" },
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
        const res = await fetch(url, { headers: { Accept: "application/json" } })
        if (!res.ok) return null
        const data = await res.json()
        return data.display_name ?? null
    } catch {
        return null
    }
}

const CoachProfileStep: React.FC<CoachProfileStepProps> = ({ formData, updateFormData }) => {
    const [isSearching, setIsSearching] = useState(false)

    // Map refs
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markerRef = useRef<L.Marker | null>(null)

    const handleSportToggle = (sport: string) => {
        const currentSports = formData.sports || []
        const newSports = currentSports.includes(sport)
            ? currentSports.filter((s) => s !== sport)
            : [...currentSports, sport]

        updateFormData({
            sports: newSports,
        })
    }

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return

        const map = L.map(mapContainerRef.current, {
            center: formData.locationCoordinates
                ? [formData.locationCoordinates.lat, formData.locationCoordinates.lng]
                : DEFAULT_CENTER,
            zoom: MAP_CONFIG.zoom,
        })

        L.tileLayer(TILE_LAYER_URL, {
            attribution: "© OpenStreetMap contributors",
            maxZoom: MAP_CONFIG.maxZoom,
        }).addTo(map)

        // Fix default marker icon
        const defaultIcon = L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        })
        L.Marker.prototype.options.icon = defaultIcon

        // Create a draggable marker
        const marker = L.marker(
            formData.locationCoordinates
                ? [formData.locationCoordinates.lat, formData.locationCoordinates.lng]
                : DEFAULT_CENTER,
            { draggable: true, icon: defaultIcon }
        ).addTo(map)

        // Handle drag end -> update state
        marker.on("dragend", async () => {
            const pos = marker.getLatLng()
            const address = await reverseGeocode(pos.lat, pos.lng)
            updateFormData({
                locationAddress: address || "",
                locationCoordinates: { lat: pos.lat, lng: pos.lng },
            })
        })

        // Attach click handler to map
        const handleMapClick = async (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng
            marker.setLatLng([lat, lng])
            const address = await reverseGeocode(lat, lng)
            updateFormData({
                locationAddress: address || "",
                locationCoordinates: { lat, lng },
            })
        }
        map.on("click", handleMapClick)

        markerRef.current = marker
        mapRef.current = map

        return () => {
            map.remove()
            mapRef.current = null
            markerRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Update map position when coordinates change externally
    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !formData.locationCoordinates) return

        const { lat, lng } = formData.locationCoordinates
        markerRef.current.setLatLng([lat, lng])
        mapRef.current.setView([lat, lng], mapRef.current.getZoom())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.locationCoordinates?.lat, formData.locationCoordinates?.lng])

    // Update map position
    const updateMapPosition = useCallback(
        (lat: number, lng: number, address: string) => {
            if (!mapRef.current || !markerRef.current) return

            markerRef.current.setLatLng([lat, lng])
            mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), MAP_CONFIG.flyToZoom), {
                duration: MAP_CONFIG.flyToDuration,
                easeLinearity: MAP_CONFIG.flyToEaseLinearity,
            })

            updateFormData({
                locationAddress: address,
                locationCoordinates: { lat, lng },
            })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [updateFormData]
    )

    // Handle search
    const handleSearch = useCallback(async () => {
        const query = (formData.locationAddress || "").trim()
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
                alert("Không tìm thấy địa điểm phù hợp")
            }
        } catch (error) {
            logger.error("Geocoding error:", error)
            alert("Có lỗi xảy ra khi tìm kiếm địa điểm")
        } finally {
            setIsSearching(false)
        }
    }, [formData.locationAddress, updateMapPosition])

    // Handle Enter key
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleSearch()
        }
    }

    return (
        <div className="space-y-8">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900">
                            Thông tin Huấn Luyện Viên & Vị trí
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            Vui lòng điền đầy đủ các thông tin chuyên môn và khu vực bạn muốn dạy. Thông tin này giúp chúng tôi giới thiệu bạn đến các học viên phù hợp.
                        </p>
                    </div>
                </div>
            </div>

            {/* Expertise Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Dumbbell className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Chuyên môn thể thao</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(SPORT_LABELS).map(([key, label]) => (
                        <label
                            key={key}
                            className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${formData.sports?.includes(key)
                                ? "bg-green-50 border-green-500 ring-1 ring-green-500"
                                : "hover:bg-gray-50 border-gray-200"
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={formData.sports?.includes(key) || false}
                                onChange={() => handleSportToggle(key)}
                                className="w-4 h-4 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm font-medium">{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Profile Details Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Chi tiết hồ sơ</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Chứng chỉ / Bằng cấp <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            className="h-11"
                            value={formData.certification || ""}
                            onChange={(e) => updateFormData({ certification: e.target.value })}
                            placeholder="Ví dụ: UEFA B License, Chứng chỉ HLV cấp 1..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Giá tiền/giờ (VND) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            className="h-11"
                            type="number"
                            value={formData.hourlyRate || ""}
                            onChange={(e) => updateFormData({ hourlyRate: Number(e.target.value) })}
                            placeholder="Ví dụ: 500000"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Giới thiệu bản thân <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        className="min-h-[120px] resize-none"
                        value={formData.bio || ""}
                        onChange={(e) => updateFormData({ bio: e.target.value })}
                        placeholder="Hãy chia sẻ về phong cách dạy, triết lý huấn luyện của bạn..."
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Kinh nghiệm làm việc <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        className="min-h-[100px] resize-none"
                        value={formData.experience || ""}
                        onChange={(e) => updateFormData({ experience: e.target.value })}
                        placeholder="Ví dụ: 5 năm HLV tại CLB ABC, 3 năm đào tạo trẻ..."
                        required
                    />
                </div>
            </div>

            {/* Location Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Vị trí hoạt động</h3>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Địa chỉ trung tâm / Khu vực dạy <span className="text-red-500">*</span></Label>
                        <div className="flex gap-2">
                            <Input
                                className="h-11 flex-1"
                                value={formData.locationAddress || ""}
                                onChange={(e) => updateFormData({ locationAddress: e.target.value })}
                                onKeyPress={handleKeyPress}
                                placeholder="Nhập địa chỉ hoặc khu vực dạy chính"
                                required
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSearch}
                                disabled={!formData.locationAddress?.trim() || isSearching}
                                className="h-11 px-4"
                            >
                                {isSearching ? (
                                    <Loading size={16} />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="h-96 rounded-lg relative overflow-hidden border bg-gray-100">
                        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                        {formData.locationAddress && (
                            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur p-3 rounded shadow-lg max-w-xs z-[1000] pointer-events-none">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">
                                            {formData.locationAddress}
                                        </p>
                                        {formData.locationCoordinates && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {formData.locationCoordinates.lat.toFixed(6)}, {formData.locationCoordinates.lng.toFixed(6)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Bạn có thể kéo thả dấu trên bản đồ để xác định vị trí chính xác nhất.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default CoachProfileStep
