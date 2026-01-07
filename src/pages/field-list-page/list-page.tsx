"use client"

import { Loading } from "../../components/ui/loading"
import logger from "@/utils/logger"

import { NavbarDarkComponent } from "../../components/header/navbar-dark-component"
import FieldCard from "./card-list/field-card-props"
import { useRef, useEffect, useState } from "react"
import { FooterComponent } from "../../components/footer/footer-component"
import { useAppDispatch, useAppSelector } from "../../store/hook"
import { getAllFields } from "../../features/field/fieldThunk"
import { useGeolocation } from "../../hooks/useGeolocation"
import { locationAPIService } from "../../utils/geolocation"
import { Navigation, AlertCircle, Filter, DollarSign, Plus, Minus, Search, MapPin, Trophy } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layouts/page-wrapper"
import { FilterSidebar } from "./filter-sidebar"
import { getFieldPinIconWithLabel } from "@/utils/fieldPinIcon";
import { VIETNAM_CITIES, SPORT_TYPE_OPTIONS, PRICE_SORT_OPTIONS } from "@/utils/constant-value/constant";

const FieldBookingPage = () => {
  const fieldsListRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const { fields, loading, error, pagination } = useAppSelector(
    (state) => state.field
  );

  const [filters, setFilters] = useState({
    location: "",
    type: "",
    page: 1,
    limit: 10,
  });
  const {
    loading: geolocationLoading,
    supported: geolocationSupported,
    getCoordinates,
  } = useGeolocation();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearbyFields, setNearbyFields] = useState<any[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("any");
  const [locationFilter, setLocationFilter] = useState("");
  const [priceSort, setPriceSort] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // New filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const isUserZoomingRef = useRef<boolean>(false);
  const pendingZoomRef = useRef<number | null>(null); // THÊM dòng này
  const skipNextDebounceRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const lastFitBoundsMarkersRef = useRef<string>(""); // Track which markers we last called fitBounds for
  const mapContainerId = "fields-map-container";
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const fieldCardRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);

  const handleResetAllFilters = () => {
    setNameFilter("");
    setSportFilter("all");
    setTimeFilter("any");
    setLocationFilter("");
    setPriceSort("");
    setSearchQuery("");
    setMinPrice(null);
    setMaxPrice(null);
    setMinRating(null);
    setSelectedAmenities([]);

    setFilters((prev) => {
      const copy: any = { ...prev };
      delete copy.sortBy;
      delete copy.sortOrder;
      delete copy.name;
      delete copy.weekday;
      return {
        ...copy,
        type: "",
        sportType: "",
        location: "",
        page: 1,
      } as any;
    });

    setIsNearbyMode(false);
    setNearbyFields([]);
    setUserLocation(null);
    try {
      navigate(location.pathname, { replace: true });
    } catch (error: any) {
      logger.error("Error navigating", error);
    }
  };

  const handleGetLocation = async () => {
    try {
      const coordinates = await getCoordinates();
      if (coordinates?.lat && coordinates?.lng) {
        setUserLocation(coordinates as { lat: number; lng: number });

        // Zoom map to user location with zoom level 14
        if (mapRef.current) {
          isUserZoomingRef.current = true;
          pendingZoomRef.current = 14;
          setCurrentZoom(14);
          mapRef.current.setView([coordinates.lat, coordinates.lng], 14, { animate: true });
        }

        // Get current filters
        const currentSportType =
          sportFilter !== "all" ? sportFilter : undefined;
        const currentName = nameFilter?.trim() || undefined;
        const currentLocation = locationFilter?.trim() || undefined;
        await getNearbyFields(
          coordinates.lat,
          coordinates.lng,
          currentSportType,
          currentName,
          currentLocation
        );
      }
    } catch (error) {
      logger.error("Error getting location", error);
    }
  };

  const getNearbyFields = async (
    lat: number,
    lng: number,
    sportType?: string,
    name?: string,
    location?: string
  ) => {
    setIsLoadingNearby(true);
    try {
      const result = await locationAPIService.getNearbyFields({
        latitude: lat,
        longitude: lng,
        radius: 10,
        limit: 20,
        sportType: sportType as any,
        name: name,
        location: location,
      });
      if (result.success && result.data) {
        // Ensure operatingHours is preserved in nearby fields data
        const fieldsWithOperatingHours = result.data.map((field: any) => ({
          ...field,
          operatingHours: Array.isArray(field.operatingHours) ? field.operatingHours : [],
        }));
        setNearbyFields(fieldsWithOperatingHours);
        setIsNearbyMode(true);
      } else {
        setNearbyFields([]);
        setIsNearbyMode(false);
      }
    } catch {
      setNearbyFields([]);
      setIsNearbyMode(false);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  useEffect(() => {
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      if (!isNearbyMode) dispatch(getAllFields(filters));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [dispatch, filters, isNearbyMode]);

  // Apply client-side filters to nearby fields
  const applyFiltersToNearbyFields = (fields: any[]) => {
    let filtered = [...fields];

    // Filter by name
    if (nameFilter?.trim()) {
      const nameLower = nameFilter.trim().toLowerCase();
      filtered = filtered.filter((f) => {
        const fieldName = (f.name || "").toLowerCase();
        // Handle different location structures: string, object with address, or object with location.address
        const fieldLocation =
          typeof f.location === "string"
            ? f.location.toLowerCase()
            : (f.location?.address || f.address || "").toLowerCase();
        return (
          fieldName.includes(nameLower) || fieldLocation.includes(nameLower)
        );
      });
    }

    // Filter by location
    if (locationFilter?.trim()) {
      const locationLower = locationFilter.trim().toLowerCase();
      filtered = filtered.filter((f) => {
        // Handle different location structures
        const fieldLocation =
          typeof f.location === "string"
            ? f.location.toLowerCase()
            : (f.location?.address || f.address || "").toLowerCase();
        return fieldLocation.includes(locationLower);
      });
    }

    // Filter by sport type (already handled by API, but apply client-side as well for consistency)
    if (sportFilter !== "all") {
      filtered = filtered.filter((f) => {
        const fieldSportType = (f.sportType || "").toLowerCase();
        return fieldSportType === sportFilter.toLowerCase();
      });
    }

    // Filter by time (weekday) - this would need to be implemented based on field schedule
    // For now, we'll skip this as it requires schedule data

    // Sort by price
    if (priceSort && priceSort !== "none") {
      filtered.sort((a, b) => {
        const priceA = (a.basePrice ?? 0) || 0;
        const priceB = (b.basePrice ?? 0) || 0;
        return priceSort === "asc" ? priceA - priceB : priceB - priceA;
      });
    }

    return filtered;
  };

  useEffect(() => {
    setFilters((prev) => {
      const prevAny: any = prev;
      const prevSortBy = prevAny.sortBy;
      const prevSortOrder = prevAny.sortOrder;
      const newSortBy = priceSort && priceSort !== "none" ? "price" : undefined;
      const newSortOrder =
        priceSort && priceSort !== "none" ? priceSort : undefined;

      // Check if sort actually changed
      const sortChanged =
        prevSortBy !== newSortBy || prevSortOrder !== newSortOrder;

      // Only update if sort changed or page is not 1
      if (!sortChanged && prev.page === 1) return prev;

      const copy: any = { ...prevAny };
      delete copy.sortBy;
      delete copy.sortOrder;
      if (newSortBy && newSortOrder) {
        copy.sortBy = newSortBy;
        copy.sortOrder = newSortOrder;
      }
      copy.page = 1;
      return copy;
    });
  }, [priceSort]);

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const qType = params.get("type") || "";
      const qLocation = params.get("location") || params.get("loc") || "";
      const qName = params.get("name") || "";
      const qWeekday = params.get("weekday") || params.get("time") || "";

      setFilters((prev) => ({
        ...prev,
        type: qType,
        sportType: qType,
        location: qLocation,
        page: 1,
      }));
      setNameFilter(qName);
      setSportFilter(qType || "all");
      setTimeFilter(qWeekday || "any");
      setLocationFilter(qLocation);
    } catch (error: any) {
      logger.error("Error reading query params", error);
    }
  }, [location.search]);

  // Re-call nearby API when filters change in nearby mode
  useEffect(() => {
    if (isNearbyMode && userLocation?.lat && userLocation?.lng) {
      const currentSportType = sportFilter !== "all" ? sportFilter : undefined;
      const currentName = nameFilter?.trim() || undefined;
      const currentLocation = locationFilter?.trim() || undefined;
      getNearbyFields(
        userLocation.lat,
        userLocation.lng,
        currentSportType,
        currentName,
        currentLocation
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportFilter, nameFilter, locationFilter, isNearbyMode]);

  useEffect(() => {
    setFilters((prev) => {
      const prevAny: any = prev;
      const copy: any = { ...prevAny };

      // Check if name filter changed
      const newName = nameFilter?.trim() || undefined;
      const prevName = prevAny.name;
      if (newName !== prevName) {
        if (newName) {
          copy.name = newName;
        } else {
          delete copy.name;
        }
      }

      // Handle sport filtering
      let sportChanged = false;
      if (sportFilter !== "all") {
        // User selected specific sport
        if (
          prevAny.sportType !== sportFilter ||
          prevAny.type !== sportFilter ||
          prevAny.sportTypes
        ) {
          copy.type = sportFilter;
          copy.sportType = sportFilter;
          delete copy.sportTypes;
          sportChanged = true;
        }
      } else {
        // No filter
        if (prevAny.type || prevAny.sportType || prevAny.sportTypes) {
          delete copy.type;
          delete copy.sportType;
          delete copy.sportTypes;
          sportChanged = true;
        }
      }

      // Check if time filter changed
      const newWeekday = timeFilter !== "any" ? timeFilter : undefined;
      const prevWeekday = prevAny.weekday;
      if (newWeekday !== prevWeekday) {
        if (newWeekday) {
          copy.weekday = newWeekday;
        } else {
          delete copy.weekday;
        }
      }

      // Check if location filter changed
      const newLocation = locationFilter?.trim() || undefined;
      const prevLocation = prevAny.location;
      if (newLocation !== prevLocation) {
        if (newLocation) {
          copy.location = newLocation;
        } else {
          delete copy.location;
        }
      }

      // Only update if something actually changed
      const hasChanges =
        newName !== prevName ||
        sportChanged ||
        newWeekday !== prevWeekday ||
        newLocation !== prevLocation ||
        prev.page !== 1;

      if (!hasChanges) {
        return prev;
      }

      copy.page = 1;
      return copy;
    });
  }, [
    nameFilter,
    sportFilter,
    timeFilter,
    locationFilter,
  ]);

  const hasActiveFilters = !!(
    nameFilter ||
    searchQuery ||
    sportFilter !== "all" ||
    minPrice !== null ||
    maxPrice !== null ||
    minRating !== null ||
    selectedAmenities.length > 0 ||
    timeFilter !== "any" ||
    locationFilter ||
    (priceSort && priceSort !== "none") ||
    isNearbyMode
  );

  const forceSyncFilters = () => {
    const currentNameValue = nameInputRef.current?.value.trim() || "";
    const currentLocationValue = locationFilter.trim();

    if (currentNameValue !== nameFilter) setNameFilter(currentNameValue);
    if (currentLocationValue !== locationFilter)
      setLocationFilter(currentLocationValue);

    setFilters((prev) => {
      const copy: any = { ...prev };
      if (currentNameValue) copy.name = currentNameValue;
      else delete copy.name;
      if (currentLocationValue) copy.location = currentLocationValue.trim();
      else delete copy.location;
      if (sportFilter !== "all") {
        copy.type = sportFilter;
        copy.sportType = sportFilter;
      } else {
        delete copy.type;
        delete copy.sportType;
      }
      if (timeFilter !== "any") copy.weekday = timeFilter;
      else delete copy.weekday;
      copy.page = 1;
      return copy;
    });

    if (!isNearbyMode) {
      const base: any = {};
      if (currentNameValue) base.name = currentNameValue;
      if (currentLocationValue) base.location = currentLocationValue.trim();
      if (sportFilter !== "all") base.sportType = sportFilter;
      if (timeFilter !== "any") base.weekday = timeFilter;
      if (priceSort && priceSort !== "none") {
        base.sortBy = "price";
        base.sortOrder = priceSort;
      }
      base.page = 1;
      base.limit = 10;
      skipNextDebounceRef.current = true;
      dispatch(getAllFields(base));
    }
  };

  // Get fields to transform - apply filters to nearby fields if in nearby mode
  const fieldsToTransform =
    isNearbyMode && nearbyFields.length > 0
      ? applyFiltersToNearbyFields(nearbyFields)
      : fields;

  const transformedFields = fieldsToTransform.map((field) => {
    const rawLocation: any = (field as any).location ?? (field as any).address;
    let locationText = "Địa chỉ không xác định";
    if (typeof rawLocation === "string" && rawLocation.trim()) {
      locationText = rawLocation;
    } else if (rawLocation && typeof rawLocation === "object") {
      const address = (rawLocation as any).address;
      const geo = (rawLocation as any).geo;
      const lat = geo?.latitude ?? geo?.lat;
      const lng = geo?.longitude ?? geo?.lng;
      if (typeof address === "string" && address.trim()) {
        locationText = address;
      } else if (lat != null && lng != null) {
        locationText = `${lat}, ${lng}`;
      }
    }

    const fieldImages = (field as any).images;
    const hasValidImages = Array.isArray(fieldImages) && fieldImages.length > 0;
    const imageUrl = !hasValidImages
      ? "/general-img-portrait.png"
      : (field as any).imageUrl ||
      fieldImages[0] ||
      "/general-img-portrait.png";

    // Ensure operatingHours is properly extracted
    const operatingHours = Array.isArray((field as any).operatingHours)
      ? (field as any).operatingHours
      : [];

    return {
      id: (field as any).id,
      name: (field as any).name,
      location: locationText,
      description: (field as any).description || "Mô tả không có sẵn",
      rating: (field as any).rating ?? 0,
      reviews: (field as any).totalReviews ?? 0,
      price: (field as any).price || "N/A",
      basePrice: (field as any).basePrice || 0,
      amenities: (field as any).amenities || [],
      nextAvailability:
        (field as any).isActive !== false ? "Có sẵn" : "Không có sẵn",
      sportType: (field as any).sportType || "unknown",
      imageUrl,
      distance: (field as any).distance
        ? `${(field as any).distance.toFixed(1)} km`
        : undefined,
      operatingHours: operatingHours,
      latitude:
        (field as any).latitude ??
        (field as any).lat ??
        (field as any)?.location?.geo?.coordinates?.[1] ?? // GeoJSON: [lng, lat]
        (field as any)?.geo?.coordinates?.[1] ??
        (field as any)?.geo?.lat ??
        (field as any)?.geo?.latitude,
      longitude:
        (field as any).longitude ??
        (field as any).lng ??
        (field as any)?.location?.geo?.coordinates?.[0] ?? // GeoJSON: [lng, lat]
        (field as any)?.geo?.coordinates?.[0] ??
        (field as any)?.geo?.lng ??
        (field as any)?.geo?.longitude,
    };
  });

  const urlParams = new URLSearchParams(location.search);
  const qName = (urlParams.get("name") || "").toLowerCase();
  const qType = (urlParams.get("type") || "").toLowerCase();
  const qLocation = (
    urlParams.get("location") ||
    urlParams.get("loc") ||
    ""
  ).toLowerCase();

  // Sử dụng cả URL params và state filters
  const searchName = (qName || nameFilter.trim().toLowerCase()) || "";
  const searchLocation = (qLocation || locationFilter.trim().toLowerCase()) || "";
  const searchType = qType || (sportFilter !== "all" ? sportFilter.toLowerCase() : "");

  let filteredTransformedFields = transformedFields.filter((f) => {
    // Search by name/location
    if (searchName) {
      const inName = (f.name || "").toLowerCase().includes(searchName);
      const inLocation = (f.location || "").toLowerCase().includes(searchName);
      if (!inName && !inLocation) return false;
    }
    // Filter by sport type
    if (searchType && !(f.sportType || "").toLowerCase().includes(searchType))
      return false;
    // Filter by location
    if (searchLocation && !(f.location || "").toLowerCase().includes(searchLocation))
      return false;
    // Filter by price range
    if (minPrice !== null || maxPrice !== null) {
      const fieldPrice = (f as any).basePrice || 0;
      if (minPrice !== null && fieldPrice < minPrice) return false;
      if (maxPrice !== null && fieldPrice > maxPrice) return false;
    }
    // Filter by rating
    if (minRating !== null) {
      const fieldRating = f.rating || 0;
      if (fieldRating < minRating) return false;
    }
    // Filter by amenities (if field has amenities data)
    if (selectedAmenities.length > 0) {
      const fieldAmenities = (f as any).amenities || [];
      const fieldAmenityNames = fieldAmenities.map((a: any) =>
        typeof a === 'string' ? a : a.name || a.amenity?.name || ''
      );
      const hasAllSelected = selectedAmenities.every(selected =>
        fieldAmenityNames.some((name: string) =>
          name.toLowerCase().includes(selected.toLowerCase())
        )
      );
      if (!hasAllSelected) return false;
    }
    return true;
  });

  // Calculate filtered nearby fields count for display
  const filteredNearbyCount =
    isNearbyMode && nearbyFields.length > 0
      ? applyFiltersToNearbyFields(nearbyFields).length
      : 0;

  useEffect(() => {
    (async () => {
      try {
        const hasLeaflet = typeof (window as any).L !== "undefined";
        if (!hasLeaflet) {
          await new Promise<void>((resolve) => {
            if (!document.getElementById("leaflet-css")) {
              const link = document.createElement("link");
              link.id = "leaflet-css";
              link.rel = "stylesheet";
              link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
              link.integrity =
                "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
              link.crossOrigin = "";
              document.head.appendChild(link);
            }
            const scriptId = "leaflet-js";
            if (document.getElementById(scriptId)) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.integrity =
              "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
            script.crossOrigin = "";
            script.onload = () => resolve();
            document.body.appendChild(script);
          });
        }
        const L: any = (window as any).L;
        if (!mapRef.current) {
          const container = document.getElementById(mapContainerId);
          if (!container) return;
          mapRef.current = L.map(mapContainerId, {
            center: [16.0471, 108.2062],
            zoom: 12,
            scrollWheelZoom: true, // Ensure scroll wheel zoom is enabled
          });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          }).addTo(mapRef.current);
        }
      } catch (error: any) {
        logger.error("Failed to initialize map", error);
      }
    })();
  }, []);

  useEffect(() => {
    const L: any = (window as any).L;
    if (!L || !mapRef.current) return;

    // Fix default marker icon
    const defaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;

    markersRef.current.forEach((m) => m.remove && m.remove());
    markersRef.current = [];
    markersMapRef.current.clear();
    const bounds = L.latLngBounds([]);

    if (userLocation?.lat && userLocation?.lng) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 6,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
      }).addTo(mapRef.current);
      userMarker.bindPopup("Vị trí của bạn");
      markersRef.current.push(userMarker);
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // Store field data in marker for later reference
    const fieldDataMap = new Map<string, { name: string; sportType: string | undefined }>();
    filteredTransformedFields.forEach((f) => {
      fieldDataMap.set(f.id, { name: f.name, sportType: f.sportType });
    });

    // Update all marker labels when zoom changes
    const updateMarkerLabels = () => {
      if (!mapRef.current) return;
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom === undefined) return;

      markersRef.current.forEach((marker) => {
        // Find fieldId by matching marker
        let fieldId: string | undefined;
        for (const [id, m] of markersMapRef.current.entries()) {
          if (m === marker) {
            fieldId = id;
            break;
          }
        }

        if (fieldId) {
          const fieldData = fieldDataMap.get(fieldId);
          if (fieldData) {
            const newIcon = getFieldPinIconWithLabel(fieldData.name, fieldData.sportType, L, currentZoom);
            marker.setIcon(newIcon);
          }
        }
      });
    };

    // Remove old zoom listeners if they exist
    if ((mapRef.current as any)._labelZoomListener) {
      mapRef.current.off('zoom', (mapRef.current as any)._labelZoomListener);
      mapRef.current.off('zoomend', (mapRef.current as any)._labelZoomListener);
    }

    // Add zoom event listeners (both zoom and zoomend for better responsiveness)
    (mapRef.current as any)._labelZoomListener = updateMarkerLabels;
    mapRef.current.on('zoom', updateMarkerLabels);
    mapRef.current.on('zoomend', updateMarkerLabels);

    // Update zoom states when map zoom changes
    const updateZoomState = () => {
      if (mapRef.current) {
        // Nếu có pending zoom từ user click, ưu tiên giá trị đó
        if (pendingZoomRef.current !== null) {
          setCurrentZoom(pendingZoomRef.current);
          pendingZoomRef.current = null;
        } else {
          const zoom = mapRef.current.getZoom();
          if (zoom !== undefined) {
            setCurrentZoom(zoom);
          }
        }
      }
    };

    const resetUserZoomFlag = () => {
      isUserZoomingRef.current = false;
    };

    // Chỉ lắng nghe zoomend để tránh update quá nhiều lần
    mapRef.current.on('zoomend', updateZoomState);
    mapRef.current.on('zoomend', resetUserZoomFlag);

    // KHÔNG set initial zoom ở đây nữa - để tránh reset zoom về 12 mỗi khi useEffect chạy lại
    // updateZoomState sẽ tự động sync từ map khi zoomend event fire

    filteredTransformedFields.forEach((f) => {
      if (f.latitude != null && f.longitude != null) {
        const currentZoom = mapRef.current?.getZoom() || 12;
        const marker = L.marker([f.latitude, f.longitude], {
          icon: getFieldPinIconWithLabel(f.name, f.sportType, L, currentZoom),
        }).addTo(mapRef.current);

        // Thay vì bind popup, thêm click handler để scroll đến field card
        marker.on('click', () => {
          const fieldCardElement = fieldCardRefsRef.current.get(f.id);
          if (fieldCardElement && fieldsListRef.current) {
            // Highlight field
            setHighlightedFieldId(f.id);
            // Remove highlight after 2 seconds
            setTimeout(() => setHighlightedFieldId(null), 2000);

            // Scroll to field card
            const containerRect = fieldsListRef.current.getBoundingClientRect();
            const cardRect = fieldCardElement.getBoundingClientRect();
            const scrollTop = fieldsListRef.current.scrollTop;
            const targetScrollTop = scrollTop + cardRect.top - containerRect.top - 20; // 20px offset from top

            fieldsListRef.current.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          }
        });

        markersRef.current.push(marker);
        markersMapRef.current.set(f.id, marker);
        bounds.extend([f.latitude, f.longitude]);
      }
    });

    // Tự động điều chỉnh map để hiển thị tất cả markers
    const markersWithCoords = filteredTransformedFields.filter(
      (f) => f.latitude != null && f.longitude != null
    );

    // Create a unique key for the current set of markers to prevent repeated fitBounds calls
    const markersKey = markersWithCoords.map(f => f.id).sort().join(',');

    if (bounds.isValid() && markersWithCoords.length > 0) {
      // Có markers - fitBounds để hiển thị tất cả
      // Chỉ fitBounds nếu:
      // 1. User không đang zoom (tránh reset zoom khi user đang tương tác)
      // 2. Markers đã thay đổi (tránh gọi fitBounds lặp lại)
      if (!isUserZoomingRef.current && markersKey !== lastFitBoundsMarkersRef.current) {
        // Mark that we've called fitBounds for these markers
        lastFitBoundsMarkersRef.current = markersKey;

        // Use fitBounds with maxZoom to prevent zooming out too much
        // For many markers, allow zooming out more; for few markers, stay closer
        const maxZoomLevel = markersWithCoords.length <= 5 ? 15 : 13;
        mapRef.current.fitBounds(bounds.pad(0.2), {
          maxZoom: maxZoomLevel,
        });
      }
    } else {
      // Reset the last fitBounds markers when we have no markers
      if (markersWithCoords.length === 0) {
        lastFitBoundsMarkersRef.current = "";
      }

      // Không có markers
      // Chỉ set view nếu map chưa có center (lần đầu tiên) và user không đang zoom
      const mapCenter = mapRef.current.getCenter();
      if ((!mapCenter || markersWithCoords.length === 0) && !isUserZoomingRef.current) {
        mapRef.current.setView([16.0471, 108.2062], 12);
      }
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoomend', updateZoomState);
        mapRef.current.off('zoomend', resetUserZoomFlag);
      }
    };
  }, [filteredTransformedFields, userLocation, location.search, nameFilter, locationFilter]);

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
                .custom-scroll-container {
                    scroll-behavior: smooth;
                    overflow-y: auto;
                }
                .map-container {
                    position: relative;
                    height: 40vh;
                    overflow: hidden;
                    z-index: 10;
                }
                @media (min-width: 1024px) {
                    .map-container {
                        position: sticky;
                        top: 80px;
                        height: calc(100vh);
                    }
                }
            `}</style>
      <NavbarDarkComponent />
      <PageWrapper>
        <div className="flex flex-col-reverse lg:flex-row">
          <div className="w-full lg:w-[45%] xl:w-[40%]">
            <div className="items-start">
              <div className="bg-background-secondary flex flex-col min-h-[50vh] lg:h-screen p-4">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex flex-col gap-4">
                      {/* Row 1: Khu vực, Thể loại, Sắp xếp giá */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <Select
                            value={locationFilter || "all"}
                            onValueChange={(value) => setLocationFilter(value === "all" ? "" : value)}
                          >
                            <SelectTrigger className="w-full sm:w-[180px]">
                              <SelectValue placeholder="Địa điểm" />
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

                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-gray-500" />
                          <Select
                            value={sportFilter}
                            onValueChange={setSportFilter}
                          >
                            <SelectTrigger className="w-full sm:w-[180px]">
                              <SelectValue placeholder="Loại thể thao" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                              {SPORT_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <Select
                            value={priceSort || "none"}
                            onValueChange={(value) =>
                              setPriceSort(value === "none" ? "" : value)
                            }
                          >
                            <SelectTrigger className="w-full sm:w-[180px]">
                              <SelectValue placeholder="Sắp xếp giá" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                              {PRICE_SORT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 2: Thanh tìm kiếm */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          ref={nameInputRef}
                          className="pl-10 w-full h-11 bg-white border-gray-300 focus:ring-green-500 rounded-lg shadow-sm"
                          placeholder="Tìm kiếm theo tên sân hoặc nội dung khác..."
                          value={nameFilter}
                          onChange={(e) => setNameFilter(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setNameFilter((e.target as HTMLInputElement).value.trim());
                            }
                          }}
                        />
                      </div>

                      {/* Row 3: Nút Thêm và Vị trí hiện tại của tôi */}
                      <div className="flex items-center gap-3 flex-wrap mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSidebarOpen(true)}
                          className="flex items-center gap-2"
                        >
                          <Filter className="w-4 h-4" />
                          Thêm
                        </Button>
                        {geolocationSupported && (
                          <button
                            onClick={handleGetLocation}
                            disabled={geolocationLoading || isLoadingNearby}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed text-sm ${isNearbyMode
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-green-600 text-white hover:bg-green-700"
                              }`}
                          >
                            {geolocationLoading || isLoadingNearby ? (
                              <>
                                <Loading size={16} className="mr-2" />
                                {isLoadingNearby
                                  ? "Đang tìm..."
                                  : "Đang lấy vị trí..."}
                              </>
                            ) : (
                              <>
                                <Navigation className="w-4 h-4" />Vị trí của tôi
                              </>
                            )}
                          </button>
                        )}
                        {hasActiveFilters && (
                          <Button
                            onClick={handleResetAllFilters}
                            variant="outline"
                            className="px-3 py-2"
                          >
                            Đặt lại
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!geolocationSupported && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <AlertCircle className="w-4 h-4" />{" "}
                          <span>Trình duyệt không hỗ trợ định vị</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isNearbyMode && nearbyFields.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Đã tìm thấy {filteredNearbyCount} sân gần vị trí của bạn
                        {filteredNearbyCount !== nearbyFields.length &&
                          ` (trong tổng số ${nearbyFields.length} sân)`}
                      </span>
                    </div>
                  )}
                </div>

                <FilterSidebar
                  isOpen={isSidebarOpen}
                  onOpenChange={setIsSidebarOpen}
                  side="left"
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  locationFilter={locationFilter}
                  onLocationChange={setLocationFilter}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onPriceRangeChange={(min, max) => {
                    setMinPrice(min);
                    setMaxPrice(max);
                  }}
                  minRating={minRating}
                  onRatingChange={setMinRating}
                  timeFilter={timeFilter}
                  onTimeFilterChange={setTimeFilter}
                  selectedAmenities={selectedAmenities}
                  onAmenitiesChange={setSelectedAmenities}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetAllFilters}
                  onSearch={() => {
                    // Apply search query to nameFilter
                    if (searchQuery.trim()) {
                      setNameFilter(searchQuery.trim());
                    }
                    // Close sidebar after search
                    setIsSidebarOpen(false);
                  }}
                />

                <div
                  ref={fieldsListRef}
                  className="flex-1 overflow-y-auto scrollbar-hide"
                  style={{
                    scrollBehavior: "smooth",
                    scrollSnapType: "y mandatory",
                  }}
                >
                  {(loading || isLoadingNearby) && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loading size={100} />
                      <p className="mt-4 text-gray-500 font-medium">Đang tìm kiếm sân thể thao...</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                      <strong className="font-bold">Error!</strong>
                      <span className="block sm:inline"> {error.message}</span>
                    </div>
                  )}

                  {!loading &&
                    !isLoadingNearby &&
                    !error &&
                    filteredTransformedFields.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">
                          Không tìm thấy sân thể thao nào.
                        </p>
                      </div>
                    )}
                  {!loading &&
                    !error &&
                    filteredTransformedFields.length > 0 && (
                      <div className="space-y-4">
                        {filteredTransformedFields.map((field, index) => (
                          <div
                            key={field.id || index}
                            ref={(el) => {
                              if (el && field.id) {
                                fieldCardRefsRef.current.set(field.id, el);
                              } else if (!el && field.id) {
                                fieldCardRefsRef.current.delete(field.id);
                              }
                            }}
                            className={`scroll-snap-start transition-all duration-300 ${highlightedFieldId === field.id
                              ? 'ring-4 ring-green-500 ring-offset-2 rounded-lg'
                              : ''
                              }`}
                          >
                            <FieldCard
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
                              distance={field.distance}
                              operatingHours={field.operatingHours}
                              onBookNow={forceSyncFilters}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  {!loading &&
                    !isLoadingNearby &&
                    !isNearbyMode &&
                    pagination &&
                    pagination.total > filters.limit && (
                      <div className="flex justify-center mt-6 space-x-2">
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              page: Math.max(1, prev.page - 1),
                            }))
                          }
                          disabled={filters.page === 1}
                          className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300 hover:bg-green-700"
                        >
                          Trang trước
                        </button>
                        <span className="px-4 py-2 bg-gray-100 rounded">
                          Trang {filters.page} /{" "}
                          {Math.ceil(pagination.total / filters.limit)}
                        </span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={
                            filters.page >=
                            Math.ceil(pagination.total / filters.limit)
                          }
                          className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300 hover:bg-green-700"
                        >
                          Trang sau
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-[55%] xl:w-[60%] relative">
            <div id={mapContainerId} className="map-container w-full h-screen" />
            <div className="absolute top-24 right-4 z-40 flex flex-col items-center gap-2">
              {/* Zoom In Button - Circular */}
              <button
                onClick={() => {
                  if (mapRef.current) {
                    isUserZoomingRef.current = true;
                    const newZoom = Math.min(currentZoom + 1, 18);

                    // Lưu giá trị zoom mới vào ref trước khi gọi setZoom
                    pendingZoomRef.current = newZoom;
                    setCurrentZoom(newZoom); // Update UI ngay lập tức

                    // Gọi setZoom với animation
                    mapRef.current.setZoom(newZoom, { animate: true });
                  }
                }}
                disabled={currentZoom >= 18}
                className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                title="Phóng to"
              >
                <Plus className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
              </button>

              {/* Zoom Level Display Bar - Rounded Rectangle */}
              <div className="relative w-10 h-32 bg-white rounded-full shadow-lg border border-gray-300 overflow-hidden">
                {/* Background track */}
                <div className="absolute inset-0 flex items-end justify-center p-1">
                  <div className="w-1 h-full bg-gray-200 rounded-full" />
                </div>

                {/* Active fill based on current zoom */}
                <div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 bg-green-600 rounded-full transition-all duration-300"
                  style={{
                    height: `calc(${((currentZoom - 8) / (18 - 8)) * 100}% - 8px)`,
                    margin: '4px 0'
                  }}
                />

                {/* Zoom level number indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-gray-700 bg-white/90 px-1.5 py-0.5 rounded shadow-sm">
                    {currentZoom.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Zoom Out Button - Circular */}
              <button
                onClick={() => {
                  if (mapRef.current) {
                    isUserZoomingRef.current = true;
                    const newZoom = Math.max(currentZoom - 1, 8);

                    // Lưu giá trị zoom mới vào ref trước khi gọi setZoom
                    pendingZoomRef.current = newZoom;
                    setCurrentZoom(newZoom); // Update UI ngay lập tức

                    // Gọi setZoom với animation
                    mapRef.current.setZoom(newZoom, { animate: true });
                  }
                }}
                disabled={currentZoom <= 8}
                className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                title="Thu nhỏ"
              >
                <Minus className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
              </button>
            </div>


          </div>
        </div>
      </PageWrapper>
      <FooterComponent />
    </div>
  );
};

export default FieldBookingPage;
