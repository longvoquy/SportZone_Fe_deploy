import { useRouteError, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ErrorPage() {
    const error: any = useRouteError();
    const navigate = useNavigate();

    console.error(error);

    let errorMessage = "Đã xảy ra lỗi không mong muốn.";
    let errorDetail = "";

    if (error?.statusText) {
        errorMessage = error.statusText;
    }
    if (error?.message) {
        errorDetail = error.message;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-red-100 p-4 rounded-full">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
                <p className="text-lg text-gray-600 mb-6">{errorMessage}</p>

                {errorDetail && (
                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-500 font-mono mb-6 overflow-auto max-h-32 text-left">
                        {errorDetail}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => window.location.reload()} variant="outline">
                        Tải lại trang
                    </Button>
                    <Button onClick={() => navigate("/")} className="bg-green-600 hover:bg-green-700">
                        Về trang chủ
                    </Button>
                </div>
            </div>
        </div>
    );
}
