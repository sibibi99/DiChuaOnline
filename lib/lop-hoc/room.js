// Lớp Học Vui — một "phòng" = một nền tảng. Cùng giao diện sự kiện với lib/room.js (Chùa) và lib/bia-hoi/room.js
// để server / connector dùng chung: onJoin, onChat, onLike, onGift, onFollow, onShare, onViewers.
// Luật: quà chỉ đổi lấy HIỂN THỊ (sao, giấy khen, bàn đầu, Sổ vàng), cô chỉ nói "cảm ơn + chúc", không hứa lợi ích, không nêu số tiền.
const { isClean, isSensitive, cleanText, displayName, spokenName, stripEmotes, isMeaningful, plain } = require('../filter');
const { VoiceQueue } = require('../voice');
const { giftVi } = require('../gifts');
const store = require('../store');
const { DOVUI, CHINHTA, TRUYEN, THUACO } = require('./cau-hoi');
const { JOKES } = require('./cau-dua');

const ROWS = 4, PER = 7, NSEAT = ROWS * PER, FRONT = PER;           // hàng 0 (7 ghế đầu) = bàn đầu; hàng 1–3 cho người mới
const FILL = [...Array(NSEAT).keys()].slice(FRONT).sort((a, b) => (Math.floor(b / PER) - Math.floor(a / PER)) || a - b);  // người mới ngồi hàng cuối (to, dễ thấy) trước
const TITLES = [[0, 'Học sinh mới'], [5, 'Chăm ngoan'], [20, 'Học sinh giỏi'], [60, 'Học sinh xuất sắc'], [150, 'Thủ khoa'], [400, 'Gương sáng']];   // bản 1.1: hạ ngưỡng (buổi live đầu: trung vị chỉ 2 điểm)
const lvOf = p => { let k = 0; TITLES.forEach(([n], i) => { if (p >= n) k = i; }); return k; };
const SEGS = [
  { key: 'diemdanh', name: 'Điểm danh', sub: 'Gõ “có mặt” để cô ghi tên', sec: 45 },
  { key: 'dovui', name: 'Đố vui', sub: 'Gõ A · B · C · D để trả lời', n: 6 },
  { key: 'toan', name: 'Toán nhẩm & Chính tả', sub: 'Gõ số, hoặc gõ A / B', n: 4 },
  { key: 'rachoi', name: 'Ra chơi', sub: 'Thả tim để cả lớp nhảy dây · xen đố nhanh', sec: 70 },
  { key: 'ke', name: 'Giờ kể chuyện', sub: 'Cô kể chuyện, cuối giờ có câu hỏi nhanh', sec: 40 },
  { key: 'kt', name: 'Kiểm tra 15 phút', sub: '6 câu liên tiếp · mỗi câu 15 giây', n: 6 },
  { key: 'tongket', name: 'Tổng kết', sub: 'Cô đọc tên top 3 của buổi học', sec: 20 },
];
const ANNOUNCE = 'Chào mừng đến Lớp Học Vui! Gõ một chữ để có chỗ ngồi, gõ có mặt để điểm danh, gõ lên bảng để cô gọi. Nội dung do AI tạo, quà tặng là ủng hộ kênh.';
const ATTEND_RE = /^(co mat|diem danh|da co mat|da co|co a|da a|co mat a|da)$/;
const FLOWER_RE = /(rose|hoa|flower|bouquet|garland|rosa|lotus|tulip)/i;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BADNAME = /(lẳng lơ|lang lo|dâm|dam duc|sexy|18\+|gợi cảm|khiêu dâm|tình một đêm|không tìm thấy tài khoản|khong tim thay tai khoan)/i;
const nmOf = n => BADNAME.test(String(n)) ? 'một bạn' : spokenName(n).replace('một Phật tử', 'một bạn');
const LET = ['A', 'B', 'C', 'D'];
const fs = require('fs'), path = require('path');
const LOGF = path.join(process.env.CHUA_DATA_DIR || path.join(__dirname, '..', '..', 'data'), 'lop-hoc-log.jsonl');   // nhật ký theo tiết (không commit: data/)
const THEME_DAY = [['toan', 'tt'], ['vn', 'vh'], ['kh'], ['me'], ['en'], ['tv'], ['tg', 'dv']];   // getDay(): Chủ nhật … Thứ Bảy → chủ đề ưu tiên của ngày
const TOPIC = { vn: 'Việt Nam', vh: 'Văn hóa', tg: 'Thế giới', kh: 'Khoa học', dv: 'Động vật', toan: 'Toán', tt: 'Thể thao', tv: 'Tiếng Việt', me: 'Đố mẹo', en: 'Tiếng Anh' };
// BỐI CẢNH lớp học: server quyết định để mọi khung overlay đồng bộ; đổi sau mỗi bộ câu hỏi (đố vui, toán + chính tả, kiểm tra) và khi sang buổi mới.
// id trùng tên ảnh nền tuỳ chọn public/img/lh-nen-<id>.jpg; tp = chủ đề câu hỏi hợp với cảnh
const SCENES = [
  { id: 'sang', name: 'Lớp học buổi sáng nắng', tp: ['toan', 'tt', 'tg'] },
  { id: 'hoanghon', name: 'Lớp học lúc hoàng hôn', tp: [] },
  { id: 'dem', name: 'Lớp học đêm trăng sao', tp: ['me'] },
  { id: 'mua', name: 'Lớp học ngày mưa', tp: ['me'] },
  { id: 'thu', name: 'Lớp học mùa thu lá vàng', tp: ['vh'] },
  { id: 'xuan', name: 'Lớp học mùa xuân hoa đào', tp: ['vh', 'vn'] },
  { id: 'dong', name: 'Lớp học ngày đông ấm áp', tp: [] },
  { id: 'thinghiem', name: 'Phòng thí nghiệm khoa học', tp: ['kh'] },
  { id: 'thuvien', name: 'Thư viện của lớp', tp: ['en', 'tv'] },
  { id: 'santruong', name: 'Sân trường dưới cây phượng', tp: ['vn', 'dv', 'tt', 'tg'] },
];
const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h >>> 0; };   // cùng công thức với giao diện
// SAO LƯU data/lop-hoc-*.json mỗi ngày vào data/backup-auto/<ngày>/, giữ 7 bản gần nhất (kiểm lúc khởi động rồi mỗi giờ)
const DATA_DIR = path.dirname(LOGF);
function dailyBackup() {
  try {
    const d = new Date(), tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`, root = path.join(DATA_DIR, 'backup-auto'), dst = path.join(root, tag);
    if (fs.existsSync(dst)) return;
    const files = fs.readdirSync(DATA_DIR).filter(f => /^lop-hoc-.*\.json$/.test(f)); if (!files.length) return;
    fs.mkdirSync(dst, { recursive: true }); for (const f of files) fs.copyFileSync(path.join(DATA_DIR, f), path.join(dst, f));
    const olds = fs.readdirSync(root).filter(n => /^\d{8}$/.test(n)).sort(); while (olds.length > 7) fs.rmSync(path.join(root, olds.shift()), { recursive: true, force: true });
    console.log(`[lop-hoc] đã sao lưu ${files.length} tệp dữ liệu → backup-auto/${tag} (giữ ${Math.min(7, olds.length)} bản)`);
  } catch (e) { console.log('[lop-hoc] lỗi sao lưu:', e.message); }
}
let backupTimer = null;
const median = a => { if (!a.length) return 0; a = a.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const BOARD_RE = /^(?:(?:xin|cho|goi|co goi|thua co)\s+)?(?:(?:em|con|minh|toi|mk|e)\s+)?(?:muon\s+)?len(?:\s+bang)?(?:\s+(?:a|co|nha|nhe|di|ne|voi|co oi|duoc khong|duoc ko))?\s*$/;
const REPORT_RE = /^(?:xem )?hoc ba(?: cua (?:em|con|minh|toi))?$/;
const TEAM_RE = /^(?:vao |ve |chon |xin vao )?to ?([1-4])$/;
const FREEHOA_RE = /^(?:tang hoa(?: co(?: giao)?)?|hoa(?: co)?|tri an(?: thay co| co)?|chuc(?: mung)? (?:thay )?co(?: giao)?|chuc mung (?:ngay )?(?:nha giao|20 11|20 thang 11)|cam on (?:thay )?co(?: giao)?)(?: a| nha| nhe)?$/;

// ngày / tuần theo giờ máy (Việt Nam)
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekKey = (d = new Date()) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return dayKey(m); };
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// phép toán nhẩm sinh ngẫu nhiên theo độ khó d (1 dễ … 3 khó): [chữ, đáp án]. Buổi live đầu: toán chỉ 3 người đúng → mặc định bắt đầu ở mức 1
function mathQ(d) {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), k = r(0, 4);
  if (d <= 1) {
    if (k === 0 || k === 4) { const a = r(5, 30), b = r(5, 30); return [`${a} + ${b} = ?`, a + b]; }
    if (k === 1) { const a = r(20, 60), b = r(3, 19); return [`${a} − ${b} = ?`, a - b]; }
    if (k === 2) { const a = r(2, 6), b = r(2, 6); return [`${a} × ${b} = ?`, a * b]; }
    const b = r(2, 5), q = r(2, 6); return [`${b * q} ÷ ${b} = ?`, q];
  }
  if (d === 2) {
    if (k === 0) { const a = r(12, 58), b = r(12, 58); return [`${a} + ${b} = ?`, a + b]; }
    if (k === 1) { const a = r(40, 99), b = r(8, 35); return [`${a} − ${b} = ?`, a - b]; }
    if (k === 2) { const a = r(3, 9), b = r(3, 9); return [`${a} × ${b} = ?`, a * b]; }
    if (k === 3) { const b = r(3, 8), q = r(3, 9); return [`${b * q} ÷ ${b} = ?`, q]; }
    const a = r(30, 80), b = r(10, 40), c = r(5, 25); return [`${a} + ${b} − ${c} = ?`, a + b - c];
  }
  if (k === 0) { const a = r(48, 98), b = r(48, 98); return [`${a} + ${b} = ?`, a + b]; }
  if (k === 1) { const a = r(100, 199), b = r(30, 79); return [`${a} − ${b} = ?`, a - b]; }
  if (k === 2) { const a = r(6, 12), b = r(6, 12); return [`${a} × ${b} = ?`, a * b]; }
  if (k === 3) { const b = r(6, 12), q = r(6, 12); return [`${b * q} ÷ ${b} = ?`, q]; }
  const a = r(5, 12), b = r(3, 9), c = r(3, 9); return [`${a} + ${b} × ${c} = ?`, a + b * c];
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
    this.tp = [0, 0, 0, 0]; this.tps = [0, 0, 0, 0]; this.qstat = new Map();     // điểm 4 tổ: tuần (lưu) và buổi
    this.restore();
    this.goal = { n: 0, target: this.B.likeGoal || 200 };
    this.recess = { n: 0, target: 40, done: false };
    this.sess = new Map();             // id -> điểm trong buổi học này
    this.cycle = 0; this.q = null; this.joinBuf = []; this.nudged = new Map(); this.nudgeI = 0; this.checked = [];
    this.viewers = 0; this.tok = 0; this.segI = -1; this.segEnd = Date.now();
    if (!backupTimer) { dailyBackup(); backupTimer = setInterval(dailyBackup, 3600 * 1000); }
    setInterval(() => this.flush(), 60000); process.on('exit', () => { try { this.flush(); } catch {} });      // lưu sơ đồ ghế + giờ hoạt động ít nhất mỗi phút
    this.setTop = []; this.scene = this.pickScene(null);     // chủ đề các câu của bộ câu hỏi đang chạy → chọn cảnh kế tiếp
    this.dT = { dv: 2, ct: 2, to: 1 }; this.usedQ = new Map(); this.usedS = new Map(); this.usedJ = new Map(); this.usedT = null; this.jokeNext = 0; this.prevPresent = 0; this.loadUsed();          // độ khó nhắm tới theo loại câu + câu đã hỏi (key → giờ hỏi gần nhất, lưu data/lop-hoc-used.json)
    this.waiting = []; this.qSince = 0; this.lfeed = []; this.runLikes = 0; this.milestone = 0; this.seg0 = null; this.cyc = null; this.exam = null; this.teamT = null; this.hbSeen = 0;
    setInterval(() => this.flushJoins(), (this.B.joinBatchSec || 25) * 1000);
    this.followBuf = []; this.shareN = 0; this.lastRead = 0; this.lastThua = 0; this.smallAt = 0;
    setInterval(() => this.flushThanks(), (this.B.thanksSec || 180) * 1000);
    if ((this.B.nudgeSec ?? 180) > 0) setInterval(() => this.nudge(), (this.B.nudgeSec ?? 180) * 1000);
    // chế độ demo (connectors/demo.js)
    this.demoChats = ['có mặt', 'a', 'b', 'c', 'd', 'thưa cô', 'cô ơi', 'chào cả lớp', '12', '24', 'lớp vui quá', 'xem điểm', 'a', 'b', 'chào cô', 'vào zalo 0909123456 nhận quà'];
    this.demoGifts = [['Hoa hồng', 1], ['Hoa hồng', 1], ['Tim', 5], ['Kẹo bông', 10], ['Nhẫn', 30], ['Mũ chúc mừng', 99], ['Sư tử', 299]];
    this.start(0);
    const every = (cfg.voice.announceMin ?? 15) * 60000;
    if (every > 0) setInterval(() => { if (this.live && !this.voice.items.some(i => i.text === ANNOUNCE)) this.voice.push('join', ANNOUNCE); }, every);
  }

  // ----- câu đã hỏi: lưu bền (qua các lần khởi động lại); chỉ hỏi lại câu cũ khi hết kho hoặc sau >= 7 ngày, ưu tiên câu lâu nhất chưa hỏi -----
  loadUsed() {
    const d = store.load('lop-hoc-used') || {};
    for (const [k, v] of Object.entries(d.q || {})) this.usedQ.set(k, +v || 0);
    for (const [k, v] of Object.entries(d.s || {})) this.usedS.set(k, +v || 0);
    for (const [k, v] of Object.entries(d.j || {})) this.usedJ.set(k, String(v));
  }
  saveUsedSoon() {
    if (this.usedT) return;
    this.usedT = setTimeout(() => { this.usedT = null; try { store.save('lop-hoc-used', { q: Object.fromEntries(this.usedQ), s: Object.fromEntries(this.usedS), j: Object.fromEntries(this.usedJ) }); } catch (e) { console.log('[store] lỗi ghi lop-hoc-used:', e.message); } }, 4000);
  }
  // ----- câu đùa của cô: GỘP vào câu cô sắp đọc (không thêm lượt đọc), tối đa 1 câu / jokeSec (mặc định 165 giây ±15%), không lặp trong ngày -----
  joke(cat) {
    const sec = this.B.jokeSec ?? 165, list = JOKES[cat];
    if (!sec || !list || Date.now() < this.jokeNext || (!this.live && !this.clients.size)) return '';      // không tiêu câu đùa khi chưa ai nghe
    const day = dayKey(); let pool = list.filter(j => this.usedJ.get(j) !== day);
    if (!pool.length) pool = list.slice().sort((a, b) => String(this.usedJ.get(a) || '').localeCompare(String(this.usedJ.get(b) || ''))).slice(0, Math.max(1, Math.ceil(list.length * .25)));   // hết trong ngày: câu lâu nhất chưa dùng
    const j = pick(pool); this.usedJ.set(j, day); this.saveUsedSoon();
    this.jokeNext = Date.now() + sec * 1000 / (this.B.speed || 1) * (.85 + Math.random() * .3); return j;
  }
  jokeSolo(cat) { if (this.voice.items.length > 1) return; const j = this.joke(cat); if (j) this.voice.push('wish', j); }   // đọc riêng chỉ khi hàng chờ giọng đang ngắn
  // ----- lưu / nạp -----
  restore() {
    const d = store.load(this.key); if (!d) return;
    this.likes = d.likes || 0; this.hoa = d.hoa || 0; this.book = d.book || [];
    if (Array.isArray(d.tp) && d.tp.length === 4) this.tp = d.tp.map(n => +n || 0);
    for (const [k, v] of Object.entries(d.qstat || {})) this.qstat.set(k, v);
    for (const u of d.users || []) this.users.set(u.id, { ...blank(u.id, u.name, u.avatar), ...u, last: 0, at: 0 });
    // xếp lại sơ đồ ghế: bạn hoạt động trong 30 phút gần nhất về đúng ghế cũ (khởi động lại / mất kết nối không làm lớp trống trơn)
    if (Array.isArray(d.seats)) { const cut = Date.now() - 30 * 60000, taken = new Set();
      d.seats.slice(0, NSEAT).forEach((e, i) => { const u = e && e.id && this.users.get(e.id); if (u && !taken.has(e.id) && e.last > cut) { taken.add(e.id); this.seats[i] = e.id; u.last = e.last; u.act = e.last; } });
      if (taken.size) console.log(`[${this.platform}] xếp lại ${taken.size} bạn vào ghế cũ (hoạt động trong 30 phút gần nhất)`); }
    if (d.week && d.week !== this.week) this.rollWeek(true);
    console.log(`[${this.platform}] nạp lại sổ lớp: ${this.users.size} học sinh`);
  }
  dirty() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 3000); }
  flush() {
    clearTimeout(this.saveT); this.saveT = null;
    try {
      store.save(this.key, { week: this.week, likes: this.likes, hoa: this.hoa, book: this.book.slice(-60), tp: this.tp, qstat: Object.fromEntries([...this.qstat].slice(-600)),
        seats: this.seats.map(id => { const u = id && this.users.get(id); return u ? { id, last: u.last || 0 } : null; }),
        users: [...this.users.values()].filter(u => u.points > 0 || u.gw > 0 || u.streak > 0 || u.sao > 0 || u.team || u.cham || this.seats.includes(u.id))
          .map(({ id, name, avatar, points, wp, wk, streak, lastDay, best, sao, gw, gwk, hoa, right, team, cham, phieu }) => ({ id, name, avatar, points, wp, wk, streak, lastDay, best, sao, gw, gwk, hoa, right, team, cham, phieu })) });
    } catch (e) { console.log('[store] lỗi ghi:', e.message); }
  }
  // thứ Hai về 0: điểm thi đua tuần + điểm tri ân tuần, giữ điểm trọn đời + chuỗi điểm danh
  rollWeek(quiet) {
    const w = weekKey(); if (w === this.week && !quiet) return;
    this.week = w; this.tp = [0, 0, 0, 0]; for (const u of this.users.values()) { u.wp = 0; u.gw = 0; }
    if (!quiet) { this.broadcast({ t: 'top', ...this.tops() }); this.dirty(); }
  }
  triAn() { if (this.B.triAn != null) return !!this.B.triAn; const d = new Date(); return d.getMonth() === 10 && d.getDate() >= 12 && d.getDate() <= 20; }   // tuần tri ân 12–20/11

  broadcast(m) { const s = JSON.stringify(m); for (const c of this.clients) if (c.readyState === 1) c.send(s); }
  snapshot() {
    return { t: 'snapshot', game: 'lop-hoc', platform: this.platform, seats: this.seatView(), ...this.tops(), likes: this.likes, goal: this.goal,
      seg: this.segView(), q: this.qView(), recess: this.recess, scene: { id: this.scene.id, name: this.scene.name }, hoa: this.hoa, tri: this.triAn(), cycle: this.cycle, sess: this.sessTop(3), ticker: this.B.ticker || '',
      wait: this.waitView(), teams: { tp: this.tp, tps: this.tps } };
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
      return { id, name: u.name, avatar: u.avatar, act: u.act || 0, lv: lvOf(u.points), lt: !!lt && lt.id === id, streak: u.streak || 0, tm: this.teamOf(u) }; });
  }
  active(x) { x.act = Date.now(); }
  // chọn cảnh kế tiếp: khác cảnh vừa rồi; ưu tiên hợp chủ đề câu hỏi vừa xong, giờ thật (tối → đêm trăng, chiều → hoàng hôn, sáng → nắng) và mùa
  pickScene(topic) {
    const now = new Date(), h = now.getHours(), mo = now.getMonth(), cur = this.scene && this.scene.id;
    const night = h >= 19 || h < 5, dusk = h === 17 || h === 18, morning = h >= 5 && h <= 10, day = h >= 5 && h <= 16;
    const ws = SCENES.map(sc => {
      if (sc.id === cur) return 0;
      let w = 1;
      if (topic && sc.tp.includes(topic)) w += 5;
      if (sc.id === 'dem') w = night ? w + 5 : day ? w * .12 : w * .5;
      if (sc.id === 'hoanghon') w = dusk ? w + 5 : night ? w * .4 : day && !morning ? w * .5 : w;
      if (night && (sc.id === 'sang' || sc.id === 'santruong')) w *= .05;
      if (sc.id === 'sang' && morning) w += 2;
      if (sc.id === 'thu' && (mo === 9 || mo === 10)) w += 1.5;
      if (sc.id === 'dong' && (mo === 11 || mo <= 1)) w += 2;
      if (sc.id === 'xuan' && mo <= 2) w += 1.5;
      return w;
    });
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < SCENES.length; i++) { r -= ws[i]; if (r <= 0) return SCENES[i]; }
    return SCENES.find(sc => sc.id !== cur) || SCENES[0];
  }
  nextScene(id) {
    let s;
    if (id) s = SCENES.find(z => z.id === id);       // dùng khi thử: /test/<nền tảng>/scene?id=...
    if (!s) { const cnt = {}; this.setTop.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; }); const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || null; s = this.pickScene(top); }
    this.setTop = []; this.scene = s; this.broadcast({ t: 'scene', id: s.id, name: s.name }); this.logLine({ scene: s.id });
  }
  teamOf(u) { return u.team || (hash(u.id) % 4) + 1; }
  teamsSoon() { if (this.teamT) return; this.teamT = setTimeout(() => { this.teamT = null; this.broadcast({ t: 'teams', tp: this.tp, tps: this.tps }); }, 1500); }
  waitView() { return { size: this.waiting.length, list: this.waiting.slice(0, 6).map(w => { const u = this.users.get(w.id) || {}; return { id: w.id, name: u.name || '', avatar: u.avatar || '', paid: !!w.paid }; }) }; }
  pushWait() { this.broadcast({ t: 'wait', ...this.waitView() }); }
  logLine(o) { try { fs.mkdirSync(path.dirname(LOGF), { recursive: true }); fs.appendFileSync(LOGF, JSON.stringify({ ts: new Date().toISOString(), cycle: this.cycle, ...o }) + '\n'); } catch {} }

  user(u) {
    const id = String(u.id || u.name);
    let x = this.users.get(id);
    const nm = BADNAME.test(String(u.name)) ? 'Bạn nhỏ' : displayName(u.name).replace(/^Phật tử$/, 'Bạn nhỏ');
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
    this.seats[i] = x.id; this.dirty();
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
    this.seats = ns; this.dirty(); this.broadcast({ t: 'seats', seats: this.seatView() });
  }
  tableOf(id) { return this.seats.indexOf(id); }

  // ----- điểm -----
  award(x, n, why) {    // điểm học: tính cho tuần, trọn đời và buổi học
    if (!n) return;
    x.wp += n; x.points += n; this.sess.set(x.id, (this.sess.get(x.id) || 0) + n); this.dirty(); this.arrangeSoon();
    if (n > 0) { const ti = this.teamOf(x) - 1; this.tp[ti] += n; this.tps[ti] += n; this.teamsSoon(); }
    const lv = lvOf(x.points); if (lv > (x.lv ?? lv)) { x.lv = lv; this.broadcast({ t: 'lv', id: x.id, name: x.name, lv, title: TITLES[lv][1] }); }
    x.lv = lv;
  }

  // ----- chương trình: các tiết học nối tiếp nhau -----
  segView() { const s = SEGS[this.segI] || SEGS[0], n = SEGS[(this.segI + 1) % SEGS.length];
    return { key: s.key, name: s.name, sub: s.sub, left: Math.max(0, this.segEnd - Date.now()), next: n.name, idx: this.segI, total: SEGS.length, cycle: this.cycle }; }
  nextSeg() { this.start((this.segI + 1) % SEGS.length); }           // dùng khi thử (/test/<nền tảng>/seg) hoặc khi tiết kết thúc
  // nhật ký mỗi tiết → data/lop-hoc-log.jsonl; hết tiết tổng kết thì in báo cáo cả buổi ra console
  segLog() {
    const g = this.seg0; this.seg0 = null; if (!g) return;
    const rec = { seg: g.key, sec: Math.round((Date.now() - g.t0) / 1000), chat: g.chat, ans: g.ans, ok: g.ok, ppl: g.ppl.size, likes: g.likes, viewers: this.viewers, seated: this.seats.filter(Boolean).length, dT: { ...this.dT } };
    this.logLine(rec);
    const c = this.cyc; if (!c) return;
    c.segs.push(rec); c.chat += g.chat; c.ans += g.ans; c.ok += g.ok; c.likes += g.likes; g.ppl.forEach(p => c.ppl.add(p));
    if (g.key === 'tongket') this.report();
  }
  report() {
    const c = this.cyc; if (!c) return; const pts = [...this.sess.values()], top = pts.length ? Math.max(...pts) : 0, mins = Math.round((Date.now() - c.t0) / 60000);
    this.logLine({ summary: true, chat: c.chat, ans: c.ans, ok: c.ok, ppl: c.ppl.size, likes: c.likes, medianPts: median(pts), topPts: top, scorers: pts.length, teams: this.tps.slice(), waiting: this.waiting.length });
    console.log(`\n[lop-hoc] ===== BÁO CÁO BUỔI HỌC ${this.cycle} (${mins} phút) =====\n` +
      `  tổng: ${c.chat} bình luận · ${c.ans} lượt trả lời (${c.ok} đúng) · ${c.ppl.size} người tham gia · ${c.likes} tim · đang ngồi ${this.seats.filter(Boolean).length} · đang xem ${this.viewers}\n` +
      `  điểm buổi: trung vị ${median(pts)}, cao nhất ${top}, ${pts.length} người có điểm · tổ 1-4: ${this.tps.join(' / ')} · hàng chờ lên bảng: ${this.waiting.length} · độ khó đố vui ${this.dT.dv}, chính tả ${this.dT.ct}, toán ${this.dT.to}\n` +
      c.segs.map(r => `  - ${r.seg}: ${r.sec}s, ${r.chat} chat, ${r.ans} trả lời (${r.ok} đúng), ${r.ppl} người${r.likes ? ', ' + r.likes + ' tim' : ''}`).join('\n') + '\n');
  }
  start(i) {
    this.segLog();
    const tok = ++this.tok; this.segI = i; this.q = null;
    this.seg0 = { key: SEGS[i].key, t0: Date.now(), chat: 0, ans: 0, ok: 0, ppl: new Set(), likes: 0 };
    this.play(i, tok).then(() => { if (tok === this.tok) this.start((i + 1) % SEGS.length); }).catch(e => console.log('[lop-hoc] lỗi tiết:', e.stack || e.message));
  }
  sleep(ms, tok) { return new Promise(r => setTimeout(r, ms)).then(() => tok === this.tok); }
  say(text, kind = 'gift', meta) { if (this.live || this.clients.size) this.voice.push(kind, text, undefined, meta); }
  async play(i, tok) {
    const s = SEGS[i], B = this.B, sc = B.speed || 1; this.rollWeek();
    if (i === 0) { this.cycle++; this.sess = new Map(); this.checked = []; this.tps = [0, 0, 0, 0]; this.cyc = { t0: Date.now(), chat: 0, ans: 0, ok: 0, ppl: new Set(), likes: 0, segs: [] }; this.teamsSoon(); if (this.cycle > 1) this.nextScene(); }
    this.segEnd = Date.now() + (s.sec || 120) * 1000 / sc;
    this.broadcast({ t: 'seg', seg: this.segView() });
    const alive = () => tok === this.tok;
    const intro = {
      diemdanh: 'Điểm danh nào! Gõ có mặt nhé.',
      dovui: 'Đố vui! Gõ A, B, C hoặc D.',
      toan: 'Toán nhẩm và chính tả. Nhanh tay nào!',
      rachoi: 'Ra chơi! Thả tim để cả lớp nhảy dây.',
      ke: 'Cô kể chuyện, cả lớp lắng nghe nhé.',
      kt: 'Kiểm tra mười lăm phút nhé!',
      tongket: 'Tổng kết buổi học.',
    }[s.key];
    { const j = this.joke(s.key === 'rachoi' ? 'recess' : pick(['seg', 'tu'])); this.say(j ? `${intro} ${j}` : intro); }
    if (s.key === 'diemdanh') {
      if (!await this.sleep(s.sec * 1000 / sc, tok)) return;
      const n = this.checked.length;
      if (n) this.say(`Hôm nay có ${n} bạn có mặt.`);
      await this.sleep(6000, tok); return;
    }
    if (s.key === 'dovui') { for (let k = 0; k < s.n; k++) { if (!alive()) return; await this.ask(this.pickAbcd(), tok, k + 1, s.n); } if (alive()) this.nextScene(); return; }
    if (s.key === 'toan') {
      for (let k = 0; k < s.n; k++) { if (!alive()) return; await this.ask(k % 2 ? this.pickSpell() : this.pickMath(), tok, k + 1, s.n); } if (alive()) this.nextScene(); return;
    }
    if (s.key === 'rachoi') {
      this.recess = { n: 0, target: clampN(Math.max(40 + this.cycle * 15, Math.round(this.likeRate() * 0.7 / 10) * 10), 40, 600), done: false };
      this.broadcast({ t: 'recess', ...this.recess });
      // ra chơi xen 2 câu đố nhanh (14 giây) trong lúc cả lớp vẫn thả tim; hết giờ không đọc thêm lời
      const t0 = Date.now(), total = s.sec * 1000 / sc;
      if (!await this.sleep(12000 / sc, tok)) return;
      await this.ask(this.pickAbcd(), tok, 1, 2, { quick: true });
      if (!alive() || !await this.sleep(9000 / sc, tok)) return;
      await this.ask(this.pickAbcd(), tok, 2, 2, { quick: true });
      if (!alive() || !await this.sleep(Math.max(6000 / sc, total - (Date.now() - t0)), tok)) return;
      await this.sleep(2500, tok); return;
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
    if (s.key === 'kt') {
      this.exam = new Map(); this.examN = s.n;
      for (let k = 0; k < s.n; k++) { if (!alive()) return; await this.ask({ ...this.pickAbcd(), tag: 'Kiểm tra' }, tok, k + 1, s.n, { exam: true }); }
      if (!alive()) return; await this.examEnd(tok); if (alive()) this.nextScene(); return;
    }
    if (s.key === 'tongket') {
      const top = this.sessTop(3), tmax = Math.max(...this.tps), win = tmax >= 5 && this.tps.filter(v => v === tmax).length === 1 ? this.tps.indexOf(tmax) + 1 : 0;
      this.broadcast({ t: 'tk', rows: top, cycle: this.cycle, teams: this.tps.slice(), win });
      if (top.length) {
        const w = ['Hạng nhất', 'hạng nhì', 'hạng ba'];
        this.say(`${top.map((r, j) => `${w[j]} là ${nmOf(r.name)} với ${r.n} điểm`).join(', ')}.`);
        top.forEach(r => { const u = this.users.get(r.id); if (u) { u.sao++; } });
        if (win) this.say(`Tổ ${win} dẫn đầu buổi này!`);
      } else this.say('Hôm nay lớp mình còn yên ắng quá. Hẹn các em ở tiết sau, nhớ gõ một chữ cho cô biết nhé!');
      await this.sleep(s.sec * 1000 / sc, tok); return;
    }
  }

  // ----- câu hỏi: abcd (chọn A-D, A-B cho chính tả) hoặc num (gõ số) -----
  // độ khó nhắm tới theo loại (dv đố vui / ct chính tả / to toán): câu vừa xong >60% đúng → câu sau khó hơn, <10% → dễ hơn.
  // độ khó thật của mỗi câu = nhãn trong kho, chỉnh ±1 theo tỉ lệ đúng đã lưu (từ 10 lượt trả lời trở lên).
  effDiff(r) { const st = this.qstat.get(r[0]); let d = r[2] || 2; if (st && st.n >= 10) { const rt = st.ok / st.n; if (rt > .8) d--; else if (rt < .1) d++; } return clampN(d, 1, 3); }
  themes() { return THEME_DAY[new Date().getDay()]; }                  // chủ đề ưu tiên của ngày (Thứ Hai: Việt Nam, Thứ Ba: khoa học, Thứ Tư: đố mẹo…)
  pickRow(bank, used, kind, avoid, prevTopic) {
    const want = this.dT[kind], th = kind === 'dv' ? this.themes() : null, now = Date.now(), WEEK = 7 * 86400000;
    const cand = bank.filter(r => r[0] !== avoid);
    let pool = cand.filter(r => !used.has(r[0]));                       // 1) chưa từng hỏi
    if (!pool.length) {                                                  // 2) hết kho: câu hỏi cách đây >= 7 ngày, câu lâu nhất trước; 3) không còn thì lấy câu lâu nhất
      const byAge = cand.slice().sort((a, b) => used.get(a[0]) - used.get(b[0]));
      const old = byAge.filter(r => now - used.get(r[0]) >= WEEK);
      const src = old.length ? old : byAge; pool = src.slice(0, Math.max(Math.min(10, src.length - 1), Math.ceil(src.length * .25), 1));
    }
    let best = pool[0], bs = -1e9;
    for (const r of pool) { const sc = -5 * Math.abs(this.effDiff(r) - want) + (th && th.includes(r[3]) ? 4 : 0) - (prevTopic && r[3] === prevTopic ? 2 : 0) + Math.random() * 3; if (sc > bs) { bs = sc; best = r; } }
    used.set(best[0], now); this.saveUsedSoon(); return best;
  }
  pickAbcd() { const r = this.pickRow(DOVUI, this.usedQ, 'dv', this.lastQ, this.lastTopic); this.lastTopic = r[3]; this.lastQ = r[0]; this.setTop.push(r[3]);
    const opts = shuffle(r[1].map((t, i) => ({ t, ok: !i }))); return { type: 'abcd', text: r[0], opts: opts.map(o => o.t), ans: opts.findIndex(o => o.ok), tag: 'Đố vui · ' + (TOPIC[r[3]] || ''), kind: 'dv', key: r[0] }; }
  pickSpell() { const r = this.pickRow(CHINHTA, this.usedS, 'ct', this.lastQ); this.lastQ = r[0]; this.setTop.push('tv');
    const opts = shuffle([{ t: r[0], ok: true }, { t: r[1], ok: false }]); return { type: 'abcd', text: this.spellPrompt(), opts: opts.map(o => o.t), ans: opts.findIndex(o => o.ok), tag: 'Chính tả', kind: 'ct', key: r[0] }; }
  spellPrompt() {   // đổi câu dẫn chính tả cho đa dạng
    const P = ['Từ nào viết ĐÚNG chính tả?', 'Chọn cách viết đúng nhé!', 'Cô viết hai cách, em chọn cách đúng.', 'Cách viết nào mới đúng?', 'Đâu là từ viết đúng chính tả?', 'Em hãy tìm từ viết đúng!', 'Cách viết nào không bị lỗi chính tả?', 'Từ nào được viết chuẩn?', 'Cô chấm bài: cách viết nào đúng?', 'Thử tài chính tả: chọn từ đúng.'];
    let p; do p = pick(P); while (p === this.lastPrompt && P.length > 1); this.lastPrompt = p; return p;
  }
  pickMath() { this.setTop.push('toan'); const [q, a] = mathQ(this.dT.to); return { type: 'num', text: q, ans: a, tag: 'Toán nhẩm', kind: 'to' }; }
  qView() { const q = this.q; return q && { id: q.id, type: q.type, text: q.text, opts: q.opts, tag: q.tag, k: q.k, of: q.of, left: Math.max(0, q.end - Date.now()), total: q.sec * 1000, n: q.got.size, done: q.done, spot: q.spot || null, exam: !!q.exam }; }

  // ----- LÊN BẢNG: hàng chờ miễn phí (tối đa 12); quà chỉ thêm ưu tiên trong hàng chờ, không hứa lợi ích -----
  sortWait() { const st = id => (this.users.get(id) || {}).streak || 0; this.waiting.sort((a, b) => (b.paid - a.paid) || (st(b.id) - st(a.id)) || a.at - b.at); }
  joinBoard(x, paid) {
    let e = this.waiting.find(w => w.id === x.id);
    if (!e) {
      if (this.waiting.length >= 12) {
        const drop = paid ? [...this.waiting].reverse().find(w => !w.paid) : null;
        if (!drop) { this.broadcast({ t: 'lb', id: x.id, name: x.name, pos: 0, size: this.waiting.length, full: true }); return; }
        this.waiting.splice(this.waiting.indexOf(drop), 1);
      }
      e = { id: x.id, at: Date.now(), paid: false }; this.waiting.push(e);
    }
    if (paid) e.paid = true;
    this.sortWait(); this.broadcast({ t: 'lb', id: x.id, name: x.name, pos: this.waiting.indexOf(e) + 1, size: this.waiting.length, paid: !!e.paid }); this.pushWait();
  }
  pickSpot() {
    this.sortWait(); let u = null;
    while (this.waiting.length && !u) { const w = this.waiting.shift(), c = this.users.get(w.id); if (c && isClean(c.name) && c.last > Date.now() - 8 * 60000) u = c; }
    this.pushWait(); return u;
  }
  async ask(spec, tok, k, of, opt = {}) {
    const sc = this.B.speed || 1, sec = opt.exam ? 15 : opt.quick ? 14 : spec.type === 'num' ? 22 : 25;
    let spot = null;
    if (!opt.exam && !opt.quick) { if (this.qSince >= 2) spot = this.pickSpot(); if (spot) this.qSince = 0; else this.qSince++; }
    if (spot) {
      this.broadcast({ t: 'spot', id: spot.id, name: spot.name, avatar: spot.avatar });
      this.say(`Mời ${nmOf(spot.name)} lên bảng!`, 'wish');
      if (!await this.sleep(3200 / sc, tok)) return;
    }
    const q = this.q = { ...spec, id: Date.now(), got: new Map(), done: false, sec: sec / sc, end: Date.now() + sec * 1000 / sc, k, of, tag: opt.quick ? 'Đố nhanh' : spec.tag, t0: Date.now(), exam: !!opt.exam, quick: !!opt.quick, spot: spot ? { id: spot.id, name: spot.name, avatar: spot.avatar } : null };
    this.broadcast({ t: 'q', q: this.qView() });
    const read = spec.type === 'abcd' ? spec.text : `Toán nhẩm: ${spec.text.replace('−', 'trừ').replace('×', 'nhân').replace('÷', 'chia').replace('+', 'cộng').replace('= ?', 'bằng mấy?')}`;
    this.say(read);
    this.segEnd = Math.max(this.segEnd, q.end);
    // kết thúc sớm khi 3 người đã trả lời đúng (toán) hoặc hết giờ
    const t0 = Date.now(); while (tok === this.tok && Date.now() < q.end && !q.done) { await new Promise(r => setTimeout(r, 400)); if (spec.type === 'num' && this.correct(q).length >= 3 && Date.now() - t0 > 4000) break; }
    if (tok !== this.tok) return;
    this.reveal(q); await this.sleep((opt.exam ? 4500 : opt.quick ? 4000 : 7500) / (this.B.speed || 1), tok);
  }
  correct(q) { return [...q.got.entries()].filter(([, a]) => a.ok).sort((a, b) => a[1].t - b[1].t); }
  reveal(q) {
    q.done = true; const ok = this.correct(q), got = q.got.size, spotId = q.spot && q.spot.id;
    const dist = q.type === 'abcd' ? q.opts.map((_, i) => [...q.got.values()].filter(a => a.v === i).length) : null;
    const win = ok.map(([id], j) => { const u = this.users.get(id); if (!u) return null;
      const pts = q.exam ? 2 : id === spotId ? 8 : j === 0 ? 5 : j < 3 ? 3 : 2; this.award(u, pts); u.right++;
      if (q.exam) { const e = this.exam.get(id) || { ok: 0, ms: 0 }; e.ok++; e.ms += q.got.get(id).t - q.t0; this.exam.set(id, e); }
      return { id, name: u.name, avatar: u.avatar, pts, ten: !q.exam && (j < 3 || id === spotId) }; }).filter(Boolean);
    // người được gọi lên bảng
    let sr = null;
    if (q.spot) { const a = q.got.get(q.spot.id); sr = { id: q.spot.id, name: q.spot.name, ok: !!(a && a.ok), answered: !!a }; }
    // thống kê câu + chỉnh độ khó cho câu sau
    const rate = got ? ok.length / got : null;
    if (q.key) { const st = this.qstat.get(q.key) || { n: 0, ok: 0 }; st.n += got; st.ok += ok.length; this.qstat.set(q.key, st); this.dirty(); }
    if (q.kind && got >= 3) { if (rate > .6) this.dT[q.kind] = Math.min(3, this.dT[q.kind] + 1); else if (rate < .1) this.dT[q.kind] = Math.max(1, this.dT[q.kind] - 1); }
    if (this.seg0) this.seg0.ok += ok.length;
    this.logLine({ q: q.key || q.text, tag: q.tag, kind: q.kind, dT: q.kind ? this.dT[q.kind] : null, got, ok: ok.length, rate: rate == null ? null : +rate.toFixed(2), spot: sr ? { ok: sr.ok, answered: sr.answered } : undefined });
    const ansTxt = q.type === 'abcd' ? `${LET[q.ans]}, ${q.opts[q.ans]}` : String(q.ans);
    this.broadcast({ t: 'qend', id: q.id, ans: q.ans, ansTxt, dist, win: win.slice(0, 5), total: got, right: ok.length, spot: sr, exam: !!q.exam });
    this.broadcast({ t: 'top', ...this.tops() });
    let line = `Đáp án là ${ansTxt}.`;      // lên bảng / kiểm tra: kết quả chỉ hiện chữ trên bảng, giọng không đọc thêm
    if (!q.exam) { if (win.length) line += ` Nhanh nhất là ${nmOf(win[0].name)}!`; else if (got) line += ' Chưa ai đúng.';
      const many = ok.length >= 4 && ok.length >= got * .6, few = got >= 1 && ok.length <= Math.floor(got * .25), jk = many ? this.joke('many') : few ? this.joke('few') : ''; if (jk) line += ' ' + jk; }   // đùa gộp vào câu công bố đáp án
    this.say(line, 'wish');
  }
  async examEnd(tok) {
    const rows = [...this.exam.entries()].filter(([, v]) => v.ok > 0).sort((a, b) => b[1].ok - a[1].ok || a[1].ms - b[1].ms).slice(0, 3)
      .map(([id, v]) => { const u = this.users.get(id); return u && { id, name: u.name, avatar: u.avatar, n: v.ok, of: this.examN || 5 }; }).filter(Boolean);
    this.broadcast({ t: 'kt', rows });
    if (rows.length) {
      rows.forEach((r, j) => { const u = this.users.get(r.id); if (u) { u.phieu = (u.phieu || 0) + 1; this.award(u, [5, 3, 2][j]); } });
      this.say(`Kiểm tra xong. ${rows.map((r, j) => `${['Nhất', 'nhì', 'ba'][j]} là ${nmOf(r.name)}`).join(', ')}.`);
    }
    await this.sleep(11000 / (this.B.speed || 1), tok);
  }
  // mốc tim: đo tốc độ thả tim 3 phút gần nhất
  likeRate() { const t = Date.now() - 180000; return this.lfeed.filter(f => f[0] >= t).reduce((a, f) => a + f[1], 0) / 3; }   // tim / phút
  nextGoal(rate) { const raw = clampN(Math.round(rate * 1.5), 100, 3000); return raw >= 1000 ? Math.round(raw / 100) * 100 : Math.round(raw / 50) * 50; }   // mốc ≈ 1,5 phút thả tim của cả lớp
  mis(x, k) {   // 3 nhiệm vụ trong buổi: điểm danh, trả lời 1 câu, thả tim
    if (!x.mis || x.mis.cy !== this.cycle) x.mis = { cy: this.cycle, dd: 0, ans: 0, tim: 0, done: 0 };
    if (x.mis[k]) return; x.mis[k] = 1;
    if (x.mis.dd && x.mis.ans && x.mis.tim && !x.mis.done) { x.mis.done = 1; x.cham = (x.cham || 0) + 1; this.award(x, 3); this.broadcast({ t: 'mission', id: x.id, name: x.name, cham: x.cham }); this.dirty(); }
  }

  // ----- kéo tương tác -----
  flushJoins() {
    if (this.clients.size) { const cut = Date.now() - 120000; let present = 0; for (const u of this.users.values()) if (u.last > cut) present++; if (this.prevPresent && present - this.prevPresent >= 8) this.jokeSolo('dong'); this.prevPresent = present; }   // lớp đông lên
    const names = this.joinBuf.splice(0); if (!names.length || !this.clients.size) return;
    // không đọc lời chào người vào lớp: người vào đông, chào liên tục làm giọng cô quá dày (chỉ hiện chữ + tên trên bàn)
  }
  // cảm ơn theo dõi / chia sẻ: gom thành MỘT câu ngắn mỗi 45 giây (trước đây mỗi người một câu làm tắc giọng cô)
  flushThanks() {
    const names = this.followBuf.splice(0), sh = this.shareN; this.shareN = 0; if ((!names.length && !sh) || !this.clients.size) return;
    const parts = []; if (names.length) parts.push('các bạn vừa theo dõi lớp học'); if (sh) parts.push('các bạn đã chia sẻ');
    this.voice.push('wish', `Cảm ơn ${parts.join(', cùng ')}!`);
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
    if (this.seg0) { this.seg0.chat++; this.seg0.ppl.add(x.id); }
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
        q.got.set(x.id, { v, ok, t: Date.now() }); if (this.seg0) this.seg0.ans++; this.mis(x, 'ans');
        this.broadcast({ t: 'ans', id: x.id, name: x.name, n: q.got.size, v: q.type === 'abcd' ? LET[v] : String(v) });
        if (q.type === 'num' && ok) this.broadcast({ t: 'ok', id: x.id });
        return;
      }
    }
    // điểm danh: mỗi ngày một lần, chuỗi ngày liền
    if (ATTEND_RE.test(p)) {
      const day = dayKey();
      if (x.lastDay === day) { this.mis(x, 'dd'); this.broadcast({ t: 'chat', id: x.id, name: x.name, text: 'Có mặt!', table: this.tableOf(x.id) }); return; }
      x.streak = x.lastDay === yesterdayKey() ? x.streak + 1 : 1; x.lastDay = day; x.best = Math.max(x.best || 0, x.streak);
      const bonus = x.streak === 3 ? 3 : x.streak === 7 ? 10 : x.streak === 30 ? 40 : 0;
      this.award(x, 1 + bonus); this.mis(x, 'dd'); if (!this.checked.includes(x.name)) this.checked.push(x.name);
      this.broadcast({ t: 'dd', id: x.id, name: x.name, avatar: x.avatar, streak: x.streak, bonus });
      if (bonus) this.voice.push('gift', `${nmOf(x.name)} điểm danh ${x.streak} ngày liên tiếp! Cô thưởng cho bạn ${bonus} điểm chuyên cần!`, x.id);
      return;
    }
    const p2 = p.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean && BOARD_RE.test(p2)) {      // LÊN BẢNG (miễn phí)
      if (Date.now() - (x.lbAt || 0) < 8000) return; x.lbAt = Date.now(); this.joinBoard(x, false); return;
    }
    if (clean && REPORT_RE.test(p2)) {     // HỌC BẠ: thẻ 6 giây trên màn hình, không đọc thành tiếng
      if (Date.now() - (x.hbAt || 0) < 30000) return; x.hbAt = Date.now(); this.hocBa(x); return;
    }
    const tm = clean && TEAM_RE.exec(p2);   // TỔ 1-4
    if (tm) { x.team = +tm[1]; this.dirty(); this.broadcast({ t: 'team', id: x.id, name: x.name, team: x.team }); this.broadcast({ t: 'seats', seats: this.seatView() }); return; }
    if (clean && this.triAn() && FREEHOA_RE.test(p2)) {      // tuần tri ân: tặng hoa cô giáo MIỄN PHÍ (25 giây / lần)
      if (Date.now() - (x.hoaAt || 0) < 25000) return; x.hoaAt = Date.now();
      this.hoa++; x.hoa++; this.dirty();
      if (x.hoaDay !== dayKey()) { x.hoaDay = dayKey(); this.award(x, 1); }
      this.broadcast({ t: 'hoa', id: x.id, name: x.name, hoa: this.hoa, free: true });
      if (Math.floor(this.hoa / 20) > Math.floor((this.hoa - 1) / 20)) this.bow();
      return;
    }
    if (/^(thua co|co oi|co giao oi)\b/.test(p)) {
      if (Date.now() - (x.at || 0) < 20000) return; x.at = Date.now();
      this.broadcast({ t: 'chat', id: x.id, name: x.name, text: show, table: this.tableOf(x.id) });
      if (Date.now() - this.lastThua < 45000) return; this.lastThua = Date.now();
      this.voice.push('wish', `${nmOf(x.name)} thưa cô. ${pick(THUACO)}`, x.id); return;
    }
    if (/^(xem diem|diem cua toi|diem cua em|rank|hang cua toi)$/.test(p)) {
      if (Date.now() - (x.at || 0) < 30000) return; x.at = Date.now();
      this.broadcast({ t: 'me', id: x.id, name: x.name, points: x.points, wp: x.wp, streak: x.streak, title: TITLES[lvOf(x.points)][1] });
      return;
    }
    const meaningful = !!show && isMeaningful(show);
    this.broadcast({ t: 'chat', id: x.id, name: x.name, text: meaningful ? show : null, table: this.tableOf(x.id) });
    if (!clean || !meaningful || /^(hi+|hello+|alo+|chao|xin chao|hi co|chao co|hello co|helo)( co| ca lop| moi nguoi)?$/.test(p)) return;   // lời chào chỉ hiện chữ, không đọc
    if (Date.now() - this.lastRead < (this.B.readGapSec || 60) * 1000 || p.split(' ').length < 3) return; this.lastRead = Date.now();
    this.voice.push('wish', `${nmOf(x.name)} nói: ${cleanText(text, this.cfg.voice.maxChars || 120)}`, x.id);
  }
  onLike(u, count = 1) {
    const x = this.user(u); this.seat(x); this.active(x);
    this.likes += count; this.dirty(); this.goal.n += count; this.mis(x, 'tim');
    const nowT = Date.now(); this.lfeed.push([nowT, count]); while (this.lfeed.length && this.lfeed[0][0] < nowT - 180000) this.lfeed.shift();
    this.runLikes += count; if (this.seg0) { this.seg0.likes += count; this.seg0.ppl.add(x.id); }
    x.likeAcc = (x.likeAcc || 0) + count; while (x.likeAcc >= 10) { x.likeAcc -= 10; this.award(x, 1); }
    const sg = SEGS[this.segI];
    if (sg && sg.key === 'rachoi' && !this.recess.done) {
      this.recess.n += count; this.broadcast({ t: 'recess', ...this.recess });
      if (this.recess.n >= this.recess.target) { this.recess.done = true; this.broadcast({ t: 'recess', ...this.recess });
        this.say('Cả lớp đã thả đủ tim rồi! Nào, một hai, nhảy dây thôi! Cả lớp cùng nhảy!'); for (const id of this.seats) { const w = id && this.users.get(id); if (w) this.award(w, 1); } }
    }
    this.broadcast({ t: 'like', id: x.id, count, total: this.likes, goal: this.goal });
    if (this.goal.n >= this.goal.target) {
      const done = this.goal.target, nt = this.nextGoal(this.likeRate()); this.goal = { n: Math.min(Math.max(0, this.goal.n - done), nt - 1), target: nt };
      this.broadcast({ t: 'goaldone', target: done, goal: this.goal }); if (this.likeRate() >= 150) this.jokeSolo('tim');
    }
    while (this.runLikes >= this.milestone + 1000) {        // mốc lớn trong buổi live: mỗi 1.000 tim pháo hoa, mỗi 5.000 tim Ngày hội
      this.milestone += 1000; const m = this.milestone;
      if (m % 5000 === 0) this.festival(m); else { this.broadcast({ t: 'fw', n: m }); { const jk = this.joke('tim'); this.voice.push('gift', `${m / 1000} nghìn tim! Pháo hoa!${jk ? ' ' + jk : ''}`); } }
    }
    if (this.B.readLikes === true && isClean(x.name)) this.voice.push('like', `Cảm ơn ${nmOf(x.name)} đã thả tim cho lớp.`, x.id);
  }
  festival(m) {    // Ngày hội: mọi bạn đang có mặt trong 10 phút gần đây +5 điểm
    const cut = Date.now() - 600000; let n = 0;
    for (const u of this.users.values()) if (u.last > cut) { this.award(u, 5); n++; }
    this.broadcast({ t: 'hoi', n: m, people: n }); this.broadcast({ t: 'top', ...this.tops() });
    this.voice.push('gift', 'Ngày hội của lớp! Mỗi bạn có mặt được cộng năm điểm!');
  }
  bow() { this.broadcast({ t: 'bow', n: Math.floor(this.hoa / 20) }); this.voice.push('gift', 'Bó hoa đã đầy! Cô cúi chào cả lớp!'); }
  hocBa(x) {
    const lv = lvOf(x.points), badges = [], lt = this.lt(), ms = x.mis && x.mis.cy === this.cycle ? x.mis : {};
    if (lt && lt.id === x.id) badges.push('Lớp trưởng tuần');
    if (x.sao) badges.push(`Sao Điểm 10 ×${x.sao}`);
    if (x.best >= 3) badges.push(`Chuỗi ${x.best} ngày`);
    if (x.cham) badges.push(`Học sinh chăm ×${x.cham}`);
    if (x.phieu) badges.push(`Phiếu điểm cao ×${x.phieu}`);
    this.broadcast({ t: 'hb', id: x.id, name: x.name, avatar: x.avatar, lv, title: TITLES[lv][1], points: x.points, wp: x.wp, streak: x.streak || 0, right: x.right || 0, badges: badges.slice(0, 4),
      team: this.teamOf(x), next: TITLES[lv + 1] ? TITLES[lv + 1][0] : null, mis: { dd: !!ms.dd, ans: !!ms.ans, tim: !!ms.tim, done: !!ms.done } });
  }
  // cảm ơn quà nhỏ: gọi tên người tặng; nhiều quà trong ~6 giây thì GỘP một câu "Cảm ơn A, B và C đã tặng quà!" (không bỏ ai, không nêu số xu)
  thankSmall(x, flower) {
    const nm = nmOf(x.name); this.smallBuf = this.smallBuf || []; this.smallBuf.push({ nm: nm === 'một bạn' || !isClean(x.name) ? null : nm, flower });
    const wait = 6000 - (Date.now() - this.smallAt);
    if (wait <= 0) this.flushSmall(); else if (!this.smallT) this.smallT = setTimeout(() => this.flushSmall(), Math.max(500, wait));
  }
  flushSmall() {
    clearTimeout(this.smallT); this.smallT = null; const b = (this.smallBuf || []).splice(0); if (!b.length) return; this.smallAt = Date.now();
    const n = [...new Set(b.map(e => e.nm).filter(Boolean))], who = !n.length ? 'các bạn' : n.length === 1 ? n[0] : n.length === 2 ? `${n[0]} và ${n[1]}` : n.length === 3 ? `${n[0]}, ${n[1]} và ${n[2]}` : `${n[0]}, ${n[1]} và ${n.length - 2} bạn nữa`;
    this.voice.push('gift', b.every(e => e.flower) ? `${who} tặng hoa cô giáo, cô xin nhận nhé!` : `Cảm ơn ${who} đã tặng quà!`);
  }
  onShare(u) {
    const x = this.user(u); this.seat(x); this.active(x); this.award(x, 2);
    this.broadcast({ t: 'share', id: x.id, name: x.name });
    this.shareN++;
  }
  onViewers(n) { if (n >= 0) this.viewers = n; }
  onFollow(u) { const x = this.user(u); this.seat(x); this.award(x, 2); this.broadcast({ t: 'follow', id: x.id, name: x.name, avatar: x.avatar });
    this.followBuf.push(x.name); }
  // quà: hiển thị theo bậc (không nêu số tiền, không hứa lợi ích)
  onGift(u, giftName, count = 1, points = 1) {
    const x = this.user(u); this.seat(x); this.active(x);
    const tier = points >= 99 ? 'ratlon' : points >= 30 ? 'lon' : points >= 5 ? 'vua' : 'nho';
    x.sao += tier === 'nho' ? 1 : 3; x.gw += points; this.dirty();
    const gShow = giftVi(giftName) === 'món quà' ? giftName : giftVi(giftName), flower = this.triAn() && FLOWER_RE.test(String(giftName));
    const prevHoa = this.hoa; if (flower) { this.hoa += Math.max(1, count); x.hoa += Math.max(1, count); }
    this.joinBoard(x, true);       // quà = ưu tiên 1 lượt trong hàng chờ lên bảng (chỉ trong game)
    if (tier === 'lon' || tier === 'ratlon') x.front = Date.now() + 40 * 60000;       // ngồi bàn đầu 40 phút
    if (tier === 'ratlon') { this.book.push({ name: x.name, avatar: x.avatar, at: Date.now() }); if (this.book.length > 60) this.book.shift(); }
    this.arrangeSoon();
    const o = { id: x.id, name: x.name, avatar: x.avatar, tier, gift: gShow, count, flower, hoa: this.hoa, at: Date.now() };
    this.broadcast({ t: 'gift', ...o }); this.broadcast({ t: 'top', ...this.tops() });
    const nm = nmOf(x.name), g = cleanText(giftVi(giftName), 30) || 'món quà', thanks = `Cảm ơn ${nm} đã tặng ${count > 1 ? count + ' ' : ''}${g} ủng hộ lớp.`;
    const line = flower ? `${nm} tặng hoa cô giáo, cô xin nhận nhé!` : {
      nho: 'Cô tặng bạn một ngôi sao điểm mười!',
      vua: 'Cô trao giấy khen cho bạn. Cả lớp vỗ tay nào!',
      lon: 'Mời bạn lên ngồi bàn đầu, cô trao huy hiệu Lớp trưởng tuần này. Cả lớp vỗ tay nào!',
      ratlon: `Cả lớp đứng dậy tuyên dương ${nm}! Tên bạn được ghi vào Sổ vàng của lớp. Chúc bạn học tốt, ngày nào cũng vui!`,
    }[tier];
    if (tier === 'nho') this.thankSmall(x, flower); else this.voice.push('gift', flower ? line : `${thanks} ${line}`, x.id);      // quà nhỏ: luôn cảm ơn gọi tên, dồn dập thì gộp tên
    if (flower && Math.floor(this.hoa / 20) > Math.floor(prevHoa / 20)) this.bow();
  }
}
function blank(id, name, avatar) { return { id, name, avatar: avatar || '', last: 0, at: 0, points: 0, wp: 0, wk: 0, streak: 0, lastDay: '', best: 0, sao: 0, gw: 0, gwk: 0, hoa: 0, likeAcc: 0, right: 0, team: 0, cham: 0, phieu: 0 }; }

module.exports = { Room, SEGS, ROWS, PER, TITLES };
