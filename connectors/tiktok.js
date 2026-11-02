// Đọc live TikTok (thư viện không chính thức tiktok-live-connector, AGPL-3.0 — module tách riêng)
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

module.exports = function startTikTok(room, opt) {
  let conn, retry = 15000, stopped = false;
  // proto v3: user.id / user.displayId; bản cũ: userId / uniqueId
  const U = d => { const u = d?.user || {}; return { id: String(u.id || u.userId || u.displayId || u.uniqueId || ''), name: u.nickname || u.displayId || u.uniqueId }; };

  async function connect() {
    if (stopped) return;
    conn = new TikTokLiveConnection(opt.username, {
      // tải danh sách quà cần ký request qua Euler Stream gói Business; sự kiện quà đã có tên + số xu nên tắt mặc định
      enableExtendedGiftInfo: !!opt.extendedGiftInfo,
      signApiKey: opt.signApiKey || undefined,
    });
    // tên trường theo proto v3 của thư viện 2.x (content, count, gift.*); giữ tên cũ làm dự phòng
    conn.on(WebcastEvent.MEMBER, d => room.onJoin(U(d)));
    conn.on(WebcastEvent.CHAT, d => { const text = d.content ?? d.comment; if (text) room.onChat(U(d), text); });
    conn.on(WebcastEvent.LIKE, d => room.onLike(U(d), d.count || d.likeCount || 1));
    conn.on(WebcastEvent.FOLLOW, d => room.onFollow(U(d)));
    conn.on(WebcastEvent.GIFT, d => {
      const type = d.gift?.type ?? d.giftDetails?.giftType;
      if (type === 1 && !d.repeatEnd) return;           // quà chuỗi: chỉ tính khi kết thúc
      const count = d.repeatCount || 1;
      const coin = d.gift?.diamondCount ?? d.giftDetails?.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1;
      const name = d.gift?.name || d.giftDetails?.giftName || d.extendedGiftInfo?.name || 'quà';
      room.onGift(U(d), name, count, coin * count);
    });
    conn.on(WebcastEvent.STREAM_END, () => { console.log('[tiktok] live kết thúc'); later(); });
    conn.on(ControlEvent.DISCONNECTED, () => { console.log('[tiktok] mất kết nối'); later(); });
    try {
      const st = await conn.connect();
      console.log('[tiktok] đã kết nối phòng', st?.roomId || '');
      retry = 15000;
    } catch (e) {
      console.log('[tiktok] chưa kết nối được:', e?.message || e, '→ thử lại sau', retry / 1000, 'giây');
      later();
    }
  }
  let timer;
  function later() {
    clearTimeout(timer); try { conn?.disconnect(); } catch {}
    timer = setTimeout(connect, retry); retry = Math.min(retry * 2, 120000);
  }
  // Tắt live rồi mở lại thì TikTok cấp phòng mới nhưng không phải lúc nào cũng báo STREAM_END
  // -> mỗi phút dò room id hiện tại, khác phòng đang nghe thì nối lại ngay.
  const watch = setInterval(async () => {
    if (stopped || !conn?.roomId) return;
    try {
      const probe = new TikTokLiveConnection(opt.username, { signApiKey: opt.signApiKey || undefined });
      const id = await probe.fetchRoomId();
      if (id && String(id) !== String(conn.roomId)) {
        console.log('[tiktok] có phiên live mới', id, '→ nối lại');
        retry = 1000; later();
      }
    } catch {}
  }, 60000);
  connect();
  return () => { stopped = true; clearTimeout(timer); clearInterval(watch); try { conn?.disconnect(); } catch {} };
};
