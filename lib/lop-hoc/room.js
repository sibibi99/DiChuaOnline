// Lớp Học Vui — một "phòng" = một nền tảng. Cùng giao diện sự kiện với lib/room.js (Chùa) và lib/bia-hoi/room.js
// để server / connector dùng chung: onJoin, onChat, onLike, onGift, onFollow, onShare, onViewers.
// Luật: quà chỉ đổi lấy HIỂN THỊ (sao, giấy khen, bàn đầu, Sổ vàng), cô chỉ nói "cảm ơn + chúc", không hứa lợi ích, không nêu số tiền.
const { isClean, isSensitive, cleanText, displayName, spokenName, stripEmotes, isMeaningful, plain } = require('../filter');
const { VoiceQueue } = require('../voice');
const { giftVi } = require('../gifts');
const store = require('../store');
const { DOVUI, CHINHTA, TRUYEN, THUACO } = require('./cau-hoi');

const ROWS = 4, PER = 7, NSEAT = ROWS * PER, FRONT = PER;           // hàng 0 (7 ghế đầu) = bàn đầu; hàng 1–3 cho người mới
const FILL = [...Array(NSEAT).keys()].slice(FRONT).sort((a, b) => (Math.floor(b / PER) - Math.floor(a / PER)) || a - b);  // người mới ngồi hàng cuối (to, dễ thấy) trước
const TITLES = [[0, 'Học sinh mới'], [20, 'Chăm ngoan'], [80, 'Học sinh giỏi'], [250, 'Học sinh xuất sắc'], [600, 'Thủ khoa']];
const lvOf = p => { let k = 0; TITLES.forEach(([n], i) => { if (p >= n) k = i; }); return k; };
const SEGS = [
  { key: 'diemdanh', name: 'Điểm danh', sub: 'Gõ “có mặt” để cô ghi tên', sec: 55 },
  { key: 'dovui', name: 'Đố vui', sub: 'Gõ A · B · C · D để trả lời', n: 5 },
  { key: 'toan', name: 'Toán nhẩm & Chính tả', sub: 'Gõ số, hoặc gõ A / B', n: 4 },
  { key: 'rachoi', name: 'Ra chơi', sub: 'Thả tim để cả lớp nhảy dây', sec: 60 },
  { key: 'ke', name: 'Giờ kể chuyện', sub: 'Cô kể chuyện, cuối giờ có câu hỏi nhanh', sec: 40 },
  { key: 'tongket', name: 'Tổng kết', sub: 'Cô đọc tên top 3 của buổi học', sec: 28 },
];
const ANNOUNCE = 'Chào mừng đến Lớp Học Vui! Gõ một chữ bất kỳ để có chỗ ngồi, gõ có mặt để điểm danh, gõ A, B, C, D để trả lời câu hỏi của cô. ' +
  'Đây là chương trình giải trí, nội dung do AI tạo, quà tặng là ủng hộ kênh.';
const ATTEND_RE = /^(co mat|diem danh|da co mat|da co|co a|da a|co mat a|da)$/;
const FLOWER_RE = /(rose|hoa|flower|bouquet|garland|rosa|lotus|tulip)/i;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nmOf = n => spokenName(n).replace('một Phật tử', 'một bạn');
const LET = ['A', 'B', 'C', 'D'];

// ngày / tuần theo giờ máy (Việt Nam)
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekKey = (d = new Date()) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return dayKey(m); };
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// phép toán nhẩm sinh ngẫu nhiên: [chữ, đáp án]
function mathQ() {
  const r = n => 2 + Math.floor(Math.random() * n), k = Math.floor(Math.random() * 5);
  if (k === 0) { const a = r(48) + 10, b = r(48) + 10; return [`${a} + ${b} = ?`, a + b]; }
  if (k === 1) { const a = r(60) + 40, b = r(30) + 5; return [`${a} − ${b} = ?`, a - b]; }
  if (k === 2) { const a = r(10), b = r(10); return [`${a} × ${b} = ?`, a * b]; }
  if (k === 3) { const b = r(8), q = r(9); return [`${b * q} ÷ ${b} = ?`, q]; }
  const a = r(9) + 3, b = r(8), c = r(8); return [`${a} + ${b} × ${c} = ?`, a + b * c];
}

