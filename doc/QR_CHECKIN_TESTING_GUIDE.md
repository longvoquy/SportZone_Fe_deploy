# Hướng Dẫn Test QR Check-in Trên Điện Thoại

## Mục Lục
- [Yêu Cầu](#yêu-cầu)
- [Cài Đặt](#cài-đặt)
- [Chạy Development Server](#chạy-development-server)
- [Flow Test QR Check-in](#flow-test-qr-check-in)
- [Troubleshooting](#troubleshooting)

---

## Yêu Cầu

- **Điện thoại và máy tính cùng mạng WiFi** (cùng LAN/mạng nội bộ)
- Backend đã chạy và có API endpoints cho QR check-in
- Có ít nhất 1 booking với status `confirmed` và payment status `succeeded`

---

## Cài Đặt

### 1. Cài đặt dependencies (nếu chưa có)
```bash
cd FE
npm install
```

### 2. Cấu hình Backend URL
Đảm bảo file `.env` đã cấu hình đúng API URL:
```env
VITE_API_URL=http://192.168.x.x:3000/api
```

> **Lưu ý:** Thay `192.168.x.x` bằng IP của máy tính đang chạy Backend. 
> Dùng lệnh `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux) để lấy IP.

---

## Chạy Development Server

### Bước 1: Chạy Frontend với `--host`

```bash
npm run dev -- --host
```

### Bước 2: Lấy Network URL

Vite sẽ hiển thị output như sau:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/   ← Dùng URL này trên điện thoại
```

### Bước 3: Cho phép Firewall (Windows)

Nếu Windows Firewall chặn kết nối, bạn cần:

1. Mở **Windows Defender Firewall**
2. Chọn **Allow an app or feature through Windows Defender Firewall**
3. Thêm Node.js hoặc cho phép port 5173

Hoặc tạm tắt Firewall trong quá trình test:
```powershell
# Tắt firewall (cần Admin)
netsh advfirewall set allprofiles state off

# Bật lại sau khi test xong
netsh advfirewall set allprofiles state on
```

---

## Flow Test QR Check-in

### Scenario 1: Điện thoại là Customer, Máy tính là Staff

| Device | Role | Action |
|--------|------|--------|
| 📱 Điện thoại | Customer | Tạo QR Code |
| 💻 Máy tính | Staff | Quét QR bằng webcam |

**Bước thực hiện:**

#### Trên Điện Thoại (Customer):
1. Mở trình duyệt, truy cập `http://192.168.x.x:5173`
2. Đăng nhập với tài khoản Customer
3. Vào **Lịch sử đặt sân** hoặc **Chi tiết booking**
4. Chọn booking có status **Đã xác nhận** (confirmed) và **Đã thanh toán**
5. Nhấn **Tạo mã nhận sân** để tạo QR Code
   > ⚠️ QR chỉ tạo được từ **15 phút trước** giờ đá

#### Trên Máy Tính (Staff):
1. Mở `http://localhost:5173/staff/check-in`
2. Nhấn **Bắt đầu quét** để mở webcam
3. Hướng webcam vào QR Code trên màn hình điện thoại
4. Xác nhận thông tin booking và nhấn **Xác nhận Check-in**

---

### Scenario 2: Máy tính là Customer, Điện thoại là Staff

| Device | Role | Action |
|--------|------|--------|
| 💻 Máy tính | Customer | Tạo QR Code |
| 📱 Điện thoại | Staff | Quét QR bằng camera |

**Bước thực hiện:**

#### Trên Máy Tính (Customer):
1. Mở `http://localhost:5173`
2. Đăng nhập với tài khoản Customer
3. Vào booking confirmed → Tạo QR Code

#### Trên Điện Thoại (Staff):
1. Mở `http://192.168.x.x:5173/staff/check-in`
2. Nhấn **Bắt đầu quét** để mở camera
3. Quét QR Code từ màn hình máy tính
4. Xác nhận check-in

---

## Test Data Setup

### Tạo Booking Test (nếu cần)

1. Đăng nhập với tài khoản Customer
2. Đặt sân với thời gian gần hiện tại (trong vòng 15 phút)
3. Thanh toán booking (hoặc dùng API để update status)

### Kiểm tra Booking hợp lệ

Booking có thể tạo QR khi:
- `status` = `confirmed`
- `payment.status` = `succeeded`
- Thời gian hiện tại >= (startTime - 15 phút)

---

## API Endpoints Liên Quan

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/bookings/check-in/generate-qr/:bookingId` | POST | Customer tạo QR token |
| `/api/bookings/check-in/verify` | POST | Staff verify QR token |
| `/api/bookings/check-in/confirm/:bookingId` | POST | Staff confirm check-in |
| `/api/bookings/:bookingId` | GET | Lấy thông tin booking |

---

## Troubleshooting

### 1. Không truy cập được từ điện thoại

- **Kiểm tra cùng mạng WiFi**: Cả 2 thiết bị phải cùng network
- **Kiểm tra IP**: Dùng đúng IP từ output của Vite
- **Tắt Firewall**: Windows Firewall có thể chặn kết nối
- **Thử ping**: Từ điện thoại ping IP máy tính

### 2. Camera không hoạt động

- Cho phép trình duyệt truy cập camera
- Trên iOS Safari: Settings → Safari → Camera → Allow
- Trên Android Chrome: Site Settings → Camera → Allow

### 3. QR không quét được

- Đảm bảo ánh sáng đủ
- Giữ QR Code ổn định trong khung camera
- Thử refresh và tạo QR mới

### 4. Lỗi "Chưa đến giờ nhận sân"

- QR chỉ tạo được từ 15 phút trước giờ đá
- Giải pháp test: Tạo booking với startTime = now + 5 phút

### 5. Backend không nhận request

- Kiểm tra Backend URL trong `.env`
- Đảm bảo Backend đang chạy
- Kiểm tra CORS đã cho phép IP của máy

---

## Quick Commands

```bash
# Chạy Frontend với network access
npm run dev -- --host

# Xem IP máy tính (Windows)
ipconfig

# Xem IP máy tính (Mac/Linux)  
ifconfig | grep inet

# Kiểm tra port đang mở
netstat -an | findstr 5173
```

---

## Lưu Ý Bảo Mật

⚠️ **KHÔNG** sử dụng `--host` trong môi trường production!

Option này chỉ dành cho development và testing local. Trong production, hãy sử dụng proper HTTPS và domain.
