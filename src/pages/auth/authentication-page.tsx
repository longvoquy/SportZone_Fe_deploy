import { useState, useEffect } from "react";
//redux + navigation
import { useAppDispatch } from "../../store/hook";
import { useNavigate, useLocation } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";

//UI
import { toast } from "react-toastify";
import {
  CustomFailedToast,
  CustomSuccessToast,
} from "../../components/toast/notificiation-toast";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loading } from "@/components/ui/loading";

//axios
import axios from "axios";
import {
  signInWithEmailAndPassword,
  signUpWithEmailAndPassword,
  signInWithGoogle
} from "../../features/authentication/authThunk";
import logger from "../../utils/logger";

// Security Warning Component
import { SecurityWarning } from "@/components/auth/SecurityWarning";

export default function AuthenticationPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Login banner images
  const loginBanners = [
    "/login.banner.img/login_banner.jpeg",
    "/login.banner.img/login_banner_1.jpg",
    "/login.banner.img/login_banner_2.jpg",
  ];

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % loginBanners.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [loginBanners.length]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    date_of_birth: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Check for redirect toast message
  useEffect(() => {
    const state = location.state as { showToast?: boolean; toastMessage?: string; from?: any } | null;
    if (state?.showToast && state?.toastMessage) {
      // Use setTimeout to ensure toast library is ready/mounted or to delay slightly after render
      setTimeout(() => {
        CustomFailedToast(state.toastMessage);
      }, 100);

      // Clear the toast flag from state to prevent showing it again on refresh/re-render
      // We keep other state properties like 'from'
      navigate(location.pathname, {
        replace: true,
        state: { ...state, showToast: false }
      });
    }
  }, [location, navigate]);

  // Helper function to get redirect URL from localStorage or location state
  const getRedirectUrl = (): string | null => {
    try {
      // First check location state (passed from AuthRequiredPopup)
      const stateRedirectUrl = (location.state as any)?.redirectUrl;
      if (stateRedirectUrl) {
        return stateRedirectUrl;
      }

      // Then check localStorage
      const storedRedirectUrl = localStorage.getItem('bookingRedirectUrl');
      if (storedRedirectUrl) {
        return storedRedirectUrl;
      }

      return null;
    } catch (error) {
      logger.warn('Failed to get redirect URL:', error);
      return null;
    }
  };

  // Helper function to clear redirect URL from localStorage
  const clearRedirectUrl = () => {
    try {
      localStorage.removeItem('bookingRedirectUrl');
    } catch (error) {
      logger.warn('Failed to clear redirect URL from localStorage:', error);
    }
  };

  // Helper function to handle redirect after successful login
  // Use window.location.href to ensure 1 clean refresh after login
  const handleRedirectAfterLogin = (user: any) => {
    const redirectUrl = getRedirectUrl();

    // Clear redirect URL from localStorage
    clearRedirectUrl();

    // If we have a redirect URL and it's a valid booking page, redirect there
    if (redirectUrl && (redirectUrl.includes('/field-booking') || redirectUrl.includes('/fields'))) {
      window.location.href = redirectUrl;
      return;
    }

    // Otherwise, use default redirect logic - use window.location.href for 1 clean refresh
    if (user.role === "field_owner") {
      window.location.href = "/field-owner-dashboard";
    } else if (user.role === "coach") {
      window.location.href = "/coach/dashboard";
    } else {
      window.location.href = "/";
    }
  };

  logger.debug("Login page data:", { formData, isLogin });

  const handleInputChange = (e: {
    target: { name: string; value: string };
  }) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const validatedate_of_birth = (date: string) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 12;
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error("Vui lòng điền email và mật khẩu");
      return false;
    }

    if (!isLogin) {
      if (!formData.fullName) {
        toast.error("Vui lòng điền họ và tên");
        return false;
      }
      if (formData.password.length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Mật khẩu không khớp");
        return false;
      }

      if (
        !formData.date_of_birth ||
        !validatedate_of_birth(formData.date_of_birth)
      ) {
        toast.error("Ngày sinh không hợp lệ hoặc tuổi phải lớn hơn 12");
        return false;
      }

      if (
        !formData.phone ||
        !validatePhoneNumber(formData.phone)
      ) {
        toast.error("Số điện thoại không hợp lệ");
        return false;
      }
    }
    return true;
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const googleUserInfo = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        const { picture } = googleUserInfo.data;

        const result = await dispatch(
          signInWithGoogle({
            token: tokenResponse.access_token,
            avatar: picture,
            rememberMe,
          })
        ).unwrap();

        CustomSuccessToast("Đăng nhập Google thành công!");

        // Handle redirect after successful Google login
        if (result?.user) {
          handleRedirectAfterLogin(result.user);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          CustomFailedToast(error.response?.data?.message || error.message);
        } else if (error instanceof Error) {
          CustomFailedToast(error.message);
        } else {
          CustomFailedToast("Đăng nhập Google thất bại");
        }
      }
    },
    onError: (error: any) => {
      CustomFailedToast("Đăng nhập Google thất bại");
      logger.error(error);
    },
  });

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      date_of_birth: "",
      confirmPassword: "",
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const result = await dispatch(
          signInWithEmailAndPassword({
            email: formData.email,
            password: formData.password,
            rememberMe,
          })
        ).unwrap();

        if (result) {
          const user = result?.user;

          if (user && user.isActive === false) {
            CustomFailedToast("Tài khoản của bạn đã bị khóa.");
            navigate("/lock-account");
            setIsLoading(false);
            return;
          }

          CustomSuccessToast("Đăng nhập thành công!");

          // Add a small delay for animation
          await new Promise(resolve => setTimeout(resolve, 800));

          // Handle redirect after successful login
          handleRedirectAfterLogin(user);
        }
      } else {
        const result = await dispatch(
          signUpWithEmailAndPassword({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            date_of_birth: formData.date_of_birth,
            phone: formData.phone,
          })
        ).unwrap();

        if (result) {
          CustomSuccessToast("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản. Link xác thực có hiệu lực trong 5 phút.");
          await new Promise(resolve => setTimeout(resolve, 800));
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      let errorMessage = "Có lỗi xảy ra";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.payload?.message) {
        errorMessage = error.payload.message;
      }

      CustomFailedToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen fixed inset-0 overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
          <Loading size={100} />
        </div>
      )}
      {/* Full Screen Background Carousel */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {loginBanners.map((banner, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              backgroundImage: `url('${banner}')`,
            }}
          />
        ))}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content Container - Centered */}
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        {/* White Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="mx-auto flex items-center justify-center mb-6 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            >
              <img
                src="/SportZone.png"
                alt="SportZone Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <h2 className="text-2xl xl:text-3xl font-bold text-green-600 mb-3">
              {isLogin ? "Đăng Nhập" : "Đăng Ký"}
            </h2>
            {/* <p className="text-gray-600 text-lg">
              {isLogin
                ? "Chào mừng bạn quay trở lại SportZone"
                : "Tạo tài khoản mới của bạn"}
            </p> */}
          </div>

          {/* Security Warning - Shows when user is in Bearer token fallback mode */}
          <SecurityWarning />

          {/* Form */}
          <div className="space-y-6">
            {/* Full Name Field (only for register) */}
            {!isLogin && (
              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="Nhập họ và tên của bạn"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Date of Birth Field (only for register) */}
            {!isLogin && (
              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Ngày sinh
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full pl-4 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Phone Field (only for register) */}
            {!isLogin && (
              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="Nhập số điện thoại của bạn"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2 text-left">
              <label className="block text-sm font-medium text-gray-700 text-left">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2 text-left">
              <label className="block text-sm font-medium text-gray-700 text-left">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (only for register) */}
            {!isLogin && (
              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    placeholder="Nhập lại mật khẩu"
                    required={!isLogin}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me / Forgot Password (only for login) */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Checkbox
                    id="terms"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                  />
                  <label
                    htmlFor="terms"
                    className="px-2 text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ghi nhớ tài khoản
                  </label>
                </div>
                <button
                  onClick={() => navigate("/forgot-password")}
                  type="button"
                  className="text-sm text-green-700 hover:text-green-800 font-medium transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-4 px-6 rounded-xl text-base font-medium focus:ring-4 focus:ring-green-200 transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loading size={20} className="border-white" />
              ) : (
                <>
                  <span>{isLogin ? "Đăng Nhập" : "Đăng Ký"}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Toggle Mode */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
              <button
                onClick={toggleMode}
                className="ml-2 text-green-700 hover:text-green-800 font-medium transition-colors"
              >
                {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
              </button>
            </p>
          </div>

          {/* Social Login */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-600">
                  Hoặc tiếp tục với
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={() => handleGoogleLogin()}
                className="w-full transform duration-300 hover:scale-105 inline-flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}