class Room {
  constructor(platform, cfg, voiceEngine) {
    this.platform = platform; this.cfg = cfg; this.key = 'lop-hoc-' + platform;     // dữ liệu riêng: data/lop-hoc-<nền tảng>.json
    this.B = cfg.lopHoc || {};
    this.clients = new Set();
    this.users = new Map();            // id -> {id,name,avatar,last,points,wp,wk,streak,lastDay,best,sao,gw,gwk,hoa,likeAcc,right}
    this.seats = new Array(NSEAT).fill(null);
    this.likes = 0; this.hoa = 0; this.book = []; this.week = weekKey();
    this.voice = new VoiceQueue(voiceEngine, cfg.voice, m => this.broadcast(m));
    this.voice.hasListener = () => [...this.clients].some(c => c.readyState === 1);
    this.restore();
    this.goal = { n: 0, target: this.B.likeGoal || 100 };
    this.recess = { n: 0, target: 40, done: false };
    this.sess = new Map();             // id -> điểm trong buổi học này
    this.cycle = 0; this.q = null; this.joinBuf = []; this.nudged = new Map(); this.nudgeI = 0; this.checked = [];
    this.viewers = 0; this.tok = 0; this.segI = -1; this.segEnd = Date.now();
    setInterval(() => this.flushJoins(), (this.B.joinBatchSec || 12) * 1000);
    if ((this.B.nudgeSec ?? 70) > 0) setInterval(() => this.nudge(), (this.B.nudgeSec ?? 70) * 1000);
    // chế độ demo (connectors/demo.js)
    this.demoChats = ['có mặt', 'a', 'b', 'c', 'd', 'thưa cô', 'cô ơi', 'chào cả lớp', '12', '24', 'lớp vui quá', 'xem điểm', 'a', 'b', 'chào cô', 'vào zalo 0909123456 nhận quà'];
    this.demoGifts = [['Hoa hồng', 1], ['Hoa hồng', 1], ['Tim', 5], ['Kẹo bông', 10], ['Nhẫn', 30], ['Mũ chúc mừng', 99], ['Sư tử', 299]];
    this.start(0);
    const every = (cfg.voice.announceMin ?? 10) * 60000;
    if (every > 0) setInterval(() => { if (this.live && !this.voice.items.some(i => i.text === ANNOUNCE)) this.voice.push('join', ANNOUNCE); }, every);
  }

