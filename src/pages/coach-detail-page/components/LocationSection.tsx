import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import logger from "@/utils/logger";

interface LocationSectionProps {
  coachData: any;
  currentCoach: any;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<L.Map | null>;
  markerRef: React.RefObject<L.Marker | null>;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  coachData,
  currentCoach,
  mapContainerRef,
  mapRef,
  markerRef,
}) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const localMapRef = useRef<L.Map | null>(null);
  const localMarkerRef = useRef<L.Marker | null>(null);

  const handleOpenMaps = () => {
    const locationData = (currentCoach as any)?.locationData;
    if (locationData?.geo?.coordinates) {
      const [lng, lat] = locationData.geo.coordinates;
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
    } else if (coachData?.location) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(coachData.location)}`, "_blank");
    }
  };

  // Initialize map directly in this component
  useEffect(() => {
    // Don't initialize if map already exists or container is not ready
    if (!mapContainerRef.current || localMapRef.current) return;

    // Check if container already has a map instance (from previous render)
    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) {
      logger.warn('[LocationSection] Container already has a map instance, cleaning up first');
      // Try to find and remove existing map
      const existingMap = (L as any).Map.prototype.getContainer ?
        Array.from(document.querySelectorAll('.leaflet-container')).find((el: any) =>
          el === container && el._leaflet_id
        ) : null;
      if (existingMap) {
        try {
          const mapInstance = (existingMap as any)._leaflet;
          if (mapInstance && mapInstance.remove) {
            mapInstance.remove();
          }
        } catch (e) {
          logger.warn('[LocationSection] Error cleaning up existing map:', e);
        }
      }
      // Clear the leaflet ID
      delete (container as any)._leaflet_id;
    }

    const hasSize = () => {
      if (!mapContainerRef.current) return false;
      const rect = mapContainerRef.current.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const initializeMap = () => {
      // Double check before initializing
      if (!mapContainerRef.current || localMapRef.current) return;

      // Check again if container has a map
      if ((mapContainerRef.current as any)._leaflet_id) {
        logger.warn('[LocationSection] Container has map instance, skipping initialization');
        return;
      }

      // Always start with default center - marker will be added/updated in separate useEffect
      const initialCenter: [number, number] = [10.776889, 106.700806]; // Default center (Ho Chi Minh City)
      const initialZoom = 13;

      try {
        logger.debug('[LocationSection] Initializing map with center:', initialCenter);

        const map = L.map(mapContainerRef.current!, {
          center: initialCenter,
          zoom: initialZoom,
          doubleClickZoom: false,
          zoomControl: true,
        });

        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
          errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        });

        tileLayer.addTo(map);
        logger.debug('[LocationSection] Tile layer added');

        // Default marker icon
        const defaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        (L as any).Marker.prototype.options.icon = defaultIcon;

        localMapRef.current = map;
        if (mapRef) mapRef.current = map;

        setIsMapReady(true);
        logger.debug('[LocationSection] Map initialized');

        // Invalidate size multiple times - with safety checks
        // Wait a bit for map to fully initialize before invalidating
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (localMapRef.current && !(localMapRef.current as any)._destroyed) {
              try {
                localMapRef.current.invalidateSize(false);
              } catch (error) {
                logger.warn('[LocationSection] Error invalidating size:', error);
              }
            }
          }, 150);

          setTimeout(() => {
            if (localMapRef.current && !(localMapRef.current as any)._destroyed) {
              try {
                localMapRef.current.invalidateSize(false);
              } catch (error) {
                logger.warn('[LocationSection] Error invalidating size:', error);
              }
            }
          }, 400);

          setTimeout(() => {
            if (localMapRef.current && !(localMapRef.current as any)._destroyed) {
              try {
                localMapRef.current.invalidateSize(false);
              } catch (error) {
                logger.warn('[LocationSection] Error invalidating size:', error);
              }
            }
          }, 800);
        });
      } catch (error) {
        logger.error('[LocationSection] Failed to initialize map:', error);
        setIsMapReady(true); // Hide loading spinner even on error
      }
    };

    // Wait for container to have size
    if (hasSize()) {
      initializeMap();
    } else {
      let attempts = 0;
      const maxAttempts = 30;
      const checkInterval = setInterval(() => {
        attempts++;
        if (hasSize() && !localMapRef.current) {
          initializeMap();
          clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
          // Force initialization
          if (!localMapRef.current && mapContainerRef.current) {
            initializeMap();
          }
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    // Cleanup function
    return () => {
      // Cleanup is handled in separate useEffect
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - refs are stable

  // Update marker when currentCoach changes
  useEffect(() => {
    if (!localMapRef.current) {
      logger.debug('[LocationSection] Map not ready yet, skipping marker update');
      return;
    }

    // Check both currentCoach and coachData for locationData
    const locationData = (currentCoach as any)?.locationData || (coachData as any)?.locationData;

    logger.debug('[LocationSection] Checking for coordinates:', {
      currentCoach: currentCoach ? Object.keys(currentCoach) : null,
      coachData: coachData ? Object.keys(coachData) : null,
      locationData: locationData ? Object.keys(locationData) : null,
      geo: locationData?.geo,
      coordinates: locationData?.geo?.coordinates
    });

    const geo = locationData?.geo?.coordinates as number[] | undefined;
    const hasCoords = Array.isArray(geo) && geo.length === 2 && Number.isFinite(geo[0]) && Number.isFinite(geo[1]);

    if (!hasCoords) {
      logger.debug('[LocationSection] No valid coordinates for marker', {
        geo,
        isArray: Array.isArray(geo),
        length: geo?.length,
        isValid0: geo ? Number.isFinite(geo[0]) : false,
        isValid1: geo ? Number.isFinite(geo[1]) : false
      });
      return;
    }

    const [lng, lat] = geo as number[];
    logger.debug('[LocationSection] Updating marker to:', lat, lng);

    // Get or create default icon
    const defaultIcon = (L as any).Marker.prototype.options.icon || L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Update or create marker
    if (!localMarkerRef.current) {
      logger.debug('[LocationSection] Creating new marker');
      localMarkerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(localMapRef.current);
      if (markerRef) markerRef.current = localMarkerRef.current;
    } else {
      logger.debug('[LocationSection] Updating existing marker position');
      localMarkerRef.current.setLatLng([lat, lng]);
    }

    // Fly to location
    localMapRef.current.flyTo([lat, lng], Math.max(localMapRef.current.getZoom(), 14), { duration: 1.0 });
  }, [currentCoach, coachData, markerRef]);

  // Cleanup on unmount
  useEffect(() => {
    const container = mapContainerRef.current;
    const map = localMapRef.current;
    const marker = localMarkerRef.current;
    const parentMapRef = mapRef;

    return () => {
      logger.debug('[LocationSection] Cleaning up map and marker');
      if (marker) {
        try {
          marker.remove();
        } catch (e) {
          logger.warn('[LocationSection] Error removing marker:', e);
        }
        localMarkerRef.current = null;
      }
      if (map) {
        try {
          map.remove();
        } catch (e) {
          logger.warn('[LocationSection] Error removing map:', e);
        }
        localMapRef.current = null;
        if (parentMapRef) parentMapRef.current = null;
      }
      // Clear container's leaflet ID
      if (container) {
        delete (container as any)._leaflet_id;
      }
    };
  }, [mapRef, mapContainerRef]);

  return (
    <Card
      id="location"
      className="shadow-md hover:shadow-lg transition-all duration-300 scroll-mt-24"
    >
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Vị trí</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:border-green-500 bg-transparent"
            onClick={handleOpenMaps}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Chỉ đường
          </Button>
        </div>
        <hr className="my-2 border-gray-200 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Display */}
        {((coachData as any)?.locationData?.address || coachData?.location) && (
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="bg-green-600 p-2 rounded-lg shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 text-left">Địa điểm</h4>
              <p className="text-sm text-green-700 mt-1">
                {(coachData as any)?.locationData?.address || coachData?.location || 'Chưa có địa chỉ'}
              </p>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="h-96 rounded-lg relative overflow-hidden border border-gray-200 bg-gray-100">
          {!isMapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
              <div className="text-center">
                <Loading size={32} className="text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Đang tải bản đồ...</p>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
        </div>
      </CardContent>
    </Card>
  );
};