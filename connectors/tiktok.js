// Đọc live TikTok (thư viện không chính thức tiktok-live-connector, AGPL-3.0 — module tách riêng)
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

module.exports = function startTikTok(room, opt) {
  let conn, retry = 15000, stopped = false;
  const U = d => ({ id: d?.user?.userId || d?.user?.uniqueId, name: d?.user?.nickname || d?.user?.uniqueId });

  async function connect() {
    if (stopped) return;
    conn = new TikTokLiveConnection(opt.username, {
      enableExtendedGiftInfo: true,
      signApiKey: opt.signApiKey || undefined,
    });
    conn.on(WebcastEvent.MEMBER, d => room.onJoin(U(d)));
    conn.on(WebcastEvent.CHAT, d => room.onChat(U(d), d.comment));
    conn.on(WebcastEvent.LIKE, d => room.onLike(U(d), d.likeCount || 1));
    conn.on(WebcastEvent.FOLLOW, d => room.onFollow(U(d)));
    conn.on(WebcastEvent.GIFT, d => {
      const type = d.giftDetails?.giftType;
      if (type === 1 && !d.repeatEnd) return;           // quà chuỗi: chỉ tính khi kết thúc
      const count = d.repeatCount || 1;
      const coin = d.giftDetails?.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1;
      const name = d.giftDetails?.giftName || d.extendedGiftInfo?.name || 'quà';
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
  connect();
  return () => { stopped = true; clearTimeout(timer); try { conn?.disconnect(); } catch {} };
};
