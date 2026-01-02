import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
    FieldsResponse,
    FieldResponse,
    FieldAvailabilityResponse,
    CreateFieldPayload,
    UpdateFieldPayload,
    UpdateFieldWithImagesPayload,
    GetFieldsParams,
    GetMyFieldsParams,
    CheckAvailabilityParams,
    SchedulePriceUpdatePayload,
    CancelScheduledPriceUpdatePayload,
    ScheduledPriceUpdate,
    ErrorResponse,
    FieldAmenitiesResponse,
    UpdateFieldAmenitiesPayload,
    UpdateFieldAmenitiesResponse,
    FieldOwnerBookingsParams,
    FieldOwnerBookingsResponse,
} from "../../types/field-type";
import logger from "@/utils/logger";
import axiosPublic from "../../utils/axios/axiosPublic";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import {
    FIELDS_API,
    FIELDS_PAGINATED_API,
    FIELD_BY_ID_API,
    FIELD_AVAILABILITY_API,
    CREATE_FIELD_API,
    CREATE_FIELD_WITH_IMAGES_API,
    UPDATE_FIELD_API,
    UPDATE_FIELD_WITH_IMAGES_API,
    DELETE_FIELD_API,
    SCHEDULE_PRICE_UPDATE_API,
    CANCEL_SCHEDULED_PRICE_UPDATE_API,
    GET_SCHEDULED_PRICE_UPDATES_API,
    GET_FIELD_AMENITIES_API,
    UPDATE_FIELD_AMENITIES_API,
    GET_MY_FIELDS_API,
    GET_MY_FIELDS_BOOKINGS_API,
    GENERATE_FIELD_AI_API,
} from "./fieldAPI";

// Generate field from AI
export const generateFieldFromAI = createAsyncThunk<
    CreateFieldPayload,
    string,
    { rejectValue: ErrorResponse }
