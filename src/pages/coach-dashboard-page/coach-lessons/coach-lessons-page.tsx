"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin, DollarSign, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoachDashboardLayout } from "@/components/layouts/coach-dashboard-layout";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { getAllFields } from "@/features/field";
import { createLessonType } from "@/features/lesson-types";
import { CustomSuccessToast, CustomFailedToast } from "@/components/toast/notificiation-toast";
import logger from "@/utils/logger";
// Mock field data (fallback)
const mockFields = [
  {
    id: "1",
    name: "Sân Bóng Đá Thảo Điền",
    location: "Quận 2, TP. Hồ Chí Minh",
    price: "300,000 VNĐ/giờ",
    avatar: "/soccer-field.png",
    sportType: "Bóng đá",
  },
  {
    id: "2",
    name: "Sân Tennis Riverside",
    location: "Quận 7, TP. Hồ Chí Minh",
    price: "250,000 VNĐ/giờ",
    avatar: "/outdoor-tennis-court.png",
    sportType: "Quần vợt",
  },
  {
    id: "3",
    name: "Sân Cầu Lông Phú Nhuận",
    location: "Quận Phú Nhuận, TP. Hồ Chí Minh",
    price: "150,000 VNĐ/giờ",
    avatar: "/badminton-court.png",
    sportType: "Cầu lông",
  },
  {
    id: "4",
    name: "Sân Bóng Rổ Bình Thạnh",
    location: "Quận Bình Thạnh, TP. Hồ Chí Minh",
    price: "200,000 VNĐ/giờ",
    avatar: "/outdoor-basketball-court.png",
    sportType: "Bóng rổ",
  },
  {
    id: "5",
    name: "Sân Pickleball Central Park",
    location: "Quận 1, TP. Hồ Chí Minh",
    price: "180,000 VNĐ/giờ",
    avatar: "/pickleball-court.jpg",
    sportType: "Pickleball",
  },
  {
    id: "6",
    name: "Sân Bóng Chuyền Biển",
    location: "Quận 7, TP. Hồ Chí Minh",
    price: "220,000 VNĐ/giờ",
    avatar: "/outdoor-volleyball-court.png",
    sportType: "Bóng chuyền",
  },
];

