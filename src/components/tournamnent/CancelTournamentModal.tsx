"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { useAppDispatch } from '@/store/hook';
import { cancelTournamentById } from '@/features/tournament/tournamentThunk';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import logger from '@/utils/logger';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CancelTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    onCancelled?: () => void;
}

export function CancelTournamentModal({ isOpen, onClose, tournamentId, onCancelled }: CancelTournamentModalProps) {
    const dispatch = useAppDispatch();
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleConfirm = async () => {
        // Validate reason
        if (!reason || reason.trim() === '') {
            setError('Vui lòng cung cấp lý do hủy giải đấu');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await dispatch(cancelTournamentById({ id: tournamentId, reason })).unwrap();
            const result = response.data || response;

            logger.debug('Cancellation response:', result);

            if (result.success) {
                setSuccess(true);
                // Auto close after 2 seconds
                setTimeout(() => {
                    handleClose();
                    onCancelled?.();
                }, 2000);
            } else {
                setError(result.message || "Hủy giải đấu thất bại");
            }
        } catch (err: any) {
            logger.error('Cancellation error:', err);
            setError(err.message || "Hủy giải đấu thất bại");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReason("");
        setError(null);
        setSuccess(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 ${success ? 'text-green-600' : 'text-red-600'}`}>
                        {success ? (
                            <CheckCircle className="h-5 w-5" />
                        ) : (
                            <AlertCircle className="h-5 w-5" />
                        )}
                        {success ? 'Hủy giải đấu thành công' : 'Hủy giải đấu'}
                    </DialogTitle>
                    <DialogDescription>
                        {success
                            ? 'Giải đấu đã được hủy. Các đội tham gia sẽ được thông báo.'
                            : 'Vui lòng xác nhận hủy giải đấu này.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-8 flex flex-col items-center gap-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <p className="text-center text-gray-600">
                            Giải đấu đã được hủy thành công.
                        </p>
                        <Button variant="outline" onClick={handleClose} className="mt-4">
                            Đóng
                        </Button>
                    </div>
                ) : (
                    <>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Lỗi</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4 py-4">
                            <Alert className="bg-orange-50 border-orange-200">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertTitle className="text-orange-800">Cảnh báo hệ thống Demerit</AlertTitle>
                                <AlertDescription className="text-orange-700">
                                    Việc hủy giải đấu thường xuyên trong thời gian ngắn sẽ khiến bạn bị <strong>cấm tạo giải đấu mới trong 1 năm</strong>. Vui lòng cân nhắc kỹ trước khi thực hiện.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Lý do hủy giải đấu *</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Vui lòng nhập lý do hủy giải đấu..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                Hủy bỏ
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loading size={16} className="mr-2" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    "Xác nhận hủy"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
