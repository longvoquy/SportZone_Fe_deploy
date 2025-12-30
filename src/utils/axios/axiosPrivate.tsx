import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000, // Tăng từ 10s lên 60s để phù hợp với AI processing
  withCredentials: true, // Gửi kèm cookie tới server cho các request
  headers: {
    'X-Client-Type': 'web', // Phân biệt FE user với FE admin
  },
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: Auto-attach Bearer token if using fallback mode
axiosInstance.interceptors.request.use(
  (config) => {
    // Only add Authorization header if cookies are NOT being used
    const hasCookie = document.cookie.includes('access_token');

    if (!hasCookie) {
      const token = sessionStorage.getItem('auth_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const BASE_URL = import.meta.env.VITE_API_URL;

        // Detect auth method: cookie vs bearer token
        const hasCookie = document.cookie.includes('access_token') || document.cookie.includes('refresh_token');

        if (hasCookie) {
          // Cookie-based refresh (primary flow)
          await axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
        } else {
          // Bearer token refresh (fallback flow)
          const refreshToken = sessionStorage.getItem('auth_refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
                'X-Client-Type': 'web'
              }
            }
          );

          // Update tokens in sessionStorage if returned in response
          if (response.data?.accessToken) {
            sessionStorage.setItem('auth_access_token', response.data.accessToken);
          }
          if (response.data?.refreshToken) {
            sessionStorage.setItem('auth_refresh_token', response.data.refreshToken);
          }
        }

        processQueue(null, "refreshed");
        isRefreshing = false;

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear both cookie and sessionStorage auth state
        sessionStorage.removeItem('auth_access_token');
        sessionStorage.removeItem('auth_refresh_token');
        sessionStorage.removeItem('user');

        // Only redirect to auth if there was actually a stored user session
        // Anonymous users should NOT be redirected to /auth on 401 errors
        const hadStoredUser = sessionStorage.getItem("user");
        if (hadStoredUser) {
          // Clear any persisted client-side user state before forcing re-auth
          try {
            localStorage.removeItem("user");
          } catch {
            // ignore storage errors
          }

          // Refresh failed, redirect to login
          window.location.href = "/auth";
        }
        // For anonymous users, just reject the error without redirect
        return Promise.reject(refreshError);
      }
    }

    // For 403 or other errors, just reject
    if (error.response?.status === 403) {
      // Only redirect to auth if there was actually a stored user session
      // Anonymous users should NOT be redirected to /auth on 403 errors
      const hadStoredUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (hadStoredUser) {
        try {
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
        } catch {
          // ignore storage errors
        }
        window.location.href = "/auth";
      }
      // For anonymous users, just reject the error without redirect
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;


