import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    AuthResponse,
    ErrorResponse,
    LoginPayload,
    RegisterPayload,
    RegisterResponse,
} from "../../types/authentication-type";
import axiosPublic from "../../utils/axios/axiosPublic";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import { LOGIN_API, REGISTER_API, GOOGLE_LOGIN_API, LOGOUT_API, VALIDATE_SESSION_API, REFRESH_TOKEN_API } from "./authAPI";
import logger from "@/utils/logger";

export const signInWithEmailAndPassword = createAsyncThunk<
    Pick<AuthResponse, "user">,
    LoginPayload,
    { rejectValue: ErrorResponse }
>("auth/login", async (payload, thunkAPI) => {
    try {
        const response = await axiosPublic.post(LOGIN_API, payload);

        logger.debug("Login response data:", response.data);

        const raw = response?.data?.data ?? response?.data;
        const user = raw?.user ?? raw?.data?.user ?? raw?.result?.user ?? null;
        if (!user) {
            throw new Error("Invalid login response: missing user");
        }
        return { user } as Pick<AuthResponse, "user">;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Login failed",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// register
export const signUpWithEmailAndPassword = createAsyncThunk<
    RegisterResponse,
    RegisterPayload,
    { rejectValue: ErrorResponse } // type of error payload
>("auth/register", async (payload, thunkAPI) => {
    try {
        const response = await axiosPublic.post(REGISTER_API, payload);
        logger.debug("Register response data:", response.data);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message:
                error.response?.data?.message || error.message || "Register failed",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Google 
export const signInWithGoogle = createAsyncThunk<
    Pick<AuthResponse, "user">,
    { token: string; avatar?: string; rememberMe?: boolean },
    { rejectValue: ErrorResponse }
>("auth/google", async (payload, thunkAPI) => {
    try {
        const response = await axiosPublic.post(GOOGLE_LOGIN_API, {
            token: payload.token,
            avatar: payload.avatar,
            rememberMe: payload.rememberMe,
        });

        const raw = response?.data?.data ?? response?.data;
        const user = raw?.user ?? raw?.data?.user ?? raw?.result?.user ?? null;
        if (!user) {
            throw new Error("Invalid google login response: missing user");
        }
        return { user } as Pick<AuthResponse, "user">;
    } catch (error: any) {
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Google login failed",
            status: error.response?.status || "500",
        });
    }
});


// logout
export const logout = createAsyncThunk<
    { message: string },
    void,
    { rejectValue: ErrorResponse }
>("auth/logout", async (_, thunkAPI) => {
    try {
        const response = await axiosPublic.post(LOGOUT_API);
        return response.data;
    } catch (error: any) {
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Logout failed",
            status: error.response?.status || "500",
        });
    }
});

// Validate session - check if JWT is still valid
export const validateSession = createAsyncThunk<
    Pick<AuthResponse, "user">,
    void,
    { rejectValue: ErrorResponse }
>("auth/validateSession", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(VALIDATE_SESSION_API);

        const raw = response?.data?.data ?? response?.data;
        const user = raw?.user ?? raw?.data?.user ?? raw?.result?.user ?? null;

        if (!user) {
            throw new Error("Invalid session: missing user");
        }

        return { user } as Pick<AuthResponse, "user">;
    } catch (error: any) {
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Session expired",
            status: error.response?.status || "401",
        });
    }
});

// Refresh token - get new JWT using refresh token
export const refreshToken = createAsyncThunk<
    Pick<AuthResponse, "user">,
    void,
    { rejectValue: ErrorResponse }
>("auth/refreshToken", async (_, thunkAPI) => {
    try {
        const response = await axiosPublic.post(REFRESH_TOKEN_API);

        const raw = response?.data?.data ?? response?.data;
        const user = raw?.user ?? raw?.data?.user ?? raw?.result?.user ?? null;

        if (!user) {
            throw new Error("Failed to refresh token: missing user");
        }

        return { user } as Pick<AuthResponse, "user">;
    } catch (error: any) {
        return thunkAPI.rejectWithValue({
            message: error.response?.data?.message || error.message || "Token refresh failed",
            status: error.response?.status || "401",
        });
    }
});

import type { ForgotPasswordPayload, ResetPasswordPayload, ChangePasswordPayload } from "../../types/user-type";
import { FORGOT_PASSWORD_API, RESET_PASSWORD_API, CHANGE_PASSWORD_API, DEACTIVATE_ACCOUNT_API } from "./authAPI";

// Forgot password
export const forgotPassword = createAsyncThunk<
    { message: string },
    ForgotPasswordPayload,
    { rejectValue: ErrorResponse }
>("auth/forgotPassword", async (payload, thunkAPI) => {
    try {
        const response = await axiosPublic.post(FORGOT_PASSWORD_API, payload);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to send reset email",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Reset password
export const resetPassword = createAsyncThunk<
    { message: string },
    ResetPasswordPayload,
    { rejectValue: ErrorResponse }
>("auth/resetPassword", async (payload, thunkAPI) => {
    try {
        const response = await axiosPublic.post(RESET_PASSWORD_API, payload);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to reset password",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Change password (for logged in users) - uses axiosPrivate
export const changePassword = createAsyncThunk<
    { message: string },
    ChangePasswordPayload,
    { rejectValue: ErrorResponse }
>("auth/changePassword", async (payload, thunkAPI) => {
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

// Deactivate account
export const deactivateAccount = createAsyncThunk<
    { message: string },
    void,
    { rejectValue: ErrorResponse }
>("auth/deactivateAccount", async (_, thunkAPI) => {
    try {
        const response = await axiosPrivate.patch(DEACTIVATE_ACCOUNT_API);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to deactivate account",
            status: error.response?.status || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});
