import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import logger from "@/utils/logger";
import {
    signInWithEmailAndPassword,
    signUpWithEmailAndPassword,
    signInWithGoogle,
    logout,
    validateSession,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword,
    deactivateAccount,
} from "./authThunk";
import {
    getUserProfile,
    updateUserProfile,
    setBookmarkCoaches,
    removeBookmarkCoaches,
    setBookmarkFields,
    removeBookmarkFields,
} from "../user/userThunk";
import type { AuthResponse, ErrorResponse } from "../../types/authentication-type";
import { clearUserAuth, setCookie } from "../../lib/cookies";

// Extend the User type from AuthResponse to include new fields
// This assumes AuthResponse['user'] is the User interface we want to modify.
// If AuthResponse['user'] is a simple type, this might need adjustment.
// For now, we'll define a local type that includes the new fields.
type User = AuthResponse["user"] & {
    tournaments?: any[];
    // Abuse prevention fields
    activeTournamentsCount?: number;
    weeklyTournamentCreationCount?: number;
    tournamentTier?: 'FREE' | 'PREMIUM';
}

interface AuthState {
    _id: string | null;
    user: User | null; // Use the extended User type here
    token: string | null; // kept for backward-compatibility but unused with cookie auth
    authMethod: 'cookie' | 'bearer' | null; // NEW: Track authentication method
    securityWarning: string | null; // NEW: Security warning for fallback mode
    loading: boolean;
    error: ErrorResponse | null;
    verifyStatus?: "pending" | "success" | "error";
    verifyMessage?: string;

    // User management state
    updateLoading: boolean;
    updateError: ErrorResponse | null;
    forgotPasswordLoading: boolean;
    forgotPasswordSuccess: boolean;
    forgotPasswordError: ErrorResponse | null;
    resetPasswordLoading: boolean;
    resetPasswordSuccess: boolean;
    resetPasswordError: ErrorResponse | null;
    changePasswordLoading: boolean;
    changePasswordSuccess: boolean;
    changePasswordError: ErrorResponse | null;
    deactivateLoading: boolean;
}

const readUserFromCookie = (): any | null => {
    try {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(/user=([^;]+)/);
        if (!match) return null;
        const userStr = decodeURIComponent(match[1]);
        return JSON.parse(userStr);
    } catch { return null; }
};

const getStoredUser = () => {
    try {
        // Ưu tiên cookie trước, rồi fallback localStorage
        const fromCookie = readUserFromCookie();
        if (fromCookie) return fromCookie;
        // Sau cookie, ưu tiên sessionStorage (rememberMe = false)
        const sessionUserStr = sessionStorage.getItem("user");
        if (sessionUserStr) return JSON.parse(sessionUserStr);
        // Cuối cùng mới đến localStorage (rememberMe = true)
        const localUserStr = localStorage.getItem("user");
        return localUserStr ? JSON.parse(localUserStr) : null;
    } catch {
        return null;
    }
};

const storedUser = getStoredUser();

// Debug current auth state
logger.debug("Auth initialState - User:", storedUser?.fullName);

// Validate authMethod from sessionStorage
const storedAuthMethod = sessionStorage.getItem('auth_method');
const validAuthMethod = (storedAuthMethod === 'cookie' || storedAuthMethod === 'bearer')
    ? storedAuthMethod
    : null;

