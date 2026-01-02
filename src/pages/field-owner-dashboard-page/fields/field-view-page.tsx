"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loading } from "@/components/ui/loading"
import { useParams, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hook"
import { getFieldById } from "@/features/field/fieldThunk"
import { clearCurrentField } from "@/features/field/fieldSlice"
import { FieldOwnerDashboardLayout } from "@/components/layouts/field-owner-dashboard-layout"
import { FieldSelectionPlaceholder } from "./components/field-selection-placeholder"
import { ChevronLeft, ChevronRight, MapPin, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuickNavPills } from "./components/QuickNavPills"
import { OverviewCard } from "./components/OverviewCard"
import { RulesCard } from "./components/RulesCard"
import { AmenitiesCard } from "./components/AmenitiesCard"
import { GalleryCard } from "./components/GalleryCard"
import { RatingCard } from "./components/RatingCard"
import { LocationCard } from "./components/LocationCard"
import { getSportDisplayNameVN } from "@/components/enums/ENUMS"

const mockDescription = "Sân cầu lông hiện đại với 4 sân tiêu chuẩn, máy đánh bóng tự động, tiện ích đầy đủ. Phù hợp tập luyện và thi đấu."
const mockRules = ["Không mang giày ngoài vào sân", "Hủy trước 24h", "Mang theo vợt cá nhân"]
const mockAmenities = ["Vợt miễn phí", "Nước uống", "Bãi đỗ xe"]
const mockImages = [
    "https://source.unsplash.com/random/800x600/?badminton-court-1",
    "https://source.unsplash.com/random/800x600/?badminton-court-2",
    "https://source.unsplash.com/random/800x600/?badminton-court-3",
    "https://source.unsplash.com/random/800x600/?badminton-court-4",
    "https://source.unsplash.com/random/800x600/?badminton-court-5",
]

export default function FieldViewPage() {
    const { fieldId } = useParams<{ fieldId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()

    const { currentField, loading } = useAppSelector((s) => s.field)
    const previousFieldIdRef = useRef<string | undefined>(undefined)

    // Clear currentField and fetch new field when fieldId changes
    useEffect(() => {
        if (!fieldId) {
            previousFieldIdRef.current = undefined
            return
        }

        // If fieldId changed, clear previous field data and fetch new one
        if (previousFieldIdRef.current !== fieldId) {
            // Clear previous field data immediately when fieldId changes
            // This prevents showing old field data while new field is loading
            dispatch(clearCurrentField())

            // Fetch the new field
            dispatch(getFieldById(fieldId))
            previousFieldIdRef.current = fieldId
        } else {
            // FieldId hasn't changed, but verify currentField matches
            // Only fetch if currentField is missing or doesn't match
            const currentFieldId = currentField?.id
            if (!currentFieldId || currentFieldId !== fieldId) {
                dispatch(getFieldById(fieldId))
            }
        }
    }, [fieldId, dispatch, currentField?.id])

    const overviewRef = useRef<HTMLDivElement | null>(null)
    const rulesRef = useRef<HTMLDivElement | null>(null)
    const amenitiesRef = useRef<HTMLDivElement | null>(null)
    const galleryRef = useRef<HTMLDivElement | null>(null)
    const ratingRef = useRef<HTMLDivElement | null>(null)
    const locationRef = useRef<HTMLDivElement | null>(null)

    // Active pill logic
    const [activeTab, setActiveTab] = useState("overview")
    const getScrollContainer = () => document.getElementById("field-owner-dashboard-main")

    const scrollToSection = (sectionId: string) => {
        const container = getScrollContainer()
        const el = document.getElementById(sectionId)
        if (!el || !container) return

        setActiveTab(sectionId)

        // Calculate relative position inside the container
        // container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top
        const offset = 20 // minimal offset
        const elementRelativeTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
        const targetScrollTop = elementRelativeTop - offset

        const startY = container.scrollTop
        const distance = targetScrollTop - startY
        const duration = 600
        let startTime: number | null = null

        const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
        const step = (ts: number) => {
            if (startTime === null) startTime = ts
            const elapsed = ts - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = easeInOutCubic(progress)
            container.scrollTo(0, startY + distance * eased)
            if (elapsed < duration) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }

    useEffect(() => {
        const container = getScrollContainer()
        if (!container) return

        const handleScroll = () => {
            const ids = ["overview", "rules", "amenities", "gallery", "rating", "location"]
            if (container.scrollTop < 20) {
                setActiveTab("overview")
                return
            }

            // Adjust offset for trigger point
            const scrollPosition = container.scrollTop + 100

            for (const id of ids) {
                const element = document.getElementById(id)
                if (element) {
                    // We need position relative to the container content start
                    // element.offsetTop is usually relative to the closest positioned ancestor.
                    // If the container is that ancestor, this works.
                    // Otherwise we might need getBoundingClientRect logic similar to scrollToSection.
                    // For simplicity, let's try offsetTop assuming relative positioning inside.

                    const { offsetTop, offsetHeight } = element
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveTab(id)
                        break
                    }
                }
            }
        }

        container.addEventListener("scroll", handleScroll)
        return () => container.removeEventListener("scroll", handleScroll)
    }, [])

    const locationText = useMemo(() => {
        const loc: any = (currentField as any)?.location
        if (typeof loc === "string") return loc
        if (loc && typeof loc === "object") {
            const parts = [loc.address, loc.ward, loc.district, loc.city, loc.province].filter(Boolean)
            return parts.length ? parts.join(", ") : "Địa chỉ đang cập nhật"
        }
        return "Địa chỉ đang cập nhật"
    }, [currentField])

    type Amenity = { amenityId?: string | number; name?: string; price?: number } | string

    const amenitiesRaw: Amenity[] = useMemo(() => {
        const raw = (currentField as any)?.amenities as Amenity[] | undefined
        return Array.isArray(raw) ? raw : []
    }, [currentField])

    const amenitiesDisplay = useMemo(() => {
        return amenitiesRaw.map((a, idx) => {
            if (typeof a === "string") {
                return { key: `amenity-${idx}`, label: a }
            }
            const key = String((a as any)?.amenityId ?? `amenity-${idx}`)
            const name = (a as any)?.name ?? "Tiện ích"
            const price = (a as any)?.price
            const label = price != null && price !== "" ? `${name} - ${Number(price).toLocaleString()}đ` : String(name)
            return { key, label }
        })
    }, [amenitiesRaw])

    const rules: string[] = useMemo(() => {
        const raw = (currentField as any)?.rules as string[] | undefined
        return Array.isArray(raw) && raw.length > 0 ? raw : mockRules
    }, [currentField])

    const ratingValue: number = useMemo(() => {
        const r = (currentField as any)?.rating ?? (currentField as any)?.averageRating
        const n = Number(r)
        return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0
    }, [currentField])

    // Image carousel
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const carouselRef = useRef<HTMLDivElement>(null)
    const viewportRef = useRef<HTMLDivElement>(null)
    const [viewportWidth, setViewportWidth] = useState(0)

    const images: string[] = useMemo(() => {
        return ((currentField?.images as string[]) || []).filter(Boolean)
    }, [currentField])

    const placeholderImg = "/general-img-portrait.png"

    const displayImages: string[] = useMemo(() => {
        const base = images.length > 0 ? images : [placeholderImg]
        if (base.length < 5) {
            const duplicated: string[] = []
            while (duplicated.length < 5) {
                duplicated.push(...base)
            }
            return duplicated.slice(0, 5)
        }
        return base
    }, [images])

    const extendedImages = useMemo(() => {
        if (displayImages.length === 0) return [] as string[]
        const prefix = displayImages.slice(-5)
        const suffix = displayImages.slice(0, 5)
        return [...prefix, ...displayImages, ...suffix]
    }, [displayImages])

    useEffect(() => {
        if (extendedImages.length > 0) {
            setCurrentIndex(5)
            setIsTransitioning(false)
        }
    }, [extendedImages, fieldId])

    // Reset state when fieldId changes
    useEffect(() => {
        setViewportWidth(0)
        setIsTransitioning(false)
    }, [fieldId])

    // Monitor viewport width variations
    useEffect(() => {
        const element = viewportRef.current
        if (!element) return

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use contentRect.width for precise content box measurement
                setViewportWidth(entry.contentRect.width)
            }
        })

        resizeObserver.observe(element)

        return () => resizeObserver.disconnect()
    }, [extendedImages.length]) // Re-attach when carousel might be re-rendered

    const nextSlide = () => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setCurrentIndex((prev) => prev + 1)
    }

    const prevSlide = () => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setCurrentIndex((prev) => prev - 1)
    }

    useEffect(() => {
        if (!isTransitioning) return
        const timer = setTimeout(() => {
            setIsTransitioning(false)
            if (currentIndex >= displayImages.length + 5) {
                setCurrentIndex(5)
            } else if (currentIndex < 5) {
                setCurrentIndex(displayImages.length + 4)
            }
        }, 600)
        return () => clearTimeout(timer)
    }, [currentIndex, isTransitioning, displayImages.length])

    const itemsPerView = 4
    const gapPx = 12
    const itemWidthPx = viewportWidth > 0 ? Math.floor((viewportWidth - gapPx * (itemsPerView - 1)) / itemsPerView) : 0
    const translateXPx = -(currentIndex * (itemWidthPx + gapPx))

    return (
        <FieldOwnerDashboardLayout>
            <div key={fieldId} className="min-h-screen bg-white">
                {loading || (fieldId && !currentField) ? (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <Loading size={48} className="mb-4" />
                            <p className="text-gray-600">Đang tải thông tin sân...</p>
                        </div>
                    </div>
                ) : !currentField ? (
                    <FieldSelectionPlaceholder />
                ) : (
                    <div className="p-4">
                        {/* Image Carousel */}
                        {extendedImages.length > 0 && (
                            <div
                                ref={viewportRef}
                                className="relative w-full h-40 md:h-48 lg:h-56 mb-4 overflow-hidden select-none rounded-lg"
                            >
                                <div
                                    ref={carouselRef}
                                    className="flex h-full gap-3"
                                    style={{
                                        transform: `translateX(${translateXPx}px)`,
                                        transition: isTransitioning ? "transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
                                    }}
                                >
                                    {extendedImages.map((src, i) => (
                                        <div
                                            key={`slide-${i}`}
                                            className="flex-none h-full"
                                            style={{ width: itemWidthPx ? `${itemWidthPx}px` : undefined }}
                                        >
                                            <img
                                                src={src || "/placeholder.svg"}
                                                alt={`Ảnh ${i + 1}`}
                                                className="w-full h-full object-cover rounded-md object-center"
                                                onError={(e) => {
                                                    ; (e.target as HTMLImageElement).src = placeholderImg
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    aria-label="Ảnh trước"
                                    onClick={prevSlide}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow border"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    aria-label="Ảnh tiếp"
                                    onClick={nextSlide}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow border"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}

                        {/* Header Section */}
                        <div className="mb-4">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                        {currentField?.name}
                                    </h1>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{locationText}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate(`/field-owner/fields/${fieldId}/edit`)}
                                    className="flex items-center gap-2"
                                >
                                    <Edit className="h-4 w-4" />
                                    Chỉnh sửa
                                </Button>
                            </div>

                            <hr className="border-t border-gray-200 my-4" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Môn Thể thao:</span>
                                    <span className="font-medium">{currentField?.sportType ? getSportDisplayNameVN(currentField.sportType) : "-"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Giá:</span>
                                    <span className="font-medium">
                                        {currentField?.price ||
                                            (currentField?.basePrice ? `${currentField.basePrice.toLocaleString()}đ/giờ` : "-")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Trạng thái:</span>
                                    <span className={`font-medium ${currentField?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                        {currentField?.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="bg-[#FAFAFA] rounded-lg p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-4">
                                    <QuickNavPills
                                        activeTab={activeTab}
                                        pills={[
                                            { k: "overview", label: "Overview" },
                                            { k: "rules", label: "Rules" },
                                            { k: "amenities", label: "Amenities" },
                                            { k: "gallery", label: "Gallery" },
                                            { k: "rating", label: "Rating" },
                                            { k: "location", label: "Location" },
                                        ]}
                                        onSelect={(k) => scrollToSection(k)}
                                    />

                                    <div className="mt-4 space-y-4">
                                        <OverviewCard
                                            refObj={overviewRef}
                                            id="overview"
                                            description={currentField?.description || mockDescription}
                                        />

                                        <RulesCard
                                            refObj={rulesRef}
                                            id="rules"
                                            rules={rules}
                                        />

                                        <AmenitiesCard
                                            refObj={amenitiesRef}
                                            id="amenities"
                                            items={amenitiesDisplay}
                                            fallback={mockAmenities}
                                        />

                                        <GalleryCard
                                            refObj={galleryRef}
                                            id="gallery"
                                            images={(currentField?.images as string[]) || []}
                                            fallback={mockImages}
                                        />

                                        <RatingCard
                                            refObj={ratingRef}
                                            id="rating"
                                            ratingValue={ratingValue}
                                            reviewCount={((currentField as any)?.reviewCount ?? 0) as number}
                                            fieldId={String(fieldId || (currentField as any)?.id || "")}
                                        />

                                        <LocationCard
                                            refObj={locationRef}
                                            id="location"
                                            addressText={String(((currentField as any)?.location?.address ?? locationText) || "")}
                                            geoCoords={(() => {
                                                const c = (currentField as any)?.location?.geo?.coordinates as number[] | undefined
                                                return Array.isArray(c) && c.length === 2 ? [c[0], c[1]] : null
                                            })() as [number, number] | null}
                                        />
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <aside className="lg:col-span-1">
                                    <div className="lg:sticky lg:top-20 space-y-4">
                                        <Card className="shadow-lg border-0 bg-white">
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-lg font-semibold text-gray-900">
                                                    Thông tin sân
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Giá cơ bản</p>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {currentField?.price ||
                                                            (currentField?.basePrice ? `${currentField.basePrice.toLocaleString()}đ/h` : "Liên hệ")}
                                                    </p>
                                                </div>
                                                <div className="pt-4 border-t">
                                                    <p className="text-sm text-gray-600 mb-2">Thông tin bổ sung</p>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Đánh giá:</span>
                                                            <span className="font-medium">
                                                                {ratingValue.toFixed(1)} ⭐ ({((currentField as any)?.reviewCount ?? 0)} đánh giá)
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Tổng đặt:</span>
                                                            <span className="font-medium">
                                                                {(currentField as any)?.totalBookings ?? 0} lượt
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => navigate(`/field-owner/fields/${fieldId}/edit`)}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Chỉnh sửa sân
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FieldOwnerDashboardLayout>
    )
}

