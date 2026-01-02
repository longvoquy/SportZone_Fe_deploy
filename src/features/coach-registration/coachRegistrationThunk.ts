import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import axiosUpload from "../../utils/axios/axiosUpload";
import {
    SUBMIT_COACH_REGISTRATION_API,
    GET_MY_COACH_REGISTRATION_API,
    UPLOAD_COACH_DOCUMENT_API,
} from "./coachRegistrationAPI";

export type CreateCoachRegistrationPayload = {
    personalInfo: {
        fullName: string;
        idNumber: string;
        address: string;
    };
    // eKYC fields
    ekycSessionId?: string;
    ekycData?: {
        fullName: string;
        idNumber?: string;
        identityCardNumber?: string;
        address?: string;
        permanentAddress?: string;
        dateOfBirth?: string;
        expirationDate?: string;
    };
    // Coach profile information
    sports: string; // Sport type
    certification: string;
    hourlyRate: number;
    bio: string;
    experience: string;
    // Location information
    locationAddress: string;
    locationCoordinates?: { lat: number; lng: number };
    // Photos/Documents
    profilePhoto?: string;
    certificationPhotos?: string[];
};

export type CoachRegistrationResponse = {
    id: string;
    userId: string;
    personalInfo: {
        fullName: string;
        idNumber: string;
        address: string;
    };
    // eKYC fields
    ekycSessionId?: string;
    ekycStatus?: 'pending' | 'verified' | 'failed';
    ekycVerifiedAt?: string;
    ekycData?: {
        fullName: string;
        idNumber?: string;
        identityCardNumber?: string;
        address?: string;
        permanentAddress?: string;
        dateOfBirth?: string;
        expirationDate?: string;
    };
    // Coach profile
    sports: string;
    certification: string;
    hourlyRate: number;
    bio: string;
    experience: string;
    locationAddress: string;
    locationCoordinates?: { lat: number; lng: number };
    profilePhoto?: string;
    certificationPhotos?: string[];
    // Status
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    // Timestamps
    submittedAt: string;
    processedAt?: string;
    processedBy?: string;
    reviewedAt?: string;
    reviewedBy?: string;
};

export type ErrorResponse = {
    message: string;
    status: string;
    errors?: any;
};

/**
 * Submit coach registration request
 */
export const submitCoachRegistration = createAsyncThunk<
    CoachRegistrationResponse,
    CreateCoachRegistrationPayload,
    { rejectValue: ErrorResponse }
>("coachRegistration/submit", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(SUBMIT_COACH_REGISTRATION_API, payload);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to submit coach registration",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Get my coach registration request status
 */
export const getMyCoachRegistration = createAsyncThunk<
    CoachRegistrationResponse | null,
    void,
    { rejectValue: ErrorResponse }
>("coachRegistration/getMyStatus", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_MY_COACH_REGISTRATION_API);
        const registration = response.data?.data ?? response.data;
        return (registration as CoachRegistrationResponse) || null;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null; // No registration request found
        }
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get registration status",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

/**
 * Upload coach document (profile photo or certification documents)
 */
export const uploadCoachDocument = createAsyncThunk<
    string,
    File,
    { rejectValue: ErrorResponse }
>("coachRegistration/uploadDocument", async (file, thunkAPI) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axiosUpload.post<{ success: boolean; data: { url: string } }>(
            UPLOAD_COACH_DOCUMENT_API,
            formData,
        );

        const url = response.data?.data?.url;
        if (!url || typeof url !== 'string' || url.trim() === '') {
            throw new Error('URL không hợp lệ từ server');
        }
        return url;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to upload document",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});
