# Chùa Online Live — Hướng dẫn cài đặt

Bộ này chạy một server nhỏ trên VPS. Server đọc bình luận, tim và quà từ TikTok, YouTube và Facebook. Mỗi nền tảng có một trang chánh điện riêng, và OBS phát trang đó lên live.

```
TikTok  ─┐                          ┌─ http://localhost:3000/tiktok   → OBS #1 → TikTok
YouTube ─┼─ server.js (VPS) ────────┼─ http://localhost:3000/youtube  → OBS #2 → YouTube
Facebook ┘     │                    └─ http://localhost:3000/facebook → OBS #3 → Facebook
               └─ gọi Vbee (giọng Thiện Đức) → trả file âm thanh
```

---

## 1. Cài trên VPS Windows

1. Cài **Node.js bản LTS**: https://nodejs.org
2. Chép cả thư mục `chua-online-live` vào VPS, ví dụ `C:\chua-online-live`.
3. Bấm đúp **`start.bat`**. Lần đầu, file này tự cài thư viện, tạo `config.json` rồi mở Notepad để bạn điền.
4. Điền xong thì lưu lại, chạy `start.bat` lần nữa. Cửa sổ sẽ hiện 3 địa chỉ `http://localhost:3000/...`.

> Mặc định cả 3 nền tảng chạy **`"demo": true`**, tức là giả lập người xem. Bạn mở trình duyệt vào `http://localhost:3000/tiktok` để xem thử. Lần đầu cần bấm vào màn hình để bật âm thanh; trong OBS âm thanh tự bật.

## 2. Điền `config.json`

| Mục | Ý nghĩa |
|---|---|
| `templeName`, `templeSubtitle`, `ticker` | Tên chùa, dòng phụ, dòng chữ chạy trên bàn thờ |
| `bigGiftCoins` | Quà từ bao nhiêu xu trở lên thì **thỉnh chuông** (mặc định 99) |
| `platforms.tiktok.username` | Tên kênh TikTok, không có `@`. Sửa `"demo": false` để chạy thật |
| `platforms.youtube.channelId` | Channel ID dạng `UC...`, xem tại YouTube Studio → Cài đặt → Kênh → Cài đặt nâng cao |
| `platforms.facebook.pageId`, `pageAccessToken` | ID Trang và Page Access Token (xem mục 5) |
| `platforms.<tên>.enabled` | `false` để tắt hẳn nền tảng đó |
| `voice.*` | Giọng đọc (xem mục 4) |

Sửa xong `config.json` thì đóng cửa sổ `start.bat` rồi mở lại.

## 3. Cài OBS: 3 bản, mỗi bản phát 1 nền tảng

OBS mặc định chỉ cho mở 1 cửa sổ. Bạn tải **OBS bản Portable (file .zip)** rồi giải nén thành 3 thư mục: `OBS-TikTok`, `OBS-YouTube`, `OBS-Facebook`. Mỗi thư mục có cài đặt riêng.

Làm lần lượt cho từng bản:

1. **Settings → Video:** Base và Output đều đặt **720x1280**, FPS **30**.
2. **Settings → Output:** Encoder **x264**, Rate Control **CBR**, Bitrate **3000 Kbps**, Keyframe Interval **2**, preset **veryfast**.
3. **Settings → Stream:**
   - TikTok: Service **Custom**, dán Server URL và Stream Key lấy từ TikTok LIVE Studio / LIVE Center.
   - YouTube: Service **YouTube - RTMPS**, dán Stream key lấy từ YouTube Studio → Phát trực tiếp.
   - Facebook: Service **Facebook Live**, dán Stream key (nên dùng *khoá luồng cố định* của Trang).
4. Thêm nguồn **Browser**:
   - URL lần lượt là `http://localhost:3000/tiktok`, `/youtube`, `/facebook`.
   - Width **720**, Height **1280**.
   - ✅ **Control audio via OBS**, để tiếng mõ, chuông và giọng đọc đi vào luồng live.
   - ✅ Refresh browser when scene becomes active.
5. Bấm **Start Streaming**.

> Nếu VPS bị giật: ở mục 2 hạ Bitrate xuống 2500, hoặc tạm tắt một nền tảng.

## 4. Giọng đọc Thiện Đức (Vbee)

**Bước 1: Lấy App ID và Token**
1. Vào https://studio.vbee.vn/apps → **Tích hợp API** → **Tạo ứng dụng**.
2. Đặt tên, ví dụ `chua-online`. Chọn thời hạn **Vĩnh viễn** để không bị dừng giữa chừng.
3. Mở ứng dụng vừa tạo, sao chép **App ID** và **Token**.

**Bước 2: Điền vào `config.json`**
```json
"engine": "vbee",
"vbee": {
  "appId": "App ID vừa sao chép",
  "token": "Token vừa sao chép",
  "voiceCode": "MA-GIONG-THIEN-DUC",
  "mode": "auto",
  "speed": 0.9
}
```

