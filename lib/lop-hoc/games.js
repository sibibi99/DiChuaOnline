// 5 TRÒ GIỜ RA CHƠI của Lớp Học Vui (mỗi giờ ra chơi đổi một trò, xoay vòng không lặp trò liền kề):
//   rps = Oẳn tù tì với cô · tug = Kéo co 4 tổ · hang = Đoán chữ · count = Đếm nhanh · dragon = Rồng rắn lên mây
// Luật chung: giọng cô mỗi trò chỉ 1 câu mở + 1 câu kết (≤ 12 từ), không đọc từng ván / tỉ số; lệnh trò chơi không bị đọc thành bình luận;
// quà KHÔNG cộng lực / điểm trong trò chơi (chỉ hiển thị); mọi trò miễn phí.
const { plain } = require('../filter');
const { HANG } = require('./tu-doan');
const GAMES = ['rps', 'tug', 'hang', 'count', 'dragon'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BEATS = { bua: 'keo', keo: 'bao', bao: 'bua' };                       // khoá thắng giá trị: búa thắng kéo, kéo thắng bao, bao thắng búa
const rpsOf = (p2, text) => { if (['bua', 'keo', 'bao'].includes(p2)) return p2; const t = String(text || '');
  if (/^\s*(✊|👊)/u.test(t)) return 'bua'; if (/^\s*(✌|✂)/u.test(t)) return 'keo'; if (/^\s*(✋|🖐|🤚)/u.test(t)) return 'bao'; return null; };
const COUNT_KINDS = ['tao', 'sao', 'ca', 'bong', 'hoa', 'la'];
const sqz = s => plain(s).replace(/[^a-z0-9]/g, '');                         // so khớp đoán chữ: bỏ dấu, bỏ khoảng trắng, bỏ ký tự lạ

class Game {
  constructor(room, kind) { this.room = room; this.kind = kind; this.on = false; this.t0 = 0; }
  state(m) { this.room.gameState = m; this.room.broadcast(m); }
  top(map, n = 3) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, v]) => { const u = this.room.users.get(id); return u && { id, name: u.name, avatar: u.avatar, n: v }; }).filter(Boolean); }
  chat() { return false; }
  like() {}
}

// ---- 1. OẲN TÙ TÌ VỚI CÔ ----
class Rps extends Game {
  constructor(room) { super(room, 'rps'); this.picks = new Map(); this.score = new Map(); this.phase = ''; }
  chat(x, p, p2, text) {
    const m = this.on && this.phase === 'open' && rpsOf(p2, text); if (!m) return false;
    if (!this.picks.has(x.id)) { this.picks.set(x.id, m); this.room.broadcast({ t: 'chat', id: x.id, name: x.name, text: { bua: 'Búa!', keo: 'Kéo!', bao: 'Bao!' }[m], table: this.room.tableOf(x.id) }); }
    return true;                                                              // mỗi ván chỉ tính lần đầu, lệnh không bị đọc thành bình luận
  }
  async run(tok) {
    const r = this.room, sc = r.B.speed || 1, of = 5; this.on = true; r.say('Oẳn tù tì với cô nào! Gõ búa, kéo hoặc bao.');
    for (let round = 1; round <= of; round++) {
      this.picks.clear(); this.phase = 'open'; this.state({ t: 'rps', phase: 'open', round, of, left: 7500 / sc, top: this.top(this.score) });
      if (!await r.sleep(7500 / sc, tok)) return;
      const co = pick(['bua', 'keo', 'bao']); this.phase = 'res'; let win = 0;
      for (const [id, m] of this.picks) if (BEATS[m] === co) { win++; this.score.set(id, (this.score.get(id) || 0) + 1); const u = r.users.get(id); if (u) r.award(u, 1); }
      this.state({ t: 'rps', phase: 'res', round, of, co, win, total: this.picks.size, top: this.top(this.score) });
      if (!await r.sleep(2500 / sc, tok)) return;
    }
    const t = this.top(this.score, 1)[0]; r.say(t ? `Oẳn tù tì xong rồi, ${r.nm(t.name)} thắng nhiều nhất!` : 'Oẳn tù tì xong rồi, lần sau cô thắng nhé!');
  }
}

