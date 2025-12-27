import React, { useState, useEffect, useCallback } from 'react';
import logger from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import { Loading } from "@/components/ui/loading";
import { getFieldById, updateFieldWithImages } from '@/features/field/fieldThunk';
import { clearErrors } from '@/features/field/fieldSlice';
import { getAmenitiesBySportType } from '@/features/amenities';
import type { CreateFieldPayload, PriceRange, FieldLocation, UpdateFieldWithImagesPayload } from '@/types/field-type';
import type { AmenityWithPrice } from '@/types/amenity-with-price';
import { CustomFailedToast, CustomSuccessToast } from '@/components/toast/notificiation-toast';
import { FieldOwnerDashboardLayout } from '@/components/layouts/field-owner-dashboard-layout';
import { FieldSelectionPlaceholder } from './components/field-selection-placeholder';
import {
    BasicInfoCard,
    PriceCard,
    AvailabilityCard,
    OverviewCard,
    IncludesCard,
    RulesCard,
    AmenitiesCard,
    GalleryCard,
    LocationCard,
    CourtGridCard
} from '@/pages/field-owner-dashboard-page/create/component/field-create';

export default function FieldEditPage() {
    const { fieldId } = useParams<{ fieldId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentField, loading, updateLoading, updateError } = useAppSelector((state) => state.field);

    // Form state
    const [formData, setFormData] = useState<CreateFieldPayload>({
        name: '',
        sportType: '',
        description: '',
        location: '',
        images: [],
        operatingHours: [],
        slotDuration: 60,
        minSlots: 1,
        maxSlots: 4,
        priceRanges: [],
        basePrice: ''
    });

    // Location coordinates state
    const [locationData, setLocationData] = useState<FieldLocation>({
        address: '',
        geo: {
            type: 'Point',
            coordinates: [0, 0]
        }
    });

    // UI state
    // Image handling state
    const [keptAvatarUrl, setKeptAvatarUrl] = useState<string | null>(null);
    const [keptGalleryUrls, setKeptGalleryUrls] = useState<string[]>([]);

    const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
    const [newAvatarPreview, setNewAvatarPreview] = useState<string | null>(null);

    const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
    const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([]);
    const [selectedIncludes, setSelectedIncludes] = useState<AmenityWithPrice[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<AmenityWithPrice[]>([]);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [dayAvailability, setDayAvailability] = useState<Record<string, boolean>>({});
    const [editingDay, setEditingDay] = useState<string | null>(null);

    // Court management state
    const [courtsToDelete, setCourtsToDelete] = useState<string[]>([]);
    const [pendingNewCourts, setPendingNewCourts] = useState<number>(0);

    // Computed UI values
    const avatarPreview = newAvatarPreview || keptAvatarUrl;
    const galleryPreviews = [...keptGalleryUrls, ...newGalleryPreviews];

    // Available days and multipliers
    const availableDays = [
        { value: 'monday', label: 'Thứ Hai' },
        { value: 'tuesday', label: 'Thứ Ba' },
        { value: 'wednesday', label: 'Thứ Tư' },
        { value: 'thursday', label: 'Thứ Năm' },
        { value: 'friday', label: 'Thứ Sáu' },
        { value: 'saturday', label: 'Thứ Bảy' },
        { value: 'sunday', label: 'Chủ Nhật' }
    ];

    const availableMultipliers = [
        { value: 0.5, label: '0.5x (Giảm 50%)' },
        { value: 0.8, label: '0.8x (Giảm 20%)' },
        { value: 1.0, label: '1.0x (Giá bình thường)' },
        { value: 1.2, label: '1.2x (Tăng 20%)' },
        { value: 1.5, label: '1.5x (Tăng 50%)' },
        { value: 2.0, label: '2.0x (Tăng 100%)' }
    ];

    // Fetch field data on mount
    useEffect(() => {
        if (fieldId) {
            dispatch(getFieldById(fieldId));
        }
    }, [fieldId, dispatch]);

    // Populate form when field data is loaded
    useEffect(() => {
        if (currentField && currentField.id === fieldId) {
            logger.debug("field-edit-page currentField loaded", {
                id: currentField.id,
                name: currentField.name,
                courtsCount: currentField.courts?.length
            });
            // Extract location data
            const location = currentField.location as any;
            let address = '';
            let coordinates: [number, number] = [0, 0];

            if (typeof location === 'string') {
                address = location;
            } else if (location && typeof location === 'object') {
                address = location.address || location.address || '';
                if (location.geo?.coordinates && Array.isArray(location.geo.coordinates)) {
                    coordinates = [location.geo.coordinates[0], location.geo.coordinates[1]];
                }
            }

            // Extract operating hours and determine selected days
            const hours = currentField.operatingHours || [];
            const daysFromHours = hours.map(oh => oh.day);
            setSelectedDays(daysFromHours);

            // Set day availability based on operating hours
            const availability: Record<string, boolean> = {};
            daysFromHours.forEach(day => {
                availability[day] = true;
            });
            setDayAvailability(availability);

            // Extract amenities and categorize by type
            const amenities = currentField.amenities || [];
            const includesList: AmenityWithPrice[] = [];
            const amenitiesList: AmenityWithPrice[] = [];

            amenities.forEach((amenity: any) => {
                const amenityId = amenity.amenityId || amenity.amenity?._id || amenity.amenity?.id || amenity.amenity || '';
                const amenityType = amenity.type || amenity.amenity?.type;
                const amenityData: AmenityWithPrice = {
                    amenityId,
                    price: amenity.price || 0
                };

                // Phân loại: FACILITY -> includes, DRINK và OTHER -> amenities
                if (amenityType === 'facility') {
                    includesList.push(amenityData);
                } else if (amenityType === 'drink' || amenityType === 'other') {
                    amenitiesList.push(amenityData);
                } else {
                    // Fallback: nếu không có type, đưa vào amenities
                    amenitiesList.push(amenityData);
                }
            });
            setSelectedIncludes(includesList);
            setSelectedAmenities(amenitiesList);

            // Set form data
            setFormData({
                name: currentField.name || '',
                sportType: currentField.sportType || '',
                description: currentField.description || '',
                location: address,
                images: currentField.images || [],
                operatingHours: hours,
                slotDuration: currentField.slotDuration || 60,
                minSlots: currentField.minSlots || 1,
                maxSlots: currentField.maxSlots || 4,
                priceRanges: currentField.priceRanges || [],
                basePrice: currentField.basePrice?.toString() || '',
                numberOfCourts: currentField.courts?.length || 1
            });

            // Set location data
            setLocationData({
                address,
                geo: {
                    type: 'Point',
                    coordinates
                }
            });

            // Set image previews and state
            if (currentField.images && currentField.images.length > 0) {
                setKeptAvatarUrl(currentField.images[0]);
                setKeptGalleryUrls(currentField.images.slice(1));
            } else {
                setKeptAvatarUrl(null);
                setKeptGalleryUrls([]);
            }
            setNewAvatarFile(null);
            setNewAvatarPreview(null);
            setNewGalleryFiles([]);
            setNewGalleryPreviews([]);
        }
    }, [currentField, fieldId]);

    // Fetch amenities when sportType changes
    useEffect(() => {
        if (formData.sportType) {
            dispatch(getAmenitiesBySportType(formData.sportType));
        }
    }, [dispatch, formData.sportType]);

    // Memoized callbacks
    const handleIncludesChange = useCallback((amenities: AmenityWithPrice[]) => {
        setSelectedIncludes(amenities);
    }, []);

    const handleAmenitiesChange = useCallback((amenities: AmenityWithPrice[]) => {
        setSelectedAmenities(amenities);
    }, []);

    const handleLocationChange = useCallback((location: FieldLocation) => {
        setLocationData(location);
        setFormData(prev => ({
            ...prev,
            location: location.address
        }));
    }, []);

    // Form handlers
    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOperatingHoursChange = (day: string, field: 'start' | 'end' | 'duration', value: string | number) => {
        setFormData(prev => {
            const existingIndex = prev.operatingHours.findIndex(oh => oh.day === day);
            const updatedHours = [...prev.operatingHours];

            if (existingIndex >= 0) {
                updatedHours[existingIndex] = {
                    ...updatedHours[existingIndex],
                    [field]: value
                };
            } else {
                updatedHours.push({
                    day,
                    start: field === 'start' ? value as string : '06:00',
                    end: field === 'end' ? value as string : '22:00',
                    duration: field === 'duration' ? value as number : 60
                });
            }

            return {
                ...prev,
                operatingHours: updatedHours
            };
        });
    };

    const handlePriceRangeChange = (index: number, field: keyof PriceRange, value: any) => {
        setFormData(prev => ({
            ...prev,
            priceRanges: prev.priceRanges.map((range, i) =>
                i === index ? { ...range, [field]: value } : range
            )
        }));
    };

    const addPriceRange = (day: string) => {
        setFormData(prev => {
            const toMinutes = (t: string) => {
                const [hh = '00', mm = '00'] = (t || '00:00').split(':');
                return Number(hh) * 60 + Number(mm);
            };

            const rangesForCurrentDay = prev.priceRanges.filter(range => range.day === day);
            const operatingHoursForDay = prev.operatingHours.find(oh => oh.day === day);
            const dayStart = operatingHoursForDay ? operatingHoursForDay.start : '06:00';
            const dayEnd = operatingHoursForDay ? operatingHoursForDay.end : '22:00';

            const lastEnd = rangesForCurrentDay.length > 0
                ? rangesForCurrentDay[rangesForCurrentDay.length - 1].end
                : dayStart;

            if (toMinutes(lastEnd) >= toMinutes(dayEnd)) {
                CustomFailedToast('Giờ kết thúc của khung cuối đã chạm/qua giờ đóng cửa. Không thể thêm.');
                return prev;
            }

            const newPriceRange: PriceRange = {
                day,
                start: lastEnd,
                end: dayEnd,
                multiplier: 1.0
            };

            return {
                ...prev,
                priceRanges: [...prev.priceRanges, newPriceRange]
            };
        });
    };

    const removePriceRange = (index: number) => {
        setFormData(prev => ({
            ...prev,
            priceRanges: prev.priceRanges.filter((_, i) => i !== index)
        }));
    };

    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Revoke old new preview if exists
        if (newAvatarPreview) URL.revokeObjectURL(newAvatarPreview);

        setNewAvatarFile(file);
        setNewAvatarPreview(URL.createObjectURL(file));
    };

    const removeAvatar = () => {
        if (newAvatarFile) {
            if (newAvatarPreview) URL.revokeObjectURL(newAvatarPreview);
            setNewAvatarFile(null);
            setNewAvatarPreview(null);
        } else {
            // Remove kept avatar
            setKeptAvatarUrl(null);
        }
    };

    const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        setNewGalleryFiles(prev => [...prev, ...files]);
        const newPreviewsSnapshot = files.map(file => URL.createObjectURL(file));
        setNewGalleryPreviews(prev => [...prev, ...newPreviewsSnapshot]);
    };

    const removeGalleryImage = (index: number) => {
        const keptCount = keptGalleryUrls.length;
        if (index < keptCount) {
            setKeptGalleryUrls(prev => prev.filter((_, i) => i !== index));
        } else {
            const newIndex = index - keptCount;
            // Revoke URL?
            const urlToRemove = newGalleryPreviews[newIndex];
            if (urlToRemove) URL.revokeObjectURL(urlToRemove);

            setNewGalleryFiles(prev => prev.filter((_, i) => i !== newIndex));
            setNewGalleryPreviews(prev => prev.filter((_, i) => i !== newIndex));
        }
    };

    const toggleDay = (day: string) => {
        setSelectedDays((prev) => {
            if (prev.includes(day)) {
                setDayAvailability(prevAvail => {
                    const newAvailability = { ...prevAvail };
                    delete newAvailability[day];
                    return newAvailability;
                });
                return prev.filter((d) => d !== day);
            } else {
                setFormData(formData => {
                    const existingHours = formData.operatingHours.find(oh => oh.day === day);
                    if (!existingHours) {
                        return {
                            ...formData,
                            operatingHours: [
                                ...formData.operatingHours,
                                {
                                    day,
                                    start: '06:00',
                                    end: '22:00',
                                    duration: 60
                                }
                            ]
                        };
                    }
                    return formData;
                });
                setDayAvailability(prevAvail => ({
                    ...prevAvail,
                    [day]: true
                }));
                return [...prev, day];
            }
        });
    };

    const toggleDayAvailability = (day: string) => {
        setDayAvailability((prev) => ({
            ...prev,
            [day]: !prev[day],
        }));
    };

    const handleEditDay = (day: string) => {
        setEditingDay(editingDay === day ? null : day);
    };

    const handleResetAvailability = () => {
        setSelectedDays([]);
        setDayAvailability({});
        setFormData(prev => ({
            ...prev,
            operatingHours: [],
            priceRanges: []
        }));
    };

    const handleSaveAvailability = () => {
        // Placeholder
    };

    // Court management handlers
    const handleMarkCourtForDeletion = (courtId: string) => {
        setCourtsToDelete(prev => {
            if (prev.includes(courtId)) {
                // Undo deletion
                return prev.filter(id => id !== courtId);
            } else {
                // Mark for deletion
                return [...prev, courtId];
            }
        });
    };

    const handleAddCourt = () => {
        setPendingNewCourts(prev => prev + 1);
    };

    // Form validation
    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            CustomFailedToast('Vui lòng nhập tên sân');
            return false;
        }
        if (!formData.sportType) {
            CustomFailedToast('Vui lòng chọn loại sân');
            return false;
        }
        if (!formData.description.trim()) {
            CustomFailedToast('Vui lòng nhập mô tả sân');
            return false;
        }
        const locationString = typeof formData.location === 'string'
            ? formData.location
            : formData.location?.address || '';
        if (!locationString.trim()) {
            CustomFailedToast('Vui lòng nhập địa chỉ sân');
            return false;
        }
        if (locationData.geo.coordinates[0] === 0 && locationData.geo.coordinates[1] === 0) {
            CustomFailedToast('Vui lòng chọn vị trí sân trên bản đồ hoặc tìm kiếm địa chỉ');
            return false;
        }
        if (!formData.basePrice || Number(formData.basePrice) <= 0) {
            CustomFailedToast('Vui lòng nhập giá cơ bản hợp lệ');
            return false;
        }
        if (selectedDays.length === 0) {
            CustomFailedToast('Vui lòng chọn ít nhất một ngày hoạt động');
            return false;
        }
        const availableDays = selectedDays.filter(day => dayAvailability[day] === true);
        if (availableDays.length === 0) {
            CustomFailedToast('Vui lòng bật ít nhất một ngày hoạt động');
            return false;
        }
        return true;
    };

    // Form submission
    const handleSubmit = async () => {
        if (!fieldId || !validateForm()) return;

        try {
            dispatch(clearErrors());

            const filteredOperatingHours = formData.operatingHours.filter(oh =>
                selectedDays.includes(oh.day) && dayAvailability[oh.day] === true
            );

            const filteredPriceRanges = formData.priceRanges.filter(pr =>
                selectedDays.includes(pr.day) && dayAvailability[pr.day] === true
            );

            const amenitiesForAPI = [
                ...selectedIncludes,
                ...selectedAmenities
            ];

            // Construct keptImages
            const finalKeptImages: string[] = [];
            if (keptAvatarUrl && !newAvatarFile) {
                finalKeptImages.push(keptAvatarUrl);
            }
            finalKeptImages.push(...keptGalleryUrls);

            // Calculate new number of courts (existing - deleted + new)
            const currentCourtsCount = currentField?.courts?.length || 0;
            const newTotalCourts = currentCourtsCount - courtsToDelete.length + pendingNewCourts;

            const updatePayload: UpdateFieldWithImagesPayload = {
                name: formData.name,
                sportType: formData.sportType,
                description: formData.description,
                location: locationData,
                operatingHours: filteredOperatingHours,
                slotDuration: formData.slotDuration,
                minSlots: formData.minSlots,
                maxSlots: formData.maxSlots,
                priceRanges: filteredPriceRanges,
                basePrice: Number(formData.basePrice),
                amenities: amenitiesForAPI,
                avatar: newAvatarFile || undefined,
                gallery: newGalleryFiles.length > 0 ? newGalleryFiles : undefined,
                keptImages: finalKeptImages.length > 0 ? finalKeptImages : undefined,
                numberOfCourts: pendingNewCourts > 0 ? newTotalCourts : undefined,
                courtsToDelete: courtsToDelete.length > 0 ? courtsToDelete : undefined
            };

            await dispatch(updateFieldWithImages({
                id: fieldId,
                payload: updatePayload
            })).unwrap();

            CustomSuccessToast('Cập nhật sân thành công!');

            // Reset court management state and refresh field data
            setCourtsToDelete([]);
            setPendingNewCourts(0);
            dispatch(getFieldById(fieldId));
        } catch (error) {
            logger.error('Error updating field:', error);
            CustomFailedToast('Cập nhật sân thất bại. Vui lòng thử lại.');
        }
    };

    // Error handling
    useEffect(() => {
        if (updateError) {
            CustomFailedToast(updateError.message || 'Có lỗi xảy ra khi cập nhật sân');
        }
    }, [updateError]);

    if (loading) {
        return (
            <FieldOwnerDashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <Loading size={48} className="text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600">Đang tải thông tin sân...</p>
                    </div>
                </div>
            </FieldOwnerDashboardLayout>
        );
    }

    if (!currentField && !loading) {
        return (
            <FieldOwnerDashboardLayout>
                <FieldSelectionPlaceholder />
            </FieldOwnerDashboardLayout>
        );
    }

    return (
        <FieldOwnerDashboardLayout>
            <div className="min-h-screen bg-background-secondary py-8">
                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa sân</h1>
                            <p className="text-gray-600 mt-2">Cập nhật thông tin sân thể thao của bạn</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/field-owner/fields')}
                        >
                            Hủy
                        </Button>
                    </div>

                    {/* Basic Info Section */}
                    <div id="section-basic">
                        <BasicInfoCard
                            formData={formData}
                            onInputChange={handleInputChange}
                            showCourtCount={false}
                        />

                    </div>

                    {/* Court Management Section */}
                    <div id="section-courts">
                        <CourtGridCard
                            courts={currentField?.courts || []}
                            courtsToDelete={courtsToDelete}
                            pendingNewCourts={pendingNewCourts}
                            onMarkDelete={handleMarkCourtForDeletion}
                            onAddCourt={handleAddCourt}
                            maxCourts={10}
                            isLoading={updateLoading}
                        />
                    </div>

                    {/* Basic Price Section */}
                    <div id="section-price">
                        <PriceCard
                            formData={formData}
                            onInputChange={handleInputChange}
                            onApplyDefaultHours={(start: string, end: string) => {
                                const targetDays = availableDays.map(d => d.value);
                                setFormData(prev => {
                                    const updated = { ...prev };
                                    targetDays.forEach(day => {
                                        const idx = updated.operatingHours.findIndex(oh => oh.day === day);
                                        if (idx >= 0) {
                                            updated.operatingHours[idx] = {
                                                ...updated.operatingHours[idx],
                                                start,
                                                end
                                            };
                                        } else {
                                            updated.operatingHours.push({ day, start, end, duration: prev.slotDuration || 60 });
                                        }
                                    });
                                    return updated;
                                });
                                setDayAvailability(prev => {
                                    const copy = { ...prev };
                                    targetDays.forEach(day => { copy[day] = copy[day] ?? true; });
                                    return copy;
                                });
                            }}
                        />
                    </div>

                    {/* Availability Section */}
                    <div id="section-availability">
                        <AvailabilityCard
                            selectedDays={selectedDays}
                            dayAvailability={dayAvailability}
                            editingDay={editingDay}
                            formData={formData}
                            availableDays={availableDays}
                            availableMultipliers={availableMultipliers}
                            onToggleDay={toggleDay}
                            onToggleDayAvailability={toggleDayAvailability}
                            onEditDay={handleEditDay}
                            onOperatingHoursChange={handleOperatingHoursChange}
                            onPriceRangeChange={handlePriceRangeChange}
                            onAddPriceRange={addPriceRange}
                            onRemovePriceRange={removePriceRange}
                            onApplyDaySettings={(sourceDay: string, targetDays: string[]) => {
                                setFormData(prev => {
                                    const updated = { ...prev };
                                    const srcHours = updated.operatingHours.find(oh => oh.day === sourceDay);
                                    if (srcHours) {
                                        targetDays.forEach(td => {
                                            const idx = updated.operatingHours.findIndex(oh => oh.day === td);
                                            if (idx >= 0) {
                                                updated.operatingHours[idx] = {
                                                    ...updated.operatingHours[idx],
                                                    start: srcHours.start,
                                                    end: srcHours.end,
                                                    duration: srcHours.duration
                                                };
                                            } else {
                                                updated.operatingHours.push({
                                                    day: td,
                                                    start: srcHours.start,
                                                    end: srcHours.end,
                                                    duration: srcHours.duration
                                                });
                                            }
                                        });
                                    }
                                    const srcRanges = updated.priceRanges.filter(pr => pr.day === sourceDay);
                                    targetDays.forEach(td => {
                                        updated.priceRanges = updated.priceRanges.filter(pr => pr.day !== td);
                                        updated.priceRanges = [
                                            ...updated.priceRanges,
                                            ...srcRanges.map(r => ({ ...r, day: td }))
                                        ];
                                    });
                                    return updated;
                                });
                                setSelectedDays(prev => Array.from(new Set([...prev, ...targetDays])));
                                setDayAvailability(prev => {
                                    const copy = { ...prev };
                                    targetDays.forEach(td => { copy[td] = true; });
                                    return copy;
                                });
                            }}
                            onResetAvailability={handleResetAvailability}
                            onSaveAvailability={handleSaveAvailability}
                        />
                    </div>

                    {/* Venue Overview Section */}
                    <div id="section-overview">
                        <OverviewCard
                            formData={formData}
                            onInputChange={handleInputChange}
                        />
                    </div>

                    {/* Includes Section */}
                    <div id="section-includes">
                        <IncludesCard
                            selectedIncludes={selectedIncludes}
                            onIncludesChange={handleIncludesChange}
                            sportType={formData.sportType}
                        />
                    </div>

                    {/* Venue Rules Section */}
                    <div id="section-rules">
                        <RulesCard
                            rules={formData.rules || []}
                            onRulesChange={(newRules) => handleInputChange('rules', newRules)}
                        />
                    </div>

                    {/* Amenities Section */}
                    <div id="section-amenities">
                        <AmenitiesCard
                            selectedAmenities={selectedAmenities}
                            onAmenitiesChange={handleAmenitiesChange}
                            sportType={formData.sportType}
                        />
                    </div>

                    {/* Gallery Section */}
                    <div id="section-gallery">
                        <GalleryCard
                            avatarPreview={avatarPreview}
                            onAvatarUpload={handleAvatarUpload}
                            onRemoveAvatar={removeAvatar}
                            galleryPreviews={galleryPreviews}
                            onGalleryUpload={handleGalleryUpload}
                            onRemoveGalleryImage={removeGalleryImage}
                        />
                    </div>

                    {/* Location Section */}
                    <div id="section-locations">
                        <LocationCard
                            formData={formData}
                            onInputChange={handleInputChange}
                            onLocationChange={handleLocationChange}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/field-owner/fields')}
                            disabled={updateLoading}
                        >
                            Hủy
                        </Button>
                        <Button
                            size="lg"
                            className="px-8"
                            onClick={handleSubmit}
                            disabled={updateLoading}
                        >
                            {updateLoading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </div>
        </FieldOwnerDashboardLayout>
    );
}

