// Bia Hơi Đảo Thần Tiên — một "phòng" = một nền tảng. Cùng giao diện sự kiện với lib/room.js (Chùa) để server / connector dùng chung.
// Hướng C đã duyệt: bia hơi chỉ là không khí; quà = gọi món cho bàn mình, "Dzô" là cụng ly vui, không thử thách uống.
const { isClean, cleanText, displayName, spokenName, stripEmotes, isMeaningful, plain } = require('../filter');
const { VoiceQueue } = require('../voice');
const { giftVi } = require('../gifts');
const store = require('../store');

const TABLES = 8, PER = 4, TOP = 5;
// thực đơn = bậc quà theo xu (xu nhỏ nhất của bậc). server: ai mang món ra
const MENU = [
  { key: 'quan', xu: 299, name: 'Bao cả đảo', server: 'all' },
  { key: 'ban', xu: 99, name: 'Bao cả bàn', server: 'all' },
  { key: 'muc', xu: 30, name: 'Mực nướng', server: 'thu' },
  { key: 'dzo', xu: 10, name: 'Một vòng Dzô', server: 'mai' },
  { key: 'nem', xu: 5, name: 'Nem chua rán', server: 'mai' },
  { key: 'lac', xu: 1, name: 'Đĩa lạc rang', server: 'thu' },
];
const STAFF = { thu: 'Thu', mai: 'Mai', hang: 'chị Hằng', all: 'cả quán' };
// câu chúc vần của chị Hằng (gọi Mực nướng trở lên)
const WISHES = [
  'Chúc bạn tiền vô như nước, tiền ra nhỏ giọt, việc gì cũng xuôi, ngày nào cũng vui.',
  'Chúc bạn sức khỏe dồi dào, làm đâu thắng đó, đi đâu cũng có người thương.',
  'Chúc bạn công việc thuận buồm, gia đình êm ấm, tối nay vui hết nấc.',
  'Chúc bạn năm nay phát tài, lương tăng gấp đôi, sếp khen hết lời.',
  'Chúc bạn buồn ít vui nhiều, ăn ngon ngủ kỹ, chuyện gì cũng như ý.',
  'Chúc bạn ra đường gặp may, về nhà gặp vui, bạn bè đông vui cả đời.',
];
// minigame luân phiên (config.segments ghi đè); mỗi lượt cfg.segMin phút (mặc định 8)
const SEGMENTS = [
  { key: 'vui', name: 'Bàn nào vui nhất', sub: 'Bình luận + thả tim cho bàn mình',
    say: 'Minigame bàn nào vui nhất bắt đầu! Bình luận và thả tim để ghi điểm cho bàn mình. Bàn thắng được lên bàn VIP và nghe chị Hằng hát chúc.' },
  { key: 'ott', name: 'Oẳn tù tì với chị Hằng', sub: 'Chat búa · kéo · bao',
    say: 'Oẳn tù tì với chị Hằng! Chat búa, kéo hoặc bao. Ai thắng chị nhiều nhất sẽ được chị Hằng chúc riêng.' },
  { key: 'quay', name: 'Giờ quẩy cùng Ngân', sub: 'Thả tim để Ngân nhảy sung hơn',
    say: 'Đến giờ quẩy! Cả đảo thả tim thật nhiều để vũ công Ngân nhảy sung hơn nào.' },
  { key: 'do', name: 'Đố vui bàn nhậu', sub: 'Trả lời đúng nhanh nhất',
    say: 'Đố vui bàn nhậu! Ai trả lời đúng nhanh nhất sẽ được cả đảo vỗ tay.' },
  { key: 'dzo', name: 'Vua Dzô', sub: 'Chat “dzô” nhiều nhất',
    say: 'Cuộc thi Vua Dzô bắt đầu! Ai chat dzô nhiều nhất lượt này sẽ lên ngôi Vua Dzô.' },
];
const QUIZ = [
  ['Con gì đầu dê mình ốc?', ['con doc', 'doc']],
  ['Tháng nào có 28 ngày?', ['tat ca', 'thang nao cung', '12 thang', 'moi thang']],
  ['Cái gì có cổ nhưng không có miệng?', ['ao', 'chai', 'binh']],
  ['Bệnh gì bác sĩ bó tay?', ['gay tay']],
  ['Cái gì luôn đi tới mà không bao giờ đến?', ['ngay mai']],
  ['Cái gì của bạn nhưng người khác dùng nhiều hơn?', ['ten']],
  ['Có 3 quả táo, bạn lấy đi 2 quả. Bạn còn mấy quả?', ['2', 'hai']],
  ['Xã gì đông dân nhất?', ['xa hoi']],
  ['Cầu gì không bắc qua sông?', ['cau thu', 'cau long', 'cau vong', 'cau thang', 'cau hon', 'cau ca']],
  ['Cây gì không có lá?', ['cot dien', 'cay but', 'cay so', 'cay kem', 'cay dan', 'cay nen']],
  ['Quả gì không ăn được?', ['qua bong', 'qua ta', 'qua dat', 'qua dam', 'qua tim', 'qua cau']],
  ['Con gì ăn lửa với nước than?', ['tau hoa', 'tau', 'xe lua']],
  ['Bánh gì nghe tên đã thấy đau?', ['banh tet']],
  ['Con gì biết đi nhưng ai cũng bảo nó bò?', ['con bo', 'bo']],
];
// câu hỏi nhanh: gõ 1 hoặc 2 (dễ trả lời nhất cho người mới vào)
const POLLS = [
  ['Trà đá hay nước mía?', 'Trà đá', 'Nước mía'], ['Thích biển hay thích núi?', 'Biển', 'Núi'],
  ['Cà phê đen hay cà phê sữa?', 'Cà phê đen', 'Cà phê sữa'], ['Phở hay bún chả?', 'Phở', 'Bún chả'],
  ['Hôm nay đi làm về muộn hay về sớm?', 'Về muộn', 'Về sớm'], ['Ngủ trước hay sau 12 giờ đêm?', 'Trước 12 giờ', 'Sau 12 giờ'],
  ['Mồi ngon nhất: lạc rang hay mực nướng?', 'Lạc rang', 'Mực nướng'], ['Cuối tuần đi chơi hay nằm nhà?', 'Đi chơi', 'Nằm nhà'],
  ['Ăn cay giỏi hay sợ cay?', 'Ăn cay giỏi', 'Sợ cay'], ['Nhắn tin trả lời ngay hay để mai?', 'Trả lời ngay', 'Để mai'],
  ['Thích mùa hè hay mùa đông?', 'Mùa hè', 'Mùa đông'], ['Hát karaoke hay ngồi vỗ tay?', 'Cầm mic', 'Vỗ tay'],
  ['Đi xe máy hay đi ô tô?', 'Xe máy', 'Ô tô'], ['Thích Thu hay thích Mai phục vụ?', 'Thu', 'Mai'],
];
// gọi tên người đang ngồi mà chưa tương tác
const NUDGE = {
  any: [(n, b) => `${n} ở bàn ${b} ơi, gõ dzô cụng ly với cả bàn nào!`, (n, b) => `Bàn ${b} im quá! ${n} ơi, chat một câu chào cả đảo đi!`,
    (n, b) => `${n} ơi, gõ em ơi để Thu ra phục vụ bàn ${b} nè!`, (n, b) => `${n} bàn ${b} ơi, thả tim cho bàn mình lên top nào!`],
  ott: [n => `${n} ơi, chat búa, kéo hoặc bao đấu với chị Hằng đi!`],
  do: [n => `${n} ơi, đoán thử câu đố đi, sai cũng được!`],
  dzo: [n => `${n} ơi, gõ dzô đi, đang thi Vua Dzô đó!`],
  quay: [n => `${n} ơi, thả tim cho Ngân nhảy sung lên nào!`],
};
const OTT = { bua: 'búa', keo: 'kéo', bao: 'bao' }, BEATS = { bua: 'keo', keo: 'bao', bao: 'bua' };
const ANNOUNCE = 'Chào mừng đến Bia Hơi Đảo Thần Tiên! Bình luận bất kỳ để vào bàn ngồi, chat dzô để cả đảo cùng cụng ly, chat em ơi để gọi phục vụ. ' +
  'Đây là chương trình giải trí, quà tặng là ủng hộ kênh. Uống có trách nhiệm, đã uống rượu bia thì không lái xe.';
