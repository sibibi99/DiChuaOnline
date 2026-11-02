# CLAUDE.md — Chùa Online Live

Overlay live "đi chùa online" tương tác cho **TikTok, YouTube, Facebook**. Mỗi nền tảng chạy độc lập. OBS trên VPS Windows phát trang overlay lên live. Người dùng (chủ dự án) giao tiếp bằng **tiếng Việt**, thích câu trả lời ngắn gọn, đi thẳng vào việc. Giữ chữ hiển thị và log bằng tiếng Việt có dấu.

## Kiến trúc

```
connectors/*  ──(sự kiện chuẩn hoá)──►  lib/room.js (1 Room / nền tảng)  ──WebSocket──►  public/index.html (canvas 720×1280)
                                              │                                              ▲
                                              └─► lib/voice.js (hàng chờ) ─► lib/vbee.js ─► cache/voice/*.mp3 ─┘ (/voice/<file>)
```

- `server.js`: HTTP + WebSocket (`/ws?p=<platform>`). Các route:
  - `/<platform>` trả overlay.
  - `/voice/<file>` trả file âm thanh trong cache.
  - `/test/<platform>/chat?text=&name=` và `/test/<platform>/gift?gift=&coins=` để bắn sự kiện thử.
  - `POST /vbee-webhook` để Vbee gọi lại.
- `connectors/`: mỗi file export `start(room, platformCfg) → stop()`, gọi các hàm chuẩn hoá của Room:
  - `room.onJoin(u)`, `room.onChat(u, text)`, `room.onLike(u, count)`, `room.onGift(u, giftName, count, points)`, `room.onFollow(u)`
  - `u = { id, name }`. `points` của TikTok = diamondCount × repeatCount. YouTube quy đổi Super Chat (VND/250).
  - `tiktok.js`: `tiktok-live-connector` (**AGPL-3.0**, không chính thức). Giữ trong module riêng để thay được.
  - `youtube.js`: `youtube-chat` (MIT), theo channelId, không cần API key.
  - `facebook.js`: Graph API, tìm live đang chạy của Page, đọc SSE `streaming-graph.facebook.com/{id}/live_comments`.
  - `demo.js`: giả lập người xem. Bật bằng `"demo": true` trong config.
- `lib/room.js`: trạng thái riêng mỗi nền tảng:
  - 24 chỗ ngồi thường. Khi đầy, người im lặng lâu nhất phải nhường chỗ.
  - Top 6 công đức ngồi hàng đầu.
  - Bộ đếm niệm Phật, tổng lượt like.
  - Sinh câu đọc: quà → "A Di Đà Phật, cảm ơn X đã cúng dường…"; lời nguyện → "X nguyện: …"; niệm Phật → "X niệm Nam mô A Di Đà Phật".
- `lib/filter.js`: `isClean` chặn từ tục, link, SĐT, quảng cáo. Có thêm `cleanText`, `displayName`, `spokenName` (tên khó đọc → "một Phật tử") và `isNiemPhat`.
- `lib/voice.js`:
  - `VoiceEngine.synth(text) → tên file cache`. Engine là `vbee` | `http` | `espeak` (giọng máy chỉ để thử) | `none`.
  - `VoiceQueue`: ưu tiên gift > wish > join > niem; tối đa `maxQueue` câu; mỗi user chờ `perUserCooldownSec`; tạo trước câu kế tiếp.
  - Chỉ phát khi có overlay đang mở. Overlay gửi `{t:'spoken', id}` báo đọc xong; có timeout dự phòng.
- `lib/vbee.js`:
  - Realtime `POST https://api.vbee.vn/v1/tts` với `mode:"sync"`, trả audio stream, tối đa 300 ký tự.
  - Batch `mode:"async"` (bắt buộc có `webhookUrl`) rồi hỏi lại `GET /v1/tts/requests/{id}` đến khi `COMPLETED` để lấy `audioLink` (link sống 3 phút).
  - `mode:"auto"`: thử sync trước, nếu bị 400 vì voice thì chuyển hẳn sang async.
  - Header: `Authorization: Bearer <token>`, `App-Id`. Tài liệu: https://api-docs.vbee.vn
