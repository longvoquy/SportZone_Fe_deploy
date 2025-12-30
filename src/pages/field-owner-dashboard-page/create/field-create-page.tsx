import React, { useState, useEffect, useCallback } from 'react';
import logger from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import { createField, createFieldWithImages } from '@/features/field/fieldThunk';
import { clearErrors } from '@/features/field/fieldSlice';
import { getAmenitiesBySportType } from '@/features/amenities';
import type { CreateFieldPayload, PriceRange, FieldLocation } from '@/types/field-type';
import type { AmenityWithPrice } from '@/types/amenity-with-price';
import { CustomFailedToast, CustomSuccessToast } from '@/components/toast/notificiation-toast';
import { FieldOwnerDashboardLayout } from '@/components/layouts/field-owner-dashboard-layout';
import {
    BasicInfoCard,
    PriceCard,
    AvailabilityCard,
    OverviewCard,
    IncludesCard,
    RulesCard,
    AmenitiesCard,
    GalleryCard,
    LocationCard
} from '@/pages/field-owner-dashboard-page/create/component/field-create';
import { AiFieldGenerationModal } from '@/pages/field-owner-dashboard-page/create/component/field-create/AiFieldGenerationModal';
import { generateFieldFromAI } from '@/features/field/fieldThunk';
import { Wand2 } from 'lucide-react'; // Import magic wand icon