const nmOf = n => spokenName(n).replace('một Phật tử', 'một vị khách');
const dishOf = xu => MENU.find(m => xu >= m.xu) || MENU[MENU.length - 1];
const pick = a => a[Math.floor(Math.random() * a.length)];
// tin chỉ gồm tiếng hô: "dzô", "zôoo", "vô vô", "1 2 3 dzô", "100%"
const DZO_RE = /^((mot hai ba|1 2 3)\s*)?((dz|z|d)o+|vo+|100 ?%|tram phan tram)([\s!.,]+((dz|z|d)o+|vo+))*[\s!.,]*$/;

class Room {
  constructor(platform, cfg, voiceEngine) {
    this.platform = platform; this.cfg = cfg; this.key = 'bia-hoi-' + platform;   // dữ liệu riêng: data/bia-hoi-<nền tảng>.json
    this.clients = new Set();
    this.users = new Map();            // id -> {id,name,avatar,last,points,dzo,orders}
    this.seats = new Array(TABLES * PER).fill(null);
    this.likes = 0; this.dzo = 0; this.orders = []; this.vip = -1;
    this.voice = new VoiceQueue(voiceEngine, cfg.voice, m => this.broadcast(m));
    this.voice.hasListener = () => [...this.clients].some(c => c.readyState === 1);
    this.restore();
    const B = cfg.biaHoi || {};
    this.goal = { n: 0, target: B.likeGoal || 50 };   // mốc đầu nhỏ, rồi tăng dần
    this.viewers = 0;
    this.joinBuf = []; this.poll = null; this.nudged = new Map(); this.nudgeI = 0;
    setInterval(() => this.flushJoins(), (B.joinBatchSec || 15) * 1000);
    if ((B.nudgeSec ?? 75) > 0) setInterval(() => this.nudge(), (B.nudgeSec ?? 75) * 1000);
    if ((B.pollMin ?? 3) > 0) setInterval(() => this.startPoll(), (B.pollMin ?? 3) * 60000);
    // chế độ demo (connectors/demo.js) dùng câu chat / quà riêng của quán
    this.demoChats = ['dzô', 'dzô dzô', 'zôooo', 'em ơi', 'tính tiền', 'ghép bàn', 'quán vui quá', 'chào cả đảo', 'búa', 'kéo', 'bao', 'nhảy đi Ngân ơi', '100%', 'tối nay quẩy hết mình', '1', '2', '1', 'con dốc', 'xã hội', 'vào zalo 0909123456 nhận quà'];
    this.demoGifts = [['Hoa hồng', 1], ['Hoa hồng', 1], ['Tim', 5], ['Kẹo bông', 10], ['Nhẫn', 30], ['Mũ chúc mừng', 99], ['Sư tử', 299]];
    this.segs = B.segments || SEGMENTS; this.segMs = (B.segMin || 5) * 60000; this.segI = -1; this.nextSeg();
    const every = (cfg.voice.announceMin ?? 10) * 60000;
    if (every > 0) setInterval(() => {
      if (this.live && !this.voice.items.some(i => i.text === ANNOUNCE)) this.voice.push('join', ANNOUNCE);
    }, every);
  }

