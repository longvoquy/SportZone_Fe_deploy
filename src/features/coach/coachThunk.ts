import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    CoachesResponse,
    CoachDetailResponse,
    LegacyCoachesResponse,
    CoachFilters,
    ErrorResponse,
    CoachProfileResponse,
    PublicCoachesResponse,
    SportType as SportTypeType,
} from "../../types/coach-type";
import { SportType as SPORT_TYPE_CONST } from "../../types/coach-type";
import axiosPublic from "../../utils/axios/axiosPublic";
import axiosUpload from "../../utils/axios/axiosUpload";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import logger from "@/utils/logger";
import {
    COACHES_API,
    COACH_BY_ID_API,
    ALL_COACHES_API,
    COACHES_PUBLIC_API,
    UPLOAD_COACH_GALLERY_API,
    DELETE_COACH_GALLERY_IMAGE_API,
} from "./coachAPI";
import { COACH_BY_ID_API as COACH_PUT_API } from './coachAPI';
import { COACH_ID_BY_USER_ID_API } from "./coachAPI";

// Map API Coach shape (coachesAPI.md) to app Coach type used in UI
const mapApiCoachToAppCoach = (apiCoach: any): import("../../types/coach-type").Coach => {
    return {
        id: apiCoach?.id || "",
        fullName: apiCoach?.fullName || "",
        email: apiCoach?.email || "",
        avatarUrl: apiCoach?.avatarUrl,
        isVerified: apiCoach?.isVerified ?? false,
        sports: Array.isArray(apiCoach?.sports) ? apiCoach.sports : [],
        certification: apiCoach?.certification || "",
        hourlyRate: Number(apiCoach?.hourlyRate ?? 0),
        bio: apiCoach?.bio || "",
        rating: Number(apiCoach?.rating ?? 0),
        totalReviews: Number(apiCoach?.totalReviews ?? 0),
    };
};

// Map API Legacy Coach shape to app LegacyCoach type
const mapApiLegacyCoachToAppLegacyCoach = (apiCoach: any): import("../../types/coach-type").LegacyCoach => {
    return {
        id: apiCoach?.id || "",
        name: apiCoach?.name || "",
        location: apiCoach?.location || "",
        description: apiCoach?.description || "",
        rating: Number(apiCoach?.rating ?? 0),
        totalReviews: Number(apiCoach?.totalReviews ?? 0),
        price: Number(apiCoach?.price ?? 0),
        nextAvailability: apiCoach?.nextAvailability || null,
    };
};

// Map API Coach Detail shape to app CoachDetail type
const mapApiCoachDetailToAppCoachDetail = (apiCoach: any): import("../../types/coach-type").CoachDetail => {
    const name = apiCoach?.name || apiCoach?.user?.fullName || "";
    const description = apiCoach?.description || apiCoach?.bio || "";
    const price = Number(apiCoach?.price ?? apiCoach?.hourlyRate ?? 0);
    const reviewCount = Number(apiCoach?.reviewCount ?? apiCoach?.totalReviews ?? 0);
    const avatar = apiCoach?.avatar || apiCoach?.user?.avatarUrl || "";
    const level = apiCoach?.level || apiCoach?.rank || "";
    const memberSince = apiCoach?.memberSince || apiCoach?.createdAt || "";
    const experience = apiCoach?.coachingDetails?.experience || apiCoach?.experience || "";
    const certification = apiCoach?.coachingDetails?.certification || apiCoach?.certification || "";

    // Extract locationData from API response
    // BE returns locationData as an object with { address, geo: { type, coordinates } }
    const locationData = apiCoach?.locationData ||
        (apiCoach?.location && typeof apiCoach.location === 'object' ? apiCoach.location : null);

    return {
        id: apiCoach?.id || apiCoach?._id || "",
        name,
        profileImage: apiCoach?.profileImage || "",
        avatar,
        description,
        rating: Number(apiCoach?.rating ?? 0),
        reviewCount,
        location: apiCoach?.location || apiCoach?.user?.location || "",
        locationData: locationData || undefined, // Include locationData with geo coordinates
        galleryImages: Array.isArray(apiCoach?.galleryImages) ? apiCoach.galleryImages : [],
        level,
        // include sports so frontend can show specialization — simple fallback + normalization
        sports: (() => {
            const allowed = (Object.values(SPORT_TYPE_CONST) as string[]).map((s) => s.toLowerCase());
            const raw = apiCoach?.sports ?? apiCoach?.coachingDetails?.sports ?? apiCoach?.profile?.sports ?? apiCoach?.user?.sports ?? [];
            if (!Array.isArray(raw)) return [] as unknown as SportTypeType[];
            return raw
                .map((s: any) => String(s || '').trim().toLowerCase())
                .filter((v: string) => allowed.includes(v)) as unknown as SportTypeType[];
        })(),
        completedSessions: Number(apiCoach?.completedSessions ?? 0),
        createdAt: apiCoach?.createdAt || "",
        memberSince,
        availableSlots: Array.isArray(apiCoach?.availableSlots) ? apiCoach.availableSlots : [],
        price,
        coachingDetails: {
            experience,
            certification,
        },
    };
};

