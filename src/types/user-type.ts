export interface UserProfile {
    id: string
    fullName: string
    email: string
    phone?: string
    avatarUrl?: string
    role: string
    isVerified: boolean
}

export interface UpdateProfileData {
    fullName?: string
    email?: string
    phone?: string
    avatarUrl?: string
}

export interface User {
    _id: string
    fullName: string
    email: string
    phone?: string
    avatarUrl?: string
    role: string
    isVerified: boolean
    status: string
    isActive: boolean
    googleId?: string
    favouriteFields?: string[]
    favouriteCoaches?: string[]
    createdAt: string
    updatedAt: string
}

// Payload types for API calls
export interface UpdateProfilePayload {
    fullName?: string
    email?: string
    phone?: string
    avatar?: File
}

export interface ForgotPasswordPayload {
    email: string
}

export interface ResetPasswordPayload {
    email: string
    resetPasswordToken: string
    newPassword: string
    confirmPassword: string
}

export interface ChangePasswordPayload {
    oldPassword: string
    newPassword: string
    confirmPassword: string
}

export interface ErrorResponse {
    message: string
    status: string
}