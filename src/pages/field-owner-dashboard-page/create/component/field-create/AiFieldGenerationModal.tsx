import { useState, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Wand2 } from 'lucide-react';
import { SPORT_TYPE_OPTIONS } from '@/utils/constant-value/constant';
interface AiFieldGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
}

export const AiFieldGenerationModal = memo(({
    isOpen,
    onClose,
    onGenerate,
    isLoading
}: AiFieldGenerationModalProps) => {
    const [name, setName] = useState('');
    const [sportType, setSportType] = useState('football');
    const [address, setAddress] = useState('');
    const [price, setPrice] = useState(''); // e.g., "150000"
    const [openTime, setOpenTime] = useState('06:00');
    const [closeTime, setCloseTime] = useState('22:00');
    const [freeAmenities, setFreeAmenities] = useState('');
    const [paidServices, setPaidServices] = useState('');
    const [description, setDescription] = useState('');
    const [numberOfCourts, setNumberOfCourts] = useState('1');

    const handleGenerate = () => {
        // Construct the prompt
        // Mẫu: "Tên sân: [Name]. Môn thể thao: [Sport]. Địa chỉ: [Address]. Giá thuê khoảng: [Price]. Giờ mở cửa: [Hours]. Mô tả thêm: [Description]."
        const promptParts: string[] = [];

        if (name) promptParts.push(`Tên sân: ${name}`);
        if (sportType) promptParts.push(`Môn thể thao: ${sportType === 'football' ? 'Bóng đá' : sportType === 'badminton' ? 'Cầu lông' : sportType === 'pickleball' ? 'Pickleball' : sportType}`);
        if (address) promptParts.push(`Địa chỉ: ${address}`);
        if (numberOfCourts) promptParts.push(`Số lượng sân: ${numberOfCourts}`);
        if (price) promptParts.push(`Giá thuê trung bình: ${price} VND/giờ`);
        if (openTime && closeTime) promptParts.push(`Giờ hoạt động: ${openTime} - ${closeTime}`);
        if (freeAmenities) promptParts.push(`Tiện ích miễn phí (có sẵn): ${freeAmenities}`);
        if (paidServices) promptParts.push(`Dịch vụ trả phí (thuê/mua thêm): ${paidServices}`);
        if (description) promptParts.push(`Mô tả thêm và quy định: ${description}`);

        const fullPrompt = promptParts.join('. ') + ". Hãy tạo dữ liệu chi tiết cho sân này bao gồm các khung giờ giá chi tiết và quy định.";

        onGenerate(fullPrompt);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-emerald-600">
                        <Wand2 className="w-5 h-5" />
                        AI Hỗ trợ tạo sân
                    </DialogTitle>
                    <DialogDescription>
                        Điền các thông tin cơ bản bên dưới, AI sẽ giúp bạn viết mô tả chi tiết, tạo bảng giá và thiết lập giờ hoạt động.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-name">Tên sân bãi <span className="text-red-500">*</span></Label>
                            <Input
                                id="ai-name"
                                placeholder="VD: Sân Bóng Chân Mây"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ai-sport">Môn thể thao</Label>
                            <Select value={sportType} onValueChange={setSportType}>
                                <SelectTrigger id="ai-sport">
                                    <SelectValue placeholder="Chọn môn" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SPORT_TYPE_OPTIONS.filter(sport => sport.value !== "all").map((sport) => (
                                        <SelectItem key={sport.value} value={sport.value}>
                                            {sport.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ai-address">Địa chỉ / Khu vực <span className="text-red-500">*</span></Label>
                        <Input
                            id="ai-address"
                            placeholder="VD: Quận Cẩm Lệ, Đà Nẵng"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-navail">Số lượng sân</Label>
                            <Input
                                id="ai-navail"
                                type="number"
                                min="1"
                                placeholder="1"
                                value={numberOfCourts}
                                onChange={(e) => setNumberOfCourts(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="ai-price">Giá thuê trung bình (VND/h)</Label>
                            <Input
                                id="ai-price"
                                placeholder="VD: 200000"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-open">Giờ mở cửa</Label>
                            <Input
                                id="ai-open"
                                type="time"
                                value={openTime}
                                onChange={(e) => setOpenTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-close">Giờ đóng cửa</Label>
                            <Input
                                id="ai-close"
                                type="time"
                                value={closeTime}
                                onChange={(e) => setCloseTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-free">Tiện ích miễn phí (Có sẵn)</Label>
                            <Textarea
                                id="ai-free"
                                placeholder="VD: Wifi, Bãi đỗ xe, Tủ đồ..."
                                className="h-24 resize-none"
                                value={freeAmenities}
                                onChange={(e) => setFreeAmenities(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ai-paid">Dịch vụ trả phí (Thuê/Mua)</Label>
                            <Textarea
                                id="ai-paid"
                                placeholder="VD: Thuê giày, Nước uống, Thuê trọng tài..."
                                className="h-24 resize-none"
                                value={paidServices}
                                onChange={(e) => setPaidServices(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ai-desc">Mô tả thêm / Quy định</Label>
                        <Textarea
                            id="ai-desc"
                            placeholder="VD: Cấm hút thuốc, cấm đem đồ ăn vào sân..."
                            className="h-24 resize-none"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading || !name.trim() || !address.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang AI xử lý...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" />
                                Tạo thông tin
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
