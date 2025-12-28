import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAppSelector, useAppDispatch } from "@/store/hook"
import { toast } from "sonner"
import { Building2, MapPin, Phone } from "lucide-react"
import {
    getMyOwnerProfile,
    updateMyOwnerProfile,
    createOwnerProfile
} from "@/features/field-owner-profile"

export default function FieldOwnerTab() {
    const dispatch = useAppDispatch()
    const { user } = useAppSelector((state) => state.auth)
    const authUser = useAppSelector((state) => state.auth.user)
    const ownerProfileState = useAppSelector((state) => state.ownerProfile)
    const { myProfile, loading, creating, updating } = ownerProfileState

    const [formData, setFormData] = useState({
        facilityName: "",
        facilityLocation: "",
        description: "",
        businessHours: "",
        contactPhone: "",
        website: "",
        businessEmail: "",
    })
    const [isEditing, setIsEditing] = useState(false)

    // Fetch field owner profile data on component mount
    useEffect(() => {
        if (authUser?._id && authUser?.role === "field_owner") {
            dispatch(getMyOwnerProfile())
        }
    }, [authUser?._id, dispatch])

    // Update form data when field owner data is loaded
    useEffect(() => {
        if (authUser?.role !== "field_owner") return

        // Prefer profile values, fall back to user for email/phone
        if (myProfile) {
            setFormData({
                facilityName: myProfile.facilityName || "",
                facilityLocation: myProfile.facilityLocation || "",
                description: myProfile.description || "",
                businessHours: myProfile.businessHours || "",
                contactPhone: myProfile.contactPhone || user?.phone || "",
                website: myProfile.website || "",
                businessEmail: user?.email || "",
            })
            // Existing profile: default to view mode
            setIsEditing(false)
        } else if (user) {
            setFormData((prev) => ({
                ...prev,
                contactPhone: user.phone || "",
                businessEmail: user.email || "",
            }))
            // No profile yet: allow editing to create
            setIsEditing(true)
        }
    }, [myProfile, user, authUser?.role])

    // Handle input changes
    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Handle form submit
    const handleSubmit = async () => {
        if (!authUser?._id || authUser?.role !== "field_owner") {
            toast.error("Từ chối truy cập. Cần quyền chủ sân.")
            return
        }

        try {
            const payload = {
                facilityName: formData.facilityName,
                facilityLocation: formData.facilityLocation || undefined,
                description: formData.description || undefined,
                businessHours: formData.businessHours || undefined,
                contactPhone: formData.contactPhone || undefined,
                website: formData.website || undefined,
            }

            if (myProfile?.id) {
                await dispatch(updateMyOwnerProfile(payload as any)).unwrap()
                toast.success("Cập nhật hồ sơ chủ sân thành công!")
                setIsEditing(false)
            } else {
                await dispatch(createOwnerProfile(payload as any)).unwrap()
                toast.success("Tạo hồ sơ chủ sân thành công!")
                setIsEditing(false)
            }
        } catch (error: any) {
            toast.error(error?.message || "Thao tác với hồ sơ chủ sân thất bại")
        }
    }

    // Handle toggle edit mode via "Đặt lại" button
    const handleReset = () => {
        if (!authUser?._id || authUser?.role !== "field_owner") return
        // If currently editing, turn off edit mode and reset to last saved values
        if (isEditing) {
            if (myProfile) {
                setFormData({
                    facilityName: myProfile.facilityName || "",
                    facilityLocation: myProfile.facilityLocation || "",
                    description: myProfile.description || "",
                    businessHours: myProfile.businessHours || "",
                    contactPhone: myProfile.contactPhone || user?.phone || "",
                    website: myProfile.website || "",
                    businessEmail: user?.email || "",
                })
            } else if (user) {
                setFormData({
                    facilityName: "",
                    facilityLocation: "",
                    description: "",
                    businessHours: "",
                    contactPhone: user.phone || "",
                    website: "",
                    businessEmail: user.email || "",
                })
            }
            setIsEditing(false)
        } else {
            // If currently not editing, enable edit mode
            setIsEditing(true)
        }
    }

    return (
        <>
            <Card className="w-full bg-white rounded-[10px] shadow-[0px_4px_44px_0px_rgba(211,211,211,0.25)] border-0">
                <CardContent className="p-6">
                    <div className="space-y-10">
                        {/* Header Section */}
                        <div className="flex items-center gap-3 pb-5 border-b border-gray-200">
                            <Building2 className="w-6 h-6 text-gray-600" />
                            <h2 className="text-xl font-semibold text-gray-800">
                                Thông tin Chủ sân
                            </h2>
                        </div>

                        {/* Business Information */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2.5 md:col-span-2">
                                    <Label className="text-base font-normal text-start">
                                        Tên cơ sở *
                                    </Label>
                                    <Input
                                        value={formData.facilityName}
                                        onChange={(e) => handleInputChange('facilityName', e.target.value)}
                                        placeholder="Nhập tên cơ sở"
                                        className="h-14 p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385]"
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>



                            <div className="space-y-2.5">
                                <Label className="text-base font-normal text-start">
                                    Mô tả
                                </Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Mô tả về cơ sở của bạn..."
                                    className="min-h-[100px] p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385] resize-none"
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                                <Phone className="w-5 h-5" />
                                Thông tin liên hệ
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <Label className="text-base font-normal text-start">
                                        Số điện thoại liên hệ
                                    </Label>
                                    <Input
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                                        placeholder="Nhập số điện thoại liên hệ"
                                        className="h-14 p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385]"
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <Label className="text-base font-normal text-start">
                                        Email
                                    </Label>
                                    <Input
                                        type="email"
                                        value={formData.businessEmail}
                                        onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                                        placeholder="Nhập email"
                                        className="h-14 p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385]"
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-base font-normal text-start flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Địa chỉ cơ sở
                                </Label>
                                <Textarea
                                    value={formData.facilityLocation}
                                    onChange={(e) => handleInputChange('facilityLocation', e.target.value)}
                                    placeholder="Nhập địa chỉ cơ sở..."
                                    className="min-h-[80px] p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385] resize-none"
                                    disabled={!isEditing}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <Label className="text-base font-normal text-start">
                                        Giờ hoạt động
                                    </Label>
                                    <Input
                                        value={formData.businessHours}
                                        onChange={(e) => handleInputChange('businessHours', e.target.value)}
                                        placeholder="Ví dụ: Thứ 2-CN: 6:00-22:00"
                                        className="h-14 p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385]"
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-base font-normal text-start">
                                        Website
                                    </Label>
                                    <Input
                                        value={formData.website}
                                        onChange={(e) => handleInputChange('website', e.target.value)}
                                        placeholder="https://example.com"
                                        className="h-14 p-5 bg-gray-50 rounded-[10px] border-0 text-base font-normal text-[#6B7385] placeholder:text-[#6B7385]"
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Field Owner Status */}
                        <div className="space-y-4 p-4 bg-blue-50 rounded-[10px] border border-blue-200">
                            <h4 className="text-base font-medium text-blue-800">
                                Trạng thái Chủ sân
                            </h4>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 ${myProfile?.isVerified ? 'bg-green-500' : 'bg-yellow-500'} rounded-full`}></div>
                                <span className="text-sm text-blue-700">
                                    {myProfile?.isVerified ? 'Tài khoản chủ sân của bạn đã được xác minh' : 'Tài khoản chủ sân của bạn đang chờ xác minh'}
                                </span>
                            </div>
                            {typeof myProfile?.rating === 'number' && (
                                <p className="text-sm text-blue-600">
                                    Đánh giá: {myProfile.rating} ({myProfile.totalReviews || 0} lượt)
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-5 pt-5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                                className="min-w-24 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 rounded-[10px] text-base font-medium"
                            >
                                {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!isEditing || loading || creating || updating || !formData.facilityName}
                                className="min-w-36 px-6 py-3.5 bg-gray-800 hover:bg-gray-900 text-white rounded-[10px] text-base font-medium"
                            >
                                {myProfile ? (updating ? 'Đang lưu...' : 'Lưu thay đổi') : (creating ? 'Đang tạo...' : 'Tạo hồ sơ')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}


