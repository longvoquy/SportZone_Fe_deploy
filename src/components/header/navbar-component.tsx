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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RootState } from "../../store/store";
import CoachDropdownMenuItems from "./coach-dropdown-menu";
import UserDropdownMenuItems from "./user-dropdown-menu";
import { Loading } from "@/components/ui/loading";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { NotificationBell } from "./notification-bell";
import logger from "@/utils/logger";
export const NavbarComponent = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const auth = useAppSelector((state: RootState) => state.auth);

    // Debug log to verify user data
    logger.debug("Navbar - User:", auth.user?.fullName, "Role:", auth.user?.role);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const [openLogoutDialog, setOpenLogoutDialog] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        // Small delay to let the animation show
        await new Promise(resolve => setTimeout(resolve, 800));
        clearUserAuth();
        dispatch(logout());
        // Force reload to ensure clean state
        window.location.href = "/";
    };

    // Gom style theo trạng thái scroll
    const linkClass = isScrolled
        ? "text-base font-medium text-gray-900 hover:text-green-600 transition-colors duration-200"
        : "text-base font-medium text-white hover:text-green-400 transition-colors duration-200";
    const iconClass = isScrolled
        ? "h-5 w-5 text-gray-900 hover:text-green-600 transition-colors duration-200"
        : "h-5 w-5 text-white hover:text-green-400 transition-colors duration-200";
    const btnTriggerClass = isScrolled
        ? "text-gray-900 bg-white"
        : "text-white bg-transparent";

    return (
        <>
            {isLoggingOut && (
                <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
                    <Loading size={100} />
                </div>
            )}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? "bg-white/95 shadow-md border-b border-gray-200"
                    : "bg-transparent"
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
                        {/* <Link to="/reviews" className={linkClass}>
                        Đánh giá
                    </Link> */}
                        <Link to="/about" className={linkClass}>
                            Về chúng tôi
                        </Link>
                        {/* <Link to="/contact" className={linkClass}>
                        Liên hệ
                    </Link> */}
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
                                        className={`flex items-center gap-2 transition-all duration-200 hover:bg-green-800 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none active:scale-95 ${btnTriggerClass}`}
                                    >
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage
                                                src={auth.user?.avatarUrl}
                                                alt="User avatar"
                                            />
                                            <AvatarFallback>CN</AvatarFallback>
                                        </Avatar>
                                        <span className={linkClass}>{auth.user?.fullName || "Tài khoản"}</span>
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

                                <Dialog open={openLogoutDialog} onOpenChange={setOpenLogoutDialog}>
                                    <DialogContent className="bg-white max-w-sm">
                                        <DialogHeader>
                                            <DialogTitle>Xác nhận đăng xuất</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4 text-base">Bạn có chắc chắn muốn đăng xuất không?</div>
                                        <DialogFooter>
                                            <Button variant="destructive" onClick={handleLogout}>
                                                Xác nhận
                                            </Button>
                                            <Button variant="outline" onClick={() => setOpenLogoutDialog(false)}>
                                                Hủy
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className={`transition-all duration-200 ${btnTriggerClass}`}
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
