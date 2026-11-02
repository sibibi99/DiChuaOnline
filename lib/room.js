// Một "phòng" = một nền tảng (tiktok / youtube / facebook), trạng thái độc lập
const { isClean, cleanText, displayName, spokenName, isNiemPhat, stripEmotes, isMeaningful } = require('./filter');
const { VoiceQueue } = require('./voice');
const { DEFAULT_RITUALS, ritualForGift, ritualForChat, isRitualCommand, drawQue } = require('./rituals');
const { giftVi } = require('./gifts');
const store = require('./store');

const SEATS = 24;      // chỗ quỳ lễ thường mặc định (trước bàn thờ 5 chỗ dành cho top công đức); đổi bằng config.seats
const TOP = 5;
// lời chúc theo giờ máy (giờ Việt Nam): ca tối không chúc "một ngày an lành"
function buoi(h = new Date().getHours()) {
  if (h >= 4 && h < 11) return 'một buổi sáng an lành';
  if (h >= 11 && h < 13) return 'một buổi trưa an lành';
  if (h >= 13 && h < 17) return 'một buổi chiều an lành';
  if (h >= 17 && h < 22) return 'một buổi tối an lành';
  return 'một đêm bình an';
}
const ANNOUNCE ='Nam mô A Di Đà Phật. Quý Phật tử bình luận bất kỳ để vào chánh điện quỳ lễ. Bình luận thắp đèn, cầu an, hoặc xin xăm để cùng làm pháp sự.';

class Room {
  constructor(platform, cfg, voiceEngine) {
    this.platform = platform; this.cfg = cfg;
    this.clients = new Set();
    this.users = new Map();            // id -> {id,name,avatar,last,points,ritualAt}
    this.seats = new Array(cfg.seats || SEATS).fill(null);
    this.niem = 0; this.likes = 0;
    this.rituals = (cfg.rituals || DEFAULT_RITUALS).map(r => ({ ...r, count: 0, last: '' }));
    this.voice = new VoiceQueue(voiceEngine, cfg.voice, m => this.broadcast(m));
    this.voice.hasListener = () => [...this.clients].some(c => c.readyState === 1);
    this.restore();
    this.viewers = 0; this.updateStageMin();
    setInterval(() => this.updateStageMin(), 15000);
    // nhắc người mới cách vào chánh điện (cùng 1 câu nên Vbee chỉ tạo 1 lần, các lần sau lấy bộ nhớ đệm)
    const every = (cfg.voice.announceMin ?? 10) * 60000;
    if (every > 0) setInterval(() => {
      if (this.live && !this.voice.items.some(i => i.text === ANNOUNCE)) this.voice.push('join', ANNOUNCE);
    }, every);
  }