- `public/index.html`: một file duy nhất, canvas 2D vẽ toàn bộ Mẫu A (chánh điện Quan Âm), không dùng ảnh ngoài.
  - Lớp tĩnh `BACK`/`MID` vẽ sẵn bằng `layer()`. Mỗi frame vẽ hào quang, đèn, khói, dải chữ chạy, Phật tử, bong bóng, "Sớ cầu an", "+Công đức", thông báo quà, hoa rơi, hiệu ứng thỉnh chuông.
  - Âm thanh dùng WebAudio: nền ngân, mõ đều, chuông. Khi giọng đọc phát thì nhạc nền tự nhỏ lại (ducking).
  - Tin WS nhận vào: `snapshot | seats | top | niem | join | chat | like | gift | speak`.

## Chạy & kiểm tra

```bash
npm install
cp config.example.json config.json   # để demo:true; voice.engine:"espeak" để thử giọng máy, hoặc "none"
node server.js                       # http://localhost:3000/tiktok | /youtube | /facebook
node tools/mock-vbee.js some.wav     # Vbee giả lập :4555 (voiceCode "custom_*" bị sync từ chối → test fallback)
#   rồi đặt voice.vbee.apiBase = "http://localhost:4555/v1", appId "APP", token "TK"
bash tools/record-demo.sh tiktok 30  # quay video demo có tiếng (cần Xvfb, pulseaudio, google-chrome, ffmpeg)
node tools/vbee-check.js [thu]       # liệt kê giọng Vbee / tạo thử 1 câu bằng config thật
```

Chưa có test tự động. Khi sửa overlay, kiểm tra bằng ảnh chụp headless (Playwright) hoặc `record-demo.sh`, và để ý các chữ bị đè lên nhau.

## Triển khai (xem HUONG-DAN.md)

VPS Windows chạy `start.bat` (tự cài thư viện, tự khởi động lại khi server dừng), cùng 3 OBS bản portable. Mỗi OBS có Browser Source `localhost:3000/<platform>` cỡ 720×1280 và bật "Control audio via OBS"; encoder x264, 30fps, khoảng 3000 kbps.

## Trạng thái & việc còn mở

- ✅ Mẫu A, 3 phòng độc lập, chế độ demo, bộ lọc nội dung, hàng chờ giọng đọc, Vbee (đã test với server giả lập).
- ⏳ **Chưa test với live thật** trên cả 3 nền tảng, và chưa test với Vbee thật (chờ App ID, Token, voiceCode giọng "Thiện Đức").
- ⏳ Giọng riêng trên Vbee nhiều khả năng chỉ chạy được Batch, nên mỗi câu trễ vài giây. Cần đo thực tế.
- ⏳ Facebook giới hạn thời lượng mỗi phiên live; chưa có cơ chế tự phát lại.
- 💡 Đã bàn, chưa làm:
  - Bảng "Đầu nguyện vọng" (gõ `nguyện: …`).
  - Dòng chữ kêu gọi follow / giỏ hàng.
  - Trang quản trị đổi nội dung không cần sửa code.
  - Đổi cảnh theo giờ.
  - Mẫu B (Thiền viện trăng rằm) và Mẫu C (Sân chùa cầu an) — bản vẽ phác ở `docs/mockups/three-variants.html?v=B|C`.

## Quy ước

- Không commit `config.json` (chứa token) hay `cache/`.
- Giữ nội dung trang nghiêm. Không viết câu kiểu "tặng quà để được phù hộ" (vi phạm chính sách quà tặng của nền tảng).
- Danh sách từ cấm nằm trong `lib/filter.js`. Câu đọc tối đa 300 ký tự (giới hạn Vbee Realtime); `maxChars` mặc định 120.
