"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertCircle, ImageIcon, X, Clock, Copy, Upload } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hook";
import { useNavigate } from "react-router-dom";
import { CustomSuccessToast, CustomFailedToast } from "@/components/toast/notificiation-toast";
import logger from "@/utils/logger";

interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    fieldId?: string;
    note?: string;
}

interface PaymentV2CoachProps {
    coachId: string;
    bookingData: BookingFormData;
    onBack?: () => void;
}

// Helper function for formatting VND
const formatVND = (value: number): string => {
    try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    } catch {
        return `${value.toLocaleString('vi-VN')} ₫`;
    }
};

/**
 * PaymentV2Coach component - Bank transfer with proof image upload for coach booking
 */
export const PaymentV2Coach: React.FC<PaymentV2CoachProps> = ({
    coachId,
    bookingData,
    onBack,
}) => {
    const navigate = useNavigate();
    const { currentCoach } = useAppSelector((state) => state.coach);

    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [verificationResult, setVerificationResult] = useState<{
        status: string;
        reason?: string;
        isAiVerified: boolean;
    } | null>(null);

    // Held booking state (restored from localStorage if page is refreshed)
    const [heldBookingId, setHeldBookingId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(300); // 5 minutes in seconds
    const [holdError, setHoldError] = useState<string | null>(null);
    const [bankAccount, setBankAccount] = useState<any>(null);
    const [loadingBankAccount, setLoadingBankAccount] = useState<boolean>(false);
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Fetch bank account info when component mounts
    useEffect(() => {
        if (coachId) {
            fetchBankAccount(coachId);
        }
    }, [coachId]);

    // Restore held booking from localStorage on mount (created in PersonalInfo step)
    useEffect(() => {
        try {
            const storedBookingId = localStorage.getItem('heldBookingId');
            const storedHoldTime = localStorage.getItem('heldBookingTime');

            logger.debug('[PAYMENT V2 COACH] Checking localStorage for held booking:', {
                storedBookingId,
                storedHoldTime
            });

            // Validate stored booking ID
            if (!storedBookingId || storedBookingId.trim() === '' || storedBookingId === 'undefined' || storedBookingId === 'null') {
                logger.warn('[PAYMENT V2 COACH] Invalid or missing heldBookingId in localStorage:', storedBookingId);
                setHoldError('Chưa có booking được giữ chỗ. Vui lòng quay lại bước trước.');
                return;
            }

            if (storedHoldTime) {
                const holdTime = parseInt(storedHoldTime);
                if (isNaN(holdTime)) {
                    logger.error('[PAYMENT V2 COACH] Invalid hold time:', storedHoldTime);
                    setHoldError('Dữ liệu booking không hợp lệ. Vui lòng quay lại bước trước.');
                    return;
                }

                const now = Date.now();
                const elapsed = Math.floor((now - holdTime) / 1000);
                const remaining = 300 - elapsed; // 5 minutes = 300 seconds

                if (remaining > 0) {
                    setHeldBookingId(storedBookingId);
                    setCountdown(remaining);
                    logger.debug('[PAYMENT V2 COACH] Restored held booking:', {
                        heldBookingId: storedBookingId,
                        remainingSeconds: remaining
                    });
                } else {
                    // Booking expired, clear localStorage
                    logger.warn('[PAYMENT V2 COACH] Held booking expired');
                    localStorage.removeItem('heldBookingId');
                    localStorage.removeItem('heldBookingCountdown');
                    localStorage.removeItem('heldBookingTime');
                    setHoldError('Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.');
                }
            } else {
                logger.warn('[PAYMENT V2 COACH] No hold time found in localStorage');
                setHoldError('Chưa có booking được giữ chỗ. Vui lòng quay lại bước trước.');
            }
        } catch (error) {
            logger.error('[PAYMENT V2 COACH] Error restoring held booking:', error);
            setHoldError('Lỗi khi khôi phục thông tin booking. Vui lòng quay lại bước trước.');
        }
    }, []);

    // Handle countdown expired - release slot and reset
    const handleCountdownExpired = useCallback(async () => {
        if (!heldBookingId) return;

        try {
            // Call public API to cancel booking hold (no auth required)
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/cancel-hold`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    cancellationReason: 'Thời gian giữ chỗ đã hết (5 phút)'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                logger.error('[PaymentV2Coach] Error cancelling booking on countdown expiry:', errorData);
            } else {
                logger.debug('[PaymentV2Coach] Booking hold cancelled successfully');
            }
        } catch (error) {
            // Log error but continue with cleanup
            logger.error('[PaymentV2Coach] Error cancelling booking on countdown expiry:', error);
        }

        // Clear all localStorage (always run, even if API call fails)
        localStorage.removeItem('heldBookingId');
        localStorage.removeItem('heldBookingCountdown');
        localStorage.removeItem('heldBookingTime');

        // Reset state
        setHeldBookingId(null);
        setCountdown(0);
        setHoldError('Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.');
    }, [heldBookingId]);

    // Countdown timer effect
    useEffect(() => {
        if (!heldBookingId || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                const newCountdown = prev - 1;
                if (newCountdown <= 0) {
                    clearInterval(timer);
                    // Booking expired - release slot and reset
                    handleCountdownExpired();
                    return 0;
                }
                // Update localStorage
                localStorage.setItem('heldBookingCountdown', newCountdown.toString());
                return newCountdown;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [heldBookingId, countdown, handleCountdownExpired]);

    // Format countdown timer (MM:SS)
    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const fetchBankAccount = async (coachId: string) => {
        setLoadingBankAccount(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/coaches/${coachId}/bank-account`);
            if (response.ok) {
                const result = await response.json();
                const bankAccountData = result?.data || result;
                setBankAccount(bankAccountData);
            } else {
                logger.error('Failed to fetch bank account:', response.status, response.statusText);
                setBankAccount(null);
            }
        } catch (error) {
            logger.error('Error fetching bank account:', error);
            setBankAccount(null);
        } finally {
            setLoadingBankAccount(false);
        }
    };

    // Calculate pricing
    const calculateHours = useCallback((): number => {
        if (!bookingData.startTime || !bookingData.endTime) return 0;
        const start = new Date(`1970-01-01T${bookingData.startTime}:00`);
        const end = new Date(`1970-01-01T${bookingData.endTime}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return hours > 0 ? hours : 0;
    }, [bookingData.startTime, bookingData.endTime]);

    const calculateBookingAmount = useCallback((): number => {
        if (!currentCoach?.price) return 0;
        const hours = calculateHours();
        return Math.round(currentCoach.price * hours);
    }, [currentCoach?.price, calculateHours]);

    const calculatePlatformFee = useCallback((): number => {
        const bookingAmount = calculateBookingAmount();
        return Math.round(bookingAmount * 0.05); // 5% platform fee
    }, [calculateBookingAmount]);

    const calculateTotal = useCallback((): number => {
        const bookingAmount = calculateBookingAmount();
        const platformFee = calculatePlatformFee();
        return bookingAmount + platformFee;
    }, [calculateBookingAmount, calculatePlatformFee]);

    const isBookingDataValid = useMemo(() => {
        return Boolean(
            coachId &&
            bookingData.date &&
            bookingData.startTime &&
            bookingData.endTime &&
            // fieldId is optional for coach bookings
            calculateHours() > 0 &&
            calculateTotal() > 0
        );
    }, [coachId, bookingData, calculateHours, calculateTotal]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setPaymentError('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setPaymentError('File không được vượt quá 5MB');
            return;
        }

        setProofImage(file);
        setPaymentError(null);

        // Create preview
        const preview = URL.createObjectURL(file);
        setProofPreview(preview);
    };

    const handleRemoveImage = () => {
        if (proofPreview) {
            URL.revokeObjectURL(proofPreview);
        }
        setProofImage(null);
        setProofPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            CustomSuccessToast('Đã sao chép vào clipboard');
        }).catch(() => {
            CustomFailedToast('Không thể sao chép');
        });
    };

    // Handle payment submission (submit proof for held booking)
    const handlePayment = async () => {
        if (!proofImage) {
            setPaymentError('Vui lòng upload ảnh chứng minh thanh toán');
            return;
        }

        // Booking should already be held from PersonalInfo step
        if (!heldBookingId) {
            setPaymentError('Chưa có booking được giữ chỗ. Vui lòng quay lại bước trước.');
            return;
        }

        // Additional validation: ensure heldBookingId is a valid string
        if (typeof heldBookingId !== 'string' || heldBookingId.trim() === '' || heldBookingId === 'undefined') {
            logger.error('[PaymentV2Coach] Invalid heldBookingId:', heldBookingId);
            setPaymentError('ID booking không hợp lệ. Vui lòng quay lại bước trước.');
            return;
        }

        // Countdown chỉ là thông báo, không block submit
        // User có thể submit payment proof ngay khi có heldBookingId
        if (countdown <= 0) {
            // Chỉ warning, không block - vẫn cho phép submit
            logger.warn('Countdown đã hết, nhưng vẫn cho phép submit payment proof');
        }

        setPaymentStatus('processing');
        setPaymentError(null);

        try {
            logger.debug('[PaymentV2Coach] Submitting payment proof for booking:', heldBookingId);

            // Create FormData with payment proof
            const formDataToSend = new FormData();
            formDataToSend.append('paymentProof', proofImage);

            // Optional auth token
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Submit payment proof for existing booking
            const url = `${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/submit-payment-proof`;
            logger.debug('[PaymentV2Coach] Submitting to URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formDataToSend,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                logger.error('[PaymentV2Coach] Server error:', errorData);
                throw new Error(errorData.message || 'Không thể gửi ảnh chứng minh. Vui lòng thử lại.');
            }

            const responseData = await response.json();
            const booking = responseData.data || responseData;
            logger.debug('[PaymentV2Coach] Payment proof submitted successfully:', booking);

            // Check for AI verification result
            const isConfirmed = booking.status === 'confirmed';
            const transaction = booking.transaction;
            const isRejected = transaction?.paymentProofStatus === 'rejected';

            if (isConfirmed) {
                setVerificationResult({
                    status: 'confirmed',
                    isAiVerified: true
                });
                CustomSuccessToast('Thanh toán thành công! AI đã xác nhận biên lai của bạn.');
            } else if (isRejected) {
                setVerificationResult({
                    status: 'rejected',
                    reason: transaction?.paymentProofRejectionReason,
                    isAiVerified: true
                });
                CustomFailedToast('AI từ chối biên lai: ' + transaction?.paymentProofRejectionReason);
            } else {
                setVerificationResult({
                    status: 'pending',
                    isAiVerified: false
                });
                CustomSuccessToast('Đã gửi yêu cầu đặt coach! Đang chờ coach xác nhận thanh toán.');
            }

            setPaymentStatus('success');

            // Clear localStorage
            localStorage.removeItem('heldBookingId');
            localStorage.removeItem('heldBookingCountdown');
            localStorage.removeItem('heldBookingTime');

            // Clean up preview URL
            if (proofPreview) {
                URL.revokeObjectURL(proofPreview);
            }

            // Only navigate if NOT rejected
            if (!isRejected) {
                setTimeout(() => {
                    navigate(`/bookings/${booking._id || booking.id}`);
                }, 2000);
            } else {
                logger.debug('[PaymentV2Coach] AI verification rejected. Staying on page for retry.');
            }
        } catch (error: any) {
            logger.error('[PaymentV2Coach] Error submitting payment proof:', error);
            const errorMessage = error?.message || 'Không thể gửi ảnh chứng minh. Vui lòng thử lại.';
            setPaymentError(errorMessage);
            setPaymentStatus('error');
            CustomFailedToast(errorMessage);
        }
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeString: string): string => {
        if (!timeString) return '';
        return timeString;
    };

    if (!isBookingDataValid) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <p className="text-base text-[#6b7280]">Dữ liệu booking không hợp lệ. Vui lòng quay lại và chọn lại.</p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onBack}>Quay lại</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const bookingAmount = calculateBookingAmount();
    const platformFee = calculatePlatformFee();
    const total = calculateTotal();
    const hours = calculateHours();

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
            <Card className="border border-gray-200">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <CardTitle className="text-2xl">Bước 2: Thanh toán chuyển khoản</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Booking Hold Status */}
                    {heldBookingId && countdown > 0 && (
                        <div className={`p-4 border rounded-lg flex items-center justify-between ${countdown < 120
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-green-50 border-green-200 text-green-800'
                            }`}>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                <span>Chỗ đã được giữ. Vui lòng upload ảnh chứng minh trong thời gian còn lại.</span>
                            </div>
                            <div className={`font-bold text-lg ${countdown < 120 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                {formatCountdown(countdown)}
                            </div>
                        </div>
                    )}
                    {holdError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                <span>{holdError}</span>
                            </div>
                        </div>
                    )}
                    {countdown <= 0 && heldBookingId && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                            <AlertCircle className="w-5 h-5 inline mr-2" />
                            Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.
                        </div>
                    )}

                    {/* Booking Summary */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <h3 className="font-semibold text-lg">Thông tin đặt lịch</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Ngày:</span>
                                <span className="ml-2 font-medium">{formatDate(bookingData.date)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Giờ:</span>
                                <span className="ml-2 font-medium">{formatTime(bookingData.startTime)} - {formatTime(bookingData.endTime)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Thời lượng:</span>
                                <span className="ml-2 font-medium">{hours} giờ</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Coach:</span>
                                <span className="ml-2 font-medium">{currentCoach?.name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bank Account Info */}
                    {loadingBankAccount ? (
                        <div className="text-center py-8">
                            <Loading size={32} className="mx-auto mb-2 text-green-600" />
                            <p className="text-muted-foreground">Đang tải thông tin tài khoản...</p>
                        </div>
                    ) : bankAccount ? (
                        <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200 space-y-4">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-green-900 mb-2">Thông tin chuyển khoản</h3>
                                <p className="text-sm text-green-700">Vui lòng chuyển khoản đúng số tiền và upload biên lai</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Bank Account Details */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-white rounded-lg border border-green-300">
                                        <Label className="text-sm font-semibold text-green-900 mb-2 block">Số tài khoản</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={bankAccount.accountNumber}
                                                readOnly
                                                className="font-mono text-lg font-bold"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(bankAccount.accountNumber)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border border-green-300">
                                        <Label className="text-sm font-semibold text-green-900 mb-2 block">Tên chủ tài khoản</Label>
                                        <p className="font-semibold text-lg">{bankAccount.accountName}</p>
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border border-green-300">
                                        <Label className="text-sm font-semibold text-green-900 mb-2 block">Ngân hàng</Label>
                                        <p className="font-semibold">{bankAccount.bankName}</p>
                                        {bankAccount.branch && (
                                            <p className="text-sm text-muted-foreground">Chi nhánh: {bankAccount.branch}</p>
                                        )}
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border-2 border-green-500">
                                        <Label className="text-sm font-semibold text-green-900 mb-2 block">Số tiền cần chuyển</Label>
                                        <p className="text-3xl font-bold text-green-600">{formatVND(total)}</p>
                                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                            <p>Giá coach: {formatVND(bookingAmount)} ({hours}h × {formatVND(currentCoach?.price || 0)}/h)</p>
                                            <p>Phí nền tảng (5%): {formatVND(platformFee)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code */}
                                {bankAccount.qrCodeUrl && (
                                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-green-300">
                                        <Label className="text-sm font-semibold text-green-900 mb-2">Quét QR để chuyển khoản</Label>
                                        <div className="p-4 bg-white rounded-lg border-2 border-green-500">
                                            <img
                                                src={bankAccount.qrCodeUrl}
                                                alt="QR Code"
                                                className="w-48 h-48 object-contain"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản nhanh
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertCircle className="h-5 w-5" />
                                <p className="font-semibold">Không thể tải thông tin tài khoản</p>
                            </div>
                            <p className="text-sm text-red-700 mt-2">
                                Vui lòng liên hệ với coach hoặc thử lại sau.
                            </p>
                        </div>
                    )}

                    {/* Upload Payment Proof */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold mb-2 block">
                                Upload ảnh chứng minh thanh toán
                            </Label>
                            <p className="text-sm text-muted-foreground mb-4">
                                Vui lòng chụp ảnh biên lai chuyển khoản và upload tại đây
                            </p>

                            {!proofImage ? (
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                        Click để chọn ảnh hoặc kéo thả vào đây
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        JPG, PNG, WEBP (tối đa 5MB)
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="relative border-2 border-green-500 rounded-lg p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                                            {proofPreview ? (
                                                <img
                                                    src={proofPreview}
                                                    alt="Payment proof preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm mb-1">{proofImage.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(proofImage.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRemoveImage}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {paymentError && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertCircle className="h-5 w-5" />
                                <p className="font-medium">{paymentError}</p>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {paymentStatus === 'success' && (
                        <div className={`p-6 rounded-lg border space-y-4 ${verificationResult?.status === 'confirmed'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : verificationResult?.status === 'rejected'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}>
                            <div className="flex items-center gap-3">
                                {verificationResult?.status === 'confirmed' ? (
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                ) : verificationResult?.status === 'rejected' ? (
                                    <AlertCircle className="h-8 w-8 text-red-600" />
                                ) : (
                                    <Clock className="h-8 w-8 text-amber-600" />
                                )}
                                <div>
                                    <h3 className="text-xl font-bold">
                                        {verificationResult?.status === 'confirmed'
                                            ? 'Thanh toán thành công!'
                                            : verificationResult?.status === 'rejected'
                                                ? 'Biên lai bị từ chối'
                                                : 'Đã gửi yêu cầu'}
                                    </h3>
                                    <p className="text-sm">
                                        {verificationResult?.status === 'confirmed'
                                            ? 'AI đã xác nhận thanh toán. Lịch hẹn của bạn đã được xác nhận.'
                                            : verificationResult?.status === 'rejected'
                                                ? `AI không thể xác nhận: ${verificationResult.reason}`
                                                : 'Đơn đặt đang chờ coach xác minh thanh toán thủ công.'}
                                    </p>
                                </div>
                            </div>

                            {verificationResult?.status !== 'confirmed' && (
                                <div className="space-y-2">
                                    {verificationResult?.status === 'pending' && (
                                        <p className="text-xs text-amber-700 italic">
                                            Lưu ý: Bạn có thể thay đổi ảnh minh chứng nếu phát hiện sai sót.
                                        </p>
                                    )}
                                    <Button
                                        variant="outline"
                                        className={`w-full ${verificationResult?.status === 'rejected'
                                            ? 'border-red-300 text-red-800 hover:bg-red-100'
                                            : 'border-amber-300 text-amber-800 hover:bg-amber-100'
                                            }`}
                                        onClick={() => setPaymentStatus('idle')}
                                    >
                                        {verificationResult?.status === 'rejected' ? 'Thử lại với ảnh khác' : 'Thay thế ảnh minh chứng'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={onBack}
                            className="flex-1"
                            disabled={paymentStatus === 'processing'}
                        >
                            Quay lại
                        </Button>
                        <Button
                            onClick={handlePayment}
                            disabled={
                                !proofImage ||
                                paymentStatus === 'processing'
                            }
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                            {paymentStatus === 'processing' ? (
                                <>
                                    <Loading size={16} className="mr-2" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Hoàn tất đặt lịch
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

