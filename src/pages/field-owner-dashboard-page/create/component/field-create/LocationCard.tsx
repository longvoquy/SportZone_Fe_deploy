import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from "@/components/ui/loading";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VIETNAM_CITIES } from '@/utils/constant-value/constant';
import type { CreateFieldPayload } from '@/types/field-type';
import logger from '@/utils/logger';

// Types
interface LocationCardProps {
    formData: CreateFieldPayload;
    onInputChange: (field: string, value: any) => void;
    onCoordinatesChange?: (lat: number, lng: number) => void;
    onLocationChange?: (location: {
        address: string;
        geo: { type: 'Point'; coordinates: [number, number] }
    }) => void;
}

interface LocationData {
    position: [number, number] | null;
    address: string;
}

interface GeocodingResult {
    lat: number;
    lon: number;
    display_name: string;
}

// Constants
const DEFAULT_CENTER: [number, number] = [16.0544, 108.2022]; // Đà Nẵng
const MAP_CONFIG = {
    zoom: 13,
    maxZoom: 19,
    markerRadius: 8,
    markerColor: '#2563eb',
    markerFillColor: '#3b82f6',
    markerFillOpacity: 0.9,
    flyToZoom: 14,
    flyToDuration: 1.2,
    flyToEaseLinearity: 0.25
};

const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// Utility functions
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
export default function LocationCard({
    formData,
    onInputChange,
    onCoordinatesChange,
    onLocationChange
}: LocationCardProps) {
    // State
    const [isExpanded, setIsExpanded] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [locationData, setLocationData] = useState<LocationData>({
        position: null,
        address: ''
    });

    // Refs
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const addressRef = useRef<string>('');

    // Keep latest address
    useEffect(() => {
        const locationString = typeof formData.location === 'string'
            ? formData.location
            : formData.location?.address || '';
        addressRef.current = locationString;
    }, [formData.location]);

    // Map initialization
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: DEFAULT_CENTER,
            zoom: MAP_CONFIG.zoom,
        });

        L.tileLayer(TILE_LAYER_URL, {
            attribution: '© OpenStreetMap contributors',
            maxZoom: MAP_CONFIG.maxZoom,
        }).addTo(map);

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

        // Create a draggable marker so user can drag to select location
        const marker = L.marker(DEFAULT_CENTER, {
            draggable: true,
            icon: defaultIcon
        }).addTo(map);

        // Handle drag end -> update state and emit callbacks
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setLocationData(prev => ({
                ...prev,
                position: [pos.lat, pos.lng]
            }));
            onCoordinatesChange?.(pos.lat, pos.lng);

            (async () => {
                const addr = await reverseGeocode(pos.lat, pos.lng);
                const address = addr ?? addressRef.current;

                addressRef.current = address;
                onInputChange('location', address);
                onLocationChange?.({
                    address,
                    geo: { type: 'Point', coordinates: [pos.lng, pos.lat] },
                });

                logger.debug('Selected location (drag):', { address, lat: pos.lat, lng: pos.lng });
            })();
        });

        markerRef.current = marker;
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    // Map click handler
    const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        if (!markerRef.current) return;

        markerRef.current.setLatLng([lat, lng]);

        setLocationData(prev => ({
            ...prev,
            position: [lat, lng]
        }));

        onCoordinatesChange?.(lat, lng);

        const addr = await reverseGeocode(lat, lng);
        const address = addr ?? addressRef.current;

        addressRef.current = address;
        onInputChange('location', address);
        onLocationChange?.({
            address,
            geo: { type: 'Point', coordinates: [lng, lat] },
        });

        logger.debug('Selected location (map click):', { address, lat, lng });
    }, [onCoordinatesChange, onLocationChange, onInputChange]);

    // Attach click handler
    useEffect(() => {
        if (!mapRef.current) return;

        mapRef.current.on('click', handleMapClick);

        return () => {
            mapRef.current?.off('click', handleMapClick);
        };
    }, [handleMapClick]);

    // Update map position and callbacks
    const updateMapPosition = useCallback((lat: number, lng: number, address: string) => {
        if (!mapRef.current || !markerRef.current) return;

        setLocationData({ position: [lat, lng], address });
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), MAP_CONFIG.flyToZoom), {
            duration: MAP_CONFIG.flyToDuration,
            easeLinearity: MAP_CONFIG.flyToEaseLinearity,
        });

        onCoordinatesChange?.(lat, lng);
        onLocationChange?.({
            address,
            geo: { type: 'Point', coordinates: [lng, lat] },
        });

        // sync input + ref
        addressRef.current = address;
        onInputChange('location', address);
    }, [onCoordinatesChange, onLocationChange, onInputChange]);

    // Handle search for location
    const handleSearchLocation = useCallback(async () => {
        const locationString = typeof formData.location === 'string'
            ? formData.location
            : formData.location?.address || '';
        const query = locationString.trim();
        if (!query || !mapRef.current || !markerRef.current) return;

        setIsSearching(true);

        try {
            // Check if input is direct lat,lng coordinates
            const coordinates = parseLatLngFromString(query);
            if (coordinates) {
                const [lat, lng] = coordinates;
                updateMapPosition(lat, lng, query);
                return;
            }

            // Search using geocoding service
            const result = await searchLocation(query);

            if (result) {
                updateMapPosition(result.lat, result.lon, result.display_name);
                logger.debug('Selected location (search):', { address: result.display_name, lat: result.lat, lng: result.lon });
            } else {
                alert('Không tìm thấy địa điểm phù hợp');
            }
        } catch (error) {
            logger.error('Geocoding error:', error);
            alert('Có lỗi xảy ra khi tìm kiếm địa điểm');
        } finally {
            setIsSearching(false);
        }
    }, [formData.location, updateMapPosition]);

    // Event handlers
    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchLocation();
        }
    }, [handleSearchLocation]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onInputChange('location', e.target.value);
    }, [onInputChange]);

    const handleCitySelect = useCallback(async (value: string) => {
        setSelectedCity(value);

        if (value === 'all' || !value) return;

        setIsSearching(true);

        try {
            const result = await searchLocation(value + ', Vietnam');

            if (result) {
                updateMapPosition(result.lat, result.lon, result.display_name);
                logger.debug('Selected city:', { city: value, address: result.display_name, lat: result.lat, lng: result.lon });
            } else {
                alert('Không tìm thấy thành phố này trên bản đồ');
            }
        } catch (error) {
            logger.error('City geocoding error:', error);
            alert('Có lỗi xảy ra khi tìm kiếm thành phố');
        } finally {
            setIsSearching(false);
        }
    }, [updateMapPosition]);

    // Render helpers
    const renderSearchButton = () => {
        const locationString = typeof formData.location === 'string'
            ? formData.location
            : formData.location?.address || '';
        return (
            <Button
                type="button"
                variant="outline"
                onClick={handleSearchLocation}
                disabled={!locationString.trim() || isSearching}
                className="px-4"
            >
                {isSearching ? (
                    <Loading size={16} />
                ) : (
                    <Search className="w-4 h-4" />
                )}
            </Button>
        );
    };

    const renderMapOverlay = () => (
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur p-3 rounded shadow-lg max-w-xs">
            <h4 className="font-medium text-sm">Vị trí sân</h4>
            <p className="text-xs text-gray-600 mt-1.5">
                {locationData.address || (typeof formData.location === 'string' ? formData.location : formData.location?.address) || 'Chưa nhập địa chỉ'}
            </p>
            <div className="flex items-center gap-1 mt-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600">
                    {locationData.position
                        ? `Tọa độ: ${locationData.position[0].toFixed(6)}, ${locationData.position[1].toFixed(6)}`
                        : 'Nhấn "Tìm kiếm" hoặc click trên bản đồ'
                    }
                </span>
            </div>
        </div>
    );

    return (
        <Card className="bg-white shadow-md border-0">
            <CardHeader
                onClick={toggleExpanded}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
                <div className="flex items-center justify-between">
                    <CardTitle>Vị trí</CardTitle>
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                    />
                </div>
            </CardHeader>

            {isExpanded && (
                <>
                    <hr className="border-t border-gray-300 my-0 mx-6" />
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2.5">
                            <Label>
                                Địa chỉ sân <span className="text-red-600">*</span>
                            </Label>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    <Select
                                        value={selectedCity}
                                        onValueChange={handleCitySelect}
                                        disabled={isSearching}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Chọn tỉnh/thành" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto z-[10000]">
                                            <SelectItem value="all">Tất cả khu vực</SelectItem>
                                            {VIETNAM_CITIES.map((city) => (
                                                <SelectItem key={city} value={city}>
                                                    {city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    placeholder="Nhập địa chỉ đầy đủ của sân"
                                    value={typeof formData.location === 'string' ? formData.location : formData.location?.address || ''}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                    className="flex-1"
                                />
                                {renderSearchButton()}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label>Bản đồ</Label>
                            <div className="h-96 rounded-lg relative overflow-hidden">
                                <div ref={mapContainerRef} className="absolute inset-0" />
                                {renderMapOverlay()}
                            </div>
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
}