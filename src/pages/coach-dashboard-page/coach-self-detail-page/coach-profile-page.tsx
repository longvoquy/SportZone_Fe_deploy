import { useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getCoachStatsThunk } from "@/features/reviews/reviewThunk";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  MapPin,
  Star,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  //   ChevronUp,
} from "lucide-react";
import { getCoachById, clearCurrentCoach, updateCoach, uploadCoachGalleryImages } from "@/features/coach";
import { CustomSuccessToast, CustomFailedToast } from "@/components/toast/notificiation-toast";
import type { RootState, AppDispatch } from "@/store/store";
import { CoachDashboardLayout } from "@/components/layouts/coach-dashboard-layout";
import { Loading } from "@/components/ui/loading";
import { BioSection } from "./components/BioSection";
import { GallerySection } from "./components/GallerySection";
import { LocationSection } from "./components/LocationSection";
import { ReviewsSection } from "../../coach-detail-page/components/ReviewsSection";
import { ReviewModal } from "../../coach-detail-page/components/ReviewModal";
import { getReviewsForCoachAPI } from "@/features/reviews/reviewAPI";
import { createCoachReviewThunk } from "@/features/reviews/reviewThunk";
import logger from "@/utils/logger";


// Constants for map
const DEFAULT_CENTER: [number, number] = [10.776889, 106.700806]; // Ho Chi Minh City
const MAP_CONFIG = {
  zoom: 13,
  maxZoom: 19,
  flyToZoom: 14,
  flyToDuration: 1.2,
  flyToEaseLinearity: 0.25
};

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// Utility functions for geocoding
interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
}

const parseLatLngFromString = (input: string): [number, number] | null => {
  const latLngMatch = input.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
  if (!latLngMatch) return null;

  const lat = parseFloat(latLngMatch[1]);
  const lng = parseFloat(latLngMatch[2]);

  return (!Number.isNaN(lat) && !Number.isNaN(lng)) ? [lat, lng] : null;
};

const buildSearchCandidates = (input: string): string[] => {
  const postalRegex = /\b\d{5,6}\b/g;
  const withoutPostal = input.replace(postalRegex, '').trim();

  const baseVariants = [input, withoutPostal].filter(Boolean);
  const withCountry = baseVariants.flatMap(v => [v, `${v}, Việt Nam`, `${v}, Vietnam`]);

  return Array.from(new Set(withCountry));
};

