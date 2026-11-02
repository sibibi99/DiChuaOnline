// Đọc chat YouTube Live theo Channel ID (thư viện youtube-chat, MIT, không cần API key / không tốn quota)
const { LiveChat } = require('youtube-chat');

// Quy đổi Super Chat sang điểm công đức (~ xu TikTok): 1 xu ≈ 250đ
function points(amountStr) {
  const s = String(amountStr || '');
  const n = parseFloat(s.replace(/[^\d.,]/g, '').replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) || 0;
  if (/₫|VND|đ/i.test(s)) return Math.max(1, Math.round(n / 250));
  return Math.max(1, Math.round(n * 100)); // USD và các đồng khác: ước lượng
}

module.exports = function startYouTube(room, opt) {
  let chat, stopped = false, timer, seen = new Set();
  async function connect() {
    if (stopped) return;
    // nhận 1 trong 3: handle "@ten_kenh" (dễ nhất), channelId "UC…", hoặc liveId của 1 buổi live cụ thể
    const id = opt.handle ? { handle: opt.handle.startsWith('@') ? opt.handle : '@' + opt.handle }
      : opt.liveId ? { liveId: opt.liveId } : { channelId: opt.channelId };
    chat = new LiveChat(id);
    chat.on('start', id => { console.log('[youtube] đang đọc chat live', id); seen = new Set(); room.live = true; });
    chat.on('end', r => { console.log('[youtube] live kết thúc', r || ''); room.live = false; later(); });
    chat.on('error', e => console.log('[youtube] lỗi:', e?.message || e));
    chat.on('chat', it => {
      const key = it.id || (it.author.channelId + it.timestamp);
      if (seen.has(key)) return; seen.add(key);
      const u = { id: it.author.channelId, name: it.author.name.replace(/^@/, '') };
      const text = it.message.map(m => m.text ?? m.emojiText ?? '').join('').trim();
      if (it.superchat) room.onGift(u, 'Super Chat ' + it.superchat.amount, 1, points(it.superchat.amount));
      if (it.isMembership && !text) return room.onFollow(u);
      if (text) room.onChat(u, text);
    });
    const ok = await chat.start().catch(() => false);
    if (!ok) { console.log('[youtube] kênh chưa live → thử lại sau 60 giây'); later(); }
  }
  function later() { clearTimeout(timer); try { chat?.stop(); } catch {} timer = setTimeout(connect, 60000); }
  connect();
  return () => { stopped = true; clearTimeout(timer); try { chat?.stop(); } catch {} };
};
