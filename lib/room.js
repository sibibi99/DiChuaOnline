// Một "phòng" = một nền tảng (tiktok / youtube / facebook), trạng thái độc lập
const { isClean, cleanText, displayName, spokenName, isNiemPhat } = require('./filter');
const { VoiceQueue } = require('./voice');

const SEATS = 24;      // chỗ ngồi thường (hàng đầu 6 chỗ dành cho top công đức)

class Room {
  constructor(platform, cfg, voiceEngine) {
    this.platform = platform; this.cfg = cfg;
    this.clients = new Set();
    this.users = new Map();            // id -> {id,name,last,points}
    this.seats = new Array(SEATS).fill(null);
    this.niem = 0; this.likes = 0;
    this.voice = new VoiceQueue(voiceEngine, cfg.voice, m => this.broadcast(m));
    this.voice.hasListener = () => [...this.clients].some(c => c.readyState === 1);
  }

  broadcast(m) { const s = JSON.stringify(m); for (const c of this.clients) if (c.readyState === 1) c.send(s); }
  snapshot() {
    return { t: 'snapshot', platform: this.platform, temple: this.cfg.templeName, subtitle: this.cfg.templeSubtitle,
      ticker: this.cfg.ticker, seats: this.seatView(), top: this.top(), niem: this.niem, likes: this.likes };
  }
  top() {
    return [...this.users.values()].filter(u => u.points > 0).sort((a, b) => b.points - a.points).slice(0, 6)
      .map(u => ({ id: u.id, name: u.name, points: u.points }));
  }
  seatView() { return this.seats.map(id => id ? { id, name: this.users.get(id).name } : null); }

  user(u) {
    const id = String(u.id || u.name);
    let x = this.users.get(id);
    if (!x) { x = { id, name: displayName(u.name), last: 0, points: 0 }; this.users.set(id, x); }
    else if (u.name) x.name = displayName(u.name);
    x.last = Date.now();
    return x;
  }
  // Cho người này một chỗ ngồi (nếu chưa có và không ở top hàng đầu)
  seat(x) {
    if (this.top().some(t => t.id === x.id)) { this.unseat(x.id); return; }
    if (this.seats.includes(x.id)) return;
    let i = this.seats.indexOf(null);
    if (i < 0) { // đầy: mời người im lặng lâu nhất nhường chỗ
      let oldest = Infinity;
      this.seats.forEach((id, k) => { const l = this.users.get(id).last; if (l < oldest) { oldest = l; i = k; } });
    }
    this.seats[i] = x.id;
    this.broadcast({ t: 'seats', seats: this.seatView() });
  }
  unseat(id) { const i = this.seats.indexOf(id); if (i >= 0) { this.seats[i] = null; this.broadcast({ t: 'seats', seats: this.seatView() }); } }

  // ===== sự kiện chuẩn hoá từ các nền tảng =====
  onJoin(u) {
    const x = this.user(u); this.seat(x);
    this.broadcast({ t: 'join', id: x.id, name: x.name });
    if (this.cfg.voice.readJoins) this.voice.push('join', `${spokenName(x.name)} đã vào chùa lễ Phật`, x.id);
  }
  onChat(u, text) {
    const x = this.user(u); this.seat(x);
    const clean = isClean(text) && isClean(x.name);
    const show = clean ? cleanText(text, 90) : null;
    const niem = isNiemPhat(text);
    if (niem) { this.niem++; this.broadcast({ t: 'niem', n: this.niem }); }
    this.broadcast({ t: 'chat', id: x.id, name: x.name, text: show, niem });
    if (!clean || !show) return;
    const name = spokenName(x.name);
    if (niem && show.length < 40) this.voice.push('niem', `${name} niệm Nam mô A Di Đà Phật`, x.id);
    else this.voice.push('wish', `${name} nguyện: ${cleanText(text, this.cfg.voice.maxChars || 120)}`, x.id);
  }
  onLike(u, count = 1) {
    const x = this.user(u); this.seat(x);
    this.likes += count;
    this.broadcast({ t: 'like', id: x.id, count, total: this.likes });
    if (this.cfg.voice.readLikes !== false && isClean(x.name))
      this.voice.push('like', `A Di Đà Phật, cảm ơn ${spokenName(x.name)} đã thả tim. Chúc bạn một ngày an lành.`, x.id);
  }
  onGift(u, giftName, count = 1, points = 1) {
    const x = this.user(u);
    x.points += points;
    const big = points >= (this.cfg.bigGiftCoins || 99);
    const before = this.top().map(t => t.id).join();
    this.seat(x);
    this.broadcast({ t: 'gift', id: x.id, name: x.name, gift: giftName, count, points, big });
    const after = this.top();
    if (after.map(t => t.id).join() !== before) {
      // ai bị đẩy khỏi top thì quay lại hàng thường
      for (const id of before.split(',').filter(Boolean)) if (!after.some(t => t.id === id)) this.seat(this.users.get(id));
    }
    this.broadcast({ t: 'top', top: after });
    const nm = spokenName(x.name);
    const g = cleanText(giftName, 30) || 'quà';
    this.voice.push('gift', big
      ? `A Di Đà Phật. Thỉnh chuông cảm ơn ${nm} đã cúng dường ${count > 1 ? count + ' ' : ''}${g}. Nguyện cho ${nm} và gia đình bình an, vạn sự như ý.`
      : `A Di Đà Phật, cảm ơn ${nm} đã cúng dường ${count > 1 ? count + ' ' : ''}${g}.`, x.id);
  }
  onFollow(u) { const x = this.user(u); this.seat(x); this.broadcast({ t: 'follow', id: x.id, name: x.name }); }
}

module.exports = { Room };
