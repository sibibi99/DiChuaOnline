// Một "phòng" = một nền tảng (tiktok / youtube / facebook), trạng thái độc lập
const { isClean, isSensitive, cleanText, displayName, spokenName, isNiemPhat, stripEmotes, isMeaningful, plain } = require('./filter');
const { VoiceQueue } = require('./voice');
const { DEFAULT_RITUALS, ritualForGift, ritualForChat, isRitualCommand, drawThe, THE_TOTAL } = require('./rituals');
const { giftVi } = require('./gifts');
const { TALKS, OUTROS, KIND_NAME } = require('./talks');
const store = require('./store');

const SEATS = 24;      // chỗ quỳ lễ thường mặc định (trước bàn thờ 5 chỗ dành cho top công đức); đổi bằng config.seats
const TOP = 5;
// cấp danh hiệu theo tổng xu công đức (overlay hiện cạnh tên, lên cấp thì chúc mừng)
const TITLES = [[1, 'Sơ Tâm'], [10, 'Tịnh Tâm'], [50, 'An Nhiên'], [100, 'Hoan Hỷ'], [300, 'Tri Âm'], [1000, 'Tri Âm Vàng']];   // tên thường, không dùng chức vị tôn giáo cho người tặng quà
const titleOf = p => { let t = ''; for (const [n, name] of TITLES) if (p >= n) t = name; return t; };
// lời chúc theo giờ máy (giờ Việt Nam): ca tối không chúc "một ngày an lành"
function buoi(h = new Date().getHours()) {
  if (h >= 4 && h < 11) return 'một buổi sáng an lành';
  if (h >= 11 && h < 13) return 'một buổi trưa an lành';
  if (h >= 13 && h < 17) return 'một buổi chiều an lành';
  if (h >= 17 && h < 22) return 'một buổi tối an lành';
  return 'một đêm bình an';
}
// khóa lễ luân phiên: mỗi khóa đổi cảnh + cách tương tác, có đếm ngược để buổi live không đứng một bố cục. Ghi đè bằng config.segments
const SEGMENTS = [
  { key: 'le', name: 'Phiên An Lạc', sub: 'Bình luận để vào chánh điện · chat “rút thẻ” nhận thẻ chúc lành',
    say: 'Nam mô A Di Đà Phật. Phiên an lạc bắt đầu. Quý Phật tử bình luận để vào chánh điện, chat rút thẻ để nhận một thẻ chúc lành miễn phí.' },
  { key: 'tungkinh', name: 'Giờ Đồng Niệm', sub: 'Chat “Nam mô A Di Đà Phật” · cùng cúi đầu theo tiếng mõ',
    say: 'Đến giờ đồng niệm. Đại chúng cùng chat Nam mô A Di Đà Phật, cả không gian sẽ cùng cúi đầu theo tiếng mõ.' },
  { key: 'quanam', name: 'Phiên Đèn Sen', sub: 'Mỗi lời nguyện là một ngọn đèn sen dâng Bồ Tát',
    say: 'Phiên đèn sen, hướng về Quán Thế Âm Bồ Tát. Quý Phật tử bình luận lời nguyện, mỗi lời nguyện là một ngọn đèn sen dâng lên Bồ Tát.' },
  { key: 'thien', name: 'Thiền Tĩnh Tâm', sub: 'Hít vào thật sâu · thở ra thật chậm',
    say: 'Giờ thiền tĩnh tâm. Mời đại chúng hít vào thật sâu, thở ra thật chậm, theo vòng sáng quanh tượng Phật.' },
  { key: 'ngu', name: 'Phiên Ru Ngủ', night: true, sub: 'Thả lỏng vai · thở thật chậm · nghe mưa nhẹ',
    say: 'Phiên ru ngủ. Mời quý vị thả lỏng đôi vai, thở thật chậm, nghe tiếng mưa nhẹ. Chúc quý vị một giấc ngủ ngon.' },
  { key: 'hoadang', name: 'Phiên Hoa Đăng', sub: 'Mỗi bình luận là một ngọn hoa đăng mang lời nguyện',
    say: 'Phiên hoa đăng. Mỗi bình luận của quý Phật tử là một ngọn hoa đăng mang lời nguyện bình an.' },
];
const ANNOUNCE ='Nam mô A Di Đà Phật. Quý Phật tử bình luận bất kỳ để vào chánh điện. Mỗi ngày chat rút thẻ để nhận một thẻ chúc lành miễn phí, sưu tầm đủ ba mươi sáu thẻ. Chat gõ mõ để cùng gõ mõ, thả tim để cả chánh điện cùng lễ Phật. Đây là chương trình giải trí, quà tặng là ủng hộ kênh, không phải tiền cúng dường. Chánh điện là hình ảnh mô phỏng để thư giãn, tĩnh tâm, không đại diện cho cơ sở tôn giáo nào. Giọng đọc do AI tạo. Điểm tri ân được lưu theo tên TikTok của quý vị, chat xoá điểm nếu muốn xoá.';
const today = () => new Date().toLocaleDateString('sv');   // YYYY-MM-DD theo giờ máy
// tuần bắt đầu thứ Hai (giờ máy): bảng vàng tuần tự về 0, điểm trọn đời giữ nguyên
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toLocaleDateString('sv'); };
const wp = u => u.wk === weekKey() ? (u.wp || 0) : 0;

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
    this.goal = { n: 0, target: cfg.likeGoal || 300 };   // thả tim cùng đại chúng: đủ mốc thì cả chánh điện cùng lạy
    this.mo = 0;                                          // tiếng mõ đại chúng gõ (chat "gõ mõ")
    this.viewers = 0; this.updateStageMin();
    this.joinTs = []; this.crowdAt = 0; this.crowdTop = 0;   // người vào đông → Phật quang phổ chiếu
    setInterval(() => this.updateStageMin(), 15000);
    this.segs = cfg.segments || SEGMENTS; this.segMs = (cfg.segMin || 8) * 60000; this.segI = -1; this.nextSeg();
    // nhắc người mới cách vào chánh điện (cùng 1 câu nên Vbee chỉ tạo 1 lần, các lần sau lấy bộ nhớ đệm)
    const every = (cfg.voice.announceMin ?? 10) * 60000;
    if (every > 0) setInterval(() => {
      if (this.live && !this.voice.items.some(i => i.text === ANNOUNCE)) this.voice.push('join', ANNOUNCE);
    }, every);
    // vắng tương tác thì giảng ngắn, xen kẽ lời an lạc / chuyện đời (config.talks: enabled, idleSec, gapSec, list)
    const tc = cfg.talks || {};
    this.talks = { phap: [], doi: [] }; for (const b of tc.list || TALKS) (this.talks[b.k] || (this.talks[b.k] = [])).push(b);
    this.deck = {}; this.talk = null; this.talkEnd = 0; this.talkTurn = 0; this.voice.lastOther = Date.now();
    if (tc.enabled !== false) { setInterval(() => this.talkTick(), 1500); setTimeout(() => this.warmTalks(), 20000); }
  }

  // ----- bài giảng lúc vắng -----
  pickTalk() {
    const order = this.cfg.talks?.pattern || ['phap', 'doi'], k = order[this.talkTurn++ % order.length];
    if (!this.deck[k]?.length) this.deck[k] = [...(this.talks[k] || [])].sort(() => Math.random() - .5);   // xào bài, hết lượt mới lặp lại
    const b = this.deck[k].pop(); if (!b) return null;
    const parts = [...b.parts]; if (Math.random() < .5) parts.push(OUTROS[Math.floor(Math.random() * OUTROS.length)]);
    return { ...b, parts, i: 0 };
  }
  talkTick() {
    const tc = this.cfg.talks || {}, v = this.voice, now = Date.now();
    if (!this.live || this.quiet) { this.talk = null; return; }   // ru ngủ: giữ yên tĩnh
    if (v.playing || v.items.length || now - (v.lastDone || 0) < 1200) return;
    if (this.talk) {   // đang giảng dở (vừa nhường lượt cho người bình luận): đọc tiếp câu sau
      const p = this.talk.parts[this.talk.i++];
      if (p) return v.push('talk', p, null, { title: this.talk.title, k: KIND_NAME[this.talk.k] || '', n: this.talk.i, of: this.talk.parts.length });
      this.talk = null; this.talkEnd = now; return;
    }
    if (now - (v.lastOther || 0) < (tc.idleSec ?? 20) * 1000 || now - this.talkEnd < (tc.gapSec ?? 25) * 1000) return;
    this.talk = this.pickTalk(); if (this.talk) console.log(`[${this.platform}] vắng tương tác → ${KIND_NAME[this.talk.k]}: ${this.talk.title}`);
  }
  // tạo sẵn giọng đọc mọi bài (Voice Lab, lỗi thì bỏ qua, không gọi Vbee) để lúc giảng không phải chờ
  async warmTalks() {
    if (this.cfg.voice?.engine !== 'voicelab' || this.warmed) return; this.warmed = true;
    const all = [...Object.values(this.talks).flat().flatMap(b => b.parts), ...OUTROS]; let ok = 0;
    for (const s of all) { try { if (await this.voice.engine.synth(s, { noFallback: true })) ok++; } catch {} }
    console.log(`[${this.platform}] đã tạo sẵn giọng ${ok}/${all.length} câu bài giảng`);
  }

  // ----- lưu / nạp bảng vàng, bộ đếm -----
  restore() {
    const d = store.load(this.platform); if (!d) return;
    this.niem = d.niem || 0; this.likes = d.likes || 0;
    for (const u of d.users || []) this.users.set(u.id, { ...u, points: u.points || 0, cards: u.cards || [], last: 0, ritualAt: 0,
      ...(u.wk === undefined ? { wk: weekKey(), wp: u.points || 0 } : {}) });   // dữ liệu cũ chưa có điểm tuần: tính là của tuần này
    for (const r of this.rituals) { const o = (d.rituals || {})[r.key]; if (o) { r.count = o.count || 0; r.last = o.last || ''; } }
    console.log(`[${this.platform}] nạp lại bảng vàng: ${this.users.size} Phật tử có công đức`);
  }
  dirty() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 3000); }
  flush() {
    clearTimeout(this.saveT); this.saveT = null;
    try {
      store.save(this.platform, { niem: this.niem, likes: this.likes,
        users: [...this.users.values()].filter(u => u.points > 0 || u.cards?.length).map(({ id, name, avatar, points, cards, theDay, wk, wp }) => ({ id, name, avatar, points, cards, theDay, wk, wp })),
        rituals: Object.fromEntries(this.rituals.map(r => [r.key, { count: r.count, last: r.last }])) });
    } catch (e) { console.log('[store] lỗi ghi:', e.message); }
  }

  broadcast(m) { const s = JSON.stringify(m); for (const c of this.clients) if (c.readyState === 1) c.send(s); }
  ritualView() { return this.rituals.map(r => ({ key: r.key, name: r.name, icon: r.icon, hint: r.hint, minCoins: r.minCoins, count: r.count, last: r.last })); }
  snapshot() {
    return { t: 'snapshot', platform: this.platform, temple: this.cfg.templeName, subtitle: this.cfg.templeSubtitle,
      ticker: this.cfg.ticker, seats: this.seatView(), top: this.top(), life: this.lifeRanks(), next: this.next(), niem: this.niem, likes: this.likes, rituals: this.ritualView(),
      stageMin: this.stageMin(), goal: this.goal, mo: this.mo, titles: TITLES, seg: this.segView(), col: this.collectors(), theTotal: THE_TOTAL };
  }
  // ----- khóa lễ luân phiên -----
  isNight() { const h = new Date().getHours(), a = this.cfg.nightFrom ?? 0, b = this.cfg.nightTo ?? 5; return a > b ? (h >= a || h < b) : (h >= a && h < b); }
  pickSeg(i) {
    const L = this.segs.length, ngu = this.segs.findIndex(s => s.night);
    // đêm khuya: cứ sau nightEvery phiên thường (mặc định 4) mới có 1 phiên ru ngủ ngắn
    if (ngu >= 0 && this.isNight() && !this.segs[i]?.night && (this.sinceNgu ?? 99) >= (this.cfg.nightEvery ?? 4)) return ngu;
    const b = this.segs[i]?.night ? (this.lastNormal ?? i) : i;   // hết ru ngủ: quay lại đúng vòng phiên thường
    let j = b; do { j = (j + 1) % L; } while (this.segs[j].night && j !== b);
    return j;
  }
  get quiet() { return !!this.segs[this.segI]?.night; }   // phiên ru ngủ: không đọc lời chào người vào (vẫn cảm ơn tim, quà)
  segView() { const s = this.segs[this.segI], n = this.segs[this.pickSeg(this.segI)];
    return { key: s.key, name: s.name, sub: s.sub, left: Math.max(0, this.segEnd - Date.now()), next: n.name }; }
  nextSeg() {
    clearTimeout(this.segT); this.segI = this.pickSeg(this.segI);
    const s = this.segs[this.segI], ms = s.night ? (this.cfg.nightMin ?? 3) * 60000 : this.segMs;   // ru ngủ chỉ 3 phút
    this.sinceNgu = s.night ? 0 : (this.sinceNgu ?? 99) + 1; if (!s.night) this.lastNormal = this.segI;
    this.segEnd = Date.now() + ms; this.segT = setTimeout(() => this.nextSeg(), ms);
    this.broadcast({ t: 'seg', seg: this.segView() });
    if (this.live && s.say) this.voice.push('wish', s.say);
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
  onViewers(n) {
    if (n >= 0 && n !== this.viewers) { this.viewers = n; this.updateStageMin(); }
    // số người xem vượt mốc mới (20, 50, 100, 200, 300…) → Phật quang phổ chiếu
    const M = [20, 50, 100, 200, 300, 500, 1000], m = M.filter(v => n >= v).pop() || 0;
    if (m > this.crowdTop) { this.crowdTop = m; this.crowdFx({ viewers: n }); }
  }
  // đông người: Phật quang phổ chiếu miễn phí cho cả chánh điện (cách nhau ít nhất crowdMin phút, mặc định 6)
  crowdFx(o) {
    const now = Date.now(); if (now - this.crowdAt < (this.cfg.crowdMin ?? 6) * 60000 || !this.clients.size) return;
    this.crowdAt = now;
    this.broadcast({ t: 'crowd', ...o });
    this.voice.push('gift', o.viewers ? `A Di Đà Phật. Đã có ${o.viewers} người cùng về chánh điện. Hào quang rực rỡ, chúc đại chúng bình an, an lạc.`
      : 'A Di Đà Phật. Đại chúng về chánh điện thật đông. Hào quang rực rỡ, chúc đại chúng bình an, an lạc.');
  }
  // bảng vàng TUẦN (xếp chỗ Top 5 trước bàn thờ); danh hiệu theo điểm trọn đời
  ranks(n) {
    return [...this.users.values()].filter(u => wp(u) > 0).sort((a, b) => wp(b) - wp(a)).slice(0, n)
      .map(u => ({ id: u.id, name: u.name, avatar: u.avatar, points: wp(u), life: u.points, vip: this.isVip(u) }));
  }
  lifeRanks(n = TOP) {
    return [...this.users.values()].filter(u => u.points > 0).sort((a, b) => b.points - a.points).slice(0, n)
      .map(u => ({ id: u.id, name: u.name, avatar: u.avatar, points: u.points, life: u.points, vip: this.isVip(u) }));
  }
  // tri kỷ: điểm trọn đời từ An Nhiên (50) hoặc sưu tầm từ 10 thẻ
  isVip(u) { return u.points >= (this.cfg.vipPoints ?? 50) || (u.cards?.length || 0) >= (this.cfg.vipCards ?? 10); }
  greetVip(x) {
    if (!this.isVip(x) || Date.now() - (x.greetAt || 0) < 6 * 3600e3) return;
    x.greetAt = Date.now();
    const title = titleOf(x.points) || 'Tri Âm';
    this.broadcast({ t: 'vip', id: x.id, name: x.name, avatar: x.avatar, title });
    if (isClean(x.name)) this.voice.push('gift', `Chào mừng tri kỷ ${spokenName(x.name)}, cấp ${title}, đã trở về Không Gian An Lạc.`, x.id);
  }
  // người xem tự xoá điểm + bộ thẻ của mình (dữ liệu cá nhân)
  forget(x) {
    const name = spokenName(x.name);
    this.unseat(x.id); this.users.delete(x.id); this.dirty();
    this.broadcast({ t: 'top', top: this.top(), next: this.next(), life: this.lifeRanks() });
    this.broadcast({ t: 'col', col: this.collectors() });
    this.voice.push('wish', `Đã xoá điểm và bộ thẻ của ${name} theo yêu cầu.`);
  }
  top() { return this.ranks(TOP); }
  // bảng sưu tầm thẻ phúc: ai có nhiều thẻ khác nhau nhất
  collectors() {
    return [...this.users.values()].filter(u => u.cards?.length).sort((a, b) => b.cards.length - a.cards.length).slice(0, TOP)
      .map(u => ({ id: u.id, name: u.name, avatar: u.avatar, n: u.cards.length }));
  }
  next() { return this.ranks(TOP + 5).slice(TOP); }   // hạng 6–10: dãy nhãn top 10 trên bậc thang
  seatView() { return this.seats.map(id => { if (!id) return null; const u = this.users.get(id); return { id, name: u.name, avatar: u.avatar, vip: this.isVip(u) }; }); }

  user(u) {
    const id = String(u.id || u.name);
    let x = this.users.get(id);
    if (!x) { x = { id, name: displayName(u.name), avatar: u.avatar || '', last: 0, points: 0, cards: [], ritualAt: 0 }; this.users.set(id, x); }
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
    const que = r.key === 'the' ? drawThe() : null;
    if (que) { que.moi = !x.cards.includes(que.so); if (que.moi) x.cards.push(que.so); que.bo = x.cards.length; que.tong = THE_TOTAL; }
    this.broadcast({ t: 'ritual', key: r.key, id: x.id, name: x.name, avatar: x.avatar, via, count: r.count, que, ...extra });
    this.broadcast({ t: 'rituals', rituals: this.ritualView() });
    if (que?.moi) this.broadcast({ t: 'col', col: this.collectors() });
    const nm = spokenName(x.name);
    const text = (r.say || '{name} ' + r.name).split('{name}').join(nm)
      .replace('{so}', que?.so ?? '').replace('{loai}', que?.loai ?? '').replace('{ten}', que?.ten ?? '').replace('{loi}', que?.loi ?? '');
    return que?.moi ? `${text} Thẻ mới, bộ sưu tập ${que.bo} trên ${que.tong}.` : text;
  }

  // ===== sự kiện chuẩn hoá từ các nền tảng =====
  onJoin(u) {
    const x = this.user(u); this.seat(x);
    const now = Date.now(); this.joinTs = this.joinTs.filter(t => now - t < 60000); this.joinTs.push(now);
    if (this.joinTs.length >= (this.cfg.crowdJoins || 8)) this.crowdFx({ joins: this.joinTs.length });
    this.broadcast({ t: 'join', id: x.id, name: x.name, avatar: x.avatar });
    if (this.isVip(x)) { this.greetVip(x); return; }
    if (this.cfg.voice.readJoins && !this.quiet && isClean(x.name)) this.voice.push('join', `A Di Đà Phật, chào mừng ${spokenName(x.name)} đã vào chánh điện lễ Phật.`, x.id);
  }
  onChat(u, text) {
    const x = this.user(u); this.seat(x); this.greetVip(x);
    text = stripEmotes(text);
    const clean = isClean(text) && isClean(x.name) && !isSensitive(text);
    const show = clean ? cleanText(text, 90) : null;
    const niem = isNiemPhat(text);
    if (niem) { this.niem++; this.dirty(); this.broadcast({ t: 'niem', n: this.niem }); }
    const meaningful = !!show && isMeaningful(show);
    this.broadcast({ t: 'chat', id: x.id, name: x.name, text: meaningful ? show : null, niem });
    if (!clean || !meaningful) return;                // ".", "laughcry laughcry", "))2)3": vẫn vào chỗ quỳ, không đọc
    const name = spokenName(x.name);
    if (/\bxoa (het )?(diem|du lieu)\b/.test(plain(text))) { this.forget(x); return; }
    // "gõ mõ": cả đại chúng cùng gõ, overlay đếm combo; không đọc từng câu, mỗi 100 tiếng đọc 1 lần
    if (/\bgo mo\b/.test(plain(text))) {
      this.goMo(x);
      return;
    }
    // bình luận là lệnh pháp sự: làm pháp sự (mỗi người 1 lần / 60 giây), KHÔNG đọc thành "… nguyện: xin xăm"
    if (!niem && isRitualCommand(this.rituals, text)) {
      const r = ritualForChat(this.rituals, text);
      if (r?.key === 'the') {   // thẻ phúc miễn phí: mỗi người 1 thẻ / ngày (tặng bông hồng thì rút thêm)
        if (x.theDay === today()) { this.broadcast({ t: 'theday', id: x.id, name: x.name }); return; }
        x.theDay = today(); x.ritualAt = Date.now();
        this.voice.push('wish', this.doRitual(r, x, 'chat'), x.id);
        return;
      }
      if (r && Date.now() - x.ritualAt > (this.cfg.chatRitualCooldownSec ?? 60) * 1000) {
        x.ritualAt = Date.now();
        this.voice.push('wish', this.doRitual(r, x, 'chat'), x.id);
      }
      return;
    }
    if (niem && show.length < 40) this.voice.push('niem', `${name} niệm Nam mô A Di Đà Phật`, x.id);
    else this.voice.push('wish', `${name} nguyện: ${cleanText(text, this.cfg.voice.maxChars || 120)}`, x.id);
  }
  goMo(x) {
    this.mo++; this.broadcast({ t: 'gomo', id: x.id, name: x.name, n: this.mo });
    if (this.mo % 100 === 0) this.voice.push('wish', `Đại chúng đã cùng gõ ${this.mo} tiếng mõ. Chúc mọi người an yên.`);
  }
  onLike(u, count = 1) {
    const x = this.user(u); this.seat(x);
    this.likes += count; this.dirty();
    const per = this.cfg.likesPerMo ?? 15;   // thả tim tự gõ mõ: bấm màn hình là mõ phản hồi
    if (per > 0) { this.likeMo = (this.likeMo || 0) + count; while (this.likeMo >= per) { this.likeMo -= per; this.goMo(x); } }
    this.goal.n += count;
    this.broadcast({ t: 'like', id: x.id, count, total: this.likes, goal: this.goal });
    if (this.goal.n >= this.goal.target) {
      const done = this.goal.target;
      this.goal = { n: 0, target: Math.min(done + 100, 1000) };   // mốc sau cao dần
      this.broadcast({ t: 'goaldone', target: done, goal: this.goal });
      this.voice.push('gift', `A Di Đà Phật. Đại chúng đã thả đủ ${done} tim. Cả không gian cùng cúi đầu tĩnh tâm, chúc mọi người bình an.`);
    }
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
    const lv0 = titleOf(x.points);
    x.points += points; if (x.wk !== weekKey()) { x.wk = weekKey(); x.wp = 0; } x.wp += points; this.dirty();
    const lv = titleOf(x.points), up = lv !== lv0 && x.points >= 10;   // Sơ Tâm (1 xu) không chúc, từ Tịnh Tâm trở lên
    const big = points >= (this.cfg.bigGiftCoins || 99);
    const before = this.top().map(t => t.id).join();
    this.seat(x);
    const gShow = giftVi(giftName) === 'món quà' ? giftName : giftVi(giftName);   // hiển thị: quà lạ giữ tên gốc
    // stage: đủ mức xu thì được lên chánh điện lạy Phật (quà nhỏ chỉ lạy tại chỗ, để đông người vẫn thấy cả đại chúng)
    // bông hồng: luôn được lên chánh điện và đứng đầu hàng chờ, dù đông người (khuyến khích tặng quà nhỏ)
    const rose = /rose|hoa hồng|bông hồng/i.test(giftName);
    const stage = rose || points >= this.stageMin();
    if (stage && !rose) { (this.stageHits ||= []).push(Date.now()); }
    this.broadcast({ t: 'gift', id: x.id, name: x.name, avatar: x.avatar, gift: gShow, count, points, big, stage, rose, title: lv });
    if (up) this.broadcast({ t: 'levelup', id: x.id, name: x.name, avatar: x.avatar, title: lv });
    const after = this.top();
    if (after.map(t => t.id).join() !== before) {
      // ai bị đẩy khỏi top thì quay lại hàng thường
      for (const id of before.split(',').filter(Boolean)) if (!after.some(t => t.id === id)) this.seat(this.users.get(id));
    }
    this.broadcast({ t: 'top', top: after, next: this.next(), life: this.lifeRanks() });
    const nm = spokenName(x.name);
    const g = cleanText(giftVi(giftName), 30) || 'món quà';
    const thanks = `A Di Đà Phật, cảm ơn ${nm} đã tặng ${count > 1 ? count + ' ' : ''}${g} ủng hộ kênh.`, wish = (up ? `Chúc mừng ${nm} lên cấp ${lv}. ` : '') + `Chúc bạn ${buoi()}.`;
    const r = ritualForGift(this.rituals, giftName, points);
    this.voice.push('gift', r ? `${thanks} ${this.doRitual(r, x, 'gift', { gift: gShow, big, points })} ${wish}` : `${thanks} ${wish}`, x.id);
  }
  onFollow(u) { const x = this.user(u); this.seat(x); this.broadcast({ t: 'follow', id: x.id, name: x.name }); }
}

module.exports = { Room };
