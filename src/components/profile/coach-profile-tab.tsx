import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector, useAppDispatch } from "@/store/hook"
import { getCoachById, updateCoach } from "@/features/coach/coachThunk"
import { toast } from "sonner"
import { Trophy, Star, MapPin, Upload, X, Search, Image as ImageIcon } from "lucide-react"
import logger from "@/utils/logger"
import { VIETNAM_CITIES } from "@/utils/constant-value/constant"
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function CoachProfileTab() {
    const dispatch = useAppDispatch()

    const authUser = useAppSelector((state) => state.auth.user)

    const [formData, setFormData] = useState({
        specialization: [] as string[],
        experience: "",
        certifications: "",
        hourlyRate: "",
        bio: "",
        achievements: "",
        rank: "",
        isCoachActive: true,
    })

    // Gallery state
    interface GalleryItemState {
        id: string;
        url: string;
        file?: File;
        type: 'existing' | 'new';
    }
    const [galleryItems, setGalleryItems] = useState<GalleryItemState[]>([])

    // Location state
    const [editableLocation, setEditableLocation] = useState<string>("")
    const [locationCoordinates, setLocationCoordinates] = useState<[number, number] | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [selectedCity, setSelectedCity] = useState<string>('all')

    // Leaflet map refs
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markerRef = useRef<L.Marker | null>(null)

    // Constants for map
    const DEFAULT_CENTER: [number, number] = [10.776889, 106.700806]
    const MAP_CONFIG = {
        zoom: 13,
        maxZoom: 19,
        flyToZoom: 14,
        flyToDuration: 1.2,
        flyToEaseLinearity: 0.25
    }

    // Fetch coach profile data on component mount
    useEffect(() => {
        if (authUser?._id && authUser?.role === "coach") {
            // Fetch full coach detail (backend expects user id for /coaches/:id)
            dispatch(getCoachById(authUser._id as string));
        }
    }, [authUser?._id, dispatch])

    // current coach from redux
    const currentCoach = useAppSelector((s) => s.coach.currentCoach)
    const detailLoading = useAppSelector((s) => s.coach.detailLoading)

    // Update form data when coach data is loaded
    useEffect(() => {
        if (currentCoach && authUser?.role === "coach") {
            // Parse sports string to array
            let sportsArray: string[] = [];
            const sportsData = (currentCoach as any).sports;
            if (typeof sportsData === 'string' && sportsData.trim()) {
                sportsArray = sportsData.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(sportsData)) {
                sportsArray = sportsData;
            }

            const priceNum = (currentCoach as any)?.price ?? 0;
            const coachActiveStatus = (currentCoach as any)?.isCoachActive ?? true;

            setFormData({
                specialization: sportsArray,
                experience: (currentCoach as any)?.coachingDetails?.experience ?? "",
                certifications: (currentCoach as any)?.coachingDetails?.certification ?? "",
                hourlyRate: typeof priceNum === 'number' ? String(priceNum) : "",
                bio: (currentCoach as any)?.description ?? "",
                achievements: "",
                rank: (currentCoach as any)?.level ?? "",
                isCoachActive: coachActiveStatus,
            })

            // Initialize gallery items
            const apiGallery = (currentCoach as any)?.galleryImages || [];
            setGalleryItems(apiGallery.map((url: string, idx: number) => ({
                id: `existing-${idx}-${url.substring(url.length - 10)}`,
                url,
                type: 'existing'
            })));

            // Initialize location
            const rawLocation = (currentCoach as any)?.location || "";
            const location = typeof rawLocation === 'string'
                ? rawLocation.trim()
                : (rawLocation?.address || "").trim();
            setEditableLocation(location);
        }
    }, [currentCoach, authUser?.role])

    // Handle input changes
    const handleInputChange = (field: string, value: string) => {
        if (field === 'isCoachActive') {
            setFormData(prev => ({ ...prev, [field]: value === 'true' }))
        } else {
            setFormData(prev => ({ ...prev, [field]: value }))
        }
    }

    const handleToggleSpecialization = (value: string) => {
        setFormData(prev => {
            const current = prev.specialization as string[]
            if (current.includes(value)) {
                return { ...prev, specialization: current.filter(v => v !== value) }
            }
            // Validate max 3 sports
            if (current.length >= 3) {
                toast.error("Tối đa 3 môn thể thao")
                return prev
            }
            return { ...prev, specialization: [...current, value] }
        })
    }

    // Handle form submit
    const handleSubmit = async () => {
        if (!authUser?._id || authUser?.role !== "coach") {
            toast.error("Truy cập bị từ chối. Yêu cầu vai trò huấn luyện viên.")
            return
        }

        // Validate sports selection
        if (formData.specialization.length === 0) {
            toast.error("Vui lòng chọn ít nhất một môn thể thao")
            return
        }

        if (formData.specialization.length > 3) {
            toast.error("Tối đa 3 môn thể thao")
            return
        }

        try {
            await dispatch(updateCoach({
                id: authUser._id as string,
                data: {
                    bio: formData.bio,
                    sports: formData.specialization.join(','),
                    certification: formData.certifications,
                    rank: formData.rank,
                    experience: formData.experience,
                    hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
                    isCoachActive: formData.isCoachActive,
                }
            })).unwrap()

            toast.success("Cập nhật hồ sơ huấn luyện viên thành công!")
        } catch (error: any) {
            toast.error(error?.message || "Cập nhật hồ sơ huấn luyện viên thất bại")
        }
    }

    // Handle reset form
    const handleReset = () => {
        setFormData({
            specialization: [],
            experience: "",
            certifications: "",
            hourlyRate: "",
            bio: "",
            achievements: "",
            rank: "",
            isCoachActive: true,
        })
        setGalleryItems([])
        setEditableLocation("")
        setLocationCoordinates(null)
    }

    // Gallery images computed
    const galleryImages = useMemo(() => {
        if (galleryItems.length > 0) {
            return galleryItems.map((item, index) => ({
                url: item.url,
                alt: `Gallery image ${index + 1}`
            }));
        }
        return [];
    }, [galleryItems]);

    // Handle gallery image upload
    const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setGalleryItems(prev => [...prev, {
                    id: `new-${Date.now()}-${Math.random()}`,
                    url: reader.result as string,
                    file,
                    type: 'new'
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // Handle remove gallery image
    const handleRemoveGalleryImage = (id: string) => {
        setGalleryItems(prev => prev.filter(item => item.id !== id));
    };

    // Geocoding utilities
    const searchLocation = async (query: string) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
            }
        } catch (error) {
            logger.error('Geocoding error:', error);
        }
        return null;
    };

    const reverseGeocode = async (lat: number, lon: number) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            return data.display_name ?? null;
        } catch {
            return null;
        }
    };

    // Update map position
    const updateMapPosition = useCallback((lat: number, lng: number, address: string) => {
        if (!mapRef.current || !markerRef.current) return;
        setLocationCoordinates([lat, lng]);
        setEditableLocation(address);
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), MAP_CONFIG.flyToZoom), {
            duration: MAP_CONFIG.flyToDuration,
            easeLinearity: MAP_CONFIG.flyToEaseLinearity,
        });
    }, []);

    // Handle search location
    const handleSearchLocation = useCallback(async () => {
        const query = editableLocation.trim();
        if (!query || !mapRef.current || !markerRef.current) return;
        setIsSearching(true);
        try {
            const result = await searchLocation(query);
            if (result) {
                updateMapPosition(result.lat, result.lon, result.display_name);
            } else {
                toast.error("Không tìm thấy địa điểm phù hợp");
            }
        } catch (error) {
            logger.error('Geocoding error:', error);
            toast.error("Có lỗi xảy ra khi tìm kiếm địa điểm");
        } finally {
            setIsSearching(false);
        }
    }, [editableLocation, updateMapPosition]);

    // Handle city select
    const handleCitySelect = useCallback(async (value: string) => {
        setSelectedCity(value);
        if (value === 'all' || !value) return;
        setIsSearching(true);
        try {
            const result = await searchLocation(value + ', Vietnam');
            if (result) {
                updateMapPosition(result.lat, result.lon, result.display_name);
            } else {
                toast.error('Không tìm thấy thành phố');
            }
        } catch (error) {
            logger.error('City geocoding error:', error);
            toast.error('Có lỗi xảy ra khi tìm kiếm thành phố');
        } finally {
            setIsSearching(false);
        }
    }, [updateMapPosition]);

    // Initialize Leaflet map
    useEffect(() => {
        if (mapRef.current || !mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: DEFAULT_CENTER,
            zoom: MAP_CONFIG.zoom,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: MAP_CONFIG.maxZoom,
        }).addTo(map);

        const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const marker = L.marker(DEFAULT_CENTER, {
            draggable: true,
            icon: defaultIcon
        }).addTo(map);

        marker.on('dragend', async () => {
            const pos = marker.getLatLng();
            setLocationCoordinates([pos.lat, pos.lng]);
            const addr = await reverseGeocode(pos.lat, pos.lng);
            if (addr) setEditableLocation(addr);
        });

        map.on('click', async (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            setLocationCoordinates([lat, lng]);
            const addr = await reverseGeocode(lat, lng);
            if (addr) setEditableLocation(addr);
        });

        markerRef.current = marker;
        mapRef.current = map;

        setTimeout(() => map.invalidateSize(), 100);

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    return (
        <Card className="w-full bg-white rounded-[10px] shadow-[0px_4px_44px_0px_rgba(211,211,211,0.25)] border-0">
            <CardContent className="p-6">
                <div className="space-y-10">
                    {/* Header Section */}
                    <div className="flex items-center gap-3 pb-5 border-b border-gray-200">
                        <Trophy className="w-6 h-6 text-yellow-600" />
                        <h2 className="text-xl font-semibold text-gray-800">
                            Thông tin hồ sơ huấn luyện viên
                        </h2>
                    </div>

                    {/* Coaching Information */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-700">
                            Chi tiết huấn luyện
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label className="text-base font-normal text-start">
                                    Chuyên môn *
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {['football', 'basketball', 'tennis', 'badminton', 'swimming', 'volleyball', 'pickleball', 'gym'].map((spec) => (
                                        <label key={spec} className="inline-flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-md cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(formData.specialization as string[]).includes(spec)}
                                                onChange={() => handleToggleSpecialization(spec)}
                                                className="w-4 h-4"
                                            />
                                            <span className="capitalize">{spec}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-base font-normal text-start">
                                    Kinh nghiệm
                                </Label>
                                <Textarea
                                    value={formData.experience}
                                    onChange={(e) => handleInputChange('experience', e.target.value)}
                                    placeholder="Mô tả kinh nghiệm, nền tảng và phương pháp huấn luyện của bạn..."
                                    className="min-h-[100px] p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385] resize-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label className="text-base font-normal text-start">
                                    Giá theo giờ (VND)
                                </Label>
                                <input
                                    type="number"
                                    value={formData.hourlyRate}
                                    onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                                    placeholder="Nhập giá theo giờ"
                                    className="w-full h-14 p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385]"
                                />
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-base font-normal text-start">
                                    Cấp độ
                                </Label>
                                <Select value={formData.rank} onValueChange={(value) => handleInputChange('rank', value)}>
                                    <SelectTrigger className="h-14 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385]">
                                        <SelectValue placeholder="Chọn cấp độ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="novice">Mới bắt đầu</SelectItem>
                                        <SelectItem value="intermediate">Trung cấp</SelectItem>
                                        <SelectItem value="advanced">Nâng cao</SelectItem>
                                        <SelectItem value="expert">Chuyên gia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-[10px]">
                            <div className="flex flex-col gap-1">
                                <Label className="text-base font-medium text-gray-800">
                                    Trạng thái hoạt động
                                </Label>
                                <span className="text-sm text-gray-600">
                                    {formData.isCoachActive ? 'Đang nhận đặt lịch' : 'Tạm ngưng nhận đặt lịch'}
                                </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isCoachActive}
                                    onChange={(e) => handleInputChange('isCoachActive', String(e.target.checked))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-base font-normal text-start">
                                Chứng chỉ
                            </Label>
                            <Textarea
                                value={formData.certifications}
                                onChange={(e) => handleInputChange('certifications', e.target.value)}
                                placeholder="Liệt kê các chứng chỉ và bằng cấp của bạn..."
                                className="min-h-[100px] p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385] resize-none"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-base font-normal text-start">
                                Giới thiệu
                            </Label>
                            <Textarea
                                value={formData.bio}
                                onChange={(e) => handleInputChange('bio', e.target.value)}
                                placeholder="Chia sẻ về kinh nghiệm và triết lý huấn luyện của bạn..."
                                className="min-h-[120px] p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385] resize-none"
                            />
                        </div>

                        {/* Gallery Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium text-gray-800">
                                    Thư viện ảnh
                                </Label>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleGalleryUpload}
                                    />
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                        <Upload className="w-4 h-4" />
                                        <span className="text-sm">Tải ảnh lên</span>
                                    </div>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {galleryItems.map((item) => (
                                    <div key={item.id} className="relative group">
                                        <img
                                            src={item.url}
                                            alt="Gallery"
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => handleRemoveGalleryImage(item.id)}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {galleryItems.length === 0 && (
                                    <div className="col-span-2 md:col-span-4 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                                        <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500">Chưa có ảnh nào</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="space-y-4">
                            <Label className="text-base font-medium text-gray-800">
                                Vị trí
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Input
                                        value={editableLocation}
                                        onChange={(e) => setEditableLocation(e.target.value)}
                                        placeholder="Nhập địa chỉ..."
                                        className="h-12"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Select value={selectedCity} onValueChange={handleCitySelect}>
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder="Chọn thành phố" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            <SelectItem value="all">Tất cả</SelectItem>
                                            {VIETNAM_CITIES.map((city) => (
                                                <SelectItem key={city} value={city}>{city}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={handleSearchLocation}
                                        disabled={isSearching}
                                        className="h-12 px-4 bg-green-600 hover:bg-green-700"
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div
                                ref={mapContainerRef}
                                className="w-full h-[400px] rounded-lg border border-gray-300"
                            />
                        </div>

                        {/* <div className="space-y-2.5">
                            <Label className="text-base font-normal text-start">
                                Achievements
                            </Label>
                            <Textarea
                                value={formData.achievements}
                                onChange={(e) => handleInputChange('achievements', e.target.value)}
                                placeholder="List your achievements, awards, and notable accomplishments..."
                                className="min-h-[100px] p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385] resize-none"
                            />
                        </div> */}
                    </div>

                    {/* Coach Status */}
                    <div className="space-y-4 p-4 bg-yellow-50 rounded-[10px] border border-yellow-200">
                        <h4 className="text-base font-medium text-yellow-800 flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            Trạng thái huấn luyện viên
                        </h4>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-yellow-700">
                                Hồ sơ huấn luyện viên của bạn đang được xem xét
                            </span>
                        </div>
                        <p className="text-sm text-yellow-600">
                            Sau khi được phê duyệt, bạn có thể bắt đầu nhận đặt lịch và buổi huấn luyện.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-5 pt-5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="min-w-24 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 rounded-[10px] text-base font-medium"
                        >
                            Đặt lại
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={detailLoading}
                            className={`min-w-36 px-6 py-3.5 ${detailLoading ? 'bg-gray-500 cursor-wait' : 'bg-gray-800 hover:bg-gray-900'} text-white rounded-[10px] text-base font-medium`}
                        >
                            {detailLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


