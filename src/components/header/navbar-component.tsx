import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Menu } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hook";
import { logout } from "../../features/authentication/authThunk";
import { clearUserAuth } from "../../lib/cookies";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet";
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            // Force reload to ensure clean state
            window.location.href = "/";
        }
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

    // Mobile menu link style
    const mobileLinkClass = "text-base font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 px-4 py-3 rounded-lg transition-all duration-200 flex items-center";

    const NavLinks = ({ mobile = false }) => (
        <>
            <Link
                to="/"
                className={mobile ? mobileLinkClass : linkClass}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
                Trang chủ
            </Link>
            <Link
                to="/fields"
                className={mobile ? mobileLinkClass : linkClass}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
                Sân thể thao
            </Link>
            <Link
                to="/coach"
                className={mobile ? mobileLinkClass : linkClass}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
                Huấn luyện viên
            </Link>
            <Link
                to="/field-coach"
                className={mobile ? mobileLinkClass : linkClass}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
                Đặt Sân + HLV
            </Link>
            <Link
                to="/tournaments"
                className={mobile ? mobileLinkClass : linkClass}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
                Giải đấu
            </Link>
            <Link
                to="/about"
                className={mobile ? mobileLinkClass : linkClass}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
                Về chúng tôi
            </Link>
            {auth.user?.role === "field_owner" && (
                <Link
                    to="/field-owner-dashboard"
                    className={mobile ? mobileLinkClass : linkClass}
                    onClick={() => mobile && setIsMobileMenuOpen(false)}
                >
                    Quản lý đặt sân
                </Link>
            )}
        </>
    );

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
                        className="text-2xl font-bold text-white bg-green-700 px-3 py-1 rounded-md shrink-0"
                    >
                        SportZone
                    </Link>

                    {/* Desktop Nav links */}
                    <nav className="hidden lg:flex items-center gap-6">
                        <NavLinks />
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2 md:gap-4">
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
                                        className={`flex items-center gap-2 transition-all duration-200 hover:bg-green-800 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none active:scale-95 ${btnTriggerClass} px-2 md:px-4`}
                                    >
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage
                                                src={auth.user?.avatarUrl}
                                                alt="User avatar"
                                            />
                                            <AvatarFallback>CN</AvatarFallback>
                                        </Avatar>
                                        <span className={`hidden md:inline ${linkClass}`}>{auth.user?.fullName || "Tài khoản"}</span>
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
                            <div className="hidden md:flex items-center gap-2">
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

                        {/* Mobile Menu Toggle */}
                        <div className="lg:hidden ml-2">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className={isScrolled ? "text-gray-900" : "text-white"}>
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0 overflow-y-auto">
                                    <div className="flex flex-col h-full">
                                        {/* Header Section */}
                                        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100 bg-gradient-to-br from-green-50 to-white">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <SheetTitle className="text-left text-2xl font-bold text-green-700">
                                                        SportZone
                                                    </SheetTitle>
                                                    <SheetDescription className="text-left text-gray-500 text-sm">
                                                        Menu điều hướng và tài khoản
                                                    </SheetDescription>
                                                </div>
                                            </div>
                                        </SheetHeader>

                                        {/* Navigation Links Section */}
                                        <div className="flex-1 px-6 py-6">
                                            <nav className="flex flex-col gap-1">
                                                <NavLinks mobile={true} />
                                            </nav>
                                        </div>

                                        {/* User Authentication Section */}
                                        {!auth.user && (
                                            <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50/50">
                                                <div className="flex flex-col gap-3">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start h-12 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium"
                                                        onClick={() => {
                                                            navigate("/auth");
                                                            setIsMobileMenuOpen(false);
                                                        }}
                                                    >
                                                        <User className="mr-3 h-5 w-5" />
                                                        Đăng nhập
                                                    </Button>
                                                    <Button
                                                        className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-sm transition-all duration-200"
                                                        onClick={() => {
                                                            navigate("/auth");
                                                            setIsMobileMenuOpen(false);
                                                        }}
                                                    >
                                                        Đăng ký ngay
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* User Info Section (if logged in) */}
                                        {auth.user && (
                                            <div className="px-6 pb-6 pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage
                                                            src={auth.user?.avatarUrl}
                                                            alt="User avatar"
                                                        />
                                                        <AvatarFallback className="bg-green-100 text-green-700">
                                                            {auth.user?.fullName?.charAt(0) || "U"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                                            {auth.user?.fullName || "Tài khoản"}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {auth.user?.email || ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>

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
            </header>
        </>
    );
};
