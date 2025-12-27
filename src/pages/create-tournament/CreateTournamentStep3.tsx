import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import { createTournament } from '@/features/tournament/tournamentThunk';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import logger from '@/utils/logger';

interface Step3Props {
  formData: any;
  onBack: () => void;
  onUpdate: (data: any) => void;
  backTrigger?: number;
}

export default function CreateTournamentStep3({ formData, onBack, onUpdate, backTrigger }: Step3Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const lastBackTrigger = useRef(backTrigger || 0);

  useEffect(() => {
    if (backTrigger && backTrigger > lastBackTrigger.current) {
      lastBackTrigger.current = backTrigger;
      onBack();
    }
  }, [backTrigger]);

  // Get both availableCourts and availableFields
  const tournamentState = useAppSelector((state: any) => state.tournament);
  const { loading, error, availableCourts } = tournamentState;

  const [success, setSuccess] = useState(false);
  const [isEditingFee, setIsEditingFee] = useState(false);

  // FIXED: Use selectedCourtIds to get court details from availableCourts
  const selectedCourtIds = formData.selectedCourtIds || [];

  // Get court details from availableCourts (populated in Step 2)
  const selectedCourts = availableCourts?.filter((court: any) =>
    selectedCourtIds.includes(court._id)
  ) || [];

  // If no courts found in availableCourts, check formData directly
  const courtDetails = selectedCourts.length > 0
    ? selectedCourts
    : formData.courtDetails || [];

  // Calculate recommended fees
  const calculateRecommendedFees = () => {
    const totalFieldCost = formData.totalCourtCost || formData.totalFieldCost || 0;
    const capacity = formData.maxParticipants || 1;

    // Base fee on max capacity
    const breakEvenFee = Math.ceil((totalFieldCost / capacity) / 0.9);

    // Recommended fee to cover fields and have prize money
    const recommendedFee = Math.ceil(breakEvenFee * 1.3); // 30% above break-even

    // Premium fee for substantial prize pool
    const premiumFee = Math.ceil(breakEvenFee * 1.7);

    return {
      breakEvenFee,
      recommendedFee,
      premiumFee
    };
  };

  const recommendedFees = calculateRecommendedFees();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Chưa đặt ngày';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDeadline = () => {
    if (!formData.tournamentDate) return 'Chưa đặt ngày';
    const tournamentDate = new Date(formData.tournamentDate);
    const deadline = new Date(tournamentDate.getTime() - 48 * 60 * 60 * 1000);
    return deadline.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFeeChange = (fee: number) => {
    onUpdate({ ...formData, registrationFee: fee });
  };

  const handleSubmit = async () => {
    try {
      // Ensure we're sending the correct court data
      const tournamentData = {
        ...formData,
        // Make sure we're using court-related fields
        selectedCourtIds: formData.selectedCourtIds || [],
        courtsNeeded: formData.courtsNeeded || formData.fieldsNeeded || 1,
        totalCourtCost: formData.totalCourtCost || formData.totalFieldCost || 0,
        // For backward compatibility
        selectedFieldIds: formData.selectedCourtIds || [],
        fieldsNeeded: formData.courtsNeeded || formData.fieldsNeeded || 1,
        totalFieldCost: formData.totalCourtCost || formData.totalFieldCost || 0,
      };

      const result = await dispatch(createTournament(tournamentData)).unwrap();
      setSuccess(true);

      setTimeout(() => {
        navigate(`/tournaments/${result._id}`);
      }, 2000);
    } catch (err) {
      logger.error('Failed to create tournament:', err);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Tạo Giải Đấu Thành Công!</h2>
          <p className="text-gray-600 mb-4">
            Giải đấu của bạn đã được tạo và sân đã được đặt tạm thời.
          </p>
          <p className="text-sm text-gray-500">
            Đang chuyển hướng...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-white">
            <div className="h-3 bg-gradient-to-r from-green-500 to-blue-500 w-full" />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 px-3 py-1 font-bold">
                  {formData.sportType}
                </Badge>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Xác nhận thông tin</span>
                </div>
              </div>
              <CardTitle className="text-3xl font-black text-gray-900 leading-tight">
                {formData.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Description Preview */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-gray-600 italic">"{formData.description || 'Không có mô tả cho giải đấu này.'}"</p>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Thời gian thi đấu</div>
                    <div className="font-bold text-gray-900">{formatDate(formData.tournamentDate)}</div>
                    <div className="text-sm text-blue-600 font-semibold">{formData.startTime} - {formData.endTime}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Địa điểm thi đấu</p>
                    <p className="font-bold">{courtDetails[0]?.field?.location?.address || formData.location || "Chưa xác định"}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Quy mô giải</div>
                    <div className="font-bold text-gray-900">{formData.numberOfTeams} Đội</div>
                    <div className="text-sm text-gray-500">Tối đa {formData.maxParticipants} người</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Hạn chót đăng ký</div>
                    <div className="font-bold text-gray-900">{formatDate(formData.registrationEnd)}</div>
                    <div className="text-xs text-red-500 font-bold">Xác nhận trước {calculateDeadline()}</div>
                  </div>
                </div>
              </div>

              {/* Court List Preview */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Sân đấu đã chọn
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {courtDetails.length > 0 ? (
                    courtDetails.map((court: any) => (
                      <div key={court._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500">
                            {court.courtNumber}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">{court.field?.name}</div>
                            <div className="text-xs text-gray-500 line-clamp-1">{court.field?.location?.address}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-gray-100 font-bold">SÂN CON {court.courtNumber}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl text-center italic text-gray-500">Chưa có thông tin chi tiết sân.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Rules */}
          <Card className="border-0 shadow-lg bg-yellow-50/50">
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Quy định & Lưu ý
              </h3>
              <ul className="space-y-3">
                {[
                  "Sân sẽ được giữ tạm thời cho đến khi bạn xác nhận tạo giải.",
                  "Hệ thống sẽ hoàn phí 100% nếu giải đấu bị hủy do không đủ đội tham gia.",
                  "Phí hoa hồng 10% sẽ được khấu trừ từ tổng doanh thu đăng ký.",
                  `Hạn chót để giải đấu đạt đủ số lượng là ${calculateDeadline()}.`,
                  "Sau khi tạo, thông tin cơ bản sẽ không thể thay đổi trừ khi liên hệ hỗ trợ."
                ].map((rule, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-700 flex-shrink-0">
                      {i + 1}
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Financial Summary & Action */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl bg-white sticky top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Dự tính tài chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Registration Fee Selector */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-gray-600">Phí Đăng Ký / Người</Label>
                  {isEditingFee ? (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingFee(false)} className="h-6 text-green-600">Lưu</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingFee(true)} className="h-6 text-gray-400">Chỉnh sửa</Button>
                  )}
                </div>

                {isEditingFee ? (
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">đ</span>
                    <Input
                      type="number"
                      value={formData.registrationFee || 0}
                      onChange={(e) => handleFeeChange(Number(e.target.value))}
                      className="pl-8 text-lg font-bold border-2 border-green-200 focus:border-green-500 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-100 text-center">
                    <div className="text-3xl font-black text-green-700">
                      {(formData.registrationFee || 0).toLocaleString()}đ
                    </div>
                    <div className="text-[10px] text-green-600 uppercase font-black tracking-widest mt-1">Mỗi người tham gia</div>
                  </div>
                )}

                {/* Recommendations */}
                {!isEditingFee && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeeChange(recommendedFees.breakEvenFee)}
                      className="text-[10px] h-auto py-2 flex flex-col items-center gap-1"
                    >
                      <span className="text-gray-400">Hòa vốn</span>
                      <span className="font-bold">{recommendedFees.breakEvenFee.toLocaleString()}đ</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeeChange(recommendedFees.recommendedFee)}
                      className="text-[10px] h-auto py-2 flex flex-col items-center gap-1 border-green-200 bg-green-50/50"
                    >
                      <span className="text-green-600">Đề xuất</span>
                      <span className="font-bold text-green-700">{recommendedFees.recommendedFee.toLocaleString()}đ</span>
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Financial Break-down */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tiền thuê sân</span>
                  <span className="font-bold">{(formData.totalCourtCost || 0).toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hoa hồng hệ thống (10%)</span>
                  <span className="font-bold">-{(((formData.registrationFee || 0) * (formData.maxParticipants || 1)) * 0.1).toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                  <span className="font-bold text-gray-900">Doanh thu dự kiến</span>
                  <Badge className="bg-blue-600 text-white border-0 font-bold rounded-lg px-2">
                    {(((formData.registrationFee || 0) * (formData.maxParticipants || 1)) * 0.9 - (formData.totalCourtCost || 0)).toLocaleString()} VNĐ
                  </Badge>
                </div>
                <p className="text-[10px] text-gray-400 italic text-center">
                  *Doanh thu sau khi đã trừ phí thuê sân và hoa hồng
                </p>
              </div>

              <div className="space-y-3 pt-6">
                <Button
                  onClick={handleSubmit}
                  className="w-full py-8 text-xl font-black bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                  disabled={loading || !formData.registrationFee || formData.registrationFee <= 0}
                >
                  {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN TẠO'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="w-full text-gray-400 font-bold hover:text-gray-600"
                  disabled={loading}
                >
                  Quay lại chỉnh sửa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}