export default function CoachLessonsPage() {
  const dispatch = useAppDispatch();
  const fieldState = useAppSelector((s) => s.field);

  useEffect(() => {
    dispatch(getAllFields());
  }, [dispatch]);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 form data
  const [lessonType, setLessonType] = useState("");
  const [lessonName, setLessonName] = useState("");
  const [description, setDescription] = useState("");
  const [lessonPrice, setLessonPrice] = useState("");

  // Step 2 form data
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSportType, setFilterSportType] = useState("all");

  const fieldsFromStore = Array.isArray(fieldState?.fields) ? fieldState.fields : [];

  const formatPrice = (v: any) => {
    const n = Number(v) || 0;
    try {
      return new Intl.NumberFormat("vi-VN").format(n) + " VNĐ/giờ";
    } catch {
      return `${n} VNĐ/giờ`;
    }
  };

  const uiFields = (fieldsFromStore.length > 0
    ? fieldsFromStore.map((f: any) => ({
      id: f.id,
      name: f.name,
      location: typeof f.location === 'string' ? f.location : (f.location?.address ?? ""),
      price: f.price || formatPrice(f.basePrice),
      avatar: Array.isArray(f.images) && f.images.length > 0 ? f.images[0] : undefined,
      sportType: f.sportType || "",
    }))
    : mockFields) as any[];

  const filteredFields = uiFields.filter((field) => {
    const matchesName = field.name
      .toLowerCase()
      .includes(filterName.toLowerCase());
    const matchesLocation = field.location
      .toLowerCase()
      .includes(filterLocation.toLowerCase());
    const matchesSportType =
      filterSportType === "all" || field.sportType === filterSportType;
    return matchesName && matchesLocation && matchesSportType;
  });

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleNextStep = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };



  const [creating, setCreating] = useState(false);

  const handleCreateLessonAsync = async () => {
    if (selectedFields.length === 0) return;
    setCreating(true);
    try {
      const payloads = selectedFields.map((fieldId) => ({
        type: lessonType,
        name: lessonName,
        description,
        field: fieldId,
        lessonPrice: Number(lessonPrice || 0),
      }));

      const promises = payloads.map((p) => dispatch(createLessonType(p)).unwrap());
      const results = await Promise.all(promises);
      logger.debug("Created lesson types:", results);
      CustomSuccessToast("Tạo buổi học thành công!");
      // reset form
      setStep(1);
      setLessonType("");
      setLessonName("");
      setDescription("");
      setLessonPrice("");
      setSelectedFields([]);
    } catch (err: any) {
      logger.error("Failed creating lesson types:", err);
      CustomFailedToast(err?.message || "Tạo buổi học thất bại");
    } finally {
      setCreating(false);
    }
  };

  return (
    <CoachDashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-green-700 mb-2">
              Tạo Buổi Học
            </h1>
            <p className="text-gray-600">
              {step === 1
                ? "Điền thông tin buổi học của bạn"
                : "Chọn sân để gắn với buổi học"}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8 flex items-center gap-2">
            <div
              className={`flex-1 h-2 rounded-full ${step >= 1 ? "bg-green-600" : "bg-gray-200"
                }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${step >= 2 ? "bg-green-600" : "bg-gray-200"
                }`}
            />
          </div>

          {/* Step 1: Lesson Information */}
          {step === 1 && (
            <Card className="border-2 border-green-100">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="lessonType"
                    className="text-base font-semibold"
                  >
                    Loại buổi học <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    {["single", "pair", "group"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setLessonType(type)}
                        className={`p-4 rounded-lg border-2 transition-all font-semibold capitalize ${lessonType === type
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-green-300"
                          }`}
                      >
                        {type === "single"
                          ? "Cá nhân"
                          : type === "pair"
                            ? "Cặp đôi"
                            : "Nhóm"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="lessonName"
                    className="text-base font-semibold"
                  >
                    Tên buổi học <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lessonName"
                    placeholder="VD: Buổi học tennis cơ bản"
                    value={lessonName}
                    onChange={(e) => setLessonName(e.target.value)}
                    className="border-gray-300 focus:border-green-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-base font-semibold"
                  >
                    Mô tả
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Mô tả chi tiết về buổi học..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="border-gray-300 focus:border-green-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="lessonPrice"
                    className="text-base font-semibold"
                  >
                    Giá buổi học (VNĐ)
                  </Label>
                  <Input
                    id="lessonPrice"
                    type="number"
                    placeholder="500,000"
                    value={lessonPrice}
                    onChange={(e) => setLessonPrice(e.target.value)}
                    className="border-gray-300 focus:border-green-600"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNextStep}
                    disabled={!lessonType || !lessonName}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold"
                  >
                    Tiếp Theo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Fields */}
          {step === 2 && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-4 text-green-700 hover:text-green-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>

              <Card className="border-2 border-green-100">
                <CardContent className="p-6 space-y-4">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Chọn sân
                    </h3>
                    <p className="text-sm text-gray-600">
                      Chọn các sân bạn muốn gắn với buổi học này
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3">Bộ lọc</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="filterName"
                          className="text-sm font-medium"
                        >
                          Tên sân
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="filterName"
                            placeholder="Tìm kiếm tên sân..."
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            className="pl-10 border-gray-300 focus:border-green-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="filterLocation"
                          className="text-sm font-medium"
                        >
                          Địa điểm
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="filterLocation"
                            placeholder="Tìm kiếm địa điểm..."
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            className="pl-10 border-gray-300 focus:border-green-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="filterSportType"
                          className="text-sm font-medium"
                        >
                          Thể loại
                        </Label>
                        <Select
                          value={filterSportType}
                          onValueChange={setFilterSportType}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-green-600">
                            <SelectValue placeholder="Chọn thể loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="Bóng đá">Bóng đá</SelectItem>
                            <SelectItem value="Quần vợt">Quần vợt</SelectItem>
                            <SelectItem value="Cầu lông">Cầu lông</SelectItem>
                            <SelectItem value="Pickleball">
                              Pickleball
                            </SelectItem>
                            <SelectItem value="Bóng rổ">Bóng rổ</SelectItem>
                            <SelectItem value="Bóng chuyền">
                              Bóng chuyền
                            </SelectItem>
                            <SelectItem value="Bơi lội">Bơi lội</SelectItem>
                            <SelectItem value="Phòng gym">Phòng gym</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {fieldState.loading ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loading size={40} className="text-green-600" />
                        <p className="text-gray-500 text-sm">Đang tải danh sách sân...</p>
                      </div>
                    ) : filteredFields.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Không tìm thấy sân phù hợp với bộ lọc</p>
                      </div>
                    ) : (
                      filteredFields.map((field) => (
                        <div
                          key={field.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedFields.includes(field.id)
                            ? "border-green-600 bg-green-50"
                            : "border-gray-200 hover:border-green-300"
                            }`}
                          onClick={() => handleFieldToggle(field.id)}
                        >
                          <Checkbox
                            checked={selectedFields.includes(field.id)}
                            onCheckedChange={() => handleFieldToggle(field.id)}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />

                          <Avatar className="h-16 w-16 border-2 border-green-100">
                            <AvatarImage
                              src={field.avatar || "/placeholder.svg"}
                              alt={field.name}
                            />
                            <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                              {field.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">
                              {field.name}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-4 w-4" />
                                <span
                                  className="truncate block max-w-full overflow-hidden"
                                  title={field.location}
                                  aria-label={field.location}
                                >
                                  {field.location}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-green-700 font-semibold">
                                <DollarSign className="h-4 w-4" />
                                <span>{field.price}</span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
                                {field.sportType}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="px-8 py-6 text-lg font-semibold bg-transparent"
                    >
                      Quay lại
                    </Button>
                    <Button
                      onClick={handleCreateLessonAsync}
                      disabled={creating || selectedFields.length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold gap-2"
                    >
                      {creating && <Loading size={20} />}
                      {creating ? "Đang tạo..." : "Tạo Buổi Học"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </CoachDashboardLayout>
  );
}