const searchLocation = async (query: string): Promise<GeocodingResult | null> => {
  const candidates = buildSearchCandidates(query);

  for (const candidate of candidates) {
    try {
      const url = `${NOMINATIM_BASE_URL}?format=jsonv2&limit=5&addressdetails=1&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(candidate)}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) continue;

      const data: Array<{ lat: string; lon: string; display_name: string; importance?: number }> =
        await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const best = data.slice().sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0];
        const lat = parseFloat(best.lat);
        const lon = parseFloat(best.lon);

        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          return { lat, lon, display_name: best.display_name };
        }
      }
    } catch (error) {
      logger.warn(`Failed to search for: ${candidate}`, error);
      continue;
    }
  }

  return null;
};

const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name ?? null;
  } catch {
    return null;
  }
};

export default function CoachSelfDetailPage() {
  const params = useParams();
  const initialCoachId = params.id ?? null;
  const dispatch = useDispatch<AppDispatch>();
  const {
    currentCoach, detailLoading, detailError,
    resolveCoachIdLoading, resolveCoachIdError,
    resolvedCoachRaw,
  } = useSelector((state: RootState) => state.coach);
  // Select coachStats from Redux
  const coachStats = useSelector((state: RootState) => {
    const coachId = initialCoachId || currentCoach?.id || resolvedCoachRaw?._id;
    return coachId ? state.reviews?.coachStats?.[coachId] ?? null : null;
  });
    // Fetch coachStats on mount/coachId change
    useEffect(() => {
      const coachId = initialCoachId || currentCoach?.id || resolvedCoachRaw?._id;
      if (coachId) {
        dispatch(getCoachStatsThunk(coachId));
      }
    }, [dispatch, initialCoachId, currentCoach, resolvedCoachRaw]);
  const [activeTab, setActiveTab] = useState("bio");
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  // Reviews state
  const [coachReviews, setCoachReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const REVIEW_PAGE_LIMIT = 5;
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Edit mode and editable fields (UI only)
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCoachActive, setIsCoachActive] = useState(true);
  const [editablePrice, setEditablePrice] = useState<number | "-">("-");
  const [editableSummary, setEditableSummary] = useState<string>("");
  const [editableCoachingSummary, setEditableCoachingSummary] = useState<string>("");
  const [editableLocation, setEditableLocation] = useState<string>("");
  const [locationCoordinates, setLocationCoordinates] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [editableRank, setEditableRank] = useState<string>("");
  const [editableSports, setEditableSports] = useState<string[]>([]);

  interface GalleryItemState {
    id: string;
    url: string;
    file?: File;
    type: 'existing' | 'new';
  }
  const [galleryItems, setGalleryItems] = useState<GalleryItemState[]>([]);


  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // `lessonTypes` will be computed after `coachData` is built to ensure
  // we use the normalized lessonTypes assigned into `coachData`.

  const filteredReviews = useMemo(() => {
    const base = Array.isArray(coachReviews) ? coachReviews : [];
    if (!selectedRatingFilter) return base;
    return base.filter((rv) => Math.round(Number(rv.rating || 0)) === selectedRatingFilter);
  }, [coachReviews, selectedRatingFilter]);

  const fetchReviews = useCallback(
    async (page = 1, append = false) => {
      // determine coach id (param preferred, else from store/resolved)
      const coachId = initialCoachId || currentCoach?.id || resolvedCoachRaw?._id;
      if (!coachId) return;
      try {
        setReviewsLoading(true);
        const resp = await getReviewsForCoachAPI(coachId as string, page, REVIEW_PAGE_LIMIT);

        // Normalize possible API shapes:
        // 1) { data: [...], pagination: { ... } }
        // 2) { success: true, data: { data: [...], pagination: { ... } } }
        // 3) direct array (unlikely)
        let body: any = resp;
        if (resp && typeof resp === 'object' && 'success' in resp && 'data' in resp) {
          body = resp.data;
        }

        const items = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
            ? body
            : body.data ?? [];

        const pageFromResp = body?.pagination?.page ?? resp?.pagination?.page ?? page;
        const totalPagesFromResp = body?.pagination?.totalPages ?? resp?.pagination?.totalPages ?? 1;

        if (append) setCoachReviews((prev) => [...prev, ...items]);
        else setCoachReviews(items);

        setReviewsPage(pageFromResp ?? page);
        setReviewsTotalPages(totalPagesFromResp ?? 1);
      } catch (err) {
        logger.error('Failed to load coach reviews', err);
      } finally {
        setReviewsLoading(false);
      }
    },
    [initialCoachId, currentCoach, resolvedCoachRaw],
  );

  useEffect(() => {
    const coachId = initialCoachId || currentCoach?.id || resolvedCoachRaw?._id;
    if (!coachId) return;
    fetchReviews(1, false);
    const timer = setInterval(() => {
      fetchReviews(1, false);
    }, 20000);
    return () => clearInterval(timer);
  }, [initialCoachId, currentCoach, resolvedCoachRaw, fetchReviews]);

  const onFilterChange = (rating: number | null) => {
    setSelectedRatingFilter(rating);
  };

  const onLoadMore = async (page?: number) => {
    const targetPage = typeof page === 'number' ? page : reviewsPage + 1;
    if (reviewsLoading || targetPage === reviewsPage) return;
    if (targetPage < 1 || targetPage > reviewsTotalPages) return;
    try {
      await fetchReviews(targetPage, false);
    } catch (err) {
      logger.error('Failed to load reviews page', err);
    }
  };

  const onWriteReview = () => setShowReviewModal(true);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const coachId = initialCoachId || currentCoach?.id || resolvedCoachRaw?._id;
    if (!coachId) return CustomFailedToast('Không tìm thấy thông tin HLV để gửi đánh giá');
    try {
      setIsSubmittingReview(true);
      const payload = {
        coachId,
        rating: reviewRating,
        comment: reviewComment,
      } as any;

      const action: any = await dispatch(createCoachReviewThunk(payload));
      if (action?.meta?.requestStatus === 'fulfilled') {
        CustomSuccessToast('Gửi đánh giá thành công');
        setShowReviewModal(false);
        setReviewComment('');
        setReviewRating(0);
        fetchReviews(1, false);
      } else {
        CustomFailedToast(String(action?.payload || 'Gửi đánh giá thất bại'));
      }
    } catch (err) {
      logger.error('Submit review failed', err);
      CustomFailedToast('Gửi đánh giá thất bại');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Resolve coachId: prefer param, else thunk resolve by userId
  useEffect(() => {
    if (initialCoachId) return;
    // lấy userId từ cookie/session
    let userId: string | null = null;
    try {
      const cookieUserStr = document.cookie.match(/user=([^;]+)/)?.[1];
      const storageUserStr = sessionStorage.getItem("user");
      const raw = cookieUserStr ? decodeURIComponent(cookieUserStr) : storageUserStr;
      if (raw) {
        const user = JSON.parse(raw);
        if (typeof user?._id === "string") userId = user._id;
        else if (user?._id?.buffer) {
          const arr = Object.values(user._id.buffer) as number[];
          userId = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
        } else if (user?.id) userId = String(user.id);
      }
    } catch {
      // ignore parse errors
    }
    if (userId) {
      dispatch(getCoachById(userId));
    }
  }, [initialCoachId, dispatch]);




  // Cleanup coach data when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearCurrentCoach());
    };
  }, [dispatch]);

  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

  // Initialize UI-only fields when data changes (must be before any early returns)
  const resetForm = useCallback(() => {
    const priceNum = typeof currentCoach?.price === "number"
      ? currentCoach.price
      : typeof resolvedCoachRaw?.hourlyRate === "number"
        ? resolvedCoachRaw.hourlyRate
        : undefined;

    setIsCoachActive(true);
    setEditablePrice(typeof priceNum === "number" ? priceNum : "-");

    // Initialize editable short bio summary
    const summary = (currentCoach?.description || resolvedCoachRaw?.bio || "").trim();
    setEditableSummary(summary);

    // Initialize coaching summary (experience/certification) for CoachingSection
    const coachingExperience = currentCoach?.coachingDetails?.experience ?? resolvedCoachRaw?.coachingDetails?.experience ?? resolvedCoachRaw?.experience ?? "";
    const coachingCertification = currentCoach?.coachingDetails?.certification ?? resolvedCoachRaw?.coachingDetails?.certification ?? resolvedCoachRaw?.certification ?? "";

    // Prefer a combined editable summary if not separately used
    const combinedSummary = coachingExperience || coachingCertification ? `${coachingExperience}${coachingExperience && coachingCertification ? " — " : ""}${coachingCertification}` : "";
    // Remove specific undesired combined phrase
    const filteredSummary = combinedSummary.replace(/10 years coaching experience with ITF certification\s*—\s*ITF Level 3 Coach/gi, "").trim();
    setEditableCoachingSummary(filteredSummary);

    // Initialize rank and specializations
    const initRank = currentCoach?.level ?? resolvedCoachRaw?.rank ?? "";
    setEditableRank(initRank);
    const initSpecs = currentCoach?.sports ?? resolvedCoachRaw?.sports ?? [];
    setEditableSports(Array.isArray(initSpecs) ? initSpecs : []);

    // Initialize editable location
    const rawLocation = currentCoach?.location || resolvedCoachRaw?.location || "";
    const location = typeof rawLocation === 'string'
      ? rawLocation.trim()
      : (rawLocation?.address || "").trim();
    setEditableLocation(location);

    // Initialize gallery items
    const apiGallery = currentCoach?.galleryImages || resolvedCoachRaw?.galleryImages || [];
    setGalleryItems(apiGallery.map((url, idx) => ({
      id: `existing-${idx}-${url.substring(url.length - 10)}`,
      url,
      type: 'existing'
    })));

    setIsDirty(false);
  }, [currentCoach, resolvedCoachRaw]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleEditModeToggle = (checked: boolean) => {
    if (!checked && isDirty) {
      setShowUnsavedAlert(true);
    } else {
      setIsEditMode(checked);
    }
  };

  const confirmDiscard = () => {
    setIsEditMode(false);
    setShowUnsavedAlert(false);
    resetForm();
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "bio",
        "gallery",
        "location",
      ];
      // If near the very top, force 'bio'
      if (window.scrollY < 50) {
        setActiveTab("bio");
        return;
      }
      const scrollPosition = window.scrollY + 120;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveTab(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapRef.current) return;

    // Wait for container to have proper dimensions (we will retry until container exists)
    const checkContainerSize = () => {
      if (!mapContainerRef.current) return false;
      const rect = mapContainerRef.current.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    // Retry initialization with longer delay and size check
    const initTimeout = setTimeout(() => {
      if (mapRef.current) return;

      // If container not yet available or has no size, retry shortly
      if (!mapContainerRef.current || !checkContainerSize()) {
        logger.warn('[Leaflet] Container not ready, retrying initialization...');
        const retry = setTimeout(() => {
          if (mapRef.current) return;
          if (mapContainerRef.current && checkContainerSize()) {
            initializeMap();
          } else {
            // one more retry after a bit
            setTimeout(() => {
              if (!mapRef.current && mapContainerRef.current && checkContainerSize()) initializeMap();
            }, 300);
          }
        }, 300);
        return () => clearTimeout(retry);
      }

      initializeMap();
    }, 200);

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      logger.debug('[Leaflet] Initializing map...');
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: MAP_CONFIG.zoom,
        // Disable double-click zoom to prevent conflicts
        doubleClickZoom: false,
        // Ensure zoom controls are visible
        zoomControl: true,
      });

      // Add tile layer with error handling
      const tileLayer = L.tileLayer(TILE_LAYER_URL, {
        attribution: '© OpenStreetMap contributors',
        maxZoom: MAP_CONFIG.maxZoom,
        // Add error handling for tiles
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      });

      tileLayer.addTo(map);

      // Add error event listener
      tileLayer.on('tileerror', (error) => {
        logger.error('[Leaflet] Tile loading error:', error);
      });

      // Create default icon for marker (fix for missing default icons)
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.Marker.prototype.options.icon = defaultIcon;

      const marker = L.marker(DEFAULT_CENTER, {
        draggable: true,
        icon: defaultIcon
      }).addTo(map);

      markerRef.current = marker;
      mapRef.current = map;

      // Multiple invalidateSize calls to ensure map renders
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
      setTimeout(() => {
        map.invalidateSize();
      }, 500);

      logger.debug('[Leaflet] Map initialized successfully');
    };

    return () => {
      clearTimeout(initTimeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Invalidate map size when edit mode changes or component mounts
  useEffect(() => {
    if (mapRef.current) {
      // Multiple timeouts to ensure map resizes properly
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 300);
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 500);
    }
  }, [isEditMode]);

  // Update marker and map interactions based on edit mode
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;

    if (isEditMode) {
      // Enable drag for edit mode
      if (markerRef.current.dragging) {
        markerRef.current.dragging.enable();
      }

      const handleDragEnd = () => {
        const pos = markerRef.current!.getLatLng();
        setLocationCoordinates([pos.lat, pos.lng]);
        (async () => {
          const addr = await reverseGeocode(pos.lat, pos.lng);
          if (addr) {
            setEditableLocation(addr);
          }
        })();
      };

      markerRef.current.on('dragend', handleDragEnd);

      // Enable click to set location in edit mode
      const handleMapClick = async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (!markerRef.current) return;

        markerRef.current.setLatLng([lat, lng]);
        setLocationCoordinates([lat, lng]);
        const addr = await reverseGeocode(lat, lng);
        if (addr) {
          setEditableLocation(addr);
        }
      };

      mapRef.current.on('click', handleMapClick);

      return () => {
        markerRef.current?.off('dragend', handleDragEnd);
        mapRef.current?.off('click', handleMapClick);
        markerRef.current?.dragging?.disable();
      };
    } else {
      // Disable interactions in view mode
      if (markerRef.current.dragging) {
        markerRef.current.dragging.disable();
      }
      mapRef.current.off('click');
    }
  }, [isEditMode]);

  // Auto-search location when editableLocation is set from coachData but no coordinates
  useEffect(() => {
    // Only search if we have location text but no coordinates, and map is initialized
    if (!editableLocation.trim() || locationCoordinates || !mapRef.current || !markerRef.current) return;

    // Small delay to avoid too many requests
    const timeoutId = setTimeout(async () => {
      try {
        const result = await searchLocation(editableLocation);
        if (result && mapRef.current && markerRef.current) {
          setLocationCoordinates([result.lat, result.lon]);
          markerRef.current.setLatLng([result.lat, result.lon]);
          mapRef.current.flyTo([result.lat, result.lon], MAP_CONFIG.flyToZoom, {
            duration: MAP_CONFIG.flyToDuration,
            easeLinearity: MAP_CONFIG.flyToEaseLinearity,
          });
        }
      } catch (error) {
        logger.warn('Auto-search location failed:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableLocation]);

  // Update map position helper
  const updateMapPosition = useCallback((lat: number, lng: number, address: string) => {
    if (!mapRef.current || !markerRef.current) return;

    setLocationCoordinates([lat, lng]);
    setEditableLocation(address);
    markerRef.current.setLatLng([lat, lng]);
    // Update draggable state based on edit mode
    if (markerRef.current.dragging) {
      if (isEditMode) {
        markerRef.current.dragging.enable();
      } else {
        markerRef.current.dragging.disable();
      }
    }
    mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), MAP_CONFIG.flyToZoom), {
      duration: MAP_CONFIG.flyToDuration,
      easeLinearity: MAP_CONFIG.flyToEaseLinearity,
    });
  }, [isEditMode]);

  // Handle search location
  const handleSearchLocation = useCallback(async () => {
    const query = editableLocation.trim();
    if (!query || !mapRef.current || !markerRef.current) return;

    setIsSearching(true);

    try {
      // Check if input is direct lat,lng coordinates
      const coordinates = parseLatLngFromString(query);
      if (coordinates) {
        const [lat, lng] = coordinates;
        updateMapPosition(lat, lng, query);
        setIsSearching(false);
        return;
      }

      // Search using geocoding service
      const result = await searchLocation(query);

      if (result) {
        updateMapPosition(result.lat, result.lon, result.display_name);
      } else {
        CustomSuccessToast("Không tìm thấy địa điểm phù hợp");
      }
    } catch (error) {
      logger.error('Geocoding error:', error);
      CustomSuccessToast("Có lỗi xảy ra khi tìm kiếm địa điểm");
    } finally {
      setIsSearching(false);
    }
  }, [editableLocation, updateMapPosition]);

  const handleCitySelect = useCallback(async (value: string) => {
    setSelectedCity(value);

    if (value === 'all' || !value) return;

    setIsSearching(true);

    try {
      const result = await searchLocation(value + ', Vietnam');

      if (result) {
        updateMapPosition(result.lat, result.lon, result.display_name);
        setEditableLocation(result.display_name);
        logger.debug('Selected city:', { city: value, address: result.display_name, lat: result.lat, lng: result.lon });
      } else {
        CustomSuccessToast('Không tìm thấy thành phố này trên bản đồ');
      }
    } catch (error) {
      logger.error('City geocoding error:', error);
      CustomSuccessToast('Có lỗi xảy ra khi tìm kiếm thành phố');
    } finally {
      setIsSearching(false);
    }
  }, [updateMapPosition]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Update active tab immediately to reflect the user's choice
      setActiveTab(sectionId);
      const offset = 100;
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;
      const startY = window.pageYOffset;
      const distance = offsetPosition - startY;
      const duration = 900; // ms
      let startTime: number | null = null;

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (timestamp: number) => {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);
        window.scrollTo(0, startY + distance * eased);
        if (elapsed < duration) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }
  };

  const nextGallerySlide = () => {
    setCurrentGalleryIndex((prev) => (prev + 1) % (galleryImages.length - 2));
  };

  const prevGallerySlide = () => {
    setCurrentGalleryIndex(
      (prev) =>
        (prev - 1 + (galleryImages.length - 2)) % (galleryImages.length - 2)
    );
  };

  const tabs = [
    { id: "bio", label: "Giới thiệu" },
    { id: "gallery", label: "Thư viện ảnh" },
    { id: "location", label: "Vị trí" },
  ];

  const galleryImages = useMemo(() => {
    if (galleryItems.length > 0) {
      return galleryItems.map((item, index) => ({
        url: item.url,
        alt: `Gallery image ${index + 1}`
      }));
    }
    return [];
  }, [galleryItems]);

  //   const reviews = [ (removed)
  //     {
  //       name: "Amanda Rosales",
  //       date: "09/26/2023",
  //       rating: 5,
  //       title: "Absolutely Perfect!",
  //       content:
  //         "Amazing facility. It is a perfect place for friendly match with your friends or a competitive match. It is the best place.",
  //       images: [
  //         "/badminton-court-1.jpg",
  //         "/badminton-court-2.jpg",
  //         "/badminton-court-3.jpg",
  //         "/badminton-court-4.jpg",
  //         "/badminton-court-5.jpg",
  //       ],
  //       helpful: 12,
  //     },
  //     {
  //       name: "Michael Chen",
  //       date: "09/18/2023",
  //       rating: 5,
  //       title: "Awesome. Its very convenient to play.",
  //       content:
  //         "Amazing facility. It is a perfect place for friendly match with your friends or a competitive match. Excellent coaching and atmosphere. Highly recommended for an exceptional playing experience.",
  //       helpful: 8,
  //     },
  //   ];

  // Removed similar coaches data (section deprecated)

  // Trạng thái tải dữ liệu HLV
  if (detailLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loading size={48} className="text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải thông tin huấn luyện viên...</p>
        </div>
      </div>
    );
  }

  // Trạng thái lỗi khi tải dữ liệu HLV
  if (detailError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Lỗi tải dữ liệu huấn luyện viên: {detailError.message}</p>
          <Button
            onClick={() => {
              let uid = "";
              try {
                const cookieUserStr = document.cookie.match(/user=([^;]+)/)?.[1];
                const storageUserStr = sessionStorage.getItem("user");
                const raw = cookieUserStr ? decodeURIComponent(cookieUserStr) : storageUserStr;
                if (raw) {
                  const user = JSON.parse(raw);
                  if (typeof user?._id === "string") uid = user._id;
                  else if (user?._id?.buffer) {
                    const arr = Object.values(user._id.buffer) as number[];
                    uid = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
                  } else if (user?.id) uid = String(user.id);
                }
              } catch {
                // ignore parse errors
              }
              if (uid) dispatch(getCoachById(uid));
            }}
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // Hiển thị đang lấy coachId
  if (resolveCoachIdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loading size={48} className="text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tìm mã HLV của bạn...</p>
        </div>
      </div>
    );
  }

  // Hiển thị lỗi khi resolve coachId fail
  if (resolveCoachIdError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Không tìm thấy thông tin huấn luyện viên: {resolveCoachIdError.message}
          </p>
        </div>
      </div>
    );
  }

  // Ưu tiên dữ liệu CoachDetail nếu đã có; nếu không, map từ resolvedCoachRaw (CoachProfile)
  // Normalize location to string for both currentCoach and resolvedCoachRaw
  const normalizeLocation = (loc: any): string => {
    if (!loc) return "";
    if (typeof loc === 'string') return loc;
    if (loc?.address) return loc.address;
    return "";
  };

  const coachData = currentCoach ? {
    ...currentCoach,
    location: normalizeLocation(currentCoach.location),
    lessonTypes: Array.isArray(currentCoach.lessonTypes)
      ? currentCoach.lessonTypes.map((ls: any) => {
        const normalizeId = (val: any) => {
          if (!val && val !== 0) return "";
          if (typeof val === "string") return val;
          if (typeof val === "object") {
            if (typeof val.toString === "function") return val.toString();
            if (val?._id) return normalizeId(val._id);
            if (val?.$oid) return String(val.$oid);
            if (val?.buffer) {
              try {
                const arr = Object.values(val.buffer) as number[];
                return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
              } catch {
                return JSON.stringify(val);
              }
            }
            return JSON.stringify(val);
          }
          return String(val);
        };

        return {
          ...ls,
          _id: normalizeId(ls._id),
          id: normalizeId(ls._id),
          user: normalizeId(ls.user ?? ls.userId ?? ""),
        };
      })
      : [],
  } : (resolvedCoachRaw ? {
    id: resolvedCoachRaw._id || "",
    name: resolvedCoachRaw.user?.fullName || "",
    profileImage: "",
    avatar: resolvedCoachRaw.user?.avatarUrl || "",
    description: resolvedCoachRaw.bio || "",
    rating: Number(resolvedCoachRaw.rating ?? 0),
    reviewCount: Number(resolvedCoachRaw.totalReviews ?? 0),
    location: normalizeLocation(resolvedCoachRaw.location),
    level: resolvedCoachRaw.rank || "",
    completedSessions: Number(resolvedCoachRaw.completedSessions ?? 0),
    createdAt: resolvedCoachRaw.createdAt || "",
    memberSince: resolvedCoachRaw.createdAt || "",
    availableSlots: [],
    lessonTypes: [],
    price: Number(resolvedCoachRaw.hourlyRate ?? 0),
    coachingDetails: {
      experience: resolvedCoachRaw.experience || "",
      certification: resolvedCoachRaw.certification || "",
    },
  } : null);

  return (
    <CoachDashboardLayout>
      {/* Hero Background Section */}
      <div className="relative bg-[#1a2332] overflow-hidden h-[400px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/badminton-player-action-shot-dark.jpg"
            alt="Background"
            className="w-full h-full object-cover opacity-40"
          />
          {/* Đổi overlay gradient thành overlay solid mượt hơn */}
          <div className="absolute inset-0 bg-[#0b1020]/80" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 -mt-48 relative z-20 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column - Coach Info Card and Content Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coach Information Card - Standalone */}
            <Card className="shadow-2xl border-0 animate-fade-in-up bg-white">
              <CardContent className="p-6">
                {coachData ? (
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Coach Avatar */}
                    <div className="relative group flex-shrink-0">
                      {isCoachActive && (
                        <div className="absolute -inset-1 rounded-full bg-emerald-500/70 group-hover:bg-emerald-500 transition duration-300 blur" />
                      )}
                      <Avatar className="relative h-24 w-24 border-4 border-white shadow-lg">
                        <AvatarImage
                          src={coachData.avatar || coachData.profileImage || "/professional-coach-portrait.png"}
                          alt={coachData.name}
                        />
                        <AvatarFallback className="text-2xl bg-emerald-600 text-white">
                          {coachData.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Coach Info */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h1 className="text-3xl font-bold text-balance">
                            {coachData.name}
                          </h1>
                          <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          </Badge>
                          <div className="ml-auto flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Chế độ chỉnh sửa</Label>
                            <Switch
                              checked={isEditMode}
                              onCheckedChange={handleEditModeToggle}
                              className="ring-2 ring-offset-2 ring-green-500 border border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-green-600"
                            />
                            {isEditMode && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={async () => {
                                  const coachId = initialCoachId || currentCoach?.id || resolvedCoachRaw?._id;
                                  if (!coachId) return CustomFailedToast('Không tìm thấy HLV để lưu');

                                  // 1. Process Gallery Images
                                  let finalGalleryImages: string[] = [];
                                  try {
                                    const existingUrls = galleryItems.filter(i => i.type === 'existing').map(i => i.url);
                                    const newItems = galleryItems.filter(i => i.type === 'new');
                                    const newFiles = newItems.map(i => i.file).filter((f): f is File => !!f);

                                    let uploadedUrls: string[] = [];
                                    if (newFiles.length > 0) {
                                      CustomSuccessToast('Đang tải ảnh mới lên...');
                                      const uploadRes = await dispatch(uploadCoachGalleryImages({
                                        coachId,
                                        files: newFiles
                                      })).unwrap();

                                      // Robustly get URLs from response
                                      uploadedUrls = uploadRes.urls || (uploadRes as any).data?.urls || [];
                                    }

                                    finalGalleryImages = [...existingUrls, ...uploadedUrls];
                                  } catch (err) {
                                    logger.error('Gallery upload failed', err);
                                    return CustomFailedToast('Lỗi khi tải ảnh. Vui lòng thử lại.');
                                  }

                                  // 2. Prepare Profile Payload
                                  // Try to parse coaching summary into experience and certification if possible
                                  let experience = '';
                                  let certification = '';
                                  if (editableCoachingSummary && editableCoachingSummary.trim()) {
                                    const parts = editableCoachingSummary.split('—').map(p => p.trim()).filter(Boolean);
                                    if (parts.length === 1) {
                                      experience = parts[0];
                                    } else if (parts.length >= 2) {
                                      experience = parts[0];
                                      certification = parts.slice(1).join(' — ');
                                    }
                                  } else {
                                    experience = currentCoach?.coachingDetails?.experience ?? resolvedCoachRaw?.coachingDetails?.experience ?? '';
                                    certification = currentCoach?.coachingDetails?.certification ?? resolvedCoachRaw?.coachingDetails?.certification ?? '';
                                  }

                                  const payload: any = {
                                    bio: editableSummary,
                                    sports: editableSports,
                                    certification,
                                    experience,
                                    rank: editableRank,
                                    galleryImages: finalGalleryImages,
                                  };

                                  // 3. Save Both
                                  try {
                                    const action: any = await dispatch(updateCoach({ id: coachId, data: payload }));
                                    if (action?.meta?.requestStatus === 'fulfilled') {
                                      CustomSuccessToast('Lưu thông tin thành công');
                                      // refresh data
                                      dispatch(getCoachById(coachId));
                                    } else {
                                      CustomFailedToast(String(action?.payload?.message || 'Lưu thất bại'));
                                    }
                                  } catch (err) {
                                    logger.error('Update coach failed', err);
                                    CustomFailedToast('Lưu thất bại');
                                  }
                                }}
                              >
                                Lưu
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-base text-muted-foreground text-left">
                          {coachData.description}
                        </p>
                      </div>

                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="bg-yellow-100 p-1.5 rounded">
                            <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                          </div>
                          <span className="font-semibold">
                            {coachData.rating}
                          </span>

                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{coachData.location || 'Chưa có địa chỉ'}</span>
                        </div>
                      </div>

                      {/* Additional Stats */}
                      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          <span>Hạng: {coachData.level}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Buổi đã hoàn thành: {coachData.completedSessions}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Tham gia Dreamsports từ: {coachData.memberSince
                              ? new Date(
                                coachData.memberSince
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Coach data not found.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Thanh tab điều hướng */}
            <div className="bg-white rounded-lg shadow-md p-3 sticky top-4 z-30 animate-fade-in">
              <div className="flex flex-wrap gap-2 items-center">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => scrollToSection(tab.id)}
                    className={`transition-all duration-300 ${activeTab === tab.id
                      ? "bg-[#1a2332] text-white hover:bg-[#1a2332]/90"
                      : "hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Các phần nội dung */}
            <div className="space-y-6">
              {/* Short Bio Section */}
              <BioSection
                summary={editableSummary}
                coachDescription={coachData?.description}
                isEditMode={isEditMode}
                onSummaryChange={(val) => { setEditableSummary(val); setIsDirty(true); }}
              />

              {/* Phần: Thư viện ảnh */}
              <GallerySection
                images={galleryImages}
                currentIndex={currentGalleryIndex}
                isEditMode={isEditMode}
                onNext={nextGallerySlide}
                onPrev={prevGallerySlide}
                onUpload={(files) => {
                  const filesArray = Array.from(files);
                  if (filesArray.length > 5) {
                    CustomFailedToast('Chỉ có thể tải lên tối đa 5 ảnh cùng lúc');
                    return;
                  }

                  const newItems: GalleryItemState[] = filesArray.map(file => ({
                    id: Math.random().toString(36).substring(7),
                    url: URL.createObjectURL(file),
                    file,
                    type: 'new'
                  }));

                  setGalleryItems(prev => [...prev, ...newItems]);
                  setIsDirty(true);
                  CustomSuccessToast(`Đã thêm ${filesArray.length} ảnh vào bản xem trước`);
                }}
                onDelete={(index) => {
                  setGalleryItems(prev => prev.filter((_, i) => i !== index));
                  setIsDirty(true);
                }}
              />

              {/* Phần: Đánh giá / Reviews */}
              <ReviewsSection
                coachData={coachData}
                coachStats={coachStats}
                coachReviews={coachReviews}
                filteredReviews={filteredReviews}
                reviewsLoading={reviewsLoading}
                reviewsPage={reviewsPage}
                reviewsTotalPages={reviewsTotalPages}
                selectedRatingFilter={selectedRatingFilter}
                onFilterChange={onFilterChange}
                onLoadMore={onLoadMore}
                onWriteReview={onWriteReview}
                showWriteReview={false}
              />

              {/* Phần: Vị trí */}
              <LocationSection
                location={editableLocation}
                locationCoordinates={locationCoordinates}
                isEditMode={isEditMode}
                isSearching={isSearching}
                selectedCity={selectedCity}
                mapContainerRef={mapContainerRef}
                onLocationChange={(val) => { setEditableLocation(val); setIsDirty(true); }}
                onSearchLocation={handleSearchLocation}
                onCitySelect={handleCitySelect}
              />
            </div>
          </div>

          {/* Cột phải - Đặt lịch và thanh bên */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6 animate-slide-in-right">
              {/*y*/}
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="space-y-4 pb-6">
                  <CardTitle className="text-2xl font-bold text-left">Đặt huấn luyện viên</CardTitle>
                  <hr className="my-2 border-gray-200" />

                  {/* Active switch and price editor (UI only) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="text-left">
                        <div className="text-md font-semibold text-foreground">
                          <span className="font-semibold">{coachData?.name ?? "-"}</span>{" "}
                          <span className={isCoachActive ? "text-green-600" : "text-red-600"}>
                            {isCoachActive ? "đang hoạt động" : "tạm ngưng"}
                          </span>
                        </div>
                      </div>
                      <Switch
                        disabled={!isEditMode}
                        checked={isCoachActive}
                        onCheckedChange={(val) => { setIsCoachActive(val); setIsDirty(true); }}
                        className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-green-600"
                      />
                    </div>

                    <div className="bg-muted/30 rounded-lg">
                      <Label className="text-sm text-muted-foreground">Giá từ (VND/giờ)</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xl font-bold text-green-600">₫</span>
                        {isEditMode ? (
                          <Input
                            value={editablePrice === "-" ? "" : (editablePrice as number).toLocaleString("vi-VN")}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, "");
                              setEditablePrice(v === "" ? "-" : Number(v));
                              setIsDirty(true);
                            }}
                            placeholder="0"
                            inputMode="numeric"
                            className="h-10"
                          />
                        ) : (
                          <span className="text-4xl font-bold text-green-600">{editablePrice === "-" ? "-" : (editablePrice as number).toLocaleString("vi-VN")}</span>
                        )}
                        <span className="text-lg text-muted-foreground">/giờ</span>
                      </div>
                    </div>
                  </div>

                </CardHeader>
              </Card>

              {/* Lịch trống tiếp theo */}
              <Card id="next-availability" className="shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                    Lịch trống tiếp theo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {(coachData?.availableSlots?.length
                      ? coachData.availableSlots
                        .slice(0, 4)
                        .map((slot, index) => ({
                          day: new Date(
                            Date.now() + index * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }),
                          time: slot.startTime,
                        }))
                      : [
                        { day: "Th 5, 24 Thg 9", time: "3 PM" },
                        { day: "Th 6, 25 Thg 9", time: "4 PM" },
                        { day: "Th 7, 26 Thg 9", time: "2 PM" },
                        { day: "CN, 27 Thg 9", time: "11 AM" },
                      ]
                    ).map((slot, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-3 px-2 flex flex-col items-start hover:border-green-500 hover:bg-green-50 transition-all duration-300 group bg-transparent"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <span className="text-xs text-muted-foreground group-hover:text-green-700">
                          {slot.day}
                        </span>
                        <span className="font-semibold text-sm group-hover:text-green-600">
                          {slot.time}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Danh sách bởi chủ sở hữu */}
              {/* <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-lg text-left">Danh sách bởi chủ sở hữu</CardTitle>
                  <hr className="my-2 border-gray-200 w-full" />
                </CardHeader>

                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors duration-300 cursor-pointer group">
                    <img
                      src="/sports-academy-building.jpg"
                      alt="Manchester Academy"
                      className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-green-600 transition-colors">
                        Manchester Academy
                      </h4>
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>New York, NY 10012</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card> */}
            </div>
          </div>
        </div>
      </div>

      {/* Footer chung */}
      <div className="bg-[#1a2332] text-white mt-16">
        <div className="container mx-auto px-4 lg:px-8 py-10 grid gap-6 md:grid-cols-3">
          <div>
            <h4 className="font-semibold mb-2">Dreamcoach</h4>
            <p className="text-sm text-white/70">Kết nối người chơi với huấn luyện viên chất lượng.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Hỗ trợ</h4>
            <p className="text-sm text-white/70">Email: support@dreamcoach.app</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Điều khoản</h4>
            <p className="text-sm text-white/70">Điều khoản dịch vụ · Chính sách bảo mật</p>
          </div>
        </div>
      </div>

      {/* Review modal - placed with other modals */}
      <ReviewModal
        open={showReviewModal}
        onOpenChange={(v) => setShowReviewModal(v)}
        coachName={coachData?.name || "HLV này"}
        reviewRating={reviewRating}
        hoveredRating={hoveredRating}
        reviewComment={reviewComment}
        isSubmitting={isSubmittingReview}
        onRatingChange={(r) => setReviewRating(r)}
        onHoveredRatingChange={(r) => setHoveredRating(r)}
        onCommentChange={(c) => setReviewComment(c)}
        onSubmit={handleSubmitReview}
        onCancel={() => {
          setShowReviewModal(false);
          setReviewRating(0);
          setHoveredRating(0);
        }}
      />

      {/* Confirm Unsaved Changes Alert */}
      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn thoát?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có thay đổi chưa lưu. Nếu thoát chế độ chỉnh sửa, mọi thay đổi sẽ bị hủy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedAlert(false)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard} className="bg-red-600 hover:bg-red-700 text-white">Tiếp tục thoát</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </CoachDashboardLayout>
  );
}