**Bước 3: Tìm mã giọng Thiện Đức**
Mở cửa sổ lệnh trong thư mục `chua-online-live` và chạy:
```
node tools/vbee-check.js
```
Lệnh này liệt kê các giọng trong tài khoản Vbee (giọng riêng, giọng cộng đồng, giọng Vbee). Tìm dòng **Thiện Đức** và sao chép phần `mã:` vào `voiceCode`.
> Nếu lệnh không liệt kê được: mở giọng Thiện Đức trên studio.vbee.vn và sao chép mã giọng, hoặc hỏi hỗ trợ Vbee "voiceCode của giọng ... để gọi API".

**Bước 4: Nghe thử**
```
node tools/vbee-check.js thu
```
Lệnh tạo file `thu-giong-vbee.mp3` để bạn mở nghe. Dòng kết quả cho biết đang dùng **Realtime** hay **Batch**.

**Các chế độ (`mode`)**

| mode | Cách hoạt động |
|---|---|
| `auto` (mặc định) | Thử Realtime trước, khoảng 0,5 giây/câu. Nếu Vbee không cho giọng Thiện Đức chạy Realtime thì tự chuyển sang Batch. |
| `sync` | Chỉ dùng Realtime. Nhanh nhất, nhưng tài liệu Vbee hiện chỉ liệt kê một số giọng có sẵn. |
| `async` | Chỉ dùng Batch. Dùng được mọi giọng, nhưng mỗi câu chậm hơn vài giây. |

- **`webhookUrl`** chỉ dùng cho chế độ Batch. Có thể để trống, vì server tự hỏi lại kết quả. Nếu VPS có địa chỉ công khai thì điền `http://IP-VPS:3000/vbee-webhook` để nhận kết quả nhanh hơn.
- **`speed`** là tốc độ đọc, từ 0.25 đến 1.9. Để 0.9 cho giọng chậm rãi, trang nghiêm.
- **Chi phí:** Vbee tính tiền theo số ký tự. Mỗi câu khoảng 40–120 ký tự. Muốn tiết kiệm thì giảm `maxChars` hoặc tăng `perUserCooldownSec`.
- Khi Vbee lỗi (hết credit, sai token…), live **vẫn chạy và hiện chữ**, chỉ không có tiếng. Lỗi hiện trong cửa sổ `start.bat` với dòng bắt đầu bằng `[voice] lỗi` hoặc `[vbee]`.
- Các câu đã đọc được lưu trong `cache/voice`. Câu lặp lại không bị tính tiền lần nữa.

**Quy tắc đọc đang cài sẵn:**
- Thứ tự ưu tiên: quà → lời nguyện → niệm Phật.
- Hàng chờ tối đa 8 câu.
- Mỗi người tối đa 1 câu trong 30 giây.
- Bình luận dài quá 120 ký tự thì cắt bớt.
- **Không đọc** bình luận có từ tục, link, số điện thoại hoặc quảng cáo.
- Tên toàn ký hiệu hoặc dạng `user123` thì đọc là "một Phật tử".
- Khi đang đọc, nhạc nền và tiếng mõ tự nhỏ lại.

Danh sách từ cấm nằm trong `lib/filter.js`.

Thử giọng trên giao diện mà chưa cần live: mở `http://localhost:3000/test/tiktok/chat?text=Cầu bình an&name=Minh Anh`.
Thử quà lớn: mở `http://localhost:3000/test/tiktok/gift?gift=Sư tử&coins=299`.

> Muốn dùng API giọng nói khác thay cho Vbee: đổi `"engine": "http"` rồi điền mục `http_khac`.

## 5. Lấy Page Access Token Facebook

1. Vào https://developers.facebook.com → **My Apps → Create App**, chọn loại *Business*.
2. Mở **Graph API Explorer**, chọn App vừa tạo, rồi chọn *Get Page Access Token*.
3. Tích các quyền `pages_read_engagement`, `pages_read_user_content`, `pages_show_list`.
4. Chọn Trang của chùa. Sao chép token. Nên đổi sang **token dài hạn** bằng Access Token Debugger → *Extend*.
5. Dán token vào `pageAccessToken`. `pageId` xem ở mục Giới thiệu của Trang.

Server tự tìm phiên live đang chạy của Trang mỗi 60 giây, nên không cần điền ID video.

## 6. Tự chạy lại khi VPS khởi động lại

- Nhấn `Win + R`, gõ `shell:startup`. Tạo **shortcut** tới `start.bat`, và shortcut tới 3 file `obs64.exe` (mỗi bản OBS một cái).
- Thêm tham số vào cuối ô Target của shortcut OBS: `--startstreaming --minimize-to-tray --disable-shutdown-check`.
- Bật **tự đăng nhập Windows** để các shortcut trên tự chạy (dùng lệnh `netplwiz`).

## 7. Lưu ý vận hành

- **TikTok** đọc live bằng thư viện không chính thức. Nếu TikTok đổi hệ thống, phần đọc có thể ngưng tạm thời. Nếu IP của VPS bị chặn, đăng ký API key tại Euler Stream rồi thêm `"signApiKey": "..."` vào `platforms.tiktok`.
- **YouTube** đọc chat theo Channel ID, không cần API key và không tốn quota. Chat chỉ đọc được khi kênh đang live công khai.
- **Facebook** giới hạn thời lượng mỗi phiên live. Khi phiên bị ngắt, cần bấm Start Streaming lại (bản này chưa tự động phần đó).
- Thư mục `cache/voice` có thể xoá bất cứ lúc nào để giải phóng ổ cứng.
