export interface FieldOwnerProfile {
    id: string;
    user: string; // or populated user id; UI can fetch populated user separately if needed
    facilityName: string;
    facilityLocation?: string;
    description?: string;
    amenities?: string[];
    rating?: number;
    totalReviews?: number;
    isVerified?: boolean;
    verificationDocument?: string;
    businessHours?: string;
    contactPhone?: string;
    website?: string;
    createdAt: string;
    updatedAt: string;
}

export type CreateOwnerProfilePayload = Partial<
    Pick<
        FieldOwnerProfile,
        |
            "facilityName" |
            "facilityLocation" |
            "description" |
            "amenities" |
            "verificationDocument" |
            "businessHours" |
            "contactPhone" |
            "website"
    >
> & { facilityName: string };

export type UpdateOwnerProfilePayload = Partial<
    Pick<
        FieldOwnerProfile,
        |
            "facilityName" |
            "facilityLocation" |
            "description" |
            "amenities" |
            "verificationDocument" |
            "businessHours" |
            "contactPhone" |
            "website"
    >
>;


