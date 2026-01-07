import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosPrivate from "../../utils/axios/axiosPrivate";
import {
  GET_USER_WALLET_API,
  GET_FIELD_OWNER_WALLET_API,
  GET_ADMIN_WALLET_API,
  WITHDRAW_REFUND_API,
  WITHDRAW_FIELD_OWNER_API,
} from "./walletAPI";
import type {
  UserWalletResponse,
  FieldOwnerWalletResponse,
  AdminWalletResponse,
  WithdrawRefundPayload,
} from "../../types/wallet-type";

/**
 * Get user wallet (returns null if no refund balance)
 */
export const getUserWallet = createAsyncThunk<
  UserWalletResponse | null,
  string,
  { rejectValue: string }
>("wallet/getUserWallet", async (userId, thunkAPI) => {
  try {
    const response = await axiosPrivate.get(GET_USER_WALLET_API(userId));
    // Backend returns null if no wallet
    return response.data?.data ?? response.data ?? null;
  } catch (error: any) {
    // If 404, return null (no wallet exists - lazy creation)
    if (error?.response?.status === 404) {
      return null;
    }
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Khong the tai thong tin vi";
    return thunkAPI.rejectWithValue(message);
  }
});

/**
 * Get field owner wallet
 */
export const getFieldOwnerWallet = createAsyncThunk<
  FieldOwnerWalletResponse,
  string,
  { rejectValue: string }
>("wallet/getFieldOwnerWallet", async (userId, thunkAPI) => {
  try {
    const response = await axiosPrivate.get(GET_FIELD_OWNER_WALLET_API(userId));
    return response.data?.data ?? response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Khong the tai thong tin vi";
    return thunkAPI.rejectWithValue(message);
  }
});

/**
 * Get admin wallet
 */
export const getAdminWallet = createAsyncThunk<
  AdminWalletResponse,
  void,
  { rejectValue: string }
>("wallet/getAdminWallet", async (_, thunkAPI) => {
  try {
    const response = await axiosPrivate.get(GET_ADMIN_WALLET_API);
    return response.data?.data ?? response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Khong the tai thong tin vi admin";
    return thunkAPI.rejectWithValue(message);
  }
});

/**
 * Withdraw refund balance to bank (for users)
 */
export const withdrawRefund = createAsyncThunk<
  { success: boolean; message: string },
  { userId: string; payload: WithdrawRefundPayload },
  { rejectValue: string }
>("wallet/withdrawRefund", async ({ userId, payload }, thunkAPI) => {
  try {
    const response = await axiosPrivate.post(WITHDRAW_REFUND_API(userId), payload);
    return response.data?.data ?? response.data ?? { success: true, message: "Rut tien thanh cong" };
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Khong the xu ly yeu cau rut tien";
    return thunkAPI.rejectWithValue(message);
  }
});

/**
 * Withdraw available balance to bank (for field owners)
 */
export const withdrawFieldOwnerBalance = createAsyncThunk<
  { success: boolean; message: string },
  { amount: number },
  { rejectValue: string }
>("wallet/withdrawFieldOwnerBalance", async (payload, thunkAPI) => {
  try {
    const response = await axiosPrivate.post(WITHDRAW_FIELD_OWNER_API, payload);
    return response.data?.data ?? response.data ?? { success: true, message: "Rut tien thanh cong" };
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Khong the xu ly yeu cau rut tien";
    return thunkAPI.rejectWithValue(message);
  }
});

