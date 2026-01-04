import { useEffect, useState } from "react";
import logger from "@/utils/logger";
import PageHeader from "@/components/header-banner/page-header";
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component";
import { BookingFieldTabs } from "../field-booking-page/component/booking-field-tabs"; // Reuse component
import { BookingStep } from "@/components/enums/ENUMS";
import { BookCourtAiTabExport } from "./fieldTabs/bookCourtAi";
import { AmenitiesMultiple } from "./fieldTabs/AmenitiesMultiple";
import { PersonalInfoAi } from "./fieldTabs/PersonalInfoAi";
import type { BookingFormData } from "../field-booking-page/fieldTabs/personalInfo";
import { ConfirmMultiple } from "./fieldTabs/ConfirmMultiple";
import { PaymentMultiple } from "./fieldTabs/PaymentMultiple";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { getFieldById } from "@/features/field/fieldThunk";
import { LoginBenefitsBanner } from "@/components/auth/login-benefits-banner";
import { PageWrapper } from "@/components/layouts/page-wrapper";
import { useAuth } from "@/routes/auth-wrapper";
import axiosPublic from "@/utils/axios/axiosPublic";
import { FIELD_COURTS_API } from "@/features/field/fieldAPI";

const FieldBookingAiPage = () => {
    const breadcrumbs = [{ label: "Trang chủ", href: "/" }, { label: "Đặt sân thông minh (AI)" }];
    const location = useLocation();
    const dispatch = useAppDispatch();
    const currentField = useAppSelector((state) => state.field.currentField);
    const authUser = useAppSelector((state) => state.auth.user);
    const { isAuthenticated } = useAuth();

    // State để quản lý step hiện tại và booking data
    // Restore step from sessionStorage if available (for page refresh with held booking)
    const [currentStep, setCurrentStep] = useState<BookingStep>(() => {
        try {
            const savedStep = sessionStorage.getItem('bookingAiCurrentStep');
            if (savedStep) {
                const stepNum = parseInt(savedStep, 10);
                if (!isNaN(stepNum) && (Object.values(BookingStep) as number[]).includes(stepNum)) {
                    return stepNum as BookingStep;
                }
            }
        } catch (error) {
            logger.warn('Failed to restore step from sessionStorage', error);
        }
        return BookingStep.BOOK_COURT;
    });
    const [bookingData, setBookingData] = useState<BookingFormData>({
        date: '',
        startTime: '',
        endTime: '',
        courtId: '',
        courtName: '',
        name: '',
        email: '',
        phone: '',
    });
    const [courts, setCourts] = useState<Array<{ id: string; name: string; courtNumber?: number }>>([]);
    const [courtsError, setCourtsError] = useState<string | null>(null);

    // State để quản lý banner khuyến khích đăng nhập
    const [showBenefitsBanner, setShowBenefitsBanner] = useState(true);

    // Amenities selection data
    const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);

    // AI Booking payload (validated but not yet created)
    const [aiBookingPayload, setAiBookingPayload] = useState<any>(null);
    const [aiBookingType, setAiBookingType] = useState<'consecutive' | 'weekly' | null>(null);

    // Restore selected field on refresh: from URL ?fieldId= or sessionStorage
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const urlFieldId = searchParams.get('fieldId');
        const stateFieldId = (location.state as any)?.fieldId;
        const storedFieldId = sessionStorage.getItem('selectedAiFieldId');
        const fieldId = urlFieldId || stateFieldId || storedFieldId;

        if (!currentField && fieldId) {
            dispatch(getFieldById(fieldId));
        }
    }, [location.search, location.state, currentField, dispatch]);

    // Persist currently selected field id for refresh
    useEffect(() => {
        if (currentField?.id) {
            try { sessionStorage.setItem('selectedAiFieldId', currentField.id); } catch {
                // Ignore sessionStorage errors (e.g., in private browsing mode)
                logger.warn('Failed to save field ID to sessionStorage');
            }
        }
    }, [currentField?.id, currentField?.name]);

    // Restore booking data from sessionStorage on mount (if user just logged in)
    useEffect(() => {
        if (authUser) {
            try {
                // Restore basic form data
                const raw = sessionStorage.getItem('bookingAiFormData');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                        setBookingData(prev => ({
                            ...prev,
                            date: parsed.date ?? prev.date,
                            startTime: parsed.startTime ?? prev.startTime,
                            endTime: parsed.endTime ?? prev.endTime,
                            courtId: parsed.courtId ?? prev.courtId,
                            courtName: parsed.courtName ?? prev.courtName,
                            name: parsed.name ?? prev.name,
                            email: parsed.email ?? prev.email,
                            phone: parsed.phone ?? prev.phone,
                        }));

                        // If we have complete booking data, move to amenities step
                        if (parsed.date && parsed.startTime && parsed.endTime) {
                            // Only set step if not already restored to payment
                            if (currentStep === BookingStep.BOOK_COURT) {
                                setCurrentStep(BookingStep.AMENITIES);
                            }
                        }
                    }
                }

                // Restore AI Booking Payload
                const rawPayload = sessionStorage.getItem('aiBookingPayload');
                const rawType = sessionStorage.getItem('aiBookingType');
                if (rawPayload) {
                    setAiBookingPayload(JSON.parse(rawPayload));
                }
                if (rawType === 'consecutive' || rawType === 'weekly') {
                    setAiBookingType(rawType);
                }

            } catch (error) {
                logger.warn('Failed to restore booking data from sessionStorage', error);
            }
        }
    }, [authUser]);

    // Ẩn banner khi user đăng nhập
    useEffect(() => {
        if (isAuthenticated) {
            setShowBenefitsBanner(false);
        }
    }, [isAuthenticated]);

    // Fetch courts for the field
    useEffect(() => {
        const fetchCourts = async () => {
            if (!currentField?.id) return;
            try {
                setCourtsError(null);
                const response = await axiosPublic.get(FIELD_COURTS_API(currentField.id));
                const raw = response.data?.data || response.data || [];
                const mapped = Array.isArray(raw)
                    ? raw.map((c: any) => ({
                        id: c?._id || c?.id || '',
                        name: c?.name || c?.courtName || `Court ${c?.courtNumber ?? ''}`,
                        courtNumber: c?.courtNumber,
                    }))
                    : [];
                setCourts(mapped);
                // Auto-pick first court if none selected
                if (!bookingData.courtId && mapped.length > 0) {
                    setBookingData(prev => ({
                        ...prev,
                        courtId: mapped[0].id,
                        courtName: mapped[0].name,
                    }));
                }
            } catch (error: any) {
                logger.error('Failed to fetch courts', error);
                setCourtsError('Không thể tải danh sách sân con. Vui lòng thử lại.');
            }
        };
        fetchCourts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentField?.id]);

    const handleBookCourtSubmit = (payload: any) => {
        // Store the validated booking payload (not created yet)
        setAiBookingPayload(payload);

        // Store booking type if available in payload
        if (payload.type) {
            setAiBookingType(payload.type);
        }

        // Also update basic booking data for display in subsequent steps
        setBookingData(prev => ({
            ...prev,
            date: payload.startDate || payload.date || prev.date,
            startTime: payload.startTime || prev.startTime,
            endTime: payload.endTime || prev.endTime,
            courtId: payload.courtId || prev.courtId,
        }));
        // Move to amenities selection
        setCurrentStep(BookingStep.AMENITIES);
        // Persist session
        try {
            sessionStorage.setItem('bookingAiFormData', JSON.stringify(payload));
            sessionStorage.setItem('aiBookingPayload', JSON.stringify(payload));
            if (payload.type) {
                sessionStorage.setItem('aiBookingType', payload.type);
            }
        } catch { }
    };

    // Amenities navigation
    const handleAmenitiesBack = () => {
        setCurrentStep(BookingStep.BOOK_COURT);
    };

    const handleAmenitiesSubmit = (ids: string[]) => {
        setSelectedAmenityIds(ids);
        setCurrentStep(BookingStep.ORDER_CONFIRMATION);
    };

    const handlePersonalInfoSubmit = (formData: BookingFormData) => {
        setBookingData(formData);
        setCurrentStep(BookingStep.PAYMENT);
        // Persist step for page refresh
        try {
            sessionStorage.setItem('bookingAiCurrentStep', String(BookingStep.PAYMENT));
        } catch (error) {
            logger.warn('Failed to save step to sessionStorage', error);
        }
    };

    const handleBackToConfirm = () => {
        // From Payment -> back to Personal Info
        setCurrentStep(BookingStep.PERSONAL_INFO);
    };

    // From Personal Info -> back to Confirm
    const handleBackToConfirmStep = () => {
        setCurrentStep(BookingStep.ORDER_CONFIRMATION);
    };

    const handlePaymentComplete = () => {
        // Booking and payment completed successfully
    };

    return (
        <>
            <NavbarDarkComponent />
            <PageWrapper>
                <PageHeader title="Đặt sân thông minh (AI)" breadcrumbs={breadcrumbs} />

                {/* Banner khuyến khích đăng nhập - chỉ hiển thị khi chưa đăng nhập */}
                {!isAuthenticated && showBenefitsBanner && (
                    <div className="w-full max-w-[1320px] mx-auto px-3 mt-4">
                        <LoginBenefitsBanner
                            onClose={() => setShowBenefitsBanner(false)}
                            showCloseButton={true}
                        />
                    </div>
                )}

                <BookingFieldTabs
                    currentStep={currentStep}
                />

                {currentStep === BookingStep.BOOK_COURT && (
                    <BookCourtAiTabExport
                        onSubmit={handleBookCourtSubmit}
                        courts={courts}
                        courtsError={courtsError}
                        venue={currentField || undefined}
                    />
                )}

                {/* Conditional rendering based on current step */}
                {currentStep === BookingStep.AMENITIES && (
                    <AmenitiesMultiple
                        venue={currentField || undefined}
                        selectedAmenityIds={selectedAmenityIds}
                        onChangeSelected={setSelectedAmenityIds}
                        onBack={handleAmenitiesBack}
                        onSubmit={handleAmenitiesSubmit}
                        numberOfDays={aiBookingPayload?.summary?.totalDates || aiBookingPayload?.summary?.datesBooked || aiBookingPayload?.totalDays || 1}
                        bookingType={aiBookingType || 'consecutive'}
                    />
                )}

                {currentStep === BookingStep.PERSONAL_INFO && aiBookingPayload && aiBookingType && (
                    <PersonalInfoAi
                        bookingData={bookingData}
                        onSubmit={handlePersonalInfoSubmit}
                        onBack={handleBackToConfirmStep}
                        courts={courts}
                        aiBookingPayload={aiBookingPayload}
                        aiBookingType={aiBookingType}
                    />
                )}

                {currentStep === BookingStep.ORDER_CONFIRMATION && (
                    <ConfirmMultiple
                        bookingData={bookingData}
                        selectedAmenityIds={selectedAmenityIds}
                        amenities={(currentField as any)?.amenities?.map((a: any) => ({
                            id: a?.amenityId,
                            name: a?.name,
                            price: Number(a?.price) || 0,
                        })) || []}
                        onSubmit={(data) => { setBookingData(data); setCurrentStep(BookingStep.PERSONAL_INFO); }}
                        onBack={() => { setCurrentStep(BookingStep.AMENITIES); }}
                        courts={courts}
                        numberOfDays={aiBookingPayload?.summary?.totalDates || aiBookingPayload?.summary?.datesBooked || aiBookingPayload?.totalDays || 1}
                        bookingType={aiBookingType || 'consecutive'}
                        aiBookingPayload={aiBookingPayload}
                    />
                )}

                {currentStep === BookingStep.PAYMENT && aiBookingType && (
                    <PaymentMultiple
                        bookingData={bookingData}
                        aiBookingType={aiBookingType}
                        onPaymentComplete={handlePaymentComplete}
                        onBack={handleBackToConfirm}
                        onRestart={() => {
                            // Reset to step 1
                            setCurrentStep(BookingStep.BOOK_COURT);
                            setBookingData({
                                date: '',
                                startTime: '',
                                endTime: '',
                                courtId: '',
                                courtName: '',
                                name: '',
                                email: '',
                                phone: '',
                            });
                            setSelectedAmenityIds([]);
                            setAiBookingPayload(null);
                            setAiBookingType(null);
                            // Clear persisted step
                            try {
                                sessionStorage.removeItem('bookingAiCurrentStep');
                                sessionStorage.removeItem('aiBookingPayload');
                                sessionStorage.removeItem('aiBookingType');
                            } catch (error) {
                                logger.warn('Failed to clear step from sessionStorage', error);
                            }
                        }}
                    />
                )}

            </PageWrapper>
        </>
    )
}

export default FieldBookingAiPage;
