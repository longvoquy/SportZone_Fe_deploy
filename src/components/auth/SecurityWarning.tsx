import { useAppSelector } from '@/store/hook';

/**
 * Security Warning Component
 * Hiển thị cảnh báo khi user đang dùng Bearer token fallback mode
 * (khi cookie bị chặn)
 */
export const SecurityWarning = () => {
    const { authMethod, securityWarning } = useAppSelector((state) => state.auth);

    // Chỉ hiển thị khi đang dùng bearer token mode
    if (authMethod !== 'bearer' || !securityWarning) {
        return null;
    }

    return (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 mb-2">
                        Chế độ bảo mật thấp hơn
                    </h3>
                    <p className="text-yellow-700 mb-3">
                        {securityWarning}
                    </p>
                    <a
                        href="/help/enable-cookies"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-yellow-800 font-bold underline hover:text-yellow-900"
                    >
                        📖 Hướng dẫn bật cookies để tăng bảo mật →
                    </a>
                    <p className="text-sm text-yellow-600 mt-2">
                        💡 Trong chế độ này, bạn sẽ cần đăng nhập lại khi đóng trình duyệt
                    </p>
                </div>
            </div>
        </div>
    );
};