  // ----- lưu / nạp -----
  restore() {
    const d = store.load(this.key); if (!d) return;
    this.likes = d.likes || 0; this.hoa = d.hoa || 0; this.book = d.book || [];
    for (const u of d.users || []) this.users.set(u.id, { ...blank(u.id, u.name, u.avatar), ...u, last: 0, at: 0 });
    if (d.week && d.week !== this.week) this.rollWeek(true);
    console.log(`[${this.platform}] nạp lại sổ lớp: ${this.users.size} học sinh`);
  }
  dirty() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 3000); }
  flush() {
    clearTimeout(this.saveT); this.saveT = null;
    try {
      store.save(this.key, { week: this.week, likes: this.likes, hoa: this.hoa, book: this.book.slice(-60),
        users: [...this.users.values()].filter(u => u.points > 0 || u.gw > 0 || u.streak > 0 || u.sao > 0)
          .map(({ id, name, avatar, points, wp, wk, streak, lastDay, best, sao, gw, gwk, hoa, right }) => ({ id, name, avatar, points, wp, wk, streak, lastDay, best, sao, gw, gwk, hoa, right })) });
    } catch (e) { console.log('[store] lỗi ghi:', e.message); }
  }
  // thứ Hai về 0: điểm thi đua tuần + điểm tri ân tuần, giữ điểm trọn đời + chuỗi điểm danh
  rollWeek(quiet) {
    const w = weekKey(); if (w === this.week && !quiet) return;
    this.week = w; for (const u of this.users.values()) { u.wp = 0; u.gw = 0; }
    if (!quiet) { this.broadcast({ t: 'top', ...this.tops() }); this.dirty(); }
  }
  triAn() { if (this.B.triAn != null) return !!this.B.triAn; const d = new Date(); return d.getMonth() === 10 && d.getDate() >= 12 && d.getDate() <= 20; }   // tuần tri ân 12–20/11

  broadcast(m) { const s = JSON.stringify(m); for (const c of this.clients) if (c.readyState === 1) c.send(s); }
  snapshot() {
    return { t: 'snapshot', game: 'lop-hoc', platform: this.platform, seats: this.seatView(), ...this.tops(), likes: this.likes, goal: this.goal,
      seg: this.segView(), q: this.qView(), recess: this.recess, hoa: this.hoa, tri: this.triAn(), cycle: this.cycle, sess: this.sessTop(3), ticker: this.B.ticker || '' };
  }
  tops() {
    const all = [...this.users.values()], row = u => ({ id: u.id, name: u.name, avatar: u.avatar, n: u.wp });
    const lt = this.lt();
    return { top: all.filter(u => u.wp > 0).sort((a, b) => b.wp - a.wp).slice(0, 5).map(row), book: this.book.slice(-5).reverse(),
      lt: lt ? { id: lt.id, name: lt.name, avatar: lt.avatar, n: lt.gw } : null };
  }
  lt() { return [...this.users.values()].filter(u => u.gw > 0).sort((a, b) => b.gw - a.gw)[0] || null; }
  sessTop(n) { return [...this.sess.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, p]) => { const u = this.users.get(id); return u && { id, name: u.name, avatar: u.avatar, n: p }; }).filter(Boolean); }
  seatView() {
    const lt = this.lt();
    return this.seats.map(id => { if (!id) return null; const u = this.users.get(id);
      return { id, name: u.name, avatar: u.avatar, act: u.act || 0, lv: lvOf(u.points), lt: !!lt && lt.id === id, streak: u.streak || 0 }; });
  }
  active(x) { x.act = Date.now(); }

  user(u) {
    const id = String(u.id || u.name);
    let x = this.users.get(id);
    const nm = displayName(u.name).replace(/^Phật tử$/, 'Bạn nhỏ');
    if (!x) { x = blank(id, nm, u.avatar); this.users.set(id, x); }
    else { if (u.name) x.name = nm; if (u.avatar) x.avatar = u.avatar; }
    x.last = Date.now();
    return x;
  }
  // chỗ ngồi: người mới vào hàng cuối trước; lớp đầy thì người im lặng lâu nhất nhường ghế. Hàng đầu do arrange() xếp theo điểm.
  seat(x) {
    if (this.seats.includes(x.id)) return;
    let i = FILL.find(k => !this.seats[k]);
    if (i == null) { let oldest = Infinity; for (const k of FILL) { const l = this.users.get(this.seats[k]).last; if (l < oldest) { oldest = l; i = k; } } }
    this.seats[i] = x.id;
    this.arrangeSoon(); this.broadcast({ t: 'seats', seats: this.seatView() });
  }
  // bàn đầu (hàng 0): Lớp trưởng ở giữa, người được mời lên ngồi bàn đầu (quà lớn) và người nhiều điểm học tuần nhất
  arrangeSoon() { clearTimeout(this.arrT); this.arrT = setTimeout(() => this.arrange(), 1500); }
  arrange() {
    const lt = this.lt(), now = Date.now();
    const present = this.seats.map(id => id && this.users.get(id)).filter(Boolean);
    const score = u => (lt && lt.id === u.id ? 1e9 : 0) + (u.front > now ? 1e6 : 0) + (u.wp >= 5 ? u.wp : -1);
    const front = present.filter(u => score(u) > 0).sort((a, b) => score(b) - score(a)).slice(0, FRONT).map(u => u.id);
    const cur = this.seats.slice(0, FRONT).filter(Boolean);
    if (front.length === cur.length && front.every(id => cur.includes(id))) return;        // không đổi thì giữ yên chỗ
    const rest = this.seats.slice(FRONT).filter(Boolean);
    for (const id of present.map(u => u.id)) if (!front.includes(id) && !rest.includes(id)) rest.push(id);   // người bị mời khỏi bàn đầu về lại hàng sau
    // Lớp trưởng ở ghế giữa hàng đầu, người sau xếp rải hai bên
    const order = [3, 2, 4, 1, 5, 0, 6], ns = new Array(NSEAT).fill(null);
    front.forEach((id, k) => { ns[order[k]] = id; });
    const ids = rest.filter(id => !front.includes(id));
    FILL.forEach((k, j) => { ns[k] = ids[j] || null; });
    ids.slice(FILL.length).forEach(id => { const k = order.find(z => !ns[z]); if (k != null) ns[k] = id; });   // dư chỗ thì ngồi tạm hàng đầu
    this.seats = ns; this.broadcast({ t: 'seats', seats: this.seatView() });
  }
  tableOf(id) { return this.seats.indexOf(id); }

  // ----- điểm -----
  award(x, n, why) {    // điểm học: tính cho tuần, trọn đời và buổi học
    if (!n) return;
    x.wp += n; x.points += n; this.sess.set(x.id, (this.sess.get(x.id) || 0) + n); this.dirty(); this.arrangeSoon();
    const lv = lvOf(x.points); if (lv > (x.lv ?? lv)) { x.lv = lv; this.broadcast({ t: 'lv', id: x.id, name: x.name, lv, title: TITLES[lv][1] }); }
    x.lv = lv;
  }

  // ----- chương trình: các tiết học nối tiếp nhau -----
  segView() { const s = SEGS[this.segI] || SEGS[0], n = SEGS[(this.segI + 1) % SEGS.length];
    return { key: s.key, name: s.name, sub: s.sub, left: Math.max(0, this.segEnd - Date.now()), next: n.name, idx: this.segI, total: SEGS.length, cycle: this.cycle }; }
  nextSeg() { this.start((this.segI + 1) % SEGS.length); }           // dùng khi thử (/test/<nền tảng>/seg) hoặc khi tiết kết thúc
  start(i) {
    const tok = ++this.tok; this.segI = i; this.q = null;
    this.play(i, tok).then(() => { if (tok === this.tok) this.start((i + 1) % SEGS.length); }).catch(e => console.log('[lop-hoc] lỗi tiết:', e.stack || e.message));
  }
  sleep(ms, tok) { return new Promise(r => setTimeout(r, ms)).then(() => tok === this.tok); }
  say(text, kind = 'gift', meta) { if (this.live || this.clients.size) this.voice.push(kind, text, undefined, meta); }
  async play(i, tok) {
    const s = SEGS[i], B = this.B, sc = B.speed || 1; this.rollWeek();
    if (i === 0) { this.cycle++; this.sess = new Map(); this.checked = []; }
    this.segEnd = Date.now() + (s.sec || 120) * 1000 / sc;
    this.broadcast({ t: 'seg', seg: this.segView() });
    const alive = () => tok === this.tok;
    const intro = {
      diemdanh: 'Cả lớp chú ý! Giờ điểm danh bắt đầu. Em nào có mặt thì gõ có mặt để cô ghi tên nhé. Điểm danh liên tục nhiều ngày sẽ được sao thưởng.',
      dovui: 'Tiết đố vui bắt đầu! Cô hỏi, các em gõ A, B, C hoặc D. Ai đúng và nhanh nhất sẽ được cô ghi tên lên bảng.',
      toan: 'Tiết toán nhẩm và chính tả! Toán thì gõ đáp án là số, chính tả thì gõ A hoặc B. Nhanh tay lên nào!',
      rachoi: 'Reng reng reng! Ra chơi rồi! Cả lớp thả tim thật nhiều để cùng nhau nhảy dây nào!',
      ke: 'Cả lớp ngồi ngay ngắn, cô kể chuyện cho cả lớp nghe. Cuối giờ có câu hỏi nhanh, em nào chú ý sẽ trả lời được đó!',
      tongket: 'Giờ tổng kết buổi học. Cô xin đọc tên những bạn xuất sắc nhất hôm nay.',
    }[s.key];
    this.say(intro);
    if (s.key === 'diemdanh') {
      if (!await this.sleep(s.sec * 1000 / sc, tok)) return;
      const n = this.checked.length;
      if (n) this.say(`Hôm nay có ${n} bạn có mặt. Cô gọi tên: ${this.checked.slice(0, 3).map(nmOf).join(', ')}${n > 3 ? ' và các bạn khác' : ''}. Cô ghi nhận hết rồi nhé!`);
      else this.say('Cô chưa nghe ai thưa có mặt. Các em vào lớp thì gõ có mặt cho cô biết với nhé!');
      await this.sleep(6000, tok); return;
    }
    if (s.key === 'dovui') { for (let k = 0; k < s.n; k++) { if (!alive()) return; await this.ask(this.pickAbcd(), tok, k + 1, s.n); } return; }
    if (s.key === 'toan') {
      for (let k = 0; k < s.n; k++) { if (!alive()) return; await this.ask(k % 2 ? this.pickSpell() : this.pickMath(), tok, k + 1, s.n); } return;
    }
    if (s.key === 'rachoi') {
      this.recess = { n: 0, target: Math.min(40 + this.cycle * 15, 300), done: false };
      this.broadcast({ t: 'recess', ...this.recess });
      if (!await this.sleep(s.sec * 1000 / sc, tok)) return;
      if (!this.recess.done) this.say(this.recess.n ? `Hết giờ ra chơi! Cả lớp đã thả ${this.recess.n} tim. Vào lớp thôi nào!` : 'Hết giờ ra chơi rồi, cả lớp vào lớp thôi nào!');
      await this.sleep(4000, tok); return;
    }
    if (s.key === 'ke') {
      const [title, lines] = pick(TRUYEN.filter(z => z[0] !== this.lastStory)); this.lastStory = title;
      this.story = title; this.broadcast({ t: 'story', title });
      lines.forEach(l => this.say(l, 'gift', { k: 'KỂ CHUYỆN', title }));
      const ms = lines.join(' ').length * 95 + 3500;
      this.segEnd = Date.now() + ms / sc + 32000; this.broadcast({ t: 'seg', seg: this.segView() });
      if (!await this.sleep(ms / sc, tok)) return;
      this.story = null;
      this.say('Nào, cô hỏi nhanh một câu để xem cả lớp có chú ý không nhé!');
      await this.sleep(3500, tok);
      if (!alive()) return; await this.ask(this.pickAbcd(), tok, 1, 1); return;
    }
    if (s.key === 'tongket') {
      const top = this.sessTop(3); this.broadcast({ t: 'tk', rows: top, cycle: this.cycle });
      if (top.length) {
        const w = ['Hạng nhất', 'hạng nhì', 'hạng ba'];
        this.say(`${top.map((r, j) => `${w[j]} là ${nmOf(r.name)} với ${r.n} điểm`).join(', ')}.`);
        top.forEach(r => { const u = this.users.get(r.id); if (u) { u.sao++; } });
        this.say('Cô tặng phiếu bé ngoan cho các bạn trong top. Cảm ơn cả lớp, hẹn gặp lại ở tiết sau!');
      } else this.say('Hôm nay lớp mình còn yên ắng quá. Hẹn các em ở tiết sau, nhớ gõ một chữ cho cô biết nhé!');
      await this.sleep(s.sec * 1000 / sc, tok); return;
    }
  }

  // ----- câu hỏi: abcd (chọn A-D, A-B cho chính tả) hoặc num (gõ số) -----
  pickAbcd() { const [q, a] = pick(DOVUI.filter(z => z[0] !== this.lastQ)); this.lastQ = q;
    const opts = shuffle(a.map((t, i) => ({ t, ok: !i }))); return { type: 'abcd', text: q, opts: opts.map(o => o.t), ans: opts.findIndex(o => o.ok), tag: 'Đố vui' }; }
  pickSpell() { const [ok, bad] = pick(CHINHTA.filter(z => z[0] !== this.lastQ)); this.lastQ = ok;
    const opts = shuffle([{ t: ok, ok: true }, { t: bad, ok: false }]); return { type: 'abcd', text: 'Từ nào viết ĐÚNG chính tả?', opts: opts.map(o => o.t), ans: opts.findIndex(o => o.ok), tag: 'Chính tả' }; }
  pickMath() { const [q, a] = mathQ(); return { type: 'num', text: q, ans: a, tag: 'Toán nhẩm' }; }
  qView() { const q = this.q; return q && { id: q.id, type: q.type, text: q.text, opts: q.opts, tag: q.tag, k: q.k, of: q.of, left: Math.max(0, q.end - Date.now()), total: q.sec * 1000, n: q.got.size, done: q.done }; }
  async ask(spec, tok, k, of) {
    const sc = this.B.speed || 1, sec = spec.type === 'num' ? 22 : 25;
    const q = this.q = { ...spec, id: Date.now(), got: new Map(), done: false, sec: sec / sc, end: Date.now() + sec * 1000 / sc, k, of };
    this.broadcast({ t: 'q', q: this.qView() });
    const read = spec.type === 'abcd' ? `${spec.text} ${spec.opts.map((o, i) => `${LET[i]}: ${o}.`).join(' ')}` : `Toán nhẩm: ${spec.text.replace('−', 'trừ').replace('×', 'nhân').replace('÷', 'chia').replace('+', 'cộng').replace('= ?', 'bằng mấy?')}`;
    this.say(read);
    this.segEnd = Math.max(this.segEnd, q.end);
    // kết thúc sớm khi 3 người đã trả lời đúng (toán) hoặc hết giờ
    const t0 = Date.now(); while (tok === this.tok && Date.now() < q.end && !q.done) { await new Promise(r => setTimeout(r, 400)); if (spec.type === 'num' && this.correct(q).length >= 3 && Date.now() - t0 > 4000) break; }
    if (tok !== this.tok) return;
    this.reveal(q); await this.sleep(7500 / (this.B.speed || 1), tok);
  }
  correct(q) { return [...q.got.entries()].filter(([, a]) => a.ok).sort((a, b) => a[1].t - b[1].t); }
  reveal(q) {
    q.done = true; const ok = this.correct(q);
    const dist = q.type === 'abcd' ? q.opts.map((_, i) => [...q.got.values()].filter(a => a.v === i).length) : null;
    const win = ok.map(([id], j) => { const u = this.users.get(id); const pts = j === 0 ? 5 : j < 3 ? 3 : 2; if (u) { this.award(u, pts); u.right++; } return u && { id, name: u.name, avatar: u.avatar, pts, ten: j < 3 }; }).filter(Boolean);
    const ansTxt = q.type === 'abcd' ? `${LET[q.ans]}, ${q.opts[q.ans]}` : String(q.ans);
    this.broadcast({ t: 'qend', id: q.id, ans: q.ans, ansTxt, dist, win: win.slice(0, 5), total: q.got.size, right: ok.length });
    this.broadcast({ t: 'top', ...this.tops() });
    let line = `Đáp án là ${ansTxt}.`;
    if (win.length) line += ` Nhanh nhất là ${nmOf(win[0].name)}${win[1] ? `, rồi ${nmOf(win[1].name)}` : ''}${win[2] ? ` và ${nmOf(win[2].name)}` : ''}. Có ${ok.length} bạn trả lời đúng, cô khen cả lớp!`;
    else if (q.got.size) line += ' Chưa ai đúng lần này, lần sau cố gắng nhé!'; else line += ' Chưa ai trả lời, các em nhớ giơ tay nhé!';
    this.say(line, 'wish');
  }

  // ----- kéo tương tác -----
  flushJoins() {
    const names = this.joinBuf.splice(0); if (!names.length || !this.clients.size) return;
    const [a, b] = names.map(nmOf), rest = names.length - 2;
    const who = names.length === 1 ? a : names.length === 2 ? `${a} và ${b}` : `${a}, ${b} và ${rest} bạn nữa`;
    this.voice.push('join', `Chào ${who} vừa vào lớp! ${pick(['Gõ có mặt để cô điểm danh nhé!', 'Ngồi vào chỗ, cô sắp hỏi bài đó!', 'Nghe cô hỏi rồi gõ A, B, C hoặc D nhé!'])}`);
  }
  nudge() {
    if (!this.clients.size || this.voice.items.length > 1) return;
    const now = Date.now(), left = this.goal.target - this.goal.n;
    if (this.nudgeI++ % 3 === 2 && left > 0) { this.voice.push('wish', `Còn ${left} tim nữa là cả lớp tung mũ chúc mừng, thả tim nào!`); return; }
    const c = this.seats.map(id => id && this.users.get(id)).filter(u => u && !(u.act > now - 300000) && now - (this.nudged.get(u.id) || 0) > 600000 && isClean(u.name) && u.last > now - 600000).sort((a, b) => b.last - a.last)[0];
    if (!c) { this.voice.push('wish', pick(['Ai mới vào lớp thì gõ một chữ bất kỳ để có chỗ ngồi nhé!', 'Em nào chưa điểm danh thì gõ có mặt cho cô nhé!', 'Thả tim cho lớp mình vui hơn nào!'])); return; }
    this.nudged.set(c.id, now);
    this.broadcast({ t: 'nudge', id: c.id, name: c.name });
    this.voice.push('wish', pick([n => `${n} ơi, gõ có mặt để cô điểm danh nào!`, n => `${n} ơi, em ngồi im quá, thử trả lời câu của cô đi!`, n => `Cô gọi ${n}! Em gõ một chữ cho cô biết em đang nghe nhé!`])(nmOf(c.name)), c.id);
  }

  // ===== sự kiện chuẩn hoá từ các nền tảng =====
  onJoin(u) {
    const x = this.user(u); this.seat(x);
    this.broadcast({ t: 'join', id: x.id, name: x.name, avatar: x.avatar });
    if (this.cfg.voice.readJoins && isClean(x.name) && !this.joinBuf.includes(x.name) && Date.now() - (x.greet || 0) > 600000) { x.greet = Date.now(); this.joinBuf.push(x.name); }
  }
  onChat(u, text) {
    const x = this.user(u); this.seat(x); this.active(x);
    text = stripEmotes(text);
    const clean = isClean(text) && isClean(x.name) && !isSensitive(text), p = plain(text);
    const show = clean ? cleanText(text, 80) : null;
    // người xem tự xoá dữ liệu của mình
    if (/^(xoa diem|xoa du lieu)$/.test(p)) { this.users.delete(x.id); this.seats = this.seats.map(id => id === x.id ? null : id); this.dirty(); this.broadcast({ t: 'seats', seats: this.seatView() });
      this.voice.push('wish', 'Cô đã xoá điểm và dữ liệu của bạn đó rồi nhé.'); return; }
    // trả lời câu hỏi đang mở: A-D hoặc số
    const q = this.q;
    if (q && !q.done && clean && !q.got.has(x.id)) {
      let v = null, ok = false;
      if (q.type === 'abcd') { const m = /^(dap an |chon |tra loi )?([abcd])$/.exec(p); if (m) { v = m[2].charCodeAt(0) - 97; ok = v === q.ans; if (v >= q.opts.length) v = null; } }
      else { const m = /^(-?\d+)([.,]0+)?$/.exec(p.replace(/\s/g, '')); if (m) { v = +m[1]; ok = v === q.ans; } }
      if (v != null) {
        q.got.set(x.id, { v, ok, t: Date.now() });
        this.broadcast({ t: 'ans', id: x.id, name: x.name, n: q.got.size, v: q.type === 'abcd' ? LET[v] : String(v) });
        if (q.type === 'num' && ok) this.broadcast({ t: 'ok', id: x.id });
        return;
      }
    }
    // điểm danh: mỗi ngày một lần, chuỗi ngày liền
    if (ATTEND_RE.test(p)) {
      const day = dayKey();
      if (x.lastDay === day) { this.broadcast({ t: 'chat', id: x.id, name: x.name, text: 'Có mặt!', table: this.tableOf(x.id) }); return; }
      x.streak = x.lastDay === yesterdayKey() ? x.streak + 1 : 1; x.lastDay = day; x.best = Math.max(x.best || 0, x.streak);
      const bonus = x.streak === 3 ? 3 : x.streak === 7 ? 10 : x.streak === 30 ? 40 : 0;
      this.award(x, 1 + bonus); if (!this.checked.includes(x.name)) this.checked.push(x.name);
      this.broadcast({ t: 'dd', id: x.id, name: x.name, avatar: x.avatar, streak: x.streak, bonus });
      if (bonus) this.voice.push('gift', `${nmOf(x.name)} điểm danh ${x.streak} ngày liên tiếp! Cô thưởng cho bạn ${bonus} điểm chuyên cần!`, x.id);
      else if (x.streak > 1 && isClean(x.name)) this.voice.push('wish', `${nmOf(x.name)} có mặt, đã ${x.streak} ngày liền rồi, giỏi quá!`, x.id);
      return;
    }
    if (/^(thua co|co oi|co giao oi)\b/.test(p)) {
      if (Date.now() - (x.at || 0) < 20000) return; x.at = Date.now();
      this.broadcast({ t: 'chat', id: x.id, name: x.name, text: show, table: this.tableOf(x.id) });
      this.voice.push('wish', `${nmOf(x.name)} thưa cô. ${pick(THUACO)}`, x.id); return;
    }
    if (/^(xem diem|diem cua toi|diem cua em|rank|hang cua toi)$/.test(p)) {
      if (Date.now() - (x.at || 0) < 30000) return; x.at = Date.now();
      this.broadcast({ t: 'me', id: x.id, name: x.name, points: x.points, wp: x.wp, streak: x.streak, title: TITLES[lvOf(x.points)][1] });
      this.voice.push('wish', `${nmOf(x.name)} có ${x.points} điểm, ${x.wp} điểm trong tuần, điểm danh ${x.streak} ngày liền, danh hiệu ${TITLES[lvOf(x.points)][1]}.`, x.id); return;
    }
    const meaningful = !!show && isMeaningful(show);
    this.broadcast({ t: 'chat', id: x.id, name: x.name, text: meaningful ? show : null, table: this.tableOf(x.id) });
    if (!clean || !meaningful) return;
    this.voice.push('wish', `${nmOf(x.name)} nói: ${cleanText(text, this.cfg.voice.maxChars || 120)}`, x.id);
  }
  onLike(u, count = 1) {
    const x = this.user(u); this.seat(x); this.active(x);
    this.likes += count; this.dirty(); this.goal.n += count;
    x.likeAcc = (x.likeAcc || 0) + count; while (x.likeAcc >= 10) { x.likeAcc -= 10; this.award(x, 1); }
    const sg = SEGS[this.segI];
    if (sg && sg.key === 'rachoi' && !this.recess.done) {
      this.recess.n += count; this.broadcast({ t: 'recess', ...this.recess });
      if (this.recess.n >= this.recess.target) { this.recess.done = true; this.broadcast({ t: 'recess', ...this.recess });
        this.say('Cả lớp đã thả đủ tim rồi! Nào, một hai, nhảy dây thôi! Cả lớp cùng nhảy!'); for (const id of this.seats) { const w = id && this.users.get(id); if (w) this.award(w, 1); } }
    }
    this.broadcast({ t: 'like', id: x.id, count, total: this.likes, goal: this.goal });
    if (this.goal.n >= this.goal.target) {
      const done = this.goal.target; this.goal = { n: 0, target: Math.min(done + (done < 400 ? 100 : 200), 2000) };
      this.broadcast({ t: 'goaldone', target: done, goal: this.goal });
      this.voice.push('gift', `Cả lớp đã thả đủ ${done} tim! Tung mũ chúc mừng nào, cô cảm ơn cả lớp!`);
    }
    if (this.cfg.voice.readLikes !== false && isClean(x.name)) this.voice.push('like', `Cảm ơn ${nmOf(x.name)} đã thả tim cho lớp.`, x.id);
  }
  onShare(u) {
    const x = this.user(u); this.seat(x); this.active(x); this.award(x, 2);
    this.broadcast({ t: 'share', id: x.id, name: x.name });
    this.voice.push('like', `Cảm ơn ${nmOf(x.name)} đã rủ thêm bạn vào lớp!`, x.id);
  }
  onViewers(n) { if (n >= 0) this.viewers = n; }
  onFollow(u) { const x = this.user(u); this.seat(x); this.award(x, 2); this.broadcast({ t: 'follow', id: x.id, name: x.name, avatar: x.avatar });
    this.voice.push('gift', `Cảm ơn ${nmOf(x.name)} đã theo dõi lớp học!`, x.id); }
  // quà: hiển thị theo bậc (không nêu số tiền, không hứa lợi ích)
  onGift(u, giftName, count = 1, points = 1) {
    const x = this.user(u); this.seat(x); this.active(x);
    const tier = points >= 99 ? 'ratlon' : points >= 30 ? 'lon' : points >= 5 ? 'vua' : 'nho';
    x.sao += tier === 'nho' ? 1 : 3; x.gw += points; this.dirty();
    const gShow = giftVi(giftName) === 'món quà' ? giftName : giftVi(giftName), flower = this.triAn() && FLOWER_RE.test(String(giftName));
    if (flower) this.hoa += Math.max(1, count);
    if (tier === 'lon' || tier === 'ratlon') x.front = Date.now() + 40 * 60000;       // ngồi bàn đầu 40 phút
    if (tier === 'ratlon') { this.book.push({ name: x.name, avatar: x.avatar, at: Date.now() }); if (this.book.length > 60) this.book.shift(); }
    this.arrangeSoon();
    const o = { id: x.id, name: x.name, avatar: x.avatar, tier, gift: gShow, count, flower, hoa: this.hoa, at: Date.now() };
    this.broadcast({ t: 'gift', ...o }); this.broadcast({ t: 'top', ...this.tops() });
    const nm = nmOf(x.name), g = cleanText(giftVi(giftName), 30) || 'món quà', thanks = `Cảm ơn ${nm} đã tặng ${count > 1 ? count + ' ' : ''}${g} ủng hộ lớp.`;
    const line = flower ? `${nm} tặng hoa cô giáo, cô xin nhận nhé! Bó hoa trên bục đã có ${this.hoa} bông.` : {
      nho: 'Cô tặng bạn một ngôi sao điểm mười!',
      vua: 'Cô trao giấy khen cho bạn. Cả lớp vỗ tay nào!',
      lon: 'Mời bạn lên ngồi bàn đầu, cô trao huy hiệu Lớp trưởng tuần này. Cả lớp vỗ tay nào!',
      ratlon: `Cả lớp đứng dậy tuyên dương ${nm}! Tên bạn được ghi vào Sổ vàng của lớp. Chúc bạn học tốt, ngày nào cũng vui!`,
    }[tier];
    this.voice.push('gift', `${thanks} ${line}`, x.id);
    if (flower && this.hoa % 20 < Math.max(1, count) && this.hoa >= 20) this.voice.push('gift', 'Bó hoa đã đầy! Cô xin cúi chào cả lớp, cảm ơn các em đã nhớ đến cô!');
  }
}
function blank(id, name, avatar) { return { id, name, avatar: avatar || '', last: 0, at: 0, points: 0, wp: 0, wk: 0, streak: 0, lastDay: '', best: 0, sao: 0, gw: 0, gwk: 0, hoa: 0, likeAcc: 0, right: 0 }; }

module.exports = { Room, SEGS, ROWS, PER, TITLES };
