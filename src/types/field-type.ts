// Sport Type constants matching API documentation
import { SportType } from '@/components/enums/ENUMS';

// Owner interface matching API response structure
export interface FieldOwner {
    _id: string;
    businessName?: string;
    name?: string;
    contact?: string; // For backward compatibility
    contactInfo?: {
        phone?: string;
        email?: string;
    };
}

// Court interface for multi-court fields
export interface Court {
    _id: string;
    name: string;
    courtNumber?: number;
    isActive?: boolean;
    field?: string;
}

// Main Field interface
export interface Field {
    _id: string;
    name: string;
    sportType: SportType | string; // Support both enum and string for flexibility
    description: string;
    location: string | FieldLocation; // Support both string and object types from backend
    images: string[];
    operatingHours: OperatingHours[];
    slotDuration: number; // in minutes (minimum 30, maximum 180)
    minSlots: number; // minimum slots per booking
    maxSlots: number; // maximum slots per booking
    priceRanges: PriceRange[];
    basePrice: number; // in VND
    price?: string; // Formatted price from backend (e.g., "250.000đ/giờ" or "N/A")
    isActive: boolean;
    isAdminVerify?: boolean; // Admin verification status
    maintenanceNote?: string;
    maintenanceUntil?: string; // ISO date string
    rating: number;
    totalReviews: number;
    owner: FieldOwner;
    ownerName?: string;
    ownerPhone?: string;
    courts?: Court[]; // Multi-court support
    totalBookings?: number;
    createdAt?: string;
    updatedAt?: string;
    amenities?: FieldAmenity[]; // Field amenities with prices
}

// Operating Hours interface - now supports day-specific schedules
export interface OperatingHours {
    day: string; // monday, tuesday, wednesday, etc.
    start: string; // HH:mm format (24-hour)
    end: string; // HH:mm format (24-hour)
    duration: number; // slot duration in minutes
}

// Price Range interface for time-based pricing with day support
export interface PriceRange {
    day: string; // monday, tuesday, wednesday, etc.
    start: string; // HH:mm format (24-hour)
    end: string; // HH:mm format (24-hour)
    multiplier: number; // price multiplier for this time range (e.g., 1.0, 1.5, 2.0)
}

export interface Booking {
    _id: string;
    startTime: string;
    endTime: string;
    status: string;
}

// Field Amenity interface (for API response)
export interface FieldAmenity {
    amenity: {
        _id: string;
        name: string;
        description: string;
        sportType: string;
        isActive: boolean;
        imageUrl?: string;
        type: string; // coach, drink, facility, other
    };
    price: number;
}

// Field Amenity Request interface (for API request)
export interface FieldAmenityRequest {
    amenityId: string;
    price: number;
}

// Location interface for API requests
export interface FieldLocation {
    address: string;
    geo: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
}

// Create Field Payload interface
export interface CreateFieldPayload {
    name: string;
    sportType: SportType | string;
    description: string;
    location: string | FieldLocation; // Can be string for UI, FieldLocation for API
    images?: string[];
    operatingHours: OperatingHours[];
    slotDuration: number; // 30-180 minutes
    minSlots: number; // minimum 1
    maxSlots: number; // maximum 10
    priceRanges: PriceRange[];
    basePrice: number | string; // in VND, can be string for form input
    amenities?: FieldAmenityRequest[]; // Array of amenities with prices
    numberOfCourts?: number | string; // Number of courts to create (0-10, default: 1)
    rules?: string[]; // Field rules
}


// Update Field Payload interface
export interface UpdateFieldPayload extends Partial<CreateFieldPayload> {
    isActive?: boolean;
    maintenanceNote?: string;
    maintenanceUntil?: string; // ISO date string
}