const initialState: AuthState = {
    _id: storedUser?._id || null,
    user: storedUser,
    token: null,
    authMethod: validAuthMethod, // Type-safe validated value
    securityWarning: null,
    loading: false,
    error: null,
    verifyStatus: undefined,
    verifyMessage: "",

    updateLoading: false,
    updateError: null,
    forgotPasswordLoading: false,
    forgotPasswordSuccess: false,
    forgotPasswordError: null,
    resetPasswordLoading: false,
    resetPasswordSuccess: false,
    resetPasswordError: null,
    changePasswordLoading: false,
    changePasswordSuccess: false,
    changePasswordError: null,
    deactivateLoading: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearAuth: (state) => {
            state.user = null;
            state.token = null;
            clearUserAuth();
        },
        updateUser: (state, action: PayloadAction<AuthResponse["user"]>) => {
            state.user = action.payload;
            // Ghi vào nơi đang sử dụng hiện tại: ưu tiên sessionStorage nếu có, ngược lại localStorage
            const isSessionActive = !!sessionStorage.getItem("user");
            const target = isSessionActive ? sessionStorage : localStorage;
            target.setItem("user", JSON.stringify(action.payload));
            // Sync to cookie
            setCookie("user", JSON.stringify(action.payload));
        },
        // Thêm action để force refresh avatar
        refreshAvatar: (state) => {
            if (state.user) {
                state.user = { ...state.user };
                const isSessionActive = !!sessionStorage.getItem("user");
                const target = isSessionActive ? sessionStorage : localStorage;
                target.setItem("user", JSON.stringify(state.user));
                // Sync to cookie
                setCookie("user", JSON.stringify(state.user));
            }
        },
        // Đồng bộ lại user từ cookie trước, rồi mới đến localStorage
        syncFromLocalStorage: (state) => {
            const cookieUser = readUserFromCookie();
            if (cookieUser) {
                state.user = cookieUser;
                return;
            }
            const sessionUser = sessionStorage.getItem("user");
            if (sessionUser) {
                try {
                    const parsedUser = JSON.parse(sessionUser);
                    state.user = parsedUser;
                } catch (error) {
                    logger.error("Error parsing user from localStorage:", error);
                }
                return;
            }
            const localUser = localStorage.getItem("user");
            if (localUser) {
                try {
                    const parsedUser = JSON.parse(localUser);
                    state.user = parsedUser;
                } catch (error) {
                    logger.error("Error parsing user from localStorage:", error);
                }
            }
        },

        // User specific reducers
        clearUserError: (state) => {
            state.error = null;
            state.updateError = null;
            state.forgotPasswordError = null;
            state.resetPasswordError = null;
            state.changePasswordError = null;
        },
        clearSuccessStates: (state) => {
            state.forgotPasswordSuccess = false;
            state.resetPasswordSuccess = false;
            state.changePasswordSuccess = false;
        },
    },

    extraReducers: (builder) => {
        builder
            // Xử lý các action từ authThunk
            .addCase(signInWithEmailAndPassword.fulfilled, (state, action) => {
                state.loading = false;
                const { user, authMethod, securityWarning } = action.payload;

                if (user) {
                    state.user = user;
                    state.token = null; // deprecated field
                    state.authMethod = authMethod;
                    state.securityWarning = securityWarning || null;

                    // Store ONLY in sessionStorage (not localStorage for security)
                    sessionStorage.setItem("user", JSON.stringify(user));
                    sessionStorage.setItem("auth_method", authMethod);

                    // Also sync to cookie for compatibility
                    setCookie("user", JSON.stringify(user));
                } else {
                    state.error = { message: "Missing user in login response", status: "500" } as any;
                }
            })

            .addCase(signInWithGoogle.fulfilled, (state, action) => {
                state.loading = false;
                const { user, authMethod, securityWarning } = action.payload;

                if (user) {
                    state.user = user;
                    state.token = null;
                    state.authMethod = authMethod;
                    state.securityWarning = securityWarning || null;

                    // Store ONLY in sessionStorage (not localStorage for security)
                    sessionStorage.setItem("user", JSON.stringify(user));
                    sessionStorage.setItem("auth_method", authMethod);

                    // Also sync to cookie for compatibility
                    setCookie("user", JSON.stringify(user));
                } else {
                    state.error = { message: "Missing user in google login response", status: "500" } as any;
                }
            })

            .addCase(signUpWithEmailAndPassword.fulfilled, (state) => {
                state.loading = false;
            })

            // server-side logout thunk (must be before addMatcher calls)
            .addCase(logout.fulfilled, (state) => {
                // Reset all auth state
                state.user = null;
                state.token = null;
                state.authMethod = null;
                state.securityWarning = null;

                // Clear user auth cookie
                clearUserAuth();

                try {
                    // Clear user data from storage
                    sessionStorage.removeItem("user");
                    localStorage.removeItem("user");

                    // Clear Bearer token auth data (for fallback mode)
                    sessionStorage.removeItem("auth_access_token");
                    sessionStorage.removeItem("auth_refresh_token");
                    sessionStorage.removeItem("auth_method");

                    // Clean up chat state and WebSocket
                    logger.debug('Cleaning up chat on logout');

                    // Clear all sessionStorage (including booking data)
                    sessionStorage.clear();
                } catch { }
            })

            .addCase(deactivateAccount.pending, (state) => {
                state.deactivateLoading = true;
                state.error = null;
            })
            .addCase(deactivateAccount.fulfilled, (state) => {
                state.deactivateLoading = false;
                state.user = null;
                state.token = null;
                clearUserAuth();
                try {
                    sessionStorage.removeItem("user");
                    localStorage.removeItem("user");
                } catch { }
            })
            .addCase(deactivateAccount.rejected, (state, action) => {
                state.deactivateLoading = false;
                state.error = action.payload || { message: "Failed to deactivate account", status: "500" };
            })

            // Validate session
            .addCase(validateSession.fulfilled, (state, action) => {
                state.loading = false;
                const user = action.payload?.user;
                if (user) {
                    state.user = user;
                    state.error = null;
                    // Update storage with validated user
                    const isSessionActive = !!sessionStorage.getItem("user");
                    const target = isSessionActive ? sessionStorage : localStorage;
                    target.setItem("user", JSON.stringify(user));
                    // Sync to cookie
                    setCookie("user", JSON.stringify(user));
                }
            })
            .addCase(validateSession.rejected, (state) => {
                state.loading = false;
                state.user = null;
                state.token = null;
                clearUserAuth();
                try {
                    sessionStorage.removeItem("user");
                    localStorage.removeItem("user");
                } catch { }
            })

            // Refresh token
            .addCase(refreshToken.fulfilled, (state, action) => {
                state.loading = false;
                const user = action.payload?.user;
                if (user) {
                    state.user = user;
                    state.error = null;
                    // Update storage with refreshed token
                    const isSessionActive = !!sessionStorage.getItem("user");
                    const target = isSessionActive ? sessionStorage : localStorage;
                    target.setItem("user", JSON.stringify(user));
                    // Sync to cookie
                    setCookie("user", JSON.stringify(user));
                }
            })
            .addCase(refreshToken.rejected, (state) => {
                state.loading = false;
                state.user = null;
                state.token = null;
                clearUserAuth();
                try {
                    sessionStorage.removeItem("user");
                    localStorage.removeItem("user");
                } catch { }
            })

            // --- User Management Thunks ---

            // Get user profile
            .addCase(getUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload; // Sync profile data to auth user
                state.error = null;
                // Update storage & cookie
                const isSessionActive = !!sessionStorage.getItem("user");
                const target = isSessionActive ? sessionStorage : localStorage;
                target.setItem("user", JSON.stringify(action.payload));
                setCookie("user", JSON.stringify(action.payload));
            })
            .addCase(getUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || { message: "Failed to get profile", status: "500" };
            })

            // Update user profile
            .addCase(updateUserProfile.pending, (state) => {
                state.updateLoading = true;
                state.updateError = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.updateLoading = false;
                state.user = action.payload;
                state.updateError = null;
                // Update storage & cookie
                const isSessionActive = !!sessionStorage.getItem("user");
                const target = isSessionActive ? sessionStorage : localStorage;
                target.setItem("user", JSON.stringify(action.payload));
                setCookie("user", JSON.stringify(action.payload));
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.updateLoading = false;
                state.updateError = action.payload || { message: "Failed to update profile", status: "500" };
            })

            // Set bookmark coaches
            .addCase(setBookmarkCoaches.fulfilled, (state, action) => {
                state.user = action.payload;
                setCookie("user", JSON.stringify(action.payload));
            })
            // Remove bookmark coaches
            .addCase(removeBookmarkCoaches.fulfilled, (state, action) => {
                state.user = action.payload;
                setCookie("user", JSON.stringify(action.payload));
            })
            // Set bookmark fields
            .addCase(setBookmarkFields.fulfilled, (state, action) => {
                state.user = action.payload;
                setCookie("user", JSON.stringify(action.payload));
            })
            // Remove bookmark fields
            .addCase(removeBookmarkFields.fulfilled, (state, action) => {
                state.user = action.payload;
                setCookie("user", JSON.stringify(action.payload));
            })

            // Forgot password
            .addCase(forgotPassword.pending, (state) => {
                state.forgotPasswordLoading = true;
                state.forgotPasswordError = null;
                state.forgotPasswordSuccess = false;
            })
            .addCase(forgotPassword.fulfilled, (state) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordSuccess = true;
                state.forgotPasswordError = null;
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordError = action.payload || { message: "Failed to send reset email", status: "500" };
                state.forgotPasswordSuccess = false;
            })

            // Reset password
            .addCase(resetPassword.pending, (state) => {
                state.resetPasswordLoading = true;
                state.resetPasswordError = null;
                state.resetPasswordSuccess = false;
            })
            .addCase(resetPassword.fulfilled, (state) => {
                state.resetPasswordLoading = false;
                state.resetPasswordSuccess = true;
                state.resetPasswordError = null;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.resetPasswordLoading = false;
                state.resetPasswordError = action.payload || { message: "Failed to reset password", status: "500" };
                state.resetPasswordSuccess = false;
            })

            // Change password
            .addCase(changePassword.pending, (state) => {
                state.changePasswordLoading = true;
                state.changePasswordError = null;
                state.changePasswordSuccess = false;
            })
            .addCase(changePassword.fulfilled, (state) => {
                state.changePasswordLoading = false;
                state.changePasswordSuccess = true;
                state.changePasswordError = null;
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.changePasswordLoading = false;
                state.changePasswordError = action.payload || { message: "Failed to change password", status: "500" };
                state.changePasswordSuccess = false;
            })

            .addMatcher(
                (action) => action.type.endsWith("/pending"),
                (state, action) => {
                    // Only set loading for non-specific actions if needed, 
                    // but here we want to avoid overwriting specific loading states
                    // so we might want to check which action it is. 
                    // For now, only general auth actions set global loading.
                    if (action.type.startsWith("auth/") &&
                        !action.type.includes("forgotPassword") &&
                        !action.type.includes("resetPassword") &&
                        !action.type.includes("changePassword")) {
                        state.loading = true;
                        state.error = null;
                    }
                }
            )
            // Xử lý chung cho tất cả rejected action
            .addMatcher(
                (action) => action.type.endsWith("/rejected"),
                (state, action: PayloadAction<ErrorResponse>) => {
                    // Similar logic to pending
                    if (action.type.startsWith("auth/") &&
                        !action.type.includes("forgotPassword") &&
                        !action.type.includes("resetPassword") &&
                        !action.type.includes("changePassword")) {
                        state.loading = false;
                        state.error = action.payload || { message: "Unknown error" };
                    }
                }
            );
    },
});

export const {
    clearAuth,
    updateUser,
    refreshAvatar,
    syncFromLocalStorage,
    clearUserError,
    clearSuccessStates
} = authSlice.actions;
export default authSlice.reducer;