  // ----- lưu / nạp -----
  restore() {
    const d = store.load(this.key); if (!d) return;
    this.likes = d.likes || 0; this.dzo = d.dzo || 0;
    for (const u of d.users || []) this.users.set(u.id, { ...u, points: u.points || 0, dzo: u.dzo || 0, orders: u.orders || 0, last: 0, at: 0 });
    console.log(`[${this.platform}] nạp lại sổ quán: ${this.users.size} khách quen`);
  }
  dirty() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 3000); }
  flush() {
    clearTimeout(this.saveT); this.saveT = null;
    try {
      store.save(this.key, { likes: this.likes, dzo: this.dzo,
        users: [...this.users.values()].filter(u => u.points > 0 || u.dzo > 0).map(({ id, name, avatar, points, dzo, orders }) => ({ id, name, avatar, points, dzo, orders })) });
    } catch (e) { console.log('[store] lỗi ghi:', e.message); }
  }

  broadcast(m) { const s = JSON.stringify(m); for (const c of this.clients) if (c.readyState === 1) c.send(s); }
  snapshot() {
    return { t: 'snapshot', game: 'bia-hoi', platform: this.platform, ticker: this.cfg.biaHoi?.ticker || '', seats: this.seatView(), top: this.top(), dzoTop: this.dzoTop(),
      likes: this.likes, dzo: this.dzo, goal: this.goal, seg: this.segView(), mg: this.mgView(), orders: this.orders, vip: this.vip, menu: MENU, poll: this.pollView() };
  }
  ranks(f, n = TOP) {
    return [...this.users.values()].filter(u => u[f] > 0).sort((a, b) => b[f] - a[f]).slice(0, n)
      .map(u => ({ id: u.id, name: u.name, avatar: u.avatar, n: u[f] }));
  }
  top() { return this.ranks('points'); }
  dzoTop() { return this.ranks('dzo'); }
  seatView() { return this.seats.map(id => { if (!id) return null; const u = this.users.get(id); return { id, name: u.name, avatar: u.avatar, act: u.act || 0 }; }); }
  // đánh dấu đã tương tác (chat / tim / quà / chia sẻ): ghế sáng lên trên màn hình
  active(x) { x.act = Date.now(); }
  tableOf(id) { const i = this.seats.indexOf(id); return i < 0 ? -1 : Math.floor(i / PER); }

  user(u) {
    const id = String(u.id || u.name);
    let x = this.users.get(id);
    const nm = displayName(u.name).replace(/^Phật tử$/, 'Khách');
    if (!x) { x = { id, name: nm, avatar: u.avatar || '', last: 0, points: 0, dzo: 0, orders: 0, at: 0 }; this.users.set(id, x); }
    else { if (u.name) x.name = nm; if (u.avatar) x.avatar = u.avatar; }
    x.last = Date.now();
    return x;
  }
  // xếp chỗ: ghế trống đầu tiên; quán đầy thì mời người im lặng lâu nhất nhường ghế
  seat(x) {
    if (this.seats.includes(x.id)) return;
    let i = this.seats.indexOf(null);
    if (i < 0) { let oldest = Infinity; this.seats.forEach((id, k) => { const l = this.users.get(id).last; if (l < oldest) { oldest = l; i = k; } }); }
    this.seats[i] = x.id;
    this.broadcast({ t: 'seats', seats: this.seatView() });
  }
  // "ghép bàn": chuyển sang bàn đông nhất còn chỗ
  merge(x) {
    const cur = this.tableOf(x.id); let best = -1, bn = 0;
    for (let b = 0; b < TABLES; b++) {
      if (b === cur) continue;
      const s = this.seats.slice(b * PER, b * PER + PER), n = s.filter(Boolean).length;
      if (n < PER && n > bn) { bn = n; best = b; }
    }
    if (best < 0) return false;
    if (cur >= 0) this.seats[this.seats.indexOf(x.id)] = null;
    this.seats[best * PER + this.seats.slice(best * PER, best * PER + PER).indexOf(null)] = x.id;
    this.broadcast({ t: 'seats', seats: this.seatView() });
    return best;
  }

  // ----- minigame luân phiên -----
  segView() { const s = this.segs[this.segI], n = this.segs[(this.segI + 1) % this.segs.length];
    return { key: s.key, name: s.name, sub: s.sub, left: Math.max(0, this.segEnd - Date.now()), next: n.name }; }
  nextSeg() {
    if (this.segI >= 0) this.endSeg();
    clearTimeout(this.segT); this.segI = (this.segI + 1) % this.segs.length; this.segEnd = Date.now() + this.segMs;
    this.segT = setTimeout(() => this.nextSeg(), this.segMs);
    this.mg = { scores: {}, wins: {}, dzo: {}, hype: 0 };
    const s = this.segs[this.segI];
    if (s.key === 'do') this.newQuiz();
    this.broadcast({ t: 'seg', seg: this.segView(), mg: this.mgView() });
    if (this.live && s.say) this.voice.push('wish', s.say);
  }
  endSeg() {
    const k = this.segs[this.segI].key, mg = this.mg || {}; let win = null;
    const best = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
    if (k === 'vui') { const b = best(mg.scores || {}); if (b) { this.vip = +b[0]; win = { k, table: this.vip, n: b[1] };
      this.say(`Bàn ${this.vip + 1} vui nhất đảo với ${b[1]} điểm! Cả bàn lên bàn VIP. Chị Hằng chúc cả bàn: ${pick(WISHES)}`); } }
    if (k === 'ott' || k === 'dzo') { const b = best(k === 'ott' ? mg.wins : mg.dzo); const u = b && this.users.get(b[0]);
      if (u) { win = { k, id: u.id, name: u.name, avatar: u.avatar, n: b[1] };
        this.say(k === 'ott' ? `${nmOf(u.name)} thắng chị Hằng ${b[1]} ván! Chị chúc bạn: ${pick(WISHES)}` : `${nmOf(u.name)} lên ngôi Vua Dzô với ${b[1]} lần dzô!`); } }
    if (win) this.broadcast({ t: 'mgwin', win, vip: this.vip });
  }
  say(text) { if (this.live || this.clients.size) this.voice.push('gift', text); }
  newQuiz() { const [q, a] = pick(QUIZ.filter(z => z[0] !== this.mg?.q)); Object.assign(this.mg, { q, a, solved: null }); }
  mgView() {
    const k = this.segs[this.segI]?.key, mg = this.mg || {};
    const top3 = (o, users) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id, n]) => users ? { name: this.users.get(id)?.name || '', n } : { table: +id, n });
    if (k === 'vui') return { k, rows: top3(mg.scores) };
    if (k === 'ott') return { k, rows: top3(mg.wins, 1), last: mg.last || null };
    if (k === 'dzo') return { k, rows: top3(mg.dzo, 1) };
    if (k === 'do') return { k, q: mg.q, solved: mg.solved || null };
    return { k, hype: mg.hype || 0 };
  }
  mgPush() { if (this.mgT) return; this.mgT = setTimeout(() => { this.mgT = null; this.broadcast({ t: 'mg', mg: this.mgView() }); }, 400); }
  score(x, n) {   // điểm cho bàn của người này (minigame "Bàn nào vui nhất")
    if (this.segs[this.segI].key !== 'vui') return;
    const b = this.tableOf(x.id); if (b < 0) return;
    this.mg.scores[b] = (this.mg.scores[b] || 0) + n; this.mgPush();
  }

  // ----- kéo tương tác: chào gộp, gọi tên người im, câu hỏi nhanh 1 / 2 -----
  flushJoins() {
    const names = this.joinBuf.splice(0); if (!names.length || !this.clients.size) return;
    const [a, b] = names.map(nmOf), rest = names.length - 2;
    const who = names.length === 1 ? a : names.length === 2 ? `${a} và ${b}` : names.length === 3 ? `${a}, ${b} và ${nmOf(names[2])}` : `${a}, ${b} và ${rest} bạn nữa`;
    this.voice.push('join', `Chào ${who} vừa lên đảo! ${pick(['Gõ dzô để cụng ly với cả bàn nào!', 'Chat một câu chào cả đảo đi nè!', 'Gõ em ơi là có người ra phục vụ liền!'])}`);
  }
  nudge() {
    if (!this.clients.size || this.voice.items.length > 1) return;
    const now = Date.now(), seg = this.segs[this.segI].key;
    // xen kẽ: nhắc mục tiêu tim khi gần đạt, còn lại gọi tên người mới vào mà chưa tương tác
    const left = this.goal.target - this.goal.n;
    if (this.nudgeI++ % 3 === 2 && left > 0) { this.voice.push('wish', `Còn ${left} tim nữa là vũ công Ngân lên đồ quẩy, cả đảo bấm tim nào!`); return; }
    const c = this.seats.map(id => id && this.users.get(id))
      .filter(u => u && !(u.act > now - 300000) && now - (this.nudged.get(u.id) || 0) > 600000 && isClean(u.name) && u.last > now - 600000)
      .sort((a, b) => b.last - a.last)[0];
    if (!c) { if (left > 0) this.voice.push('wish', `Ai đang xem gõ 1 chữ dzô thôi là được vào bàn! Còn ${left} tim nữa là Ngân lên đồ quẩy!`); return; }
    this.nudged.set(c.id, now);
    const f = pick(NUDGE[seg] || NUDGE.any);
    this.broadcast({ t: 'nudge', id: c.id, name: c.name, table: this.tableOf(c.id) });
    this.voice.push('wish', f(nmOf(c.name), this.tableOf(c.id) + 1));
  }
  pollView() { const p = this.poll; return p && { q: p.q, a: p.a, n: p.n, left: Math.max(0, p.end - Date.now()) }; }
  startPoll() {
    if (this.poll || !this.clients.size || this.segs[this.segI].key === 'do') return;   // đố vui có đáp án số → không chen
    const [q, a1, a2] = pick(POLLS.filter(z => z[0] !== this.lastPoll)); this.lastPoll = q;
    const ms = (this.cfg.biaHoi?.pollSec || 45) * 1000;
    this.poll = { q, a: [a1, a2], n: [0, 0], who: new Set(), end: Date.now() + ms };
    this.broadcast({ t: 'poll', poll: this.pollView() });
    this.voice.push('wish', `Câu hỏi nhanh: ${q} Gõ 1 là ${a1}, gõ 2 là ${a2}!`);
    setTimeout(() => this.endPoll(), ms);
  }
  endPoll() {
    const p = this.poll; if (!p) return; this.poll = null;
    const tot = p.n[0] + p.n[1], w = p.n[1] > p.n[0] ? 1 : 0, pct = tot ? Math.round(p.n[w] * 100 / tot) : 0;
    this.broadcast({ t: 'pollend', q: p.q, a: p.a, n: p.n, win: tot && p.n[0] !== p.n[1] ? w : -1 });
    if (!tot) return;
    this.voice.push('wish', p.n[0] === p.n[1] ? `Kết quả: hòa nhau ${p.n[0]} đều! Cả đảo chia đôi luôn!` :
      `Kết quả: ${pct} phần trăm chọn ${p.a[w]}! Cảm ơn ${tot} bạn đã chọn.`);
  }

  // ===== sự kiện chuẩn hoá từ các nền tảng =====
  onJoin(u) {
    const x = this.user(u); this.seat(x);
    this.broadcast({ t: 'join', id: x.id, name: x.name, avatar: x.avatar });
    // chào gộp mỗi 15 giây (không đọc từng người, đỡ lấn lời rủ tương tác)
    if (this.cfg.voice.readJoins && isClean(x.name) && !this.joinBuf.includes(x.name) && Date.now() - (x.greet || 0) > 600000) { x.greet = Date.now(); this.joinBuf.push(x.name); }
  }
  onChat(u, text) {
    const x = this.user(u); this.seat(x); this.active(x);
    text = stripEmotes(text);
    const clean = isClean(text) && isClean(x.name), p = plain(text), seg = this.segs[this.segI].key;
    const show = clean ? cleanText(text, 90) : null;
    this.score(x, 1);
    // câu hỏi nhanh: mỗi người 1 phiếu, chỉ gõ đúng 1 hoặc 2
    if (this.poll && (p === '1' || p === '2')) {
      const pl = this.poll; if (pl.who.has(x.id)) return; pl.who.add(x.id); pl.n[+p - 1]++;
      this.broadcast({ t: 'pollv', id: x.id, name: x.name, c: +p - 1, n: pl.n }); return;
    }
    // "dzô": cả bàn cụng ly, đếm combo; không đọc từng câu, mỗi 100 tiếng đọc 1 lần
    if (DZO_RE.test(p) && p.length < 30) {
      this.dzo++; x.dzo++; this.dirty();
      if (seg === 'dzo') { this.mg.dzo[x.id] = (this.mg.dzo[x.id] || 0) + 1; this.mgPush(); }
      this.broadcast({ t: 'dzo', id: x.id, name: x.name, table: this.tableOf(x.id), n: this.dzo });
      if (this.dzo % 100 === 0) this.voice.push('wish', `Cả đảo đã dzô ${this.dzo} lần! Một, hai, ba, dzô!`);
      return;
    }
    // oẳn tù tì: chỉ trong lượt minigame này, chat đúng 1 từ búa / kéo / bao
    if (seg === 'ott' && OTT[p]) {
      if (Date.now() - x.at < 4000) return; x.at = Date.now();
      const h = pick(Object.keys(OTT)), res = h === p ? 'hoa' : BEATS[p] === h ? 'thang' : 'thua';
      if (res === 'thang') { this.mg.wins[x.id] = (this.mg.wins[x.id] || 0) + 1; }
      this.mg.last = { name: x.name, you: OTT[p], hang: OTT[h], res };
      this.broadcast({ t: 'ott', id: x.id, name: x.name, you: OTT[p], hang: OTT[h], res }); this.mgPush();
      return;
    }
    // đố vui: ai trả lời đúng trước được cả đảo vỗ tay, rồi sang câu mới
    if (seg === 'do' && this.mg.q && !this.mg.solved && this.mg.a.some(a => (' ' + p + ' ').includes(' ' + a + ' '))) {
      this.mg.solved = { name: x.name, a: show || text };
      this.broadcast({ t: 'quiz', id: x.id, name: x.name, q: this.mg.q, a: show || text }); this.mgPush();
      this.voice.push('gift', `${nmOf(x.name)} trả lời đúng! Cả đảo vỗ tay nào!`);
      setTimeout(() => { if (this.segs[this.segI].key === 'do') { this.newQuiz(); this.mgPush(); } }, 9000);
      return;
    }
    if (/^em oi\b|^(e|em) oi+$/.test(p)) {
      if (Date.now() - x.at < 20000) return; x.at = Date.now();
      const who = pick(['thu', 'mai']);
      this.broadcast({ t: 'call', id: x.id, name: x.name, table: this.tableOf(x.id), server: who });
      this.voice.push('wish', `Dạ, ${STAFF[who]} ra bàn ${this.tableOf(x.id) + 1} ngay đây ạ!`, x.id);
      return;
    }
    if (/^tinh tien\b/.test(p)) {
      if (Date.now() - x.at < 30000) return; x.at = Date.now();
      const bill = `Hóa đơn của ${nmOf(x.name)}: ${x.dzo} lần dzô, ${x.orders} lần gọi món. Tổng cộng: một trăm phần trăm vui vẻ. Quán mời ạ!`;
      this.broadcast({ t: 'bill', id: x.id, name: x.name, dzo: x.dzo, orders: x.orders, table: this.tableOf(x.id) });
      this.voice.push('wish', bill, x.id);
      return;
    }
    if (/^ghep ban\b/.test(p)) {
      const b = this.merge(x);
      if (b !== false) this.voice.push('wish', `${nmOf(x.name)} ghép sang bàn ${b + 1}, làm quen nhau nhé!`, x.id);
      return;
    }
    if (seg === 'quay' && /\b(nhay|quay|len nhac)\b/.test(p)) { this.mg.hype = (this.mg.hype || 0) + 1; this.mgPush(); }
    const meaningful = !!show && isMeaningful(show);
    this.broadcast({ t: 'chat', id: x.id, name: x.name, text: meaningful ? show : null, table: this.tableOf(x.id) });
    if (!clean || !meaningful) return;
    this.voice.push('wish', `${nmOf(x.name)} nói: ${cleanText(text, this.cfg.voice.maxChars || 120)}`, x.id);
  }
  onLike(u, count = 1) {
    const x = this.user(u); this.seat(x); this.active(x);
    this.likes += count; this.dirty(); this.goal.n += count;
    this.score(x, Math.min(count, 5));
    if (this.segs[this.segI].key === 'quay') { this.mg.hype = (this.mg.hype || 0) + count; this.mgPush(); }
    this.broadcast({ t: 'like', id: x.id, count, total: this.likes, goal: this.goal, table: this.tableOf(x.id) });
    if (this.goal.n >= this.goal.target) {
      const done = this.goal.target;
      this.goal = { n: 0, target: Math.min(done + (done < 300 ? 50 : 100), 1000) };
      this.broadcast({ t: 'goaldone', target: done, goal: this.goal });
      this.voice.push('gift', `Đảo bùng nổ! Cả đảo đã thả đủ ${done} tim. Vũ công Ngân lên sân khấu, cả đảo cùng nâng ly. Một, hai, ba, dzô!`);
    }
    else if (!this.goal.warned && this.goal.target - this.goal.n <= Math.max(10, this.goal.target / 5)) {
      this.goal.warned = true;
      this.voice.push('wish', `Còn ${this.goal.target - this.goal.n} tim nữa thôi là Ngân lên đồ quẩy! Bấm tim liên tục nào!`);
    }
    if (this.cfg.voice.readLikes !== false && isClean(x.name)) this.voice.push('like', `Cảm ơn ${nmOf(x.name)} đã thả tim cho quán.`, x.id);
  }
  onShare(u) {
    const x = this.user(u); this.seat(x); this.active(x);
    this.broadcast({ t: 'share', id: x.id, name: x.name, table: this.tableOf(x.id) });
    this.voice.push('like', `Cảm ơn ${nmOf(x.name)} đã rủ thêm bạn lên đảo!`, x.id);
  }
  onViewers(n) { if (n >= 0) this.viewers = n; }
  onFollow(u) { const x = this.user(u); this.seat(x); this.broadcast({ t: 'follow', id: x.id, name: x.name }); }
  onGift(u, giftName, count = 1, points = 1) {
    const x = this.user(u); this.seat(x); this.active(x);
    x.points += points; x.orders++; this.dirty();
    this.score(x, points);
    const d = dishOf(points), b = this.tableOf(x.id), nm = nmOf(x.name);
    const gShow = giftVi(giftName) === 'món quà' ? giftName : giftVi(giftName);
    const o = { id: x.id, name: x.name, avatar: x.avatar, dish: d.key, dishName: d.name, table: b, server: d.server, gift: gShow, count, points, at: Date.now() };
    this.orders = [o, ...this.orders].slice(0, 4);
    this.broadcast({ t: 'order', ...o });
    this.broadcast({ t: 'top', top: this.top(), dzoTop: this.dzoTop() });
    const g = cleanText(giftVi(giftName), 30) || 'món quà', B = `bàn ${b + 1}`;
    const thanks = `Cảm ơn ${nm} đã tặng ${count > 1 ? count + ' ' : ''}${g} ủng hộ quán.`;
    const line = {
      lac: `Một đĩa lạc rang cho ${B}, Thu mang ra ngay ạ!`,
      nem: `Nem chua rán nóng hổi cho ${B}, Mai mang ra nè!`,
      dzo: `Cả ${B} cùng nâng ly. Một, hai, ba, dzô!`,
      muc: `Mực nướng thơm lừng cho ${B}. Chị Hằng chúc: ${pick(WISHES)}`,
      ban: `Chơi lớn quá! ${nm} bao cả ${B}, món ra liên tục! Chị Hằng chúc: ${pick(WISHES)}`,
      quan: `Ôi chơi lớn quá! ${nm} bao cả đảo! Pháo hoa lên nào, cả đảo cùng nâng ly. Một, hai, ba, dzô!`,
    }[d.key];
    this.voice.push('gift', `${thanks} ${line}`, x.id);
  }
}

module.exports = { Room, MENU, TABLES, PER };
