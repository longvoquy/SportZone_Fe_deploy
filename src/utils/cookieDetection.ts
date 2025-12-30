import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Detect if browser supports cookies
 * Returns: { supported: boolean, reason?: string }
 */
export const detectCookieSupport = async (): Promise<{
    supported: boolean;
    reason?: string;
}> => {
    try {
        // 1. Client-side test - check if browser allows setting cookies
        document.cookie = 'cookietest=1; SameSite=Lax';
        const clientSupport = document.cookie.indexOf('cookietest=') !== -1;
        document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT'; // Clean up

        if (!clientSupport) {
            return {
                supported: false,
                reason: 'Browser blocked cookies locally',
            };
        }

        // 2. Server-side test - check if HTTP-only cookies work
        // First call: server sets test cookie
        await axios.get(`${BASE_URL}/auth/check-cookie`, {
            withCredentials: true,
        });

        // 3. Second call: verify cookie was sent back
        const verifyResponse = await axios.get(`${BASE_URL}/auth/check-cookie`, {
            withCredentials: true,
        });

        // If server received the cookie from previous call, it means cookies work
        if (verifyResponse.data.hadPreviousCookie) {
            return { supported: true };
        } else {
            return {
                supported: false,
                reason: 'HTTP-only cookies blocked (possible third-party cookie blocker)',
            };
        }
    } catch (error) {
        console.error('Cookie detection failed:', error);

        // Network error không nên force user vào Bearer mode
        // Fallback to quick client test - nếu pass thì assume cookies work
        try {
            const quickTest = quickCookieTest();
            if (quickTest) {
                console.warn('⚠️ Server cookie test failed, but client test passed. Assuming cookies work.');
                console.warn('This might be due to temporary network issue. Using cookie-based auth.');
                return {
                    supported: true,
                    reason: 'Server test failed, client test passed (likely network issue)'
                };
            }
        } catch (clientTestError) {
            console.error('Client cookie test also failed:', clientTestError);
        }

        // Cả 2 tests đều fail → thực sự không support cookies
        return {
            supported: false,
            reason: 'Cookie detection failed - both server and client tests failed',
        };
    }
};

/**
 * Simple client-side only cookie test (faster, but less accurate)
 */
export const quickCookieTest = (): boolean => {
    try {
        document.cookie = 'cookietest=1; SameSite=Lax';
        const supported = document.cookie.indexOf('cookietest=') !== -1;
        document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
        return supported;
    } catch {
        return false;
    }
};
