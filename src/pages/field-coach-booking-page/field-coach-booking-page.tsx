import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component";
import PageHeader from "@/components/header-banner/page-header";
import { PageWrapper } from "@/components/layouts/page-wrapper";
import { CombinedBookingStep } from "@/components/enums/ENUMS";
import { FieldCoachBookingStepper } from "./field-coach-booking-stepper";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { getFieldById } from "@/features/field/fieldThunk";
import { createCombinedBooking } from "@/features/booking/bookingThunk";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { useAuth } from "@/routes/auth-wrapper";

// Import field booking components
import { BookCourtTab } from "../field-booking-page/fieldTabs/bookCourt";
import { AmenitiesTab } from "../field-booking-page/fieldTabs/amenities";
import { ConfirmCourtTab } from "../field-booking-page/fieldTabs/confirmCourt";
import { PersonalInfoTab } from "../field-booking-page/fieldTabs/personalInfo";
import type { BookingFormData } from "../field-booking-page/fieldTabs/personalInfo";

// Import new combined components
import { FieldListSelection } from "./components/field-list-selection";
import { CoachListSelection } from "./components/coach-list-selection";
import { CombinedConfirmation } from "./components/combined-confirmation";

import axiosPublic from "@/utils/axios/axiosPublic";
import { FIELD_COURTS_API } from "@/features/field/fieldAPI";
import logger from "@/utils/logger";

interface CombinedBookingData {
    field: {
        fieldId: string;
        fieldName: string;
        fieldLocation: string;
        date: string;
        startTime: string;
        endTime: string;
        courtId: string;
        courtName: string;
        courtPrice: number;
        amenityIds: string[];
    };
    coach: {
        coachId: string;
        coachName: string;
        coachPrice: number;
        date: string;
        startTime: string;
        endTime: string;
        note?: string;
    };
    user: {
        name: string;
        email: string;
        phone: string;
    };
}