// Get coaches with filters
export const getCoaches = createAsyncThunk<
    CoachesResponse,
    CoachFilters | undefined,
    { rejectValue: ErrorResponse }
>("coach/getCoaches", async (filters = {}, thunkAPI) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.name) queryParams.append("name", filters.name);
        if (filters.sportType) queryParams.append("sportType", filters.sportType);
        if (filters.minRate) queryParams.append("minRate", filters.minRate.toString());
        if (filters.maxRate) queryParams.append("maxRate", filters.maxRate.toString());
        if (filters.district) queryParams.append("district", filters.district);

        const url = queryParams.toString() ? `${COACHES_API}?${queryParams}` : COACHES_API;
        const response = await axiosPublic.get(url);

        logger.debug("Get coaches response:", response.data);

        const raw = response.data;
        const apiList = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        const mapped = apiList.map(mapApiCoachToAppCoach);
        return { success: true, data: mapped, message: raw?.message } as CoachesResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch coaches",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get coach by ID
export const getCoachById = createAsyncThunk<
    CoachDetailResponse,
    string,
    { rejectValue: ErrorResponse }
>("coach/getCoachById", async (id, thunkAPI) => {
    try {
        logger.debug("Starting getCoachById request:", {
            coachId: id,
            apiUrl: COACH_BY_ID_API(id),
        });

        const response = await axiosPublic.get(COACH_BY_ID_API(id));

        logger.debug("Raw API response received:", {
            coachId: id,
            status: response.status,
            data: response.data,
        });

        const raw = response.data;
        // Unwrap common API envelope variations
        const apiCoachContainer = (raw && typeof raw === 'object') ? raw : {};
        const apiCoachRaw = (apiCoachContainer as any)?.data ?? apiCoachContainer;
        const apiCoach = (apiCoachRaw as any)?.coach ?? apiCoachRaw;
        const mapped = mapApiCoachDetailToAppCoachDetail(apiCoach);

        logger.debug("Coach data mapped successfully:", {
            coachId: id,
            mappedCoach: {
                id: mapped.id,
                name: mapped.name,
                location: mapped.location,
                price: mapped.price,
                rating: mapped.rating,
            },
        });

        return { success: true, data: mapped, message: raw?.message } as CoachDetailResponse;
    } catch (error: any) {
        logger.error("Error fetching coach by ID:", {
            coachId: id,
            error: error.message,
            status: error.response?.status,
        });

        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch coach",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get all coaches (legacy format)
export const getAllCoaches = createAsyncThunk<
    LegacyCoachesResponse,
    void,
    { rejectValue: ErrorResponse }
>("coach/getAllCoaches", async (_, thunkAPI) => {
    try {
        const response = await axiosPublic.get(ALL_COACHES_API);

        logger.debug("Get all coaches (legacy) response:", response.data);

        const raw = response.data;
        const apiList = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        const mapped = apiList.map(mapApiLegacyCoachToAppLegacyCoach);
        return { success: true, data: mapped, message: raw?.message } as LegacyCoachesResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch all coaches",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get public coaches, optional sports filter (array of SportType)
export const getPublicCoaches = createAsyncThunk<
    PublicCoachesResponse,
    { sports?: string[] } | undefined,
    { rejectValue: ErrorResponse }
>("coach/getPublicCoaches", async (payload = {}, thunkAPI) => {
    try {
        const sports = payload?.sports;
        const params = new URLSearchParams();
        if (sports && sports.length > 0) params.append('sports', sports.join(','));

        const url = params.toString() ? `${COACHES_PUBLIC_API}?${params.toString()}` : COACHES_PUBLIC_API;
        const response = await axiosPublic.get(url);

        const raw = response.data;
        const apiList = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

        // Map to PublicCoach type
        const mapped = apiList.map((apiCoach: any) => ({
            id: apiCoach?.id || apiCoach?._id || "",
            name: apiCoach?.name || apiCoach?.fullName || "",
            location: apiCoach?.location || "",
            description: apiCoach?.description || apiCoach?.bio || undefined,
            rating: Number(apiCoach?.rating ?? 0),
            totalReviews: Number(apiCoach?.totalReviews ?? 0),
            price: Number(apiCoach?.price ?? apiCoach?.hourlyRate ?? 0),
            rank: apiCoach?.rank ?? undefined,
            sports: Array.isArray(apiCoach?.sports) ? apiCoach.sports : [],
        }));

        return { success: true, data: mapped, message: raw?.message } as PublicCoachesResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch public coaches",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Update coach profile (PUT /coaches/:id)
export const updateCoach = createAsyncThunk<
    CoachDetailResponse,
    { id: string; data: Partial<any> },
    { rejectValue: ErrorResponse }
>("coach/updateCoach", async (payload, thunkAPI) => {
    try {
        const { id, data } = payload;
        const response = await axiosPublic.put(COACH_PUT_API(id), data);
        const raw = response.data;
        const apiCoachContainer = (raw && typeof raw === 'object') ? raw : {};
        const apiCoachRaw = (apiCoachContainer as any)?.data ?? apiCoachContainer;
        const apiCoach = (apiCoachRaw as any)?.coach ?? apiCoachRaw;
        const mapped = mapApiCoachDetailToAppCoachDetail(apiCoach);
        return { success: true, data: mapped, message: raw?.message } as CoachDetailResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to update coach",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Resolve coach profile by userId -> returns raw coach object (including _id)
export const getCoachIdByUserId = createAsyncThunk<
    { success: boolean; coachId: string | null; data: import("../../types/coach-type").CoachProfile; message?: string },
    string,
    { rejectValue: ErrorResponse }
>("coach/getCoachIdByUserId", async (userId, thunkAPI) => {
    try {
        const response = await axiosPublic.get(COACH_ID_BY_USER_ID_API(userId));
        logger.debug("Coach ID by user ID response:", {
            response: response.data,
        });
        const raw: CoachProfileResponse = response?.data as CoachProfileResponse;
        const coach = (raw?.data ?? (raw as any)) as import("../../types/coach-type").CoachProfile;
        const coachId = coach?._id ?? null;
        return { success: true, coachId, data: coach, message: raw?.message };

    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to resolve coach by userId",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Upload coach gallery images
export const uploadCoachGalleryImages = createAsyncThunk<
    { success: boolean; urls: string[] },
    { coachId: string; files: File[] },
    { rejectValue: ErrorResponse }
>("coach/uploadGalleryImages", async ({ coachId, files }, thunkAPI) => {
    try {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));

        const response = await axiosUpload.post(
            UPLOAD_COACH_GALLERY_API(coachId),
            formData
        );

        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || 'Upload failed',
            status: error.response?.status?.toString() || '500',
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Delete coach gallery image by index
export const deleteCoachGalleryImage = createAsyncThunk<
    { success: boolean },
    { coachId: string; index: number },
    { rejectValue: ErrorResponse }
>("coach/deleteGalleryImage", async ({ coachId, index }, thunkAPI) => {
    try {
        const response = await axiosPrivate.delete(
            DELETE_COACH_GALLERY_IMAGE_API(coachId, index)
        );
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || 'Delete failed',
            status: error.response?.status?.toString() || '500',
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});