export default function FieldCreatePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { createLoading, createWithImagesLoading, createError, createWithImagesError } = useAppSelector((state) => state.field);


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
        basePrice: '',
        numberOfCourts: 1
    });

    // AI Generation State
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    // const [aiDescription, setAiDescription] = useState(''); // Removed, using modal now
    const { generateAiLoading } = useAppSelector((state) => state.field);

    const handleAiGenerate = async (prompt: string) => {
        if (!prompt || !prompt.trim()) {
            CustomFailedToast('Vui lòng nhập thông tin mô tả sân.');
            return;
        }

        try {
            const aiData = await dispatch(generateFieldFromAI(prompt)).unwrap();
            console.log('AI Data Received in Component:', aiData);

            // Intelligent Merge (Exclude Location, Images, Amenities)
            setFormData(prev => ({
                ...prev,
                name: aiData.name || prev.name,
                sportType: aiData.sportType?.toLowerCase() || prev.sportType, // Ensure lowercase for select match
                description: aiData.description || prev.description,
                basePrice: aiData.basePrice ? String(aiData.basePrice) : prev.basePrice,
                slotDuration: aiData.slotDuration || prev.slotDuration,
                minSlots: aiData.minSlots || prev.minSlots,
                maxSlots: aiData.maxSlots || prev.maxSlots,
                numberOfCourts: aiData.numberOfCourts || prev.numberOfCourts,
                // Overwrite Operating Hours if AI returned them
                operatingHours: aiData.operatingHours?.length > 0 ? aiData.operatingHours : prev.operatingHours,
                // Overwrite Price Ranges if AI returned them
                priceRanges: aiData.priceRanges?.length > 0 ? aiData.priceRanges : prev.priceRanges
            }));

            // Handle generated rules
            if (aiData.rules && aiData.rules.length > 0) {
                setRules(aiData.rules);
            }

            // Handle generated operating hours visualization
            if (aiData.operatingHours?.length > 0) {
                const newSelectedDays: string[] = [];
                const newAvailability: Record<string, boolean> = {};

                aiData.operatingHours.forEach(oh => {
                    if (!newSelectedDays.includes(oh.day)) {
                        newSelectedDays.push(oh.day);
                        newAvailability[oh.day] = true;
                    }
                });

                setSelectedDays(newSelectedDays);
                setDayAvailability(newAvailability);
            }

            CustomSuccessToast('Dữ liệu đã được điền tự động từ AI!');
            setIsAiDialogOpen(false);
            // setAiDescription(''); // Clear input

        } catch (error: any) {
            CustomFailedToast(error.message || 'Không thể tạo thông tin từ AI');
        }
    };


    // Location coordinates state
    const [locationData, setLocationData] = useState<FieldLocation>({
        address: '',
        geo: {
            type: 'Point',
            coordinates: [0, 0]
        }
    });

    // UI state
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [selectedIncludes, setSelectedIncludes] = useState<AmenityWithPrice[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<AmenityWithPrice[]>([]);
    const [rules, setRules] = useState<string[]>([]);

    // Memoized callbacks to prevent infinite re-renders
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


    // Fetch amenities when sportType changes
    useEffect(() => {
        if (formData.sportType) {
            dispatch(getAmenitiesBySportType(formData.sportType));
        }
    }, [dispatch, formData.sportType]);

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

            // Validation: last end must be < day closing time
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
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const removeAvatar = () => {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
    };

    const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        setGalleryFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setGalleryPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeGalleryImage = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => {
            const newPreviews = [...prev];
            URL.revokeObjectURL(newPreviews[index]);
            return newPreviews.filter((_, i) => i !== index);
        });
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
        // Check if coordinates are valid (not default 0,0)
        if (locationData.geo.coordinates[0] === 0 && locationData.geo.coordinates[1] === 0) {
            CustomFailedToast('Vui lòng chọn vị trí sân trên bản đồ hoặc tìm kiếm địa chỉ');
            return false;
        }
        if (!formData.basePrice || Number(formData.basePrice) <= 0) {
            CustomFailedToast('Vui lòng nhập giá cơ bản hợp lệ');
            return false;
        }
        // Validate maxSlots - giới hạn tối đa là 4
        if (formData.maxSlots && Number(formData.maxSlots) > 4) {
            CustomFailedToast('Số slot tối đa không được vượt quá 4');
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
        if (!validateForm()) return;

        try {
            dispatch(clearErrors());
            //CustomSuccessToast('Đang gửi yêu cầu tạo sân...');

            // Convert basePrice to number before sending
            // Filter operating hours and price ranges to only include selected and available days
            const filteredOperatingHours = formData.operatingHours.filter(oh =>
                selectedDays.includes(oh.day) && dayAvailability[oh.day] === true
            );

            const filteredPriceRanges = formData.priceRanges.filter(pr =>
                selectedDays.includes(pr.day) && dayAvailability[pr.day] === true
            );

            // Convert selected amenities to API format
            const amenitiesForAPI = [
                ...selectedIncludes, // Already in AmenityWithPrice format
                ...selectedAmenities // Already in AmenityWithPrice format
            ];

            const submitData = {
                ...formData,
                basePrice: Number(formData.basePrice),
                operatingHours: filteredOperatingHours,
                priceRanges: filteredPriceRanges,
                amenities: amenitiesForAPI,
                numberOfCourts: (formData.numberOfCourts === '' || formData.numberOfCourts === undefined) ? 1 : Number(formData.numberOfCourts),
                rules: rules.filter(r => r.trim() !== '')

            };

            // Debug: log payload prior to submit
            logger.debug('CreateField submitData', submitData);

            if (avatarFile || galleryFiles.length > 0) {
                // Prepare files with suffixes for backend identification
                const filesToUpload: File[] = [];
                const renameWithSuffix = (file: File, suffix: string): File => {
                    const dotIdx = file.name.lastIndexOf('.');
                    const base = dotIdx > -1 ? file.name.substring(0, dotIdx) : file.name;
                    const ext = dotIdx > -1 ? file.name.substring(dotIdx) : '';
                    const newName = `${base}${suffix}${ext}`;
                    return new File([file], newName, { type: file.type });
                };

                if (avatarFile) filesToUpload.push(renameWithSuffix(avatarFile, '__avatar'));
                galleryFiles.forEach(f => filesToUpload.push(renameWithSuffix(f, '__gallery')));

                const resWithImages = await dispatch(createFieldWithImages({
                    payload: submitData,
                    images: filesToUpload,
                    locationData: locationData
                })).unwrap();
                logger.debug('CreateField API response (with images):', resWithImages);
                CustomSuccessToast('Tạo sân thành công với hình ảnh!');
                setTimeout(() => navigate('/field-owner/fields'), 1500);
            } else {
                // Create field without images - need to update submitData with location object
                const payloadWithLocation = {
                    ...submitData,
                    location: locationData
                };
                const resNoImages = await dispatch(createField(payloadWithLocation)).unwrap();
                logger.debug('CreateField API response (no images):', resNoImages);
                CustomSuccessToast('Tạo sân thành công!');
                setTimeout(() => navigate('/field-owner/fields'), 1500);
            }

            // Reset form
            setFormData({
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
                basePrice: '',
                numberOfCourts: 1
            });
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            galleryPreviews.forEach(url => URL.revokeObjectURL(url));
            setAvatarFile(null);
            setAvatarPreview(null);
            setGalleryFiles([]);
            setGalleryPreviews([]);
            setSelectedIncludes([]);
            setSelectedAmenities([]);
            setRules([]);

        } catch (error) {
            logger.error('Error creating field:', error);
            CustomFailedToast('Gửi yêu cầu tạo sân thất bại. Vui lòng thử lại.');
        }
    };

    // Error handling effect
    useEffect(() => {
        if (createError) {
            CustomFailedToast(createError.message || 'Có lỗi xảy ra khi tạo sân');
        }
        if (createWithImagesError) {
            CustomFailedToast(createWithImagesError.message || 'Có lỗi xảy ra khi tạo sân với hình ảnh');
        }
    }, [createError, createWithImagesError]);
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [dayAvailability, setDayAvailability] = useState<Record<string, boolean>>({})
    const [editingDay, setEditingDay] = useState<string | null>(null)

    // Available days and multipliers for user selection
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

    const toggleDay = (day: string) => {
        setSelectedDays((prev) => {
            if (prev.includes(day)) {
                // Only unselect the day; keep existing operatingHours/priceRanges to preserve applied values
                setDayAvailability(prevAvail => {
                    const newAvailability = { ...prevAvail };
                    delete newAvailability[day];
                    return newAvailability;
                });
                return prev.filter((d) => d !== day);
            } else {
                // Select the day; if no hours exist yet, seed defaults.
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
    }

    const toggleDayAvailability = (day: string) => {
        setDayAvailability((prev) => ({
            ...prev,
            [day]: !prev[day],
        }))
    }

    const handleEditDay = (day: string) => {
        setEditingDay(editingDay === day ? null : day)
    }


    const handleResetAvailability = () => {
        setSelectedDays([])
        setDayAvailability({})
        setFormData(prev => ({
            ...prev,
            operatingHours: [],
            priceRanges: []
        }))
    }

    const handleSaveAvailability = () => {
    }

    const fillSampleData = () => {
        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const defaultHours = allDays.map(day => ({ day, start: '06:00', end: '22:00', duration: 60 }));
        setFormData(prev => ({
            ...prev,
            name: 'Sân Thể Thao Test Đà Nẵng',
            sportType: 'football',
            description: 'Sân test để kiểm thử luồng tạo sân. Sân chuẩn 5 người, bề mặt cỏ nhân tạo.',
            location: 'Đà Nẵng, Việt Nam',
            operatingHours: defaultHours,
            priceRanges: [
                { day: 'monday', start: '06:00', end: '17:00', multiplier: 1.0 },
                { day: 'monday', start: '17:00', end: '22:00', multiplier: 1.5 }
            ],
            basePrice: '200000'
        }));
        // Set sample location data for Da Nang
        setLocationData({
            address: 'Đà Nẵng, Việt Nam',
            geo: {
                type: 'Point',
                coordinates: [108.2022, 16.0544] // Da Nang coordinates [lng, lat]
            }
        });
        setSelectedDays(allDays);
        setDayAvailability({
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true
        });
        setEditingDay(null);
        CustomSuccessToast('Đã điền dữ liệu mẫu. Bạn có thể bấm Lưu sân.');
    };

    return (
        <>
            <FieldOwnerDashboardLayout>
                <div className="min-h-screen bg-background-secondary py-8">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {/* AI Assistant Button */}
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setIsAiDialogOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Wand2 className="w-4 h-4" />
                                AI Hỗ trợ tạo sân
                            </Button>
                        </div>

                        {/* Basic Info Section */}
                        <div id="section-basic">
                            <BasicInfoCard
                                formData={formData}
                                onInputChange={handleInputChange}
                            />
                        </div>

                        {/* Basic Price Section */}
                        <div id="section-price">
                            <PriceCard
                                formData={formData}
                                onInputChange={handleInputChange}
                                onApplyDefaultHours={(start: string, end: string) => {
                                    // Always apply to all available days
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
                                    // Also mark availability true for those days if not set
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

                                        // Copy Operating Hours from sourceDay
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

                                        // Copy Price Ranges from sourceDay
                                        const srcRanges = updated.priceRanges.filter(pr => pr.day === sourceDay);
                                        targetDays.forEach(td => {
                                            // Remove existing ranges of target day
                                            updated.priceRanges = updated.priceRanges.filter(pr => pr.day !== td);
                                            // Add cloned ranges for target day
                                            updated.priceRanges = [
                                                ...updated.priceRanges,
                                                ...srcRanges.map(r => ({ ...r, day: td }))
                                            ];
                                        });

                                        return updated;
                                    });

                                    // Ensure targets are marked as selected and available
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
                            <RulesCard rules={rules} onRulesChange={setRules} />
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
                                onClick={fillSampleData}
                                disabled={createLoading || createWithImagesLoading}
                            >
                                Điền dữ liệu mẫu
                            </Button>
                            <Button
                                size="lg"
                                className="px-8"
                                onClick={handleSubmit}
                                disabled={createLoading || createWithImagesLoading}
                            >
                                {createLoading || createWithImagesLoading ? 'Đang tạo sân...' : 'Lưu sân'}
                            </Button>
                        </div>

                    </div>
                </div>
            </FieldOwnerDashboardLayout>

            <AiFieldGenerationModal
                isOpen={isAiDialogOpen}
                onClose={() => setIsAiDialogOpen(false)}
                onGenerate={handleAiGenerate}
                isLoading={generateAiLoading}
            />
        </>
    );
}