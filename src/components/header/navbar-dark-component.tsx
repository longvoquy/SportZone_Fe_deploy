import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hook";
import { logout } from "../../features/authentication/authThunk";
import { clearUserAuth } from "../../lib/cookies";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { RootState } from "../../store/store";
import CoachDropdownMenuItems from "./coach-dropdown-menu";
import UserDropdownMenuItems from "./user-dropdown-menu";
import { NotificationBell } from "./notification-bell";
import { Loading } from "@/components/ui/loading";

export const NavbarDarkComponent = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const auth = useAppSelector((state: RootState) => state.auth);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        // Small delay to let the animation show
        await new Promise(resolve => setTimeout(resolve, 800));

        // Ensure all local state is wiped before moving away
        clearUserAuth();
        sessionStorage.clear(); // Explicitly clear for non-cookie auth fallback

        try {
            await dispatch(logout()).unwrap();
        } catch (error) {
            console.error("Server-side logout failed:", error);
        } finally {
            // Force reload to ensure clean state - 1 refresh
            window.location.href = "/";
        }
    };

    const linkClass = "text-base font-medium text-gray-900 hover:text-green-600";
    const iconClass = "h-5 w-5 text-gray-900 hover:text-green-600";

    return (
        <>
            {isLoggingOut && (
                <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                    <Loading size={100} />
                </div>
            )}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/95 shadow-md border-b border-gray-200" : "bg-transparent"
                    }`}
            >
                <div className="container mx-auto max-w-screen-2xl flex h-20 items-center justify-between px-4">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="text-2xl font-bold text-white bg-green-700 px-3 py-1 rounded-md"
                    >
                        SportZone
                    </Link>

                    {/* Nav links */}
                    <nav className="flex items-center gap-6">
                        <Link to="/" className={linkClass}>
                            Trang chủ
                        </Link>
                        <Link to="/fields" className={linkClass}>
                            Sân thể thao
                        </Link>
                        <Link to="/coach" className={linkClass}>
                            Huấn luyện viên
                        </Link>
                        <Link to="/field-coach" className={linkClass}>
                            Đặt Sân + HLV
                        </Link>
                        <Link to="/tournaments" className={linkClass}>
                            Giải đấu
                        </Link>
                        <Link to="/about" className={linkClass}>
                            Về chúng tôi
                        </Link>
                        {auth.user?.role === "field_owner" && (
                            <Link to="/field-owner-dashboard" className={linkClass}>
                                Quản lý đặt sân
                            </Link>
                        )}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        {/* Notification */}
                        {auth.user && (
                            <NotificationBell
                                userId={auth.user._id}
                                iconClassName={iconClass}
                            />
                        )}

                        {auth.user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="flex items-center gap-2 bg-white text-gray-900 shadow-md border-gray-300"
                                    >
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage
                                                src={auth.user?.avatarUrl}
                                                alt="User avatar"
                                            />
                                            <AvatarFallback>CN</AvatarFallback>
                                        </Avatar>
                                        <span>{auth.user.fullName || "Tài khoản"}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56 bg-white shadow-md border border-gray-200 rounded-md"
                                >
                                    {auth.user?.role === "user" && (
                                        <UserDropdownMenuItems />
                                    )}
                                    {auth.user?.role === "coach" && auth.user._id && (
                                        <CoachDropdownMenuItems />
                                    )}
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start bg-white text-green-600 hover:bg-white-50 hover:text-green-700"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="mr-2 h-5 w-5" />
                                        <span className="text-base">Đăng xuất</span>
                                    </Button>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="text-gray-900 border-gray-300"
                                    onClick={() => navigate("/auth")}
                                >
                                    <User className="mr-2 h-4 w-4" /> Đăng nhập
                                </Button>
                                <Button
                                    className="bg-yellow-500 text-black font-semibold"
                                    onClick={() => navigate("/auth")}
                                >
                                    Đăng ký ngay
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};
