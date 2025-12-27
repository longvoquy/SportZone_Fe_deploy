import type React from "react"
import logger from "@/utils/logger"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hook"
import { setFavouriteFields, removeFavouriteFields, getUserProfile } from "@/features/user"
import { CustomFailedToast, CustomSuccessToast } from "@/components/toast/notificiation-toast"
import { getFieldById } from "@/features/field/fieldThunk"
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component"
import { FooterComponent } from "@/components/footer/footer-component"
import { PageWrapper } from "@/components/layouts/page-wrapper"
import { ChevronLeft, ChevronRight, MapPin, Share2, Star, CalendarDays, AlertCircle, MessageCircle } from "lucide-react"
import L from "leaflet"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loading } from "@/components/ui/loading"
import { QuickNavPills } from "./components/QuickNavPills"
import { OverviewCard } from "./components/OverviewCard"
import { RulesCard } from "./components/RulesCard"
import { AmenitiesCard } from "./components/AmenitiesCard"
import { GalleryCard } from "./components/GalleryCard"
import { RatingCard } from "./components/RatingCard"
import { LocationCard } from "./components/LocationCard"
import { PricingTableCard } from "./components/PricingTableCard"
import { Button } from "@/components/ui/button"
import FieldDetailChatWindow from "@/components/chat/FieldDetailChatWindow"
import { getFieldPinIcon } from "@/utils/fieldPinIcon"
import ReportDialog from "@/components/report/ReportDialog"
import axiosPrivate from "@/utils/axios/axiosPrivate"
import OwnerInfoCard from "./components/OwnerInfoCard"
import { getSportDisplayNameVN } from "@/components/enums/ENUMS"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"


const FieldDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);
  const [fieldReports, setFieldReports] = useState<any[] | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const { currentField, loading } = useAppSelector((s) => s.field)
  const authUser = useAppSelector((s) => s.auth.user)
  const [favLoading, setFavLoading] = useState(false)

  const favouriteFieldIds: string[] = Array.isArray(authUser?.favouriteFields)
    ? authUser!.favouriteFields.map((f: any) => (typeof f === 'string' ? f : (f._id || f.id || String(f))))
    : [];

  const isFavourite = Boolean(id && favouriteFieldIds.includes(id));

  const toggleFavourite = async () => {

    if (!authUser) {
      return CustomFailedToast("Vui lòng đăng nhập để thêm sân vào yêu thích")
    }

    if (!id) {
      return;
    }

    try {
      setFavLoading(true)
      if (isFavourite) {
        const action: any = await dispatch(removeFavouriteFields({ favouriteFields: [id] }))
        if (action?.meta?.requestStatus === "fulfilled") {
          CustomSuccessToast("Đã bỏ yêu thích sân")
        } else {
          logger.error("removeFavouriteFields failed", { action });
          CustomFailedToast(String(action?.payload?.message || action?.payload || "Bỏ yêu thích thất bại"))
        }
      } else {
        const action: any = await dispatch(setFavouriteFields({ favouriteFields: [id] }))
        if (action?.meta?.requestStatus === "fulfilled") {
          CustomSuccessToast("Đã thêm sân vào yêu thích")
        } else {
          logger.error("setFavouriteFields failed", { action });
          CustomFailedToast(String(action?.payload?.message || action?.payload || "Thêm yêu thích thất bại"))
        }
      }
    } catch (err: any) {
      logger.error("toggleFavourite error", { err });
      CustomFailedToast(err?.message || "Thao tác thất bại")
    } finally {
      setFavLoading(false)
      try {
        // refresh profile to sync favouriteFields with server
        dispatch(getUserProfile())
      } catch { }
    }
  }

  useEffect(() => {
    if (id && (!currentField || currentField.id !== id)) {
      dispatch(getFieldById(id))
    }
  }, [id, currentField, dispatch])

  // Rate-limit profile refresh to avoid frequent /users/get-profile requests
  useEffect(() => {
    if (!id) return
    const PROFILE_REFRESH_KEY = 'profile:lastFetchAt'
    const MIN_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
    const last = Number(localStorage.getItem(PROFILE_REFRESH_KEY) || 0)
    const now = Date.now()
    const withinCooldown = now - last < MIN_INTERVAL_MS

    const missingFavs = !authUser || !Array.isArray(authUser.favouriteFields)
    const notIncluded = Array.isArray(authUser?.favouriteFields) ? !authUser!.favouriteFields.includes(id) : true

    if ((missingFavs || notIncluded) && !withinCooldown) {
      dispatch(getUserProfile()).finally(() => {
        try { localStorage.setItem(PROFILE_REFRESH_KEY, String(Date.now())) } catch { }
      })
    }
  }, [id, authUser, dispatch])

  useEffect(() => {
    if (!id) return
    // Chỉ fetch reports nếu user đã đăng nhập (API yêu cầu authentication)
    if (!authUser) {
      setFieldReports([])
      return
    }
    let cancelled = false
    const fetchReports = async () => {
      try {
        setLoadingReports(true)
        const res = await axiosPrivate.get("/reports", {
          params: { fieldId: id, limit: 5 },
        })
        if (cancelled) return
        const data = (res.data as any)?.data ?? res.data ?? []
        setFieldReports(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setFieldReports([])
      } finally {
        if (!cancelled) setLoadingReports(false)
      }
    }
    fetchReports()
    return () => {
      cancelled = true
    }
  }, [id, authUser])

  // Hiển thị popup cảnh báo khi field chưa được admin verify
  useEffect(() => {
    if (currentField && currentField.isAdminVerify === false) {
      setShowUnverifiedDialog(true)
    }
  }, [currentField])

  const overviewRef = useRef<HTMLDivElement | null>(null)
  const rulesRef = useRef<HTMLDivElement | null>(null)
  const amenitiesRef = useRef<HTMLDivElement | null>(null)
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const ratingRef = useRef<HTMLDivElement | null>(null)
  const locationRef = useRef<HTMLDivElement | null>(null)
  const pricingRef = useRef<HTMLDivElement | null>(null)
  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)


  // Active pill logic similar to coach-profile-page
  const [activeTab, setActiveTab] = useState("overview")
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (!el) return
    setActiveTab(sectionId)
    const offset = 100
    const elementPosition = el.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset
    const startY = window.pageYOffset
    const distance = offsetPosition - startY
    const duration = 600
    let startTime: number | null = null
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (ts: number) => {
      if (startTime === null) startTime = ts
      const elapsed = ts - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)
      window.scrollTo(0, startY + distance * eased)
      if (elapsed < duration) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  useEffect(() => {
    const handleScroll = () => {
      const ids = ["overview", "pricing", "rules", "amenities", "gallery", "rating", "location"]
      if (window.scrollY < 50) {
        setActiveTab("overview")
        return
      }
      const scrollPosition = window.scrollY + 120
      for (const id of ids) {
        const element = document.getElementById(id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveTab(id)
            break
          }
        }
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
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
    return Array.isArray(raw) && raw.length > 0 ? raw : []
  }, [currentField])

  const ratingValue: number = useMemo(() => {
    const r = (currentField as any)?.rating ?? (currentField as any)?.averageRating
    const n = Number(r)
    return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0
  }, [currentField])

  const reviewCount: number = useMemo(() => {
    const raw =
      (currentField as any)?.reviewCount ??
      (currentField as any)?.totalReviews ??
      (currentField as any)?.total_reviews ??
      (currentField as any)?.reviews?.length ??
      0
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [currentField])

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
    }
  }, [extendedImages])

  useEffect(() => {
    const update = () => {
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.clientWidth)
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

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

  const itemsPerView = 5
  const gapPx = 12
  const itemWidthPx = viewportWidth > 0 ? Math.floor((viewportWidth - gapPx * (itemsPerView - 1)) / itemsPerView) : 0
  const translateXPx = -(currentIndex * (itemWidthPx + gapPx))

  // ===== Leaflet Map: CSS loader, map/marker init, geocode address =====
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.id = "leaflet-css"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
  }, [])

  const geocodeAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(query)}`
      const res = await fetch(url, { headers: { Accept: "application/json" } })
      if (!res.ok) return null
      const data: Array<{ lat: string; lon: string }> = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon }
      }
      return null
    } catch {
      return null
    }
  }

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

      // Default marker icon (fixes missing icon issue)
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
        ; (L as any).Marker.prototype.options.icon = defaultIcon

      mapRef.current = map

      // Invalidate size a few times to render tiles correctly
      setTimeout(() => map.invalidateSize(), 100)
      setTimeout(() => map.invalidateSize(), 300)
      setTimeout(() => map.invalidateSize(), 500)
    }

    // Delay init until container has dimensions
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
    const geo = (currentField as any)?.location?.geo?.coordinates as number[] | undefined
    const hasCoords = Array.isArray(geo) && geo.length === 2 && Number.isFinite(geo[0]) && Number.isFinite(geo[1])
    const q = String((currentField as any)?.location?.address || locationText || "").trim()
    if (!hasCoords && !q) return
    let cancelled = false
      ; (async () => {
        let lat: number | null = null
        let lon: number | null = null
        if (hasCoords) {
          const [lng, la] = geo as number[]
          lat = la
          lon = lng
        } else {
          const gc = await geocodeAddress(q)
          if (gc) {
            lat = gc.lat
            lon = gc.lon
          }
        }
        if (cancelled || lat == null || lon == null) return
        if (!markerRef.current) {
          const fieldIcon = getFieldPinIcon(currentField?.sportType, L)
          markerRef.current = L.marker([lat, lon], {
            icon: fieldIcon
          }).addTo(map)
        } else {
          markerRef.current.setLatLng([lat, lon])
        }
        map.flyTo([lat, lon], Math.max(map.getZoom(), 14), { duration: 1.0 })
      })()
    return () => {
      cancelled = true
    }
  }, [currentField, locationText])

  if (loading && !currentField) {
    return (
      <>
        <NavbarDarkComponent />
        <PageWrapper className="bg-white">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loading size={64} className="text-green-600 mb-4" />
            <p className="text-gray-600 font-medium animate-pulse">Đang tải thông tin sân...</p>
          </div>
        </PageWrapper>
        <FooterComponent />
      </>
    )
  }

  return (
    <>
      <NavbarDarkComponent />
      <PageWrapper className="bg-white">
        <div className="w-full">
          {extendedImages.length > 0 && (
            <div
              ref={viewportRef}
              className="relative w-full h-96 md:h-[28rem] lg:h-[32rem] mb-6 overflow-hidden select-none rounded-lg"
            >
              <div
                ref={carouselRef}
                className="flex h-full gap-3"
                style={{
                  transform: `translateX(${translateXPx}px)`,
                  transition: isTransitioning
                    ? "transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                    : "none",
                }}
              >
                {extendedImages.map((src, i) => (
                  <div
                    key={`slide-${i}`}
                    className="flex-none h-full"
                    style={{
                      width: itemWidthPx ? `${itemWidthPx}px` : undefined,
                    }}
                  >
                    <img
                      src={src || "/placeholder.svg"}
                      alt={`Ảnh ${i + 1}`}
                      className="w-full h-full object-cover rounded-md object-center"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = placeholderImg;
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
        </div>

        <div className="w-full pb-6">
          <div className="max-w-6xl mx-auto px-2">
            {/* Upper side: two columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-4">
              {/* left */}
              <div className="md:col-span-2">
                <h1 className="text-2xl md:text-3xl font-bold text-left">
                  {currentField?.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-gray-600">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{locationText}</span>
                  </span>
                </div>
              </div>
              {/* right */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex md:justify-center items-center gap-4">
                  <button className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <Share2 className="h-4 w-4" />
                    <span>Chia sẻ</span>
                  </button>
                  <button
                    onClick={toggleFavourite}
                    disabled={favLoading}
                    className={`inline-flex items-center gap-2 text-sm ${isFavourite
                      ? "text-red-600 hover:text-red-800"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    <Star
                      className={`h-4 w-4 ${isFavourite ? "text-red-500" : "text-yellow-500"
                        }`}
                    />
                    <span>
                      {favLoading && <Loading size={14} className="inline mr-1" />}
                      {favLoading
                        ? "Đang xử lý..."
                        : isFavourite
                          ? "Đã yêu thích"
                          : "Thêm vào yêu thích"}
                    </span>
                  </button>
                  <button
                    onClick={() => setShowReportDialog(true)}
                    className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Báo cáo</span>
                  </button>
                </div>
                <button
                  onClick={() => scrollToSection("rating")}
                  className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md hover:border-gray-300 transition"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-700 text-white text-xs font-semibold">
                    {ratingValue.toFixed(1)}
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5"
                          fill="#FBBF24"
                        />
                      ))}
                    </div>
                    <span className="text-xs">{reviewCount} Đánh giá</span>
                  </div>
                </button>
              </div>
            </div>
            <hr className="border-t border-gray-200 my-4" />
            {/* under side: two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Môn Thể thao:</span>
                <span className="font-medium">
                  {currentField?.sportType ? getSportDisplayNameVN(currentField.sportType) : "-"}
                </span>
              </div>
              {/* <div className="flex items-center gap-2">
                                <span className="text-gray-500">Giá:</span>
                                <span className="font-medium">{currentField?.price || ((currentField as any)?.basePrice ? `${(currentField as any).basePrice.toLocaleString()}đ/giờ` : "-")}</span>
                            </div> */}
            </div>
          </div>
        </div>
        <div className="w-full bg-[#FAFAFA]">
          <div className="max-w-6xl mx-auto pt-6">
            {!loading && currentField && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
                <div className="lg:col-span-2 space-y-4 text-left">
                  <QuickNavPills
                    activeTab={activeTab}
                    pills={[
                      { k: "overview", label: "Tổng quan" },
                      { k: "pricing", label: "Bảng giá" },
                      { k: "rules", label: "Quy định" },
                      { k: "amenities", label: "Tiện ích" },
                      { k: "gallery", label: "Thư viện ảnh" },
                      { k: "rating", label: "Đánh giá" },
                      { k: "location", label: "Vị trí" },
                    ]}
                    onSelect={(k) => scrollToSection(k)}
                  />

                  {/* Always-visible sections */}
                  <div className="mt-4 space-y-4">
                    <OverviewCard
                      refObj={overviewRef}
                      id="overview"
                      description={
                        (currentField?.description as string | undefined) ||
                        "Mô tả đang được cập nhật."
                      }
                    />

                    <PricingTableCard
                      refObj={pricingRef}
                      id="pricing"
                      priceRanges={(currentField as any)?.priceRanges || []}
                      basePrice={(currentField as any)?.basePrice || 0}
                      sportType={currentField?.sportType}
                    />

                    <RulesCard refObj={rulesRef} id="rules" rules={rules} />

                    <AmenitiesCard
                      refObj={amenitiesRef}
                      id="amenities"
                      items={amenitiesDisplay}
                      fallback={[]}
                    />

                    <GalleryCard
                      refObj={galleryRef}
                      id="gallery"
                      images={(currentField.images as string[]) || []}
                      fallback={[]}
                    />

                    <RatingCard
                      refObj={ratingRef}
                      id="rating"
                      ratingValue={ratingValue}
                      reviewCount={
                        ((currentField as any)?.totalReviews ?? 0) as number
                      }
                      fieldId={id || ""}
                    />

                    {/* Location moved to sidebar (above owner info) */}
                  </div>
                </div>

                <aside className="lg:col-span-1">
                  <div className="lg:sticky lg:top-20 space-y-4">
                    {/* Info card */}
                    <Card className="bg-white rounded-2xl shadow-md border border-gray-100">
                      <CardHeader className="">
                        <div className="flex items-center gap-3 justify-center">
                          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-green-100 shrink-0">
                            <CalendarDays className="h-6 w-6 text-green-600 block" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              Lịch trống
                            </CardTitle>
                            <CardDescription className="text-gray-600 text-sm mt-1">
                              Kiểm tra lịch trống vào thời gian thuận tiện của bạn
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Booking card */}
                    <Card className="shadow-lg border-0 bg-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-sm text-gray-700">
                          Lịch trống
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Đặt sân
                          </p>
                          <p className="text-3xl font-bold text-green-600">
                            {currentField.price ||
                              (currentField.basePrice
                                ? `${currentField.basePrice.toLocaleString()}đ/h`
                                : "Liên hệ")}
                          </p>
                        </div>
                        <Button
                          onClick={() =>
                            navigate("/field-booking", {
                              state: { fieldId: currentField.id },
                            })
                          }
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 h-auto"
                        >
                          Đặt sân ngay
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Location card (moved from main column) */}
                    {currentField && (
                      <LocationCard
                        refObj={locationRef}
                        id="location"
                        addressText={String(
                          ((currentField as any)?.location?.address ??
                            locationText) ||
                          ""
                        )}
                        geoCoords={
                          (() => {
                            const c = (currentField as any)?.location?.geo
                              ?.coordinates as number[] | undefined;
                            return Array.isArray(c) && c.length === 2
                              ? [c[0], c[1]]
                              : null;
                          })() as [number, number] | null
                        }
                        sportType={currentField?.sportType}
                      />
                    )}

                    {/* Owner info card */}
                    {currentField && (
                      <OwnerInfoCard
                        name={
                          (currentField as any)?.owner?.name ||
                          (currentField as any)?.owner?.businessName ||
                          "Chủ sân"
                        }
                        phone={
                          (currentField as any)?.owner?.contactInfo?.phone ||
                          (currentField as any)?.owner?.contact ||
                          (currentField as any)?.ownerPhone
                        }
                        email={
                          (currentField as any)?.owner?.contactInfo?.email
                        }
                        avatarUrl={(currentField as any)?.owner?.avatarUrl}
                      />
                    )}

                    {/* User reports for this field */}
                    <Card className="border bg-white shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-gray-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          Báo cáo của bạn về sân này
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {loadingReports ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loading size={16} />
                            <p className="text-xs text-gray-500">
                              Đang tải lịch sử báo cáo...
                            </p>
                          </div>
                        ) : !fieldReports || fieldReports.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            Bạn chưa gửi báo cáo nào cho sân này.
                          </p>
                        ) : (
                          <ul className="space-y-2 text-xs">
                            {fieldReports.map((r) => (
                              <li
                                key={r._id}
                                className="flex flex-col rounded-md border px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold">
                                    {String(r.category || "").replace(
                                      /_/g,
                                      " "
                                    )}
                                  </span>
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                                    {r.status}
                                  </span>
                                </div>
                                {r.description && (
                                  <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">
                                    {r.description}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>

                    {/* Chat with owner card */}
                    <Card className="border bg-white shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-gray-800 flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          Liên hệ chủ sân
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-gray-600">
                          Có thắc mắc về lịch trống, giá hoặc tiện ích? Gửi
                          tin nhắn trực tiếp cho chủ sân để được hỗ trợ nhanh
                          hơn.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full border-green-600 text-green-700 hover:bg-green-50 hover:border-green-700"
                          onClick={() => setShowChatWindow(true)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Nhắn tin cho chủ sân
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
        {showChatWindow && (
          <FieldDetailChatWindow
            onClose={() => setShowChatWindow(false)}
            fieldOwnerId={String(
              (currentField as any)?.owner?.id ||
              (currentField as any)?.owner?._id ||
              ""
            )}
            fieldId={String(currentField?.id || "")}
            fieldName={currentField?.name || ""}
            fieldOwnerName={
              (currentField as any)?.owner?.name || "Chủ sân"
            }
            isOpen={showChatWindow}
          />
        )}
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          fieldId={String(currentField?.id || "")}
          fieldName={currentField?.name || ""}
        />
        <AlertDialog open={showUnverifiedDialog} onOpenChange={setShowUnverifiedDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl font-semibold text-amber-600">
                <AlertCircle className="h-5 w-5" />
                Sân chưa được xác minh
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 mt-2">
                Sân bóng này chưa được quản trị viên xác minh. Thông tin có thể chưa đầy đủ hoặc chưa được kiểm duyệt.
                <br />
                <br />
                Vui lòng liên hệ với chủ sân hoặc báo cáo nếu bạn phát hiện thông tin không chính xác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => setShowUnverifiedDialog(false)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Đã hiểu
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <FooterComponent />
      </PageWrapper>
    </>
  );
}

export default FieldDetailPage