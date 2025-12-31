import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import logger from "@/utils/logger";
import {
    GET_PROFILE_API,
    UPDATE_PROFILE_API,
    SET_BOOKMARK_FIELDS_API,
    REMOVE_BOOKMARK_FIELDS_API,
    FORGOT_PASSWORD_API,
    RESET_PASSWORD_API,
    CHANGE_PASSWORD_API,
} from "./userAPI";
import { GET_BOOKMARK_FIELDS_API, GET_BOOKMARK_COACHES_API, SET_BOOKMARK_COACHES_API, REMOVE_BOOKMARK_COACHES_API } from './userAPI';
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

// Set bookmark coaches

// Set bookmark coaches
export interface SetBookmarkCoachesPayload {
    bookmarkCoaches: string[];
}

export const setBookmarkCoaches = createAsyncThunk<
    User,
    SetBookmarkCoachesPayload,
    { rejectValue: ErrorResponse }
>("user/setBookmarkCoaches", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(SET_BOOKMARK_COACHES_API, payload);
        // API returns updated user in response.data.data
        return response.data.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to set bookmark coaches",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Remove bookmark coaches
export interface RemoveBookmarkCoachesPayload {
    bookmarkCoaches: string[];
}

export const removeBookmarkCoaches = createAsyncThunk<
    User,
    RemoveBookmarkCoachesPayload,
    { rejectValue: ErrorResponse }
>("user/removeBookmarkCoaches", async (payload, thunkAPI) => {
    try {
        // axios delete with body needs `data` option
        const response = await axiosPrivate.delete(REMOVE_BOOKMARK_COACHES_API, { data: payload });
        return response.data.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to remove bookmark coaches",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Set bookmark fields
export interface SetBookmarkFieldsPayload {
    bookmarkFields: string[];
}

export const setBookmarkFields = createAsyncThunk<
    User,
    SetBookmarkFieldsPayload,
    { rejectValue: ErrorResponse }
>("user/setBookmarkFields", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(SET_BOOKMARK_FIELDS_API, payload);

        // Handle different response structures
        return response.data.data || response.data;
    } catch (error: any) {
        logger.error("setBookmarkFields API error:", error.response?.data || error.message);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to set bookmark fields",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Remove bookmark fields
export interface RemoveBookmarkFieldsPayload {
    bookmarkFields: string[];
}

export const removeBookmarkFields = createAsyncThunk<
    User,
    RemoveBookmarkFieldsPayload,
    { rejectValue: ErrorResponse }
>("user/removeBookmarkFields", async (payload, thunkAPI) => {
    try {
        const response = await axiosPrivate.delete(REMOVE_BOOKMARK_FIELDS_API, { data: payload });

        // Handle different response structures
        return response.data.data || response.data;
    } catch (error: any) {
        logger.error("removeBookmarkFields API error:", error.response?.data || error.message);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to remove bookmark fields",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get bookmark fields
import type { BookmarkField } from '../../types/bookmark-field';
export const getBookmarkFields = createAsyncThunk<
    BookmarkField[],
    void,
    { rejectValue: ErrorResponse }
>("user/getBookmarkFields", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_BOOKMARK_FIELDS_API);
        // support both { data: [...] } and { data: { data: [...] } }
        const data = response.data?.data ?? response.data;
        return data as BookmarkField[];
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch bookmark fields",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get bookmark coaches
import type { BookmarkCoach } from '../../types/bookmark-coach';
export const getBookmarkCoaches = createAsyncThunk<
    BookmarkCoach[],
    void,
    { rejectValue: ErrorResponse }
>("user/getBookmarkCoaches", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_BOOKMARK_COACHES_API);
        const data = response.data?.data ?? response.data;
        return data as BookmarkCoach[];
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch bookmark coaches",
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