// API Response interfaces
export interface FieldsResponse {
    success: boolean;
    data: Field[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface FieldResponse {
    success: boolean;
    data: Field;
    message?: string;
}

// Field Amenities Response interfaces
export interface FieldAmenitiesResponse {
    fieldId: string;
    fieldName: string;
    amenities: FieldAmenity[];
}

export interface UpdateFieldAmenitiesPayload {
    amenities: FieldAmenityRequest[];
}

export interface UpdateFieldAmenitiesResponse {
    success: boolean;
    message: string;
    field: {
        id: string;
        name: string;
        amenities: FieldAmenity[];
    };
}

// Pagination interface
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
}

// Field Availability interfaces (Pure Lazy Creation)
export interface FieldAvailabilityResponse {
    success: boolean;
    data: FieldAvailabilityData[];
}

export interface FieldAvailabilityData {
    date: string; // YYYY-MM-DD format
    isHoliday: boolean;
    slots: AvailabilitySlot[];
    courtId?: string;
    courtName?: string;
    courtNumber?: number;
}

export interface AvailabilitySlot {
    startTime: string; // HH:mm format (24-hour)
    endTime: string; // HH:mm format (24-hour)
    available: boolean;
    price: number; // in VND
    priceBreakdown: string; // e.g., "09:00-10:00: 1.0x base price"
}

// Query parameter interfaces
export interface GetFieldsParams {
    name?: string;
    location?: string;
    sportType?: SportType | string;
    sportTypes?: string[]; // Multiple sports (new)
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'rating' | 'price' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface CheckAvailabilityParams {
    id: string;
    startDate: string; // YYYY-MM-DD format
    endDate: string; // YYYY-MM-DD format
    courtId?: string;
}

// Price Scheduling Interfaces
export interface SchedulePriceUpdatePayload {
    newPriceRanges: PriceRange[];
    newBasePrice: number; // in VND
    effectiveDate: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)
}

export interface ScheduledPriceUpdate {
    newPriceRanges: PriceRange[];
    newBasePrice: number; // in VND
    effectiveDate: string; // ISO date string
    applied: boolean;
    createdBy: string;
    createdAt: string; // ISO date string
}

export interface CancelScheduledPriceUpdatePayload {
    effectiveDate: string; // YYYY-MM-DD format
}

// Price scheduling response interfaces
export interface SchedulePriceUpdateResponse {
    success: boolean;
    message: string;
    effectiveDate: string;
    updateId?: string;
}

export interface CancelScheduledPriceUpdateResponse {
    success: boolean;
    message: string;
}

export interface GetScheduledPriceUpdatesResponse {
    success: boolean;
    data: ScheduledPriceUpdate[];
}

// Error handling interfaces
export interface ErrorResponse {
    message: string;
    status: string;
    errors?: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

// HTTP Status codes for better error handling
export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
} as const;

export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus];

// Field status constants
export const FieldStatus = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    MAINTENANCE: "MAINTENANCE"
} as const;

export type FieldStatus = typeof FieldStatus[keyof typeof FieldStatus];

// Booking status constants
export const BookingStatus = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED"
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

// Utility types
export type FieldId = string;
export type OwnerId = string;
export type UserId = string;

// Form data interfaces for image uploads
export interface CreateFieldWithImagesPayload extends Omit<CreateFieldPayload, 'images'> {
    images: File[];
}

export interface UpdateFieldWithImagesPayload extends Omit<UpdateFieldPayload, 'images'> {
    avatar?: File; // New avatar file
    gallery?: File[]; // New gallery files
    keptImages?: string[]; // URLs of images to keep
    courtsToDelete?: string[]; // IDs of courts to delete
}

// Field statistics interface
export interface FieldStatistics {
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    occupancyRate: number; // percentage
}

// My fields API parameters
export interface GetMyFieldsParams {
    name?: string;
    sportType?: 'football' | 'tennis' | 'badminton' | 'pickleball' | 'basketball' | 'volleyball' | 'swimming' | 'gym';
    isActive?: boolean;
    page?: number;
    limit?: number;
}

// Field owner bookings interfaces
export interface FieldOwnerBooking {
    bookingId: string;
    fieldId: string;
    fieldName: string;
    courtName?: string;
    courtNumber?: number;
    date: string; // YYYY-MM-DD format
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    transactionStatus?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
    // Trạng thái duyệt của chủ sân (cho flow ghi chú / yêu cầu)
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    totalPrice: number;
    bookingAmount?: number; // Amount that goes to field owner (after platform fee)
    customer: {
        fullName: string;
        phone: string;
        email: string;
    };
    selectedAmenities: string[];
    amenitiesFee?: number;
    note?: string; // Optional user note if provided during booking
    createdAt?: string; // ISO date string
}

export interface FieldOwnerBookingsParams {
    fieldName?: string;
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    transactionStatus?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
    date?: string; // YYYY-MM-DD format
    startDate?: string; // YYYY-MM-DD format
    endDate?: string; // YYYY-MM-DD format
    page?: number;
    limit?: number;
    type?: string; // Add type filter for field or field_coach
}

export interface FieldOwnerBookingsResponse {
    success: boolean;
    data: {
        bookings: FieldOwnerBooking[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    };
}