  // ----- lưu / nạp bảng vàng, bộ đếm -----
  restore() {
    const d = store.load(this.platform); if (!d) return;
    this.niem = d.niem || 0; this.likes = d.likes || 0;
    for (const u of d.users || []) this.users.set(u.id, { ...u, last: 0, ritualAt: 0 });
    for (const r of this.rituals) { const o = (d.rituals || {})[r.key]; if (o) { r.count = o.count || 0; r.last = o.last || ''; } }
    console.log(`[${this.platform}] nạp lại bảng vàng: ${this.users.size} Phật tử có công đức`);
  }
  dirty() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 3000); }
  flush() {
    clearTimeout(this.saveT); this.saveT = null;
    try {
      store.save(this.platform, { niem: this.niem, likes: this.likes,
        users: [...this.users.values()].filter(u => u.points > 0).map(({ id, name, avatar, points }) => ({ id, name, avatar, points })),
        rituals: Object.fromEntries(this.rituals.map(r => [r.key, { count: r.count, last: r.last }])) });
    } catch (e) { console.log('[store] lỗi ghi:', e.message); }
  }

  broadcast(m) { const s = JSON.stringify(m); for (const c of this.clients) if (c.readyState === 1) c.send(s); }
  ritualView() { return this.rituals.map(r => ({ key: r.key, name: r.name, icon: r.icon, hint: r.hint, count: r.count, last: r.last })); }
  snapshot() {
    return { t: 'snapshot', platform: this.platform, temple: this.cfg.templeName, subtitle: this.cfg.templeSubtitle,
      ticker: this.cfg.ticker, seats: this.seatView(), top: this.top(), next: this.next(), niem: this.niem, likes: this.likes, rituals: this.ritualView(),
      stageMin: this.stageMin() };
  }
  // ngưỡng xu lên chánh điện tự đổi theo độ đông: vắng thì 1 hoa hồng cũng lên, đông thì nâng dần
  // stageTiers: [[số người xem, xu], ...]; không biết số người xem (YouTube/FB) thì đếm người vừa tương tác 2 phút
  stageMin() { return this.curMin ?? this.calcStageMin(); }
  crowd() {
    if (this.viewers > 0) return this.viewers;
    const t = Date.now() - 120000; let n = 0;
    for (const u of this.users.values()) if (u.last > t) n++;
    return n;
  }
  calcStageMin() {
    const tiers = this.cfg.stageTiers || [[0, 1], [40, 5], [100, 10], [200, 30]];
    const c = this.crowd(), cur = tiers.findIndex(([, xu]) => xu === this.curMin);
    let i = 0;
    tiers.forEach(([n], k) => { if (c >= n) i = k; });
    // đang ở mức cao thì phải vắng hẳn (dưới 85% mốc) mới hạ, tránh nhảy qua lại
    if (cur > i && c >= tiers[cur][0] * 0.85) i = cur;
    // quà lên chánh điện dồn quá nhanh (> 8 lượt / phút) thì nâng thêm 1 bậc
    this.stageHits = (this.stageHits || []).filter(x => x > Date.now() - 60000);
    if (this.stageHits.length > 8) i = Math.min(i + 1, tiers.length - 1);
    return tiers[i][1];
  }
  updateStageMin() {
    const v = this.calcStageMin(); if (v === this.curMin) return;
    const first = this.curMin == null; this.curMin = v;
    console.log(`[${this.platform}] lên chánh điện: quà từ ${v} xu (đông ${this.crowd()} người)`);
    if (!first) this.broadcast({ t: 'stagemin', stageMin: v });
  }
  onViewers(n) { if (n >= 0 && n !== this.viewers) { this.viewers = n; this.updateStageMin(); } }
  ranks(n) {
    return [...this.users.values()].filter(u => u.points > 0).sort((a, b) => b.points - a.points).slice(0, n)
      .map(u => ({ id: u.id, name: u.name, avatar: u.avatar, points: u.points }));
  }
  top() { return this.ranks(TOP); }
  next() { return this.ranks(TOP + 3).slice(TOP); }   // hạng 6–8: overlay ghi "còn X xu để lên đệm"
  seatView() { return this.seats.map(id => { if (!id) return null; const u = this.users.get(id); return { id, name: u.name, avatar: u.avatar }; }); }

  user(u) {
    const id = String(u.id || u.name);
    let x = this.users.get(id);
    if (!x) { x = { id, name: displayName(u.name), avatar: u.avatar || '', last: 0, points: 0, ritualAt: 0 }; this.users.set(id, x); }
    else { if (u.name) x.name = displayName(u.name); if (u.avatar) x.avatar = u.avatar; }
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

  // Thực hiện một pháp sự: đếm, báo overlay (người đó đi lên lễ Phật), đọc lời
  doRitual(r, x, via, extra = {}) {
    r.count++; r.last = x.name; this.dirty();
    const que = r.key === 'xinxam' ? drawQue() : null;
    this.broadcast({ t: 'ritual', key: r.key, id: x.id, name: x.name, avatar: x.avatar, via, count: r.count, que, ...extra });
    this.broadcast({ t: 'rituals', rituals: this.ritualView() });
    const nm = spokenName(x.name);
    const text = (r.say || '{name} ' + r.name).split('{name}').join(nm)
      .replace('{so}', que?.so ?? '').replace('{loai}', que?.loai ?? '').replace('{loi}', que?.loi ?? '');
    return text;
  }

  // ===== sự kiện chuẩn hoá từ các nền tảng =====
  onJoin(u) {
    const x = this.user(u); this.seat(x);
    this.broadcast({ t: 'join', id: x.id, name: x.name, avatar: x.avatar });
    if (this.cfg.voice.readJoins && isClean(x.name)) this.voice.push('join', `A Di Đà Phật, chào mừng ${spokenName(x.name)} đã vào chánh điện lễ Phật.`, x.id);
  }
  onChat(u, text) {
    const x = this.user(u); this.seat(x);
    text = stripEmotes(text);
    const clean = isClean(text) && isClean(x.name);
    const show = clean ? cleanText(text, 90) : null;
    const niem = isNiemPhat(text);
    if (niem) { this.niem++; this.dirty(); this.broadcast({ t: 'niem', n: this.niem }); }
    const meaningful = !!show && isMeaningful(show);
    this.broadcast({ t: 'chat', id: x.id, name: x.name, text: meaningful ? show : null, niem });
    if (!clean || !meaningful) return;                // ".", "laughcry laughcry", "))2)3": vẫn vào chỗ quỳ, không đọc
    const name = spokenName(x.name);
    // bình luận là lệnh pháp sự: làm pháp sự (mỗi người 1 lần / 60 giây), KHÔNG đọc thành "… nguyện: xin xăm"
    if (!niem && isRitualCommand(this.rituals, text)) {
      const r = ritualForChat(this.rituals, text);
      if (r && Date.now() - x.ritualAt > (this.cfg.chatRitualCooldownSec ?? 60) * 1000) {
        x.ritualAt = Date.now();
        this.voice.push('wish', this.doRitual(r, x, 'chat'), x.id);
      }
      return;
    }
    if (niem && show.length < 40) this.voice.push('niem', `${name} niệm Nam mô A Di Đà Phật`, x.id);
    else this.voice.push('wish', `${name} nguyện: ${cleanText(text, this.cfg.voice.maxChars || 120)}`, x.id);
  }
  onLike(u, count = 1) {
    const x = this.user(u); this.seat(x);
    this.likes += count; this.dirty();
    this.broadcast({ t: 'like', id: x.id, count, total: this.likes });
    if (this.cfg.voice.readLikes !== false && isClean(x.name))
      this.voice.push('like', `A Di Đà Phật, cảm ơn ${spokenName(x.name)} đã thả tim. Chúc bạn ${buoi()}.`, x.id);
  }
  onShare(u) {
    const x = this.user(u); this.seat(x);
    const r = this.rituals.find(r => r.share);
    if (!r || Date.now() - x.ritualAt < (this.cfg.chatRitualCooldownSec ?? 60) * 1000) return;
    x.ritualAt = Date.now();
    this.voice.push('wish', this.doRitual(r, x, 'share'), x.id);
  }
  onGift(u, giftName, count = 1, points = 1) {
    const x = this.user(u);
    x.points += points; this.dirty();
    const big = points >= (this.cfg.bigGiftCoins || 99);
    const before = this.top().map(t => t.id).join();
    this.seat(x);
    const gShow = giftVi(giftName) === 'món quà' ? giftName : giftVi(giftName);   // hiển thị: quà lạ giữ tên gốc
    // stage: đủ mức xu thì được lên chánh điện lạy Phật (quà nhỏ chỉ lạy tại chỗ, để đông người vẫn thấy cả đại chúng)
    // bông hồng: luôn được lên chánh điện và đứng đầu hàng chờ, dù đông người (khuyến khích tặng quà nhỏ)
    const rose = /rose|hoa hồng|bông hồng/i.test(giftName);
    const stage = rose || points >= this.stageMin();
    if (stage && !rose) { (this.stageHits ||= []).push(Date.now()); }
    this.broadcast({ t: 'gift', id: x.id, name: x.name, avatar: x.avatar, gift: gShow, count, points, big, stage, rose });
    const after = this.top();
    if (after.map(t => t.id).join() !== before) {
      // ai bị đẩy khỏi top thì quay lại hàng thường
      for (const id of before.split(',').filter(Boolean)) if (!after.some(t => t.id === id)) this.seat(this.users.get(id));
    }
    this.broadcast({ t: 'top', top: after, next: this.next() });
    const nm = spokenName(x.name);
    const g = cleanText(giftVi(giftName), 30) || 'món quà';
    const thanks = `A Di Đà Phật, cảm ơn ${nm} đã cúng dường ${count > 1 ? count + ' ' : ''}${g}.`, wish = `Chúc bạn ${buoi()}.`;
    const r = ritualForGift(this.rituals, giftName, points);
    this.voice.push('gift', r ? `${thanks} ${this.doRitual(r, x, 'gift', { gift: gShow, big })} ${wish}` : `${thanks} ${wish}`, x.id);
  }
  onFollow(u) { const x = this.user(u); this.seat(x); this.broadcast({ t: 'follow', id: x.id, name: x.name }); }
}

module.exports = { Room };
