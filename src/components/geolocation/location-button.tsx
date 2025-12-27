import React from 'react';
import { Navigation, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { locationAPIService } from '@/utils/geolocation';
import { Loading } from '@/components/ui/loading';
import logger from '@/utils/logger';

interface LocationButtonProps {
  onLocationObtained?: (lat: number, lng: number) => void;
  onLocationSent?: (success: boolean) => void;
  className?: string;
  showCoordinates?: boolean;
  autoSendToBackend?: boolean;
}

/**
 * Reusable location button component
 * Gets user's current location and optionally sends it to backend
 */
export const LocationButton: React.FC<LocationButtonProps> = ({
  onLocationObtained,
  onLocationSent,
  className = '',
  showCoordinates = true,
  autoSendToBackend = true
}) => {
  const {
    position,
    error: geolocationError,
    loading: geolocationLoading,
    supported: geolocationSupported,
    getCoordinates
  } = useGeolocation();

  const [isSendingLocation, setIsSendingLocation] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  const handleGetLocation = async () => {
    try {
      logger.debug('[LOCATION BUTTON] Getting user location...');
      const coordinates = await getCoordinates();

      if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
        const location = { lat: coordinates.lat, lng: coordinates.lng };
        setUserLocation(location);
        logger.debug('[LOCATION BUTTON] Location obtained:', location);

        // Call callback if provided
        onLocationObtained?.(location.lat, location.lng);

        // Send to backend if enabled
        if (autoSendToBackend) {
          await sendLocationToBackend(location.lat, location.lng);
        }
      } else {
        logger.debug('[LOCATION BUTTON] Failed to get coordinates');
        onLocationSent?.(false);
      }
    } catch (error) {
      logger.error('[LOCATION BUTTON] Error getting location:', error);
      onLocationSent?.(false);
    }
  };

  const sendLocationToBackend = async (lat: number, lng: number) => {
    setIsSendingLocation(true);
    try {
      logger.debug('[LOCATION BUTTON] Sending location to backend:', { lat, lng });

      const result = await locationAPIService.sendLocation({
        latitude: lat,
        longitude: lng,
        accuracy: position?.coords.accuracy,
        timestamp: Date.now()
      });

      if (result.success) {
        logger.debug('[LOCATION BUTTON] Location sent successfully:', result);
        onLocationSent?.(true);
      } else {
        logger.error('[LOCATION BUTTON] Failed to send location:', result.error);
        onLocationSent?.(false);
      }
    } catch (error) {
      logger.error('[LOCATION BUTTON] Error sending location:', error);
      onLocationSent?.(false);
    } finally {
      setIsSendingLocation(false);
    }
  };

  if (!geolocationSupported) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Trình duyệt không hỗ trợ định vị</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGetLocation}
        disabled={geolocationLoading || isSendingLocation}
        className="flex items-center gap-2 text-sm"
      >
        {geolocationLoading || isSendingLocation ? (
          <>
            <Loading size={16} className="border-emerald-600" />
            {isSendingLocation ? 'Đang gửi...' : 'Đang lấy vị trí...'}
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            Lấy vị trí của tôi
          </>
        )}
      </Button>

      {showCoordinates && userLocation && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <MapPin className="w-4 h-4" />
          <span>
            {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
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
  );
};

export default LocationButton;
