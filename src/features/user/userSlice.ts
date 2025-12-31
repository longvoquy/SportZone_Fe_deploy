import { createSlice } from "@reduxjs/toolkit";
import {
    getUserProfile,
    updateUserProfile,
    removeBookmarkCoaches,
    setBookmarkFields,
    removeBookmarkFields,
    getBookmarkFields,
    getBookmarkCoaches,
    forgotPassword,
} from "./userThunk";
import type { User, ErrorResponse } from "../../types/user-type";
import logger from "../../utils/logger";

interface UserState {
    user: User | null;
    loading: boolean;
    error: ErrorResponse | null;
    bookmarkFields?: import('../../types/bookmark-field').BookmarkField[] | null;
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
}

const initialState: UserState = {
    user: null,
    loading: false,
    error: null,
    bookmarkFields: null,
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
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        clearUser: (state) => {
            state.user = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Get User Profile
        builder
            .addCase(getUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.error = null;
            })
            .addCase(getUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || { message: "Failed to get profile", status: "500" };
            });

        // Update User Profile
        builder
            .addCase(updateUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.error = null;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || { message: "Failed to update profile", status: "500" };
            });

        // Get bookmark fields
        builder
            .addCase(getBookmarkFields.pending, () => {
                // no-op or set a loading flag if desired
            })
            .addCase(getBookmarkFields.fulfilled, (state, action) => {
                state.bookmarkFields = action.payload;
            })
            .addCase(getBookmarkFields.rejected, (_state, action) => {
                logger.error('getBookmarkFields failed', action.payload);
            });

        // Get bookmark coaches
        builder
            .addCase(getBookmarkCoaches.pending, () => {
                // no-op or set loading
            })
            .addCase(getBookmarkCoaches.fulfilled, (state, action) => {
                // store under a new key on state.user to avoid changing existing shape
                // We don't have bookmarkCoaches on UserState root, maybe on User? 
                // But previously it cast state as any. 
                // Let's keep the logic but clean up syntax.
                (state as any).bookmarkCoaches = action.payload;
            })
            .addCase(getBookmarkCoaches.rejected, (_state, action) => {
                logger.error('getBookmarkCoaches failed', action.payload);
            });

        // Forgot password
        builder
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
            });

        // Remove Bookmark Coaches
        builder.addCase(removeBookmarkCoaches.fulfilled, (state, action) => {
            state.user = action.payload;
        });

        // Set Bookmark Fields
        builder.addCase(setBookmarkFields.fulfilled, (state, action) => {
            state.user = action.payload;
        });

        // Remove Bookmark Fields
        builder.addCase(removeBookmarkFields.fulfilled, (state, action) => {
            state.user = action.payload;
        });
    },
});

export const { clearUser } = userSlice.actions;

export default userSlice.reducer;