// ---- 2. KÉO CO 4 TỔ ----
class Tug extends Game {
  constructor(room) { super(room, 'tug'); this.f = [0, 0, 0, 0]; this.contrib = new Map(); this.lastPush = 0; this.end = 0; }
  assign(x) {     // chưa vào tổ thì tự xếp vào tổ ít người nhất
    if (x.team) return; const cnt = [0, 0, 0, 0]; for (const u of this.room.users.values()) if (u.team) cnt[u.team - 1]++;
    const min = Math.min(...cnt), t = pick(cnt.map((c, i) => c === min ? i : -1).filter(i => i >= 0)); x.team = t + 1; this.room.dirty();
    this.room.broadcast({ t: 'team', id: x.id, name: x.name, team: x.team });
  }
  pull(x, force) {
    this.assign(x); const ti = this.room.teamOf(x) - 1; this.f[ti] += force; this.contrib.set(x.id, (this.contrib.get(x.id) || 0) + force);
    if (Date.now() - this.lastPush > 400) this.push();
  }
  push() { this.lastPush = Date.now(); this.state({ t: 'tug', phase: 'on', f: this.f.map(v => +v.toFixed(2)), left: Math.max(0, this.end - Date.now()) }); }
  chat(x, p, p2) {
    if (!this.on || !['keo', 'keo co'].includes(p2)) return false;
    if (Date.now() - (x.tugAt || 0) >= 2000) { x.tugAt = Date.now(); this.pull(x, 1); }      // 1 lần / 2 giây / người
    return true;
  }
  like(x, count) { if (this.on) this.pull(x, Math.min(+count || 1, 10) * .25); }              // thả tim cũng tính cho tổ mình; quà không tính (không pay-to-win)
  async run(tok) {
    const r = this.room, sc = r.B.speed || 1, ms = 45000 / sc; this.on = true; this.end = Date.now() + ms; r.say('Kéo co bốn tổ! Gõ kéo hoặc thả tim cho tổ mình.');
    this.state({ t: 'tug', phase: 'on', f: this.f.slice(), left: ms });
    const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!await r.sleep(500 / sc, tok)) return; this.push(); }
    this.on = false; const tot = this.f.reduce((a, b) => a + b, 0), mx = Math.max(...this.f), win = tot > 0 && this.f.filter(v => v === mx).length === 1 ? this.f.indexOf(mx) + 1 : 0;
    if (win) for (const [id, v] of this.contrib) { const u = r.users.get(id); if (u && r.teamOf(u) === win && v >= 1) r.award(u, 2); }
    this.state({ t: 'tug', phase: 'end', f: this.f.map(v => +v.toFixed(2)), win, left: 0 });
    r.say(win ? `Tổ ${win} thắng kéo co, cô khen cả tổ!` : 'Kéo co hòa rồi, lần sau cố gắng nhé!');
    await r.sleep(3000 / sc, tok);
  }
}

// ---- 3. ĐOÁN CHỮ ----
class Hang extends Game {
  constructor(room) { super(room, 'hang'); this.cur = null; this.wins = new Map(); }
  chat(x, p, p2, text) {
    if (!this.on || !this.cur || this.cur.done) return false;
    const g = sqz(text); if (!g || g.length > 22) return false;
    if (g === this.cur.key) { this.cur.done = true; this.cur.win = x; const r = this.room; r.award(x, 3); this.wins.set(x.id, (this.wins.get(x.id) || 0) + 3); return true; }
    this.room.broadcast({ t: 'chat', id: x.id, name: x.name, text: String(text).trim().slice(0, 24), table: this.room.tableOf(x.id) });
    return true;                                                              // đoán sai: chỉ hiện bong bóng, không đọc thành bình luận
  }
  async run(tok) {
    const r = this.room, sc = r.B.speed || 1; this.on = true; r.say('Đoán chữ! Cô mở dần từng chữ, ai đoán đúng trước thắng.');
    const pool0 = HANG.filter(w => !r.usedQ.has('H:' + w[0])), words = shuffle(pool0.length >= 2 ? pool0 : HANG).slice(0, 2);
    for (const [word, hint] of words) {
      r.usedQ.set('H:' + word, Date.now()); r.saveUsedSoon();
      const chars = [...word], idx = chars.map((c, i) => c === ' ' ? -1 : i).filter(i => i >= 0), order = shuffle(idx), shown = new Set(), key = sqz(word);
      const pat = () => chars.map((c, i) => c === ' ' ? ' ' : shown.has(i) ? c.toUpperCase() : '_'), dur = Math.min(26000, Math.max(14000, idx.length * 4000)) / sc;
      this.cur = { key, word, done: false, win: null }; shown.add(order.shift());
      this.state({ t: 'hang', phase: 'open', pat: pat(), hint, left: dur, n: idx.length }); const t0 = Date.now();
      while (!this.cur.done && Date.now() - t0 < dur) {
        const step = Math.min(4000 / sc, Math.max(100, dur - (Date.now() - t0)));
        if (!await r.sleep(step, tok)) return; if (this.cur.done || Date.now() - t0 >= dur) break;
        if (order.length > 1) { shown.add(order.shift()); this.state({ t: 'hang', phase: 'open', pat: pat(), hint, left: Math.max(0, dur - (Date.now() - t0)), n: idx.length }); }
      }
      const w = this.cur.win; this.cur.done = true;
      this.state({ t: 'hang', phase: 'res', pat: chars.map(c => c === ' ' ? ' ' : c.toUpperCase()), hint, answer: word, win: w ? { id: w.id, name: w.name, avatar: w.avatar } : null, left: 0, n: idx.length });
      if (!await r.sleep(2500 / sc, tok)) return;
    }
    const t = this.top(this.wins, 1)[0]; r.say(t ? `Đoán chữ xong rồi, ${r.nm(t.name)} đoán giỏi nhất!` : 'Đoán chữ xong rồi, lần sau cô khó hơn nhé!');
  }
}