const FieldCoachBookingPage = () => {
    const breadcrumbs = [
        { label: "Trang chủ", href: "/" },
        { label: "Đặt sân + HLV" }
    ];

    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentField = useAppSelector((state) => state.field.currentField);
    const { isAuthenticated } = useAuth();

    const [currentStep, setCurrentStep] = useState<CombinedBookingStep>(CombinedBookingStep.FIELD_LIST);
    const [courts, setCourts] = useState<Array<{ id: string; name: string; courtNumber?: number }>>([]);
    const [courtsError, setCourtsError] = useState<string | null>(null);
    const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Combined booking data state
    const [bookingData, setBookingData] = useState<CombinedBookingData>({
        field: {
            fieldId: '',
            fieldName: '',
            fieldLocation: '',
            date: '',
            startTime: '',
            endTime: '',
            courtId: '',
            courtName: '',
            courtPrice: 0,
            amenityIds: [],
        },
        coach: {
            coachId: '',
            coachName: '',
            coachPrice: 0,
            date: '',
            startTime: '',
            endTime: '',
            note: '',
        },
        user: {
            name: '',
            email: '',
            phone: '',
        },
    });

    // Only restore field if not on field list step
    useEffect(() => {
        if (currentStep === CombinedBookingStep.FIELD_LIST) return;

        const searchParams = new URLSearchParams(location.search);
        const urlFieldId = searchParams.get('fieldId');
        const stateFieldId = (location.state as any)?.fieldId;
        const storedFieldId = sessionStorage.getItem('selectedFieldId');
        const fieldId = urlFieldId || stateFieldId || storedFieldId;

        if (!currentField && fieldId) {
            dispatch(getFieldById(fieldId));
        }
    }, [location.search, location.state, currentField, dispatch, currentStep]);

    const getLocationString = (location: any): string => {
        if (!location) return '';
        if (typeof location === 'string') return location;
        if (typeof location === 'object' && location.address) return location.address;
        return '';
    };

    // Persist field ID
    useEffect(() => {
        if (currentField?.id) {
            sessionStorage.setItem('selectedFieldId', currentField.id);
            setBookingData(prev => ({
                ...prev,
                field: {
                    ...prev.field,
                    fieldId: currentField.id,
                    fieldName: currentField.name,
                    fieldLocation: getLocationString(currentField.location),
                    courtPrice: currentField.basePrice || 0,
                }
            }));
        }
    }, [currentField?.id, currentField?.name, currentField?.location, currentField?.basePrice]);

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
                if (!bookingData.field.courtId && mapped.length > 0) {
                    setBookingData(prev => ({
                        ...prev,
                        field: {
                            ...prev.field,
                            courtId: mapped[0].id,
                            courtName: mapped[0].name,
                        }
                    }));
                }
            } catch (error: any) {
                logger.error('Failed to fetch courts:', error);
                setCourtsError('Không thể tải danh sách sân con. Vui lòng thử lại.');
            }
        };
        fetchCourts();
    }, [currentField?.id]);

    // ===== Field List Selection Handler =====
    const handleFieldSelect = (fieldId: string, fieldName: string, fieldLocation: string, fieldPrice: number) => {
        sessionStorage.setItem('selectedFieldId', fieldId);
        dispatch(getFieldById(fieldId));
        setBookingData(prev => ({
            ...prev,
            field: {
                ...prev.field,
                fieldId,
                fieldName,
                fieldLocation,
                courtPrice: fieldPrice,
            }
        }));
        setCurrentStep(CombinedBookingStep.FIELD_BOOK_COURT);
    };

    // ===== Field Booking Handlers =====
    const handleBookCourtSubmit = (formData: BookingFormData) => {
        setBookingData(prev => ({
            ...prev,
            field: {
                ...prev.field,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                courtId: formData.courtId || '',
                courtName: formData.courtName || '',
            }
        }));
        setCurrentStep(CombinedBookingStep.FIELD_AMENITIES);
    };

    const handleAmenitiesBack = () => {
        setCurrentStep(CombinedBookingStep.FIELD_BOOK_COURT);
    };

    const handleAmenitiesSubmit = (ids: string[]) => {
        setSelectedAmenityIds(ids);
        setBookingData(prev => ({
            ...prev,
            field: {
                ...prev.field,
                amenityIds: ids,
            }
        }));
        setCurrentStep(CombinedBookingStep.FIELD_CONFIRM);
    };

    const handleFieldConfirmSubmit = (formData: BookingFormData) => {
        setBookingData(prev => ({
            ...prev,
            field: {
                ...prev.field,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                courtId: formData.courtId || '',
                courtName: formData.courtName || '',
            }
        }));
        setCurrentStep(CombinedBookingStep.COACH_SELECT);
    };

    const handleFieldConfirmBack = () => {
        setCurrentStep(CombinedBookingStep.FIELD_AMENITIES);
    };

    // ===== Coach Selection Handlers =====
    const handleCoachSelect = (coachId: string, coachName: string, coachPrice: number) => {
        setBookingData(prev => ({
            ...prev,
            coach: {
                ...prev.coach,
                coachId,
                coachName,
                coachPrice,
                // Automatically use the same date and time as the field
                date: prev.field.date,
                startTime: prev.field.startTime,
                endTime: prev.field.endTime,
            }
        }));
        setCurrentStep(CombinedBookingStep.COMBINED_CONFIRM);
    };

    const handleCoachSelectBack = () => {
        setCurrentStep(CombinedBookingStep.FIELD_CONFIRM);
    };

    // ===== Combined Confirmation Handlers =====
    const handleCombinedConfirmContinue = () => {
        setCurrentStep(CombinedBookingStep.PERSONAL_INFO);
    };

    const handleCombinedConfirmBack = () => {
        setCurrentStep(CombinedBookingStep.COACH_SELECT);
    };

    // ===== Personal Info Handlers =====
    const handlePersonalInfoSubmit = async (formData: BookingFormData) => {
        setBookingData(prev => ({
            ...prev,
            user: {
                name: formData.name || '',
                email: formData.email || '',
                phone: formData.phone || '',
            }
        }));

        // Gửi đơn đặt trực tiếp
        setIsSubmitting(true);
        try {
            const bookingPayload = {
                fieldId: bookingData.field.fieldId,
                courtId: bookingData.field.courtId,
                date: bookingData.field.date,
                startTime: bookingData.field.startTime,
                endTime: bookingData.field.endTime,
                selectedAmenities: bookingData.field.amenityIds,
                coachId: bookingData.coach.coachId,
                paymentMethod: 11, // 11: PayOS (Fixed for combined bookings)
                note: bookingData.coach.note || '',
                paymentNote: 'Đặt Combo Sân + HLV',
                guestName: formData.name || '',
                guestEmail: formData.email || '',
                guestPhone: formData.phone || '',
            };

            const resultAction = await dispatch(createCombinedBooking(bookingPayload));

            if (createCombinedBooking.fulfilled.match(resultAction)) {
                setSubmitSuccess(true);
                toast.success('Gửi đơn đặt thành công! Vui lòng chờ xác nhận từ huấn luyện viên.');

                // Clear session storage
                sessionStorage.removeItem('bookingFormData');
                sessionStorage.removeItem('selectedFieldId');
                sessionStorage.removeItem('amenitiesNote');
            } else {
                const errorMessage = (resultAction.payload as any)?.message || 'Có lỗi xảy ra khi gửi đơn đặt';
                toast.error(errorMessage);
            }
        } catch (err: any) {
            toast.error(err.message || 'Có lỗi xảy ra khi gửi đơn đặt');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePersonalInfoBack = () => {
        setCurrentStep(CombinedBookingStep.COMBINED_CONFIRM);
    };

    // Hiển thị màn hình thành công
    if (submitSuccess) {
        return (
            <>
                <NavbarDarkComponent />
                <PageWrapper>
                    <PageHeader title="Đặt sân + HLV" breadcrumbs={breadcrumbs} />
                    <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                        <Card className="border-2 border-emerald-600">
                            <CardContent className="p-10 text-center space-y-6">
                                <CheckCircle className="w-20 h-20 text-emerald-600 mx-auto" />
                                <h2 className="text-3xl font-bold text-emerald-700">
                                    Gửi đơn đặt thành công!
                                </h2>
                                <p className="text-lg text-gray-700">
                                    Đơn đặt sân và huấn luyện viên của bạn đã được gửi.
                                </p>
                                <p className="text-sm text-gray-600">
                                    Vui lòng chờ xác nhận từ huấn luyện viên. Email thông báo sẽ được gửi đến hộp thư của bạn.
                                </p>
                                <div className="pt-4 flex justify-center gap-4">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                    >
                                        Về trang chủ
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!isAuthenticated) {
                                                toast.error('Vui lòng đăng nhập để xem lịch sử đặt sân');
                                                return;
                                            }
                                            navigate('/user-booking-history');
                                        }}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Xem lịch sử đặt sân
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </PageWrapper>
            </>
        );
    }

    // Hiển thị màn hình đang gửi
    if (isSubmitting) {
        return (
            <>
                <NavbarDarkComponent />
                <PageWrapper>
                    <PageHeader title="Đặt sân + HLV" breadcrumbs={breadcrumbs} />
                    <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                        <Card className="border border-gray-200">
                            <CardContent className="p-10 text-center space-y-4">
                                <Loading size={64} className="mx-auto" />
                                <h2 className="text-2xl font-semibold text-gray-700">
                                    Đang gửi đơn đặt...
                                </h2>
                                <p className="text-gray-600">
                                    Vui lòng chờ trong giây lát
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </PageWrapper>
            </>
        );
    }

    return (
        <>
            <NavbarDarkComponent />
            <PageWrapper>
                <PageHeader title="Đặt sân + HLV" breadcrumbs={breadcrumbs} />

                {/* Stepper */}
                <FieldCoachBookingStepper currentStep={currentStep} />

                {/* Step Content */}
                {currentStep === CombinedBookingStep.FIELD_LIST && (
                    <FieldListSelection onSelect={handleFieldSelect} />
                )}

                {currentStep === CombinedBookingStep.FIELD_BOOK_COURT && (
                    <BookCourtTab
                        onSubmit={handleBookCourtSubmit}
                        courts={courts}
                        courtsError={courtsError}
                    />
                )}

                {currentStep === CombinedBookingStep.FIELD_AMENITIES && (
                    <AmenitiesTab
                        venue={currentField || undefined}
                        selectedAmenityIds={selectedAmenityIds}
                        onChangeSelected={setSelectedAmenityIds}
                        onBack={handleAmenitiesBack}
                        onSubmit={handleAmenitiesSubmit}
                    />
                )}

                {currentStep === CombinedBookingStep.FIELD_CONFIRM && (
                    <ConfirmCourtTab
                        bookingData={{
                            date: bookingData.field.date,
                            startTime: bookingData.field.startTime,
                            endTime: bookingData.field.endTime,
                            courtId: bookingData.field.courtId,
                            courtName: bookingData.field.courtName,
                            name: '',
                            email: '',
                            phone: '',
                        }}
                        selectedAmenityIds={selectedAmenityIds}
                        amenities={(currentField as any)?.amenities?.map((a: any) => ({
                            id: a?.amenityId,
                            name: a?.name,
                            price: Number(a?.price) || 0,
                        })) || []}
                        onSubmit={handleFieldConfirmSubmit}
                        onBack={handleFieldConfirmBack}
                        courts={courts}
                    />
                )}

                {currentStep === CombinedBookingStep.COACH_SELECT && (
                    <CoachListSelection
                        onSelect={handleCoachSelect}
                        onBack={handleCoachSelectBack}
                    />
                )}

                {currentStep === CombinedBookingStep.COMBINED_CONFIRM && (
                    <CombinedConfirmation
                        fieldData={{
                            fieldName: bookingData.field.fieldName,
                            courtName: bookingData.field.courtName,
                            fieldLocation: bookingData.field.fieldLocation,
                            date: bookingData.field.date,
                            startTime: bookingData.field.startTime,
                            endTime: bookingData.field.endTime,
                            courtPrice: bookingData.field.courtPrice,
                            amenities: (currentField as any)?.amenities?.map((a: any) => ({
                                id: a?.amenityId,
                                name: a?.name,
                                price: Number(a?.price) || 0,
                            })) || [],
                            amenityIds: bookingData.field.amenityIds,
                        }}
                        coachData={{
                            coachName: bookingData.coach.coachName,
                            date: bookingData.coach.date,
                            startTime: bookingData.coach.startTime,
                            endTime: bookingData.coach.endTime,
                            pricePerHour: bookingData.coach.coachPrice,
                        }}
                        onContinue={handleCombinedConfirmContinue}
                        onBack={handleCombinedConfirmBack}
                    />
                )}

                {currentStep === CombinedBookingStep.PERSONAL_INFO && (
                    <PersonalInfoTab
                        bookingData={{
                            date: bookingData.field.date,
                            startTime: bookingData.field.startTime,
                            endTime: bookingData.field.endTime,
                            courtId: bookingData.field.courtId,
                            courtName: bookingData.field.courtName,
                            name: bookingData.user.name,
                            email: bookingData.user.email,
                            phone: bookingData.user.phone,
                        }}
                        onSubmit={handlePersonalInfoSubmit}
                        onBack={handlePersonalInfoBack}
                        courts={courts}
                        submitButtonText="Gửi đơn đặt"
                        skipFieldBookingHold={true}
                    />
                )}


            </PageWrapper>
        </>
    );
};

export default FieldCoachBookingPage;
