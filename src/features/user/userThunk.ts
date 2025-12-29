import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import logger from "@/utils/logger";
import {
    GET_PROFILE_API,
    UPDATE_PROFILE_API,
    SET_FAVOURITE_FIELDS_API,
    REMOVE_FAVOURITE_FIELDS_API,
    FORGOT_PASSWORD_API,
    RESET_PASSWORD_API,
    CHANGE_PASSWORD_API,
} from "./userAPI";
import { GET_FAVOURITE_FIELDS_API, GET_FAVOURITE_COACHES_API, SET_FAVOURITE_COACHES_API, REMOVE_FAVOURITE_COACHES_API } from './userAPI';
import type {
    User,
    UpdateProfilePayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    ChangePasswordPayload,
    ErrorResponse
} from "../../types/user-type";

// Get user profile
export const getUserProfile = createAsyncThunk<
    User,
    void,
    { rejectValue: ErrorResponse }
>("user/getUserProfile", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_PROFILE_API);

        return response.data.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get profile",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Update user profile
export const updateUserProfile = createAsyncThunk<
    User,
    UpdateProfilePayload,
    { rejectValue: ErrorResponse }
>("user/updateProfile", async (payload, thunkAPI) => {
    try {
        const formData = new FormData();

        // Append text fields
        if (payload.fullName) formData.append('fullName', payload.fullName);
        if (payload.email) formData.append('email', payload.email);
        if (payload.phone) formData.append('phone', payload.phone);

        // Append file if exists
        if (payload.avatar) {
            formData.append('avatar', payload.avatar);
        }

        const response = await axiosPrivate.patch(
            UPDATE_PROFILE_API,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );



        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to update profile",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Set favourite coaches

// Set favourite coaches
export interface SetFavouriteCoachesPayload {
    favouriteCoaches: string[];
}

export const setFavouriteCoaches = createAsyncThunk<
    User,
    SetFavouriteCoachesPayload,
    { rejectValue: ErrorResponse }
>("user/setFavouriteCoaches", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(SET_FAVOURITE_COACHES_API, payload);
        // API returns updated user in response.data.data
        return response.data.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to set favourite coaches",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Remove favourite coaches
export interface RemoveFavouriteCoachesPayload {
    favouriteCoaches: string[];
}

export const removeFavouriteCoaches = createAsyncThunk<
    User,
    RemoveFavouriteCoachesPayload,
    { rejectValue: ErrorResponse }
>("user/removeFavouriteCoaches", async (payload, thunkAPI) => {
    try {
        // axios delete with body needs `data` option
        const response = await axiosPrivate.delete(REMOVE_FAVOURITE_COACHES_API, { data: payload });
        return response.data.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to remove favourite coaches",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Set favourite fields
export interface SetFavouriteFieldsPayload {
    favouriteFields: string[];
}

export const setFavouriteFields = createAsyncThunk<
    User,
    SetFavouriteFieldsPayload,
    { rejectValue: ErrorResponse }
>("user/setFavouriteFields", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(SET_FAVOURITE_FIELDS_API, payload);

        // Handle different response structures
        return response.data.data || response.data;
    } catch (error: any) {
        logger.error("setFavouriteFields API error:", error.response?.data || error.message);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to set favourite fields",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Remove favourite fields
export interface RemoveFavouriteFieldsPayload {
    favouriteFields: string[];
}

export const removeFavouriteFields = createAsyncThunk<
    User,
    RemoveFavouriteFieldsPayload,
    { rejectValue: ErrorResponse }
>("user/removeFavouriteFields", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.delete(REMOVE_FAVOURITE_FIELDS_API, { data: payload });

        // Handle different response structures
        return response.data.data || response.data;
    } catch (error: any) {
        logger.error("removeFavouriteFields API error:", error.response?.data || error.message);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to remove favourite fields",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get favourite fields
import type { FavouriteField } from '../../types/favourite-field';
export const getFavouriteFields = createAsyncThunk<
    FavouriteField[],
    void,
    { rejectValue: ErrorResponse }
>("user/getFavouriteFields", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_FAVOURITE_FIELDS_API);
        // support both { data: [...] } and { data: { data: [...] } }
        const data = response.data?.data ?? response.data;
        return data as FavouriteField[];
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch favourite fields",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get favourite coaches
import type { FavouriteCoach } from '../../types/favourite-coach';
export const getFavouriteCoaches = createAsyncThunk<
    FavouriteCoach[],
    void,
    { rejectValue: ErrorResponse }
>("user/getFavouriteCoaches", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_FAVOURITE_COACHES_API);
        const data = response.data?.data ?? response.data;
        return data as FavouriteCoach[];
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch favourite coaches",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Forgot Password
export const forgotPassword = createAsyncThunk<
    any,
    ForgotPasswordPayload,
    { rejectValue: ErrorResponse }
>("user/forgotPassword", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(FORGOT_PASSWORD_API, payload);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to send reset email",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Reset Password
export const resetPassword = createAsyncThunk<
    any,
    ResetPasswordPayload,
    { rejectValue: ErrorResponse }
>("user/resetPassword", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(RESET_PASSWORD_API, payload);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to reset password",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Change Password
export const changePassword = createAsyncThunk<
    any,
    ChangePasswordPayload,
    { rejectValue: ErrorResponse }
>("user/changePassword", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(CHANGE_PASSWORD_API, payload);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to change password",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});