>("field/generateFieldFromAI", async (description, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(GENERATE_FIELD_AI_API, { description });
        logger.debug("Generate field AI response:", response.data);
        return response.data.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to generate field from AI",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Map API Field shape (fieldAPI.md) to app Field type used in UI
const mapApiFieldToAppField = (apiField: any): import("../../types/field-type").Field => {
    return {
        id: apiField?._id || apiField?.id || "",
        name: apiField?.name || "",
        sportType: apiField?.sportType || "",
        description: apiField?.description || "",
        location: apiField?.location || "",
        images: Array.isArray(apiField?.images) ? apiField.images : [],
        operatingHours: Array.isArray(apiField?.operatingHours) ? apiField.operatingHours : [],
        slotDuration: apiField?.slotDuration || 60,
        minSlots: apiField?.minSlots || 1,
        maxSlots: apiField?.maxSlots || 4,
        priceRanges: Array.isArray(apiField?.priceRanges) ? apiField.priceRanges : [],
        basePrice: Number(apiField?.basePrice ?? 0),
        price: apiField?.price || undefined, // Formatted price from backend (e.g., "250.000đ/giờ")
        isActive: apiField?.isActive ?? true,
        isAdminVerify: apiField?.isAdminVerify ?? false,
        maintenanceNote: apiField?.maintenanceNote,
        maintenanceUntil: apiField?.maintenanceUntil,
        rating: apiField?.rating || 0,
        totalReviews: apiField?.totalReviews || 0,
        owner: {
            id: apiField?.owner?._id || apiField?.owner?.id || apiField?.owner || "",
            businessName: apiField?.owner?.businessName,
            name: apiField?.owner?.name,
            contactInfo: apiField?.owner?.contactInfo,
        },
        ownerName: apiField?.ownerName,
        ownerPhone: apiField?.ownerPhone,
        courts: Array.isArray(apiField?.courts)
            ? apiField.courts.map((c: any) => ({
                id: c?._id || c?.id || "",
                name: c?.name || c?.courtName || "",
                courtNumber: c?.courtNumber,
                isActive: c?.isActive,
                field: c?.field?._id || c?.field || "",
            }))
            : undefined,
        totalBookings: apiField?.totalBookings,
        createdAt: apiField?.createdAt,
        updatedAt: apiField?.updatedAt,
        amenities: Array.isArray(apiField?.amenities) ? apiField.amenities : [],
    };
};

// Get all fields (without pagination)
export const getAllFields = createAsyncThunk<
    FieldsResponse,
    GetFieldsParams | undefined,
    { rejectValue: ErrorResponse }
>("field/getAllFields", async (params = {}, thunkAPI) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.name) queryParams.append("name", params.name);
        if (params.location) queryParams.append("location", params.location);

        // Priority: sportTypes > sportType
        if (params.sportTypes && params.sportTypes.length > 0) {
            // Send as multiple query params: sportTypes=football&sportTypes=badminton
            params.sportTypes.forEach(sport => {
                queryParams.append("sportTypes", sport);
            });
        } else if (params.sportType) {
            // Backward compatible: single sport
            queryParams.append("sportType", params.sportType);
        }

        if ((params as any).sortBy) queryParams.append("sortBy", (params as any).sortBy);
        if ((params as any).sortOrder) queryParams.append("sortOrder", (params as any).sortOrder);

        const url = queryParams.toString() ? `${FIELDS_API}?${queryParams}` : FIELDS_API;
        const response = await axiosPublic.get(url);

        logger.debug("Get all fields response:", response.data);

        const raw = response.data;
        const apiList = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        const mapped = apiList.map(mapApiFieldToAppField);
        return { success: true, data: mapped } as unknown as FieldsResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch fields",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get all fields with pagination
export const getAllFieldsPaginated = createAsyncThunk<
    FieldsResponse,
    GetFieldsParams & { page: number; limit: number },
    { rejectValue: ErrorResponse }
>("field/getAllFieldsPaginated", async (params, thunkAPI) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.name) queryParams.append("name", params.name);
        if (params.location) queryParams.append("location", params.location);

        // Priority: sportTypes > sportType
        if (params.sportTypes && params.sportTypes.length > 0) {
            params.sportTypes.forEach(sport => {
                queryParams.append("sportTypes", sport);
            });
        } else if (params.sportType) {
            queryParams.append("sportType", params.sportType);
        }

        if (params.sortBy) queryParams.append("sortBy", params.sortBy);
        if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

        // Pagination params (required)
        queryParams.append("page", params.page.toString());
        queryParams.append("limit", params.limit.toString());

        const url = `${FIELDS_PAGINATED_API}?${queryParams}`;
        const response = await axiosPublic.get(url);

        logger.debug("Get all fields paginated response:", response.data);

        const raw = response.data;
        // Handle API response formats:
        // 1) { success, data: { fields: [...], pagination: {...} } }
        // 2) { fields: [...], pagination: {...} }
        // 3) { data: [...]} or [...]
        const apiList =
            raw?.data?.fields ||
            raw?.fields ||
            (Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []);
        const mapped = apiList.map(mapApiFieldToAppField);
        return {
            success: true,
            data: mapped,
            pagination: raw?.data?.pagination || raw?.pagination || null
        } as unknown as FieldsResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch fields",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get my fields (for field owner)
export const getMyFields = createAsyncThunk<
    FieldsResponse,
    GetMyFieldsParams | undefined,
    { rejectValue: ErrorResponse }
>("field/getMyFields", async (params = {}, thunkAPI) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.name) queryParams.append("name", params.name);
        if (params.sportType) queryParams.append("sportType", params.sportType);
        if (params.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());

        const url = queryParams.toString() ? `${GET_MY_FIELDS_API}?${queryParams}` : GET_MY_FIELDS_API;
        const response = await axiosPrivate.get(url);

        logger.debug("Get my fields response:", response.data);

        const raw = response.data;
        // Handle API response format: { success: true, data: { fields: [...], pagination: {...} } }
        const apiList = raw?.data?.fields || (Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []);
        const mapped = apiList.map(mapApiFieldToAppField);
        return {
            success: true,
            data: mapped,
            pagination: raw?.data?.pagination || null
        } as unknown as FieldsResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch my fields",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get field by ID
export const getFieldById = createAsyncThunk<
    FieldResponse,
    string,
    { rejectValue: ErrorResponse }
>("field/getFieldById", async (id, thunkAPI) => {
    try {
        logger.debug("getFieldById request:", { fieldId: id });

        const response = await axiosPublic.get(FIELD_BY_ID_API(id));
        logger.debug("getFieldById response:", response.data);

        const raw = response.data;
        const apiField = raw?.data ?? raw;
        const mapped = mapApiFieldToAppField(apiField);

        return { success: true, data: mapped, message: raw?.message } as unknown as FieldResponse;
    } catch (error: any) {
        logger.error("Error fetching field by ID:", error);

        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch field",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Check field availability (Pure Lazy Creation)
export const checkFieldAvailability = createAsyncThunk<
    FieldAvailabilityResponse,
    CheckAvailabilityParams,
    { rejectValue: ErrorResponse }
>("field/checkAvailability", async (params, thunkAPI) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("startDate", params.startDate);
        queryParams.append("endDate", params.endDate);
        if (params.courtId) queryParams.append("courtId", params.courtId);

        const url = `${FIELD_AVAILABILITY_API(params.id)}?${queryParams}`;
        const response = await axiosPublic.get(url);
        logger.debug("Check availability response:", response.data);

        const raw = response.data;
        const availabilityData = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

        return {
            success: true,
            data: availabilityData
        } as FieldAvailabilityResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to check availability",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Create field (Owner only)
export const createField = createAsyncThunk<
    FieldResponse,
    CreateFieldPayload,
    { rejectValue: ErrorResponse }
>("field/createField", async (payload, thunkAPI) => {
    try {
        // Ensure location is in the correct format
        let requestPayload = { ...payload };

        // If location is a string, convert it to the required object format
        if (typeof requestPayload.location === 'string') {
            requestPayload = {
                ...requestPayload,
                location: {
                    address: requestPayload.location,
                    geo: {
                        type: "Point",
                        coordinates: [0, 0] // Default - should be replaced with actual coordinates
                    }
                } as any
            };
        }

        const response = await axiosPrivate.post(CREATE_FIELD_API, requestPayload);
        logger.debug("Create field response:", response.data);

        const raw = response.data;
        const apiField = raw?.data ?? raw;
        const mapped = mapApiFieldToAppField(apiField);
        return { success: true, data: mapped, message: raw?.message } as unknown as FieldResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create field",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Create field with image upload (Owner only)
// Create field with image upload (Owner only)
export const createFieldWithImages = createAsyncThunk<
    FieldResponse,
    { payload: CreateFieldPayload; images: File[]; locationData?: { address: string; geo: { type: 'Point'; coordinates: [number, number] } } },
    { rejectValue: ErrorResponse }
>("field/createFieldWithImages", async ({ payload, images, locationData }, thunkAPI) => {
    try {
        const formData = new FormData();

        logger.debug("createFieldWithImages started", { fieldName: payload.name });

        // Add basic field data
        formData.append("name", payload.name);
        formData.append("sportType", payload.sportType);
        formData.append("description", payload.description);

        // Location must be a JSON string with address and geo.coordinates
        // Use locationData if provided, otherwise construct from payload.location
        let locationObject;

        if (locationData &&
            locationData.address &&
            typeof locationData.address === 'string' &&
            locationData.address.trim() !== '' &&
            locationData.geo.coordinates[0] !== 0 &&
            locationData.geo.coordinates[1] !== 0) {
            locationObject = locationData;
        } else if (typeof payload.location === 'object' && payload.location && 'geo' in payload.location && payload.location.address) {
            locationObject = payload.location;
        } else {
            // Fallback: if only string address is provided
            const addressString = typeof payload.location === 'string' ? payload.location :
                (typeof payload.location === 'object' && payload.location?.address) ? payload.location.address : '';

            if (!addressString || addressString.trim() === '') {
                logger.error("Location address is missing");
                throw new Error('Location address is required and must be a string');
            }

            locationObject = {
                address: addressString,
                geo: {
                    type: "Point" as const,
                    coordinates: [0, 0] as [number, number]
                }
            };
        }

        // Final validation: ensure address is a non-empty string
        if (!locationObject.address || typeof locationObject.address !== 'string' || locationObject.address.trim() === '') {
            logger.error("Location validation failed:", { address: locationObject.address, type: typeof locationObject.address });
            throw new Error('Location address is required and must be a string');
        }

        logger.debug("Location to send:", {
            address: locationObject.address.substring(0, 50) + '...',
            coordinates: locationObject.geo.coordinates
        });

        formData.append("location", JSON.stringify(locationObject));

        // Debug: Log operating hours before processing

        // Add operating hours as JSON string
        // Convert duration from number to string to match backend schema
        const operatingHoursForAPI = payload.operatingHours.map(oh => ({
            ...oh,
            duration: oh.duration.toString() // Ensure it's a string
        }));

        const operatingHoursString = JSON.stringify(operatingHoursForAPI);
        formData.append("operatingHours", operatingHoursString);

        // Add slot configuration as strings (required for multipart/form-data)
        formData.append("slotDuration", payload.slotDuration.toString());
        formData.append("minSlots", payload.minSlots.toString());
        formData.append("maxSlots", payload.maxSlots.toString());

        // Add base price as string
        formData.append("basePrice", payload.basePrice.toString());

        // Debug: Log price ranges before processing

        // Price ranges serialization
        let priceRangesString = "[]";
        if (payload.priceRanges && payload.priceRanges.length > 0) {
            const priceRangesForAPI = payload.priceRanges.map(range => ({
                ...range,
                multiplier: range.multiplier.toString()
            }));
            priceRangesString = JSON.stringify(priceRangesForAPI);
        } else {
            const defaultPriceRanges = payload.operatingHours.map(oh => ({
                day: oh.day,
                start: oh.start,
                end: oh.end,
                multiplier: "1.0"
            }));
            priceRangesString = JSON.stringify(defaultPriceRanges);
        }
        formData.append("priceRanges", priceRangesString);

        // Amenities serialization
        let amenitiesString = "[]";
        if (payload.amenities && payload.amenities.length > 0) {
            const amenitiesForAPI = payload.amenities.map(amenity => ({
                ...amenity,
                price: amenity.price.toString()
            }));
            amenitiesString = JSON.stringify(amenitiesForAPI);
        }
        formData.append("amenities", amenitiesString);

        if (payload.numberOfCourts !== undefined && payload.numberOfCourts !== null) {
            formData.append("numberOfCourts", payload.numberOfCourts.toString());
        }

        if (images && images.length > 0) {
            images.forEach((image) => {
                formData.append("images", image);
            });
        }

        const response = await axiosPrivate.post(CREATE_FIELD_WITH_IMAGES_API, formData);
        logger.debug("createFieldWithImages response:", response.data);

        const raw = response.data;
        const apiField = raw?.data ?? raw;
        const mapped = mapApiFieldToAppField(apiField);

        return { success: true, data: mapped, message: raw?.message } as unknown as FieldResponse;
    } catch (error: any) {
        logger.error("createFieldWithImages error:", error);
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to create field with images",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Update field (Owner only)
export const updateField = createAsyncThunk<
    FieldResponse,
    { id: string; payload: UpdateFieldPayload },
    { rejectValue: ErrorResponse }
>("field/updateField", async ({ id, payload }, thunkAPI) => {
    try {
        const response = await axiosPrivate.patch(UPDATE_FIELD_API(id), payload);
        logger.debug("Update field response:", response.data);

        const raw = response.data;
        const apiField = raw?.data ?? raw;
        const mapped = mapApiFieldToAppField(apiField);
        return { success: true, data: mapped, message: raw?.message } as unknown as FieldResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to update field",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Update field with images (Owner only)
export const updateFieldWithImages = createAsyncThunk<
    FieldResponse,
    { id: string; payload: UpdateFieldWithImagesPayload },
    { rejectValue: ErrorResponse }
>("field/updateFieldWithImages", async ({ id, payload }, thunkAPI) => {
    try {
        const formData = new FormData();

        logger.debug("updateFieldWithImages started", { fieldId: id });

        // Add basic field data if present
        if (payload.name) formData.append("name", payload.name);
        if (payload.sportType) formData.append("sportType", payload.sportType);
        if (payload.description) formData.append("description", payload.description);
        if (payload.basePrice !== undefined) formData.append("basePrice", payload.basePrice.toString());
        if (payload.isActive !== undefined) formData.append("isActive", String(payload.isActive));
        if (payload.slotDuration) formData.append("slotDuration", payload.slotDuration.toString());
        if (payload.minSlots) formData.append("minSlots", payload.minSlots.toString());
        if (payload.maxSlots) formData.append("maxSlots", payload.maxSlots.toString());

        // Complex fields
        if (payload.location) {
            let locationObject;
            if (typeof payload.location === 'object' && payload.location && 'geo' in payload.location) {
                locationObject = payload.location;
            } else if (typeof payload.location === 'string') {
                locationObject = {
                    address: payload.location,
                    geo: { type: "Point", coordinates: [0, 0] }
                };
            } else {
                locationObject = payload.location;
            }
            if (locationObject) formData.append("location", JSON.stringify(locationObject));
        }

        if (payload.operatingHours) {
            const oh = payload.operatingHours.map(o => {
                const duration = (o as any)?.duration ?? payload.slotDuration;
                return {
                    ...o,
                    duration: (duration ?? 60).toString(),
                };
            });
            formData.append("operatingHours", JSON.stringify(oh));
        }

        if (payload.priceRanges) {
            const pr = payload.priceRanges.map(p => ({
                ...p,
                multiplier: ((p as any)?.multiplier ?? 1).toString(),
            }));
            formData.append("priceRanges", JSON.stringify(pr));
        }

        if (payload.amenities) {
            const am = payload.amenities.map(a => ({
                ...a,
                price: ((a as any)?.price ?? 0).toString(),
            }));
            formData.append("amenities", JSON.stringify(am));
        }

        // Handle Images
        if (payload.keptImages && payload.keptImages.length > 0) {
            formData.append("keptImages", JSON.stringify(payload.keptImages));
        }

        if (payload.avatar) {
            formData.append("avatar", payload.avatar);
        }

        if (payload.gallery && payload.gallery.length > 0) {
            payload.gallery.forEach((image) => {
                formData.append("gallery", image);
            });
        }

        // Add courts to delete
        if (payload.courtsToDelete && payload.courtsToDelete.length > 0) {
            formData.append("courtsToDelete", JSON.stringify(payload.courtsToDelete));
        }

        // Add number of courts if specified
        if (payload.numberOfCourts !== undefined) {
            formData.append("numberOfCourts", payload.numberOfCourts.toString());
        }


        const response = await axiosPrivate.patch(UPDATE_FIELD_WITH_IMAGES_API(id), formData);
        logger.debug("Update field with images response:", response.data);

        const raw = response.data;
        const apiField = raw?.data ?? raw;
        const mapped = mapApiFieldToAppField(apiField);
        return { success: true, data: mapped, message: raw?.message } as unknown as FieldResponse;

    } catch (error: any) {
        logger.error("updateFieldWithImages error:", error);

        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to update field with images",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Delete field (Owner only)
export const deleteField = createAsyncThunk<
    { success: boolean; message: string; fieldId: string },
    string,
    { rejectValue: ErrorResponse }
>("field/deleteField", async (id, thunkAPI) => {
    try {
        const response = await axiosPrivate.delete(DELETE_FIELD_API(id));
        logger.debug("Delete field response:", response.data);

        return { ...response.data, fieldId: id };
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to delete field",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Schedule price update (Owner only)
export const schedulePriceUpdate = createAsyncThunk<
    { success: boolean; message: string; effectiveDate: string; updateId?: string },
    { id: string; payload: SchedulePriceUpdatePayload },
    { rejectValue: ErrorResponse }
>("field/schedulePriceUpdate", async ({ id, payload }, thunkAPI) => {
    try {
        const response = await axiosPrivate.post(SCHEDULE_PRICE_UPDATE_API(id), payload);
        logger.debug("Schedule price update response:", response.data);

        const raw = response.data;
        return {
            success: raw?.success ?? true,
            message: raw?.message || "Price update scheduled successfully",
            effectiveDate: raw?.effectiveDate || payload.effectiveDate,
            updateId: raw?.updateId
        };
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to schedule price update",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Cancel scheduled price update (Owner only)
export const cancelScheduledPriceUpdate = createAsyncThunk<
    { success: boolean; message: string },
    { id: string; payload: CancelScheduledPriceUpdatePayload },
    { rejectValue: ErrorResponse }
>("field/cancelScheduledPriceUpdate", async ({ id, payload }, thunkAPI) => {
    try {
        const response = await axiosPrivate.delete(CANCEL_SCHEDULED_PRICE_UPDATE_API(id), {
            data: payload,
        });
        logger.debug("Cancel scheduled price update response:", response.data);

        const raw = response.data;
        return {
            success: raw?.success ?? true,
            message: raw?.message || "Scheduled price update cancelled"
        };
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to cancel scheduled price update",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get scheduled price updates (Owner only)
export const getScheduledPriceUpdates = createAsyncThunk<
    { success: boolean; data: ScheduledPriceUpdate[] },
    string,
    { rejectValue: ErrorResponse }
>("field/getScheduledPriceUpdates", async (id, thunkAPI) => {
    try {
        const response = await axiosPrivate.get(GET_SCHEDULED_PRICE_UPDATES_API(id));
        logger.debug("Get scheduled price updates response:", response.data);

        const raw = response.data;
        const scheduledUpdates = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

        return {
            success: true,
            data: scheduledUpdates
        };
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get scheduled price updates",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get field amenities
export const getFieldAmenities = createAsyncThunk<
    FieldAmenitiesResponse,
    string,
    { rejectValue: ErrorResponse }
>("field/getFieldAmenities", async (fieldId, thunkAPI) => {
    try {
        const response = await axiosPublic.get(GET_FIELD_AMENITIES_API(fieldId));

        logger.debug("Get field amenities response:", response.data);

        const raw = response.data;
        return {
            fieldId: raw?.fieldId || fieldId,
            fieldName: raw?.fieldName || "",
            amenities: Array.isArray(raw?.amenities) ? raw.amenities : []
        };
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch field amenities",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Update field amenities (Owner only)
export const updateFieldAmenities = createAsyncThunk<
    UpdateFieldAmenitiesResponse,
    { fieldId: string; payload: UpdateFieldAmenitiesPayload },
    { rejectValue: ErrorResponse }
>("field/updateFieldAmenities", async ({ fieldId, payload }, thunkAPI) => {
    try {
        const response = await axiosPrivate.put(UPDATE_FIELD_AMENITIES_API(fieldId), payload);

        logger.debug("Update field amenities response:", response.data);

        const raw = response.data;
        return {
            success: raw?.success ?? true,
            message: raw?.message || "Updated field amenities",
            field: {
                id: raw?.field?.id || fieldId,
                name: raw?.field?.name || "",
                amenities: Array.isArray(raw?.field?.amenities) ? raw.field.amenities : []
            }
        };
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to update field amenities",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Get my fields bookings with filter and pagination
export const getMyFieldsBookings = createAsyncThunk<
    FieldOwnerBookingsResponse,
    FieldOwnerBookingsParams | undefined,
    { rejectValue: ErrorResponse }
>("field/getMyFieldsBookings", async (params = {}, thunkAPI) => {
    try {
        const queryParams = new URLSearchParams();

        if (params.fieldName) queryParams.append('fieldName', params.fieldName);
        if (params.status) queryParams.append('status', params.status);
        if (params.transactionStatus) queryParams.append('transactionStatus', params.transactionStatus);
        if (params.date) queryParams.append('date', params.date);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.type) queryParams.append('type', params.type); // Add type param

        const url = queryParams.toString()
            ? `${GET_MY_FIELDS_BOOKINGS_API}?${queryParams.toString()}`
            : GET_MY_FIELDS_BOOKINGS_API;

        const response = await axiosPrivate.get(url);
        const raw = response.data;

        // Handle different response formats
        // Format 1: { success: true, data: { bookings: [...], pagination: {...} } }
        // Format 2: { bookings: [...], pagination: {...} }
        if (raw?.success && raw?.data) {
            return raw as FieldOwnerBookingsResponse;
        } else if (raw?.bookings && raw?.pagination) {
            // Wrap in expected format
            return {
                success: true,
                data: {
                    bookings: raw.bookings,
                    pagination: raw.pagination
                }
            } as FieldOwnerBookingsResponse;
        }

        // Fallback: return as is
        return raw as FieldOwnerBookingsResponse;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to fetch field owner bookings",
            status: error.response?.status?.toString() || "500",
            errors: error.response?.data?.errors,
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Owner: get booking detail (with note)
export const ownerGetBookingDetail = createAsyncThunk<
    any,
    string,
    { rejectValue: ErrorResponse }
>("field/ownerGetBookingDetail", async (bookingId, thunkAPI) => {
    try {
        const { OWNER_BOOKING_DETAIL_API } = await import("./fieldAPI");
        const response = await axiosPrivate.get(OWNER_BOOKING_DETAIL_API(bookingId));
        // Backend wraps responses as { success: true, data: {...} }
        return response.data?.data ?? response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to get booking detail",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Owner: accept user's note (send payment link if online)
export const ownerAcceptNote = createAsyncThunk<
    any,
    string,
    { rejectValue: ErrorResponse }
>("field/ownerAcceptNote", async (bookingId, thunkAPI) => {
    try {
        const { OWNER_ACCEPT_NOTE_API } = await import("./fieldAPI");
        const response = await axiosPrivate.patch(OWNER_ACCEPT_NOTE_API(bookingId));
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to accept booking note",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Owner: deny user's note
export const ownerDenyNote = createAsyncThunk<
    any,
    { bookingId: string; reason?: string },
    { rejectValue: ErrorResponse }
>("field/ownerDenyNote", async ({ bookingId, reason }, thunkAPI) => {
    try {
        const { OWNER_DENY_NOTE_API } = await import("./fieldAPI");
        const response = await axiosPrivate.patch(OWNER_DENY_NOTE_API(bookingId), reason ? { reason } : undefined);
        return response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to deny booking note",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Owner: accept a booking
export const ownerAcceptBooking = createAsyncThunk<
    any,
    string,
    { rejectValue: ErrorResponse }
>("field/ownerAcceptBooking", async (bookingId, thunkAPI) => {
    try {
        const { OWNER_ACCEPT_BOOKING_API } = await import("./fieldAPI");
        const response = await axiosPrivate.patch(OWNER_ACCEPT_BOOKING_API(bookingId));
        return response.data?.data ?? response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to accept booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});

// Owner: reject a booking
export const ownerRejectBooking = createAsyncThunk<
    any,
    { bookingId: string; reason?: string },
    { rejectValue: ErrorResponse }
>("field/ownerRejectBooking", async ({ bookingId, reason }, thunkAPI) => {
    try {
        const { OWNER_REJECT_BOOKING_API } = await import("./fieldAPI");
        const response = await axiosPrivate.patch(OWNER_REJECT_BOOKING_API(bookingId), reason ? { reason } : undefined);
        return response.data?.data ?? response.data;
    } catch (error: any) {
        const errorResponse: ErrorResponse = {
            message: error.response?.data?.message || error.message || "Failed to reject booking",
            status: error.response?.status?.toString() || "500",
        };
        return thunkAPI.rejectWithValue(errorResponse);
    }
});
