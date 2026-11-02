# Kết nối YouTube và Facebook Live

Mỗi nền tảng có **khung overlay riêng**, bảng vàng / bộ đếm / giọng đọc riêng:

| Nền tảng | Overlay (Browser source trong OBS) | Đọc bình luận bằng |
|---|---|---|
| TikTok | `http://localhost:3100/tiktok` (LIVE Studio → Link) | tên kênh TikTok |
| YouTube | `http://localhost:3100/youtube` | @handle kênh (không cần API key) |
| Facebook | `http://localhost:3100/facebook` | Page ID + Page Access Token |

> Mỗi overlay chỉ mở **một chỗ** (một Browser source). Mở thêm ở tab trình duyệt sẽ đọc giọng 2 lần.

---

## 1. YouTube

### 1.1. Chuẩn bị kênh (làm 1 lần)
1. Vào **studio.youtube.com** → **Tạo** → **Phát trực tiếp**.
2. Lần đầu YouTube bắt xác minh số điện thoại và **chờ tối đa 24 giờ** mới cho live.
3. Lấy **@handle** kênh: góc phải YouTube → ảnh đại diện → dòng `@ten_kenh`.

### 1.2. Khai báo trong `config.json`
```json
"youtube": { "enabled": true, "demo": false, "handle": "@ten_kenh" }
```
Khởi động lại server. Khi kênh chưa live, cửa sổ server báo `kênh chưa live → thử lại sau 60 giây`; lên live sẽ báo `[youtube] đang đọc chat live`.

### 1.3. Lấy khoá luồng
YouTube Studio → **Phát trực tiếp** → thẻ **Luồng (Stream)**:
- Chế độ hiển thị: **Công khai** (để server tìm được buổi live qua @handle).
- Bật **Trò chuyện trực tiếp (Live chat)**.
- Độ trễ: **Độ trễ thấp**.
- Sao chép **Khoá sự kiện trực tiếp (Stream key)**.

> Muốn để **Không công khai**: điền thêm `"liveId": "<mã sau watch?v=>"` thay cho `handle`, mỗi buổi đổi mã.

### 1.4. OBS
1. **Cài đặt → Luồng**: Dịch vụ **YouTube - RTMPS** → **Sử dụng khoá luồng** → dán khoá.
2. **Cài đặt → Video**: Độ phân giải nền **1080x1920**, đầu ra **1080x1920** (máy yếu: 720x1280), **30 FPS**.
3. **Cài đặt → Đầu ra**: Bitrate **4500–6000 Kbps**, Khoảng khung hình chính **2 giây**, bộ mã hoá **NVENC** nếu máy có card NVIDIA.
4. Thêm nguồn **Trình duyệt (Browser)**:
   - URL: `http://localhost:3100/youtube`
   - Rộng **1080**, Cao **1920**
   - ✔ **Điều khiển âm thanh qua OBS** (để giọng đọc vào luồng)
   - ✔ Tắt nguồn khi không hiển thị: **bỏ chọn**
5. **Bắt đầu phát trực tiếp**. YouTube tự xếp live dọc vào mục Shorts.

---

## 2. Facebook (phải live trên **Trang**, không phải trang cá nhân)

Facebook chỉ cho phần mềm đọc bình luận live của **Trang (Page)** mà sếp quản trị.

### 2.1. Lấy Page ID
Vào Trang → **Giới thiệu** → **Minh bạch trang** → dòng **ID Trang** (một dãy số).

### 2.2. Tạo ứng dụng để lấy token (làm 1 lần)
1. Vào **developers.facebook.com** → **Ứng dụng của tôi** → **Tạo ứng dụng**.
   - Trường hợp sử dụng: **Khác** → Loại: **Doanh nghiệp** → đặt tên (vd `Chua Online`).
   - Để ứng dụng ở chế độ **Phát triển** là đủ (chỉ đọc Trang của chính sếp).
2. Mở **Công cụ → Graph API Explorer**:
   - Ứng dụng Meta: chọn `Chua Online`.
   - Người dùng hoặc Trang: **Mã người dùng (User Token)**.
   - Quyền (Permissions): thêm `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`.
   - Bấm **Generate Access Token** → đăng nhập → chọn đúng Trang → Cho phép.
3. Đổi sang **token không hết hạn**:
   - Copy mã đang hiện → mở **Công cụ → Trình gỡ lỗi mã truy cập** → dán → **Gỡ lỗi** → **Gia hạn mã truy cập** → copy mã dài mới.
   - Quay lại Graph API Explorer, dán mã dài vào ô Access Token, gọi `me/accounts` → **Gửi**.
   - Trong kết quả, ở đúng Trang, copy `access_token` (đây là **Page Access Token**, không hết hạn) và `id` (là Page ID).

### 2.3. Khai báo trong `config.json` (sếp tự dán, không gửi token qua chat)
```json
"facebook": { "enabled": true, "demo": false, "pageId": "1234567890", "pageAccessToken": "EAAB..." }
```
Khởi động lại server. Trang chưa live → báo `Trang chưa live → kiểm tra lại sau 60 giây`; lên live → `[facebook] đang đọc bình luận live`.

> Token này đọc được Trang, **không đưa lên GitHub, không gửi ai** (`config.json` đã nằm trong `.gitignore`). Đổi mật khẩu Facebook / gỡ quyền ứng dụng thì token mất hiệu lực → làm lại bước 2.2.

### 2.4. Lấy khoá luồng
1. Vào **facebook.com/live/producer** → **Tạo video trực tiếp** → **Phần mềm phát trực tiếp**.
2. Mục **Đăng lên**: chọn **Trang** của sếp (không chọn dòng thời gian cá nhân).
3. Bật **Sử dụng khoá luồng cố định** (để lần sau khỏi đổi khoá trong OBS).
4. Copy **Khoá luồng**.

### 2.5. OBS
Như YouTube, chỉ khác:
- **Cài đặt → Luồng**: Dịch vụ **Facebook Live** → dán khoá.
- Browser source URL: `http://localhost:3100/facebook`.
- Bitrate tối đa Facebook **4000 Kbps** (dùng 720x1280 là đẹp và nhẹ).

Bấm **Bắt đầu phát trực tiếp** trong OBS, rồi bấm **Phát trực tiếp** trên trang Live Producer.

---

## 3. Live YouTube + Facebook cùng lúc

Hai luồng khác nhau (mỗi bên một overlay, một bảng vàng) nên cần **2 OBS chạy song song**:

1. Tạo lối tắt OBS thứ hai: chuột phải lối tắt OBS → **Thuộc tính** → ô **Đích** thêm ` --multi` vào cuối → OK.
2. Mỗi OBS dùng **Hồ sơ (Profile)** và **Bộ cảnh (Scene Collection)** riêng: OBS 1 = YouTube, OBS 2 = Facebook.
3. Máy đang chạy cả TikTok LIVE Studio thì là **3 luồng mã hoá**: nên để YouTube / Facebook ở **720x1280**, bộ mã hoá **NVENC**, và xem **CPU < 70%** trong Trình quản lý tác vụ trước khi để chạy lâu.

Kiểm tra nhanh không cần live thật: đặt `"demo": true` cho nền tảng đó → overlay tự phát sự kiện giả.

## 4. Thử nhanh khi đã kết nối
- `http://localhost:3100/test/youtube/chat?text=thắp đèn`
- `http://localhost:3100/test/facebook/chat?text=Nam mô A Di Đà Phật`

(Sự kiện thử có ghi vào bảng vàng; thử xong tắt server và xoá `data/youtube.json` / `data/facebook.json`.)
