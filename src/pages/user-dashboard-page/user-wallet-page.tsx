'use client'

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { Wallet, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"

import { NavbarDarkComponent } from "@/components/header/navbar-dark-component"
import { UserDashboardHeader } from "@/components/header/user-dashboard-header"
import { UserDashboardTabs } from "@/components/tabs/user-dashboard-tabs"
import { PageWrapper } from "@/components/layouts/page-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loading } from "@/components/ui/loading"
import {
  WalletSummaryCard,
  WalletEmptyState,
  WalletInfoCard,
} from "@/components/wallet"
import { useAppSelector, useAppDispatch } from "@/store/hook"
import { getUserWallet, withdrawRefund } from "@/features/wallet"
import { formatCurrency } from "@/utils/format-currency"
import logger from "@/utils/logger"

const MIN_WITHDRAW_AMOUNT = 1000

const formatRelativeTime = (value?: string) => {
  if (!value) return null

  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: vi,
    })
  } catch {
    return null
  }
}

export default function UserWalletPage() {
  const dispatch = useAppDispatch()
  const authUser = useAppSelector((state) => state.auth.user)
  const userId = authUser?._id ?? null

  const {
    userWallet: wallet,
    userWalletLoading: loading,
    userWalletError: error,
    withdrawLoading,
    withdrawError,
  } = useAppSelector((state) => state.wallet)

  const [withdrawAmount, setWithdrawAmount] = useState<string>("")

  // Fetch wallet on mount
  useEffect(() => {
    if (userId) {
      dispatch(getUserWallet(userId))
    }
  }, [userId, dispatch])

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  // Show withdraw error toast
  useEffect(() => {
    if (withdrawError) {
      toast.error(withdrawError)
    }
  }, [withdrawError])

  const lastUpdatedLabel = useMemo(() => {
    if (!wallet?.lastTransactionAt) return null
    const relative = formatRelativeTime(wallet.lastTransactionAt)
    if (!relative) return null
    return `Cập nhật ${relative}`
  }, [wallet?.lastTransactionAt])

  const handleWithdraw = async () => {
    const amountNumber = Number(withdrawAmount)

    if (!userId || !wallet) {
      toast.error("Không thể xác định người dùng.")
      return
    }

    if (!Number.isFinite(amountNumber)) {
      toast.error("Vui lòng nhập số tiền hợp lệ.")
      return
    }

    if (amountNumber < MIN_WITHDRAW_AMOUNT) {
      toast.error(
        `Số tiền rút tối thiểu là ${formatCurrency(
          MIN_WITHDRAW_AMOUNT,
        )}.`,
      )
      return
    }

    if (amountNumber > wallet.refundBalance) {
      toast.error("Số tiền rút vượt quá số dư hoàn tiền hiện có.")
      return
    }

    try {
      const result = await dispatch(
        withdrawRefund({ userId, payload: { amount: amountNumber } }),
      ).unwrap()
      toast.success(result.message || "Yêu cầu rút tiền đã được ghi nhận.")
      setWithdrawAmount("")
      // Refetch wallet after successful withdraw
      if (userId) {
        await dispatch(getUserWallet(userId)).unwrap()
      }
    } catch (err: any) {
      // Error is handled by Redux and shown via useEffect
      logger.error("Withdraw error:", err)
    }
  }

  const handleRefetch = () => {
    if (userId) {
      dispatch(getUserWallet(userId))
    }
  }

  return (
    <>
      <NavbarDarkComponent />
      <PageWrapper className="bg-gray-50">
        <UserDashboardHeader />
        <UserDashboardTabs />

        <div className="container mx-auto px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <WalletSummaryCard
              title="Số dư hoàn tiền"
              amount={wallet?.refundBalance ?? 0}
              currency={wallet?.currency ?? "VND"}
              message={
                loading
                  ? undefined
                  : wallet
                    ? wallet.message
                    : "Khi được hoàn tiền, số dư sẽ hiển thị tại đây."
              }
              icon={<Wallet className="h-5 w-5 text-emerald-500" />}
              loading={loading}
              className="md:col-span-2"
            />

            <Card className="border border-emerald-100 bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Trạng thái ví
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loading size={24} className="text-green-600" />
                  </div>
                ) : wallet ? (
                  <>
                    <p className="text-emerald-700">
                      Bạn có thể sử dụng số dư để đặt sân hoặc rút về tài khoản
                      ngân hàng đã xác nhận.
                    </p>
                    {lastUpdatedLabel && (
                      <p className="text-xs text-muted-foreground">
                        {lastUpdatedLabel}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Bạn chưa có khoản hoàn tiền nào. Khi admin hoàn tiền dưới
                    dạng credit, số dư sẽ hiển thị tại đây.
                  </p>
                )}
                {error && (
                  <p className="text-xs text-red-500">
                    Lỗi tải dữ liệu ví: {error}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {wallet ? (
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/40">
                    <CardTitle className="text-base font-semibold">
                      Rút hoàn tiền về tài khoản ngân hàng
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-amount">
                        Số tiền muốn rút
                      </Label>
                      <Input
                        id="withdraw-amount"
                        type="number"
                        min={MIN_WITHDRAW_AMOUNT}
                        step={1000}
                        value={withdrawAmount}
                        onChange={(event) =>
                          setWithdrawAmount(event.target.value)
                        }
                        placeholder="Ví dụ: 50000"
                        disabled={withdrawLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Số tiền rút tối thiểu {formatCurrency(MIN_WITHDRAW_AMOUNT)}.
                        Số dư hiện có:{" "}
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(wallet.refundBalance)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                      <div>
                        <p className="font-medium">
                          Thông tin tài khoản ngân hàng
                        </p>
                        <p className="mt-1 text-emerald-800/80">
                          Yêu cầu rút sẽ sử dụng thông tin ngân hàng đã lưu trong
                          hồ sơ của bạn. Vui lòng cập nhật trước khi gửi yêu cầu.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                        onClick={() => {
                          toast.info("Đi tới trang hồ sơ để cập nhật ngân hàng.")
                          window.location.href = "/user-profile"
                        }}
                      >
                        Cập nhật
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleWithdraw}
                        disabled={withdrawLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {withdrawLoading ? "Đang xử lý..." : "Gửi yêu cầu rút tiền"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <WalletEmptyState
                  title="Chưa có hoàn tiền"
                  description="Khi bạn được hoàn tiền dưới dạng credit, số dư sẽ xuất hiện tại đây và bạn có thể rút hoặc sử dụng để đặt sân."
                  action={
                      <Button
                        variant="outline"
                        className="border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                        onClick={handleRefetch}
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Kiểm tra lại
                      </Button>
                  }
                />
              )}
            </div>

            <WalletInfoCard
              title="Thông tin quan trọng"
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Wallet className="h-5 w-5" />
                </div>
              }
              items={[
                {
                  label: "Thanh toán trực tiếp",
                  description:
                    "Bạn không cần nạp tiền trước. Mọi khoản thanh toán được xử lý qua PayOS ngay khi đặt sân.",
                },
                {
                  label: "Hoàn tiền dạng credit",
                  description:
                    "Admin có thể hoàn tiền về ví credit của bạn. Bạn có thể dùng để đặt sân khác hoặc rút về ngân hàng.",
                },
                {
                  label: "Thời gian xử lý",
                  description:
                    "Yêu cầu rút tiền được xử lý bởi admin. Bạn sẽ nhận được thông báo khi hoàn tất.",
                },
              ]}
              footer={
                wallet && (
                  <p className="text-xs text-muted-foreground">
                    Mọi giao dịch đều được ghi nhận để đảm bảo tính minh bạch.
                  </p>
                )
              }
            />
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
