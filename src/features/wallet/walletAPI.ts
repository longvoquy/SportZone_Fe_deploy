import { BASE_URL } from "../../utils/constant-value/constant";

// Wallet endpoints
export const GET_USER_WALLET_API = (userId: string) => `${BASE_URL}/wallets/user/${userId}`;
export const GET_FIELD_OWNER_WALLET_API = (userId: string) => `${BASE_URL}/wallets/field-owner/${userId}`;
export const GET_ADMIN_WALLET_API = `${BASE_URL}/wallets/admin/system`;
export const WITHDRAW_REFUND_API = (userId: string) => `${BASE_URL}/wallets/user/${userId}/withdraw`;
export const WITHDRAW_FIELD_OWNER_API = `${BASE_URL}/wallets/field-owner/withdraw`;
export const PROCESS_REFUND_API = `${BASE_URL}/wallets/admin/refund`;

