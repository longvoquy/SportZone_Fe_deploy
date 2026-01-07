import { createSlice } from "@reduxjs/toolkit";
import type {
  UserWalletResponse,
  FieldOwnerWalletResponse,
  AdminWalletResponse,
} from "../../types/wallet-type";
import {
  getUserWallet,
  getFieldOwnerWallet,
  getAdminWallet,
  withdrawRefund,
  withdrawFieldOwnerBalance,
} from "./walletThunk";

interface WalletState {
  // User wallet
  userWallet: UserWalletResponse | null;
  userWalletLoading: boolean;
  userWalletError: string | null;

  // Field owner wallet
  fieldOwnerWallet: FieldOwnerWalletResponse | null;
  fieldOwnerWalletLoading: boolean;
  fieldOwnerWalletError: string | null;

  // Admin wallet
  adminWallet: AdminWalletResponse | null;
  adminWalletLoading: boolean;
  adminWalletError: string | null;

  // Withdraw
  withdrawLoading: boolean;
  withdrawError: string | null;
}

const initialState: WalletState = {
  userWallet: null,
  userWalletLoading: false,
  userWalletError: null,

  fieldOwnerWallet: null,
  fieldOwnerWalletLoading: false,
  fieldOwnerWalletError: null,

  adminWallet: null,
  adminWalletLoading: false,
  adminWalletError: null,

  withdrawLoading: false,
  withdrawError: null,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    clearUserWallet: (state) => {
      state.userWallet = null;
      state.userWalletError = null;
    },
    clearFieldOwnerWallet: (state) => {
      state.fieldOwnerWallet = null;
      state.fieldOwnerWalletError = null;
    },
    clearAdminWallet: (state) => {
      state.adminWallet = null;
      state.adminWalletError = null;
    },
    clearWithdrawError: (state) => {
      state.withdrawError = null;
    },
    clearAllWallets: (state) => {
      state.userWallet = null;
      state.fieldOwnerWallet = null;
      state.adminWallet = null;
      state.userWalletError = null;
      state.fieldOwnerWalletError = null;
      state.adminWalletError = null;
      state.withdrawError = null;
    },
  },
  extraReducers: (builder) => {
    // Get user wallet
    builder
      .addCase(getUserWallet.pending, (state) => {
        state.userWalletLoading = true;
        state.userWalletError = null;
      })
      .addCase(getUserWallet.fulfilled, (state, action) => {
        state.userWalletLoading = false;
        state.userWallet = action.payload;
        state.userWalletError = null;
      })
      .addCase(getUserWallet.rejected, (state, action) => {
        state.userWalletLoading = false;
        state.userWalletError = action.payload || "Lỗi không xác định";
        state.userWallet = null;
      });

    // Get field owner wallet
    builder
      .addCase(getFieldOwnerWallet.pending, (state) => {
        state.fieldOwnerWalletLoading = true;
        state.fieldOwnerWalletError = null;
      })
      .addCase(getFieldOwnerWallet.fulfilled, (state, action) => {
        state.fieldOwnerWalletLoading = false;
        state.fieldOwnerWallet = action.payload;
        state.fieldOwnerWalletError = null;
      })
      .addCase(getFieldOwnerWallet.rejected, (state, action) => {
        state.fieldOwnerWalletLoading = false;
        state.fieldOwnerWalletError = action.payload || "Lỗi không xác định";
        state.fieldOwnerWallet = null;
      });

    // Get admin wallet
    builder
      .addCase(getAdminWallet.pending, (state) => {
        state.adminWalletLoading = true;
        state.adminWalletError = null;
      })
      .addCase(getAdminWallet.fulfilled, (state, action) => {
        state.adminWalletLoading = false;
        state.adminWallet = action.payload;
        state.adminWalletError = null;
      })
      .addCase(getAdminWallet.rejected, (state, action) => {
        state.adminWalletLoading = false;
        state.adminWalletError = action.payload || "Lỗi không xác định";
        state.adminWallet = null;
      });

    // Withdraw refund (for users)
    builder
      .addCase(withdrawRefund.pending, (state) => {
        state.withdrawLoading = true;
        state.withdrawError = null;
      })
      .addCase(withdrawRefund.fulfilled, (state) => {
        state.withdrawLoading = false;
        state.withdrawError = null;
      })
      .addCase(withdrawRefund.rejected, (state, action) => {
        state.withdrawLoading = false;
        state.withdrawError = action.payload || "Loi khong xac dinh";
      });

    // Withdraw field owner balance
    builder
      .addCase(withdrawFieldOwnerBalance.pending, (state) => {
        state.withdrawLoading = true;
        state.withdrawError = null;
      })
      .addCase(withdrawFieldOwnerBalance.fulfilled, (state) => {
        state.withdrawLoading = false;
        state.withdrawError = null;
        // Refetch field owner wallet after successful withdraw handled in component
      })
      .addCase(withdrawFieldOwnerBalance.rejected, (state, action) => {
        state.withdrawLoading = false;
        state.withdrawError = action.payload || "Loi khong xac dinh";
      });
  },
});

export const {
  clearUserWallet,
  clearFieldOwnerWallet,
  clearAdminWallet,
  clearWithdrawError,
  clearAllWallets,
} = walletSlice.actions;

export default walletSlice.reducer;