// ---- 4. ĐẾM NHANH ----
class Count extends Game {
  constructor(room) { super(room, 'count'); this.phase = ''; this.n = 0; this.ans = new Map(); this.score = new Map(); this.t = 0; }
  chat(x, p, p2) {
    if (!this.on || !/^\d{1,2}$/.test(p2)) return false;
    if (this.phase === 'ask' && !this.ans.has(x.id)) this.ans.set(x.id, { v: +p2, t: Date.now() });
    return true;                                                              // gõ số trong lúc chơi: không đọc thành bình luận
  }
  async run(tok) {
    const r = this.room, sc = r.B.speed || 1, of = 4; this.on = true; r.say('Đếm nhanh! Nhìn kỹ các hình rồi gõ số lượng.');
    for (let round = 1; round <= of; round++) {
      this.n = 3 + Math.floor(Math.random() * 18); const kind = pick(COUNT_KINDS), seed = Math.floor(Math.random() * 1e6); this.ans.clear();
      this.phase = 'show'; this.state({ t: 'count', phase: 'show', round, of, kind, n: this.n, seed, left: 5000 / sc }); if (!await r.sleep(5000 / sc, tok)) return;
      this.phase = 'ask'; this.t = Date.now(); this.state({ t: 'count', phase: 'ask', round, of, kind, seed, left: 7000 / sc });
      const t0 = Date.now(); while (Date.now() - t0 < 7000 / sc) { if (!await r.sleep(300 / sc, tok)) return; if ([...this.ans.values()].filter(a => a.v === this.n).length >= 3 && Date.now() - t0 > 2500 / sc) break; }
      this.phase = 'res'; const right = [...this.ans.entries()].filter(([, a]) => a.v === this.n).sort((a, b) => a[1].t - b[1].t); let win = null;
      right.forEach(([id], j) => { const u = r.users.get(id); if (!u) return; const pts = j === 0 ? 3 : 1; r.award(u, pts); this.score.set(id, (this.score.get(id) || 0) + pts); if (j === 0) win = { id, name: u.name, avatar: u.avatar }; });
      this.state({ t: 'count', phase: 'res', round, of, kind, n: this.n, seed, ans: this.n, win, right: right.length, total: this.ans.size, left: 0 });
      if (!await r.sleep(2500 / sc, tok)) return;
    }
    const t = this.top(this.score, 1)[0]; r.say(t ? `Đếm nhanh xong rồi, ${r.nm(t.name)} đếm giỏi nhất!` : 'Đếm nhanh xong rồi, lần sau thử lại nhé!');
  }
}

// ---- 5. RỒNG RẮN LÊN MÂY ----
class Dragon extends Game {
  constructor(room) { super(room, 'dragon'); this.list = []; this.ids = new Set(); }
  chat(x, p, p2) {
    if (!['rong ran', 'rongran', 'rong ran len may'].includes(p2)) return false;
    if (!this.on) return true;
    if (!this.ids.has(x.id) && this.list.length < 80) {
      this.ids.add(x.id); const seg = { id: x.id, name: x.name, avatar: x.avatar }; this.list.push(seg); const n = this.list.length, ms = [10, 20, 50].includes(n) ? n : 0;
      const u = this.room.users.get(x.id); if (u) this.room.award(u, 1);                    // +1 điểm tham gia
      this.room.gameState = { t: 'rong', n, list: this.list.map(s => ({ id: s.id, name: s.name, avatar: s.avatar })) };
      this.room.broadcast({ t: 'rong', n, add: seg, ms });
    }
    return true;
  }
  async run(tok) {
    const r = this.room, sc = r.B.speed || 1; this.on = true; r.say('Rồng rắn lên mây! Gõ rồng rắn để nối vào đuôi rồng.');
    this.state({ t: 'rong', n: 0, list: [] }); if (!await r.sleep(45000 / sc, tok)) return;
    const n = this.list.length; r.say(n ? `Rồng dài ${n} khúc, giỏi lắm!` : 'Rồng chưa có khúc nào, lần sau nối nhé!'); await r.sleep(2500 / sc, tok);
  }
}

const MAKE = { rps: Rps, tug: Tug, hang: Hang, count: Count, dragon: Dragon };
async function run(room, kind, tok) {
  const g = new MAKE[kind](room); room.game = g; room.gameState = null; room.broadcast({ t: 'game', kind, on: true });
  try { await g.run(tok); } finally { g.on = false; if (room.game === g) { room.game = null; room.gameState = null; room.broadcast({ t: 'game', kind, on: false }); } }
}
module.exports = { run, GAMES, rpsOf, sqz };
