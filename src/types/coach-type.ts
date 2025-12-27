// Sport Type constants matching API documentation
export const SportType = {
    FOOTBALL: 'football',
    TENNIS: 'tennis',
    BADMINTON: 'badminton',
    PICKLEBALL: 'pickleball',
    BASKETBALL: 'basketball',
    VOLLEYBALL: 'volleyball',
    SWIMMING: 'swimming',
    GYM: 'gym'
} as const;

export type SportType = typeof SportType[keyof typeof SportType];

// Coach interfaces based on API documentation
export interface Coach {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    isVerified: boolean;
    sports: SportType[];
    certification: string;
    hourlyRate: number;
    bio: string;
    rating: number;
    totalReviews: number;
    location?: string; // Coach location for filtering
    rank?: string;
    experience?: string;
}

// Legacy Coach interface for /coaches/all endpoint
export interface LegacyCoach {
    id: string;
    name: string;
    location: string;
    description: string;
    rating: number;
    totalReviews: number;
    price: number;
    nextAvailability: null; // TODO: Will be implemented
}

// Public coach shape returned by GET /coaches/public
export interface PublicCoach {
    id: string;
    name: string;
    location: string;
    description?: string;
    rating?: number;
    totalReviews?: number;
    price?: number;
    rank?: string;
    sports?: SportType[];
}

export interface PublicCoachesResponse {
    success: boolean;
    data: PublicCoach[];
    message?: string;
}

// Location data structure with geo coordinates
export interface LocationData {
    address?: string;
    geo?: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
}

// Coach Detail interface for /coaches/:id endpoint
export interface CoachDetail {
    id: string;
    name: string;
    profileImage: string;
    avatar?: string;
    description: string;
    rating: number;
    reviewCount: number;
    location: string;
    locationData?: LocationData; // Location with geo coordinates
    galleryImages?: string[]; // Gallery images
    level: string;
    completedSessions: number;
    createdAt: string;
    memberSince?: string;
    availableSlots: TimeSlot[];
    price: number;
    sports?: SportType[];
    coachingDetails: {
        experience: string;
        certification: string;
    };
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
}



// Filter interfaces for coach queries
export interface CoachFilters {
    name?: string;
    sportType?: SportType | string;
    minRate?: number;
    maxRate?: number;
    district?: string; // Filter by district (quận)
}

// API Response interfaces
export interface CoachesResponse {
    success: boolean;
    data: Coach[];
    message?: string;
}

export interface LegacyCoachesResponse {
    success: boolean;
    data: LegacyCoach[];
    message?: string;
}

export interface CoachDetailResponse {
    success: boolean;
    data: CoachDetail;
    message?: string;
}

// Coach Profile (resolve by userId) - dedicated type for /profiles/coach-id/:userId
export interface CoachProfileUser {
    favouriteField: string[];
    isActive: boolean;
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    isVerified: boolean;
    verificationToken: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
    avatarUrl: string;
}

export interface CoachProfile {
    _id: string;
    user: CoachProfileUser;
    sports: string[];
    certification: string;
    hourlyRate: number;
    bio: string;
    galleryImages?: string[];
    rating: number;
    totalReviews: number;
    createdAt: string;
    updatedAt: string;
    completedSessions: number;
    experience: string;
    location: string;
    rank: string;
}

export interface CoachProfileResponse {
    success: boolean;
    data: CoachProfile;
    message?: string;
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

// Utility types
export type CoachId = string;
export type UserId = string;

// Coach Bank Account interface
export interface CoachBankAccount {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
    qrCodeUrl?: string;
    branch?: string;
}

// Available slot interface
export interface AvailableSlot {
    startTime: string;
    endTime: string;
    available: boolean;
}

// Create Coach Booking V2 Payload
export interface CreateCoachBookingV2Payload {
    fieldId: string;
    coachId: string;
    date: string;
    startTime: string;
    endTime: string;
    note?: string;
    guestEmail?: string;
    guestName?: string;
    guestPhone?: string;
}
