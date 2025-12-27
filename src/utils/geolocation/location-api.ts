import { BASE_URL } from "@/utils/constant-value/constant";
import logger from "@/utils/logger";

/**
 * Location API endpoints
 */
export const LOCATION_API = `${BASE_URL}/location`;

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface LocationResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    userId?: string;
  };
  error?: string;
}

export interface NearbyFieldsRequest {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers, default 10
  limit?: number; // default 20
  sportType?: 'football' | 'tennis' | 'badminton' | 'pickleball' | 'basketball' | 'volleyball' | 'swimming' | 'gym';
  name?: string; // filter by field name
  location?: string; // filter by location address
}

export interface NearbyFieldsResponse {
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    location: string; // address string
    latitude: number;
    longitude: number;
    distance: number; // in kilometers
    rating?: number;
    basePrice?: number; // base price for sorting
    price?: string; // formatted price string
    sportType?: string;
    images?: string[];
    isActive?: boolean;
    operatingHours?: Array<{
      day: string;
      start: string;
      end: string;
      duration: number;
    }>;
    description?: string;
    totalReviews?: number;
    amenities?: any[];
  }>;
  error?: string;
}

/**
 * Location API service
 */
class LocationAPIService {
  /**
   * Send user location to backend
   * @param locationData - Location coordinates and metadata
   * @returns Promise with API response
   */
  async sendLocation(locationData: LocationData): Promise<LocationResponse> {
    try {
      const response = await fetch(`${LOCATION_API}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...locationData,
          timestamp: locationData.timestamp || Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Error sending location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get nearby fields based on user location
   * @param request - Location and search parameters
   * @returns Promise with nearby fields
   */
  async getNearbyFields(request: NearbyFieldsRequest): Promise<NearbyFieldsResponse> {
    try {
      const params = new URLSearchParams({
        lat: request.latitude.toString(),
        lng: request.longitude.toString(),
        radius: (request.radius || 10).toString(),
        limit: (request.limit || 20).toString(),
        ...(request.sportType ? { sportType: request.sportType } : {}),
        ...(request.name ? { name: request.name } : {}),
        ...(request.location ? { location: request.location } : {})
      } as Record<string, string>);

      // Match BE spec: GET /fields/nearby
      const response = await fetch(`${BASE_URL}/fields/nearby?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      // BE now consistently returns { success, data }
      return json as NearbyFieldsResponse;
    } catch (error) {
      logger.error('Error getting nearby fields:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update user's last known location
   * @param locationData - Location coordinates
   * @returns Promise with API response
   */
  async updateLastLocation(locationData: Omit<LocationData, 'timestamp'>): Promise<LocationResponse> {
    try {
      const response = await fetch(`${LOCATION_API}/last-location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...locationData,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Error updating last location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's location history
   * @param userId - User ID
   * @param limit - Number of records to return
   * @returns Promise with location history
   */
  async getLocationHistory(userId: string, limit: number = 50): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
    }>;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({
        userId,
        limit: limit.toString()
      });

      const response = await fetch(`${LOCATION_API}/history?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Error getting location history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const locationAPIService = new LocationAPIService();
export default locationAPIService;
