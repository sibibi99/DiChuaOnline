// Bảng điều khiển Lớp Học Vui (trang /dieu-khien): sếp tự chỉnh khi đang live, đổi là ÁP DỤNG NGAY, không phải khởi động lại.
// - Mọi chỉnh sửa ghi đè lên config.lopHoc và lưu data/dieu-khien.json (khởi động lại vẫn giữ); "Về mặc định" xoá hết, trả về giá trị trong config.json.
// - Bảo mật: mặc định chỉ nhận từ chính máy này (127.0.0.1 / ::1, Host là localhost, không qua proxy). Máy khác trong LAN chỉ khi sếp tự đặt lopHoc.panelPin trong config.json
//   (gửi kèm header x-pin; sai quá 5 lần / phút thì khoá 1 phút). Mọi lệnh GHI phải là POST + header x-dk + cùng nguồn (Origin trùng Host).
// - Mỗi thanh trượt có giới hạn an toàn (SCHEMA): vượt giới hạn bị kéo về mức gần nhất, không cho chỉnh tới mức làm tắc giọng.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const store = require('../store');
const Games = require('./games');

const KEY = 'dieu-khien';
const GAME_NAMES = { rps: 'Oẳn tù tì', tug: 'Kéo co', hang: 'Đoán chữ', count: 'Đếm số', dragon: 'Rồng rắn lên mây' };
const SEG_BTN = [['diemdanh', 'Điểm danh'], ['dovui', 'Đố vui'], ['toan', 'Toán & chính tả'], ['rachoi', 'Ra chơi'], ['ke', 'Kể chuyện'], ['kt', 'Kiểm tra'], ['tongket', 'Tổng kết']];

// type: bool | range | select. range: min / max / step; off = giá trị "tắt" cho phép (vd 0) nằm ngoài [min, max].
const SCHEMA = [
  { key: 'music', group: 'am', label: 'Nhạc nền', type: 'bool', def: true, hint: 'Bật / tắt nhạc nền học đường trên màn hình live.' },
  { key: 'musicVol', group: 'am', label: 'Âm lượng nhạc nền', type: 'range', min: 0, max: 100, step: 5, def: 60, unit: '%' },
  { key: 'voiceVol', group: 'am', label: 'Âm lượng giọng cô', type: 'range', min: 10, max: 100, step: 5, def: 100, unit: '%', hint: 'Thấp nhất 10% — muốn im hẳn thì dùng nút TẠM IM CÔ.' },

  { key: 'speed', group: 'tiet', label: 'Tốc độ buổi học', type: 'range', min: 0.7, max: 1.5, step: 0.05, def: 1, unit: '×', hint: '1 = bình thường; 1,2 = mọi tiết ngắn hơn một chút.' },
  { key: 'maxDiff', group: 'tiet', label: 'Mức khó tối đa', type: 'range', min: 1, max: 3, step: 1, def: 3, hint: '1 = dễ (tiểu học) · 2 = vừa · 3 = cả câu khó.' },
  { key: 'grade', group: 'tiet', label: 'Khối lớp', type: 'select', def: 0, options: [[0, 'Để học sinh bình chọn'], [1, 'Cố định lớp 1–2'], [2, 'Cố định lớp 3–5'], [3, 'Cố định lớp 6–9']] },
  { key: 'vote', group: 'tiet', label: 'Bình chọn chủ đề trước tiết đố vui', type: 'bool', def: true },
  { key: 'voteSec', group: 'tiet', label: 'Thời gian bình chọn', type: 'range', min: 10, max: 40, step: 5, def: 15, unit: 'giây' },

  { key: 'shareStripLowSec', group: 'tuongtac', label: 'Dải rủ bạn — khi dưới mục tiêu', type: 'range', min: 20, max: 180, step: 5, def: 45, unit: 'giây' },
  { key: 'shareStripSec', group: 'tuongtac', label: 'Dải rủ bạn — khi đủ đông', type: 'range', min: 30, max: 300, step: 5, def: 90, unit: 'giây' },
  { key: 'shareVoiceLowSec', group: 'tuongtac', label: 'Giọng cô rủ bạn — khi dưới mục tiêu', type: 'range', min: 60, max: 600, step: 10, def: 120, unit: 'giây' },
  { key: 'shareVoiceSec', group: 'tuongtac', label: 'Giọng cô rủ bạn — khi đủ đông', type: 'range', min: 90, max: 900, step: 10, def: 240, unit: 'giây' },
  { key: 'shareTarget', group: 'tuongtac', label: 'Mục tiêu số bạn trong lớp', type: 'range', min: 0, max: 1000, step: 10, def: 100, unit: 'bạn', hint: '0 = tắt câu mục tiêu và nhịp rủ dày.' },
  { key: 'shareThanksSec', group: 'tuongtac', label: 'Cảm ơn người chia sẻ (cách nhau)', type: 'range', min: 30, max: 300, step: 5, def: 60, unit: 'giây' },
  { key: 'shareTail', group: 'tuongtac', label: 'Đuôi "rủ bạn" ở điểm danh và tổng kết', type: 'bool', def: true },
  { key: 'fewMax', group: 'tuongtac', label: 'Lớp vắng khi dưới', type: 'range', min: 5, max: 60, step: 1, def: 12, unit: 'bạn', hint: 'Dưới mức này cô chào từng bạn; từ mức này chào gộp.' },
  { key: 'crowdGreetSec', group: 'tuongtac', label: 'Chào gộp học sinh mới (cách nhau)', type: 'range', min: 30, max: 300, step: 5, def: 90, unit: 'giây' },
  { key: 'idleSec', group: 'tuongtac', label: 'Cô lấp chỗ trống sau', type: 'range', min: 10, max: 120, step: 5, off: 0, def: 20, unit: 'giây', hint: '0 = tắt. Từ 10 giây trở lên.' },
  { key: 'idleBusySec', group: 'tuongtac', label: 'Lấp chỗ trống khi lớp đông', type: 'range', min: 20, max: 180, step: 5, def: 45, unit: 'giây' },
  { key: 'jokeSec', group: 'tuongtac', label: 'Câu đùa của cô (cách nhau)', type: 'range', min: 60, max: 600, step: 15, off: 0, def: 165, unit: 'giây', hint: '0 = tắt. Từ 60 giây trở lên.' },
  { key: 'readChat', group: 'tuongtac', label: 'Cô đọc bình luận của học sinh', type: 'bool', def: true },
  { key: 'readGapSec', group: 'tuongtac', label: 'Đọc bình luận (cách nhau)', type: 'range', min: 20, max: 300, step: 5, def: 60, unit: 'giây', hint: 'Thấp nhất 20 giây để giọng cô không bị tắc.' },
  { key: 'thankFollow', group: 'tuongtac', label: 'Cảm ơn người theo dõi', type: 'bool', def: true },
];
const BY_KEY = Object.fromEntries(SCHEMA.map(s => [s.key, s]));
const nearStep = (v, s) => { const st = s.step || 1; return Math.round(v / st) * st; };

// kiểm một giá trị: { ok, value, clamped } hoặc { ok:false, error }
function check(key, raw) {
  const s = Object.prototype.hasOwnProperty.call(BY_KEY, key) ? BY_KEY[key] : null; if (!s) return { ok: false, error: 'Không có mục "' + key + '"' };
  if (s.type === 'bool') return typeof raw === 'boolean' ? { ok: true, value: raw } : { ok: false, error: key + ': cần bật / tắt' };
  if (typeof raw !== 'number' || !isFinite(raw)) return { ok: false, error: key + ': cần là số' };
  if (s.type === 'select') { const v = Math.round(raw); return s.options.some(o => o[0] === v) ? { ok: true, value: v } : { ok: false, error: key + ': lựa chọn không có' }; }
  let v = nearStep(raw, s); v = +v.toFixed(4);
  if (s.off != null && raw === s.off) return { ok: true, value: s.off };      // "tắt" chỉ khi gửi đúng giá trị tắt; số nhỏ hơn mức tối thiểu thì kéo lên mức tối thiểu
  const c = Math.max(s.min, Math.min(s.max, v)); return { ok: true, value: +c.toFixed(4), clamped: raw < s.min - 1e-9 || raw > s.max + 1e-9 };
}

function createPanel({ rooms, cfg, base, getLogs, version, dataDir, page }) {
  const B = () => cfg.lopHoc || (cfg.lopHoc = {});
  const primary = () => rooms.tiktok || Object.values(rooms)[0];
  const fails = new Map(); let rtok = null;
  const overrides = {};      // chỉ các mục sếp đã đổi (để lưu / hiển thị "đã chỉnh")
  Object.assign(overrides, loadOverrides());

  function loadOverrides() { const d = store.load(KEY), out = {}; for (const [k, v] of Object.entries((d && d.values) || {})) { const c = check(k, v); if (c.ok) out[k] = c.value; } return out; }
  function save() { try { store.save(KEY, { values: overrides, savedAt: new Date().toISOString() }); } catch (e) { console.log('[dieu-khien] lỗi ghi:', e.message); } }
  function put(key, value) {
    B()[key] = value; for (const r of Object.values(rooms)) if (r.B !== B()) r.B[key] = value;
    if (key === 'music' || key === 'musicVol' || key === 'voiceVol') for (const r of Object.values(rooms)) r.pushAudio();
  }
  function unput(key) { const had = base && Object.prototype.hasOwnProperty.call(base, key); if (had) put(key, base[key]); else { delete B()[key]; for (const r of Object.values(rooms)) delete r.B[key]; if (['music', 'musicVol', 'voiceVol'].includes(key)) for (const r of Object.values(rooms)) r.pushAudio(); } }
  const cur = s => { const v = B()[s.key]; return v === undefined ? s.def : v; };

  function schemaView() { return SCHEMA.map(s => ({ ...s, value: cur(s), changed: Object.prototype.hasOwnProperty.call(overrides, s.key) })); }
  function state() {
    const r = primary(), st = r ? r.statusView() : {};
    return { status: { ...st, voiceDown: !!(r && r.voice && r.voice.engine && r.voice.engine.vlDownAt), platforms: Object.keys(rooms), version: version || '' }, schema: schemaView(), segs: SEG_BTN, games: Games.GAMES.map(k => [k, GAME_NAMES[k] || k]), logs: (getLogs ? getLogs(10) : []).map(l => String(l).slice(0, 200)), hasPin: !!pin(), now: Date.now() };
  }
  function set(patch) {
    const applied = {}, clamped = [], errors = [];
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, errors: ['Dữ liệu không hợp lệ'] };
    for (const [k, raw] of Object.entries(patch)) { const c = check(k, raw); if (!c.ok) errors.push(c.error); else { applied[k] = c.value; if (c.clamped) clamped.push(k); } }
    if (errors.length) return { ok: false, errors };
    for (const [k, v] of Object.entries(applied)) { put(k, v); overrides[k] = v; }
    save(); return { ok: true, applied, clamped };
  }
  function resetDefaults() { for (const k of Object.keys(overrides)) { unput(k); delete overrides[k]; } save(); return { ok: true }; }

  // ---------- an ninh ----------
  const pin = () => { const p = cfg.lopHoc && cfg.lopHoc.panelPin; return typeof p === 'string' && p.length >= 4 ? p : ''; };
  const LOOP = /^(::1|127\.|::ffff:127\.)/;
  function isLocal(req) {
    const h = req.headers || {}, host = String(h.host || '').replace(/:\d+$/, '').toLowerCase();
    if (!LOOP.test(req.socket && req.socket.remoteAddress || '')) return false;
    if (h['x-forwarded-for'] || h['x-real-ip'] || h['cf-connecting-ip'] || h['forwarded'] || h['x-forwarded-host']) return false;      // qua proxy / đường hầm: không coi là máy này
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }
  // trả về null nếu được phép, hoặc { code, msg }
  function authorize(req) {
    if (isLocal(req)) return null;
    const p = pin(); if (!p) return { code: 403, msg: 'Chỉ mở được từ máy đang chạy live. (Muốn mở từ máy khác: đặt lopHoc.panelPin trong config.json rồi khởi động lại.)' };
    const ip = String(req.socket && req.socket.remoteAddress || ''), f = fails.get(ip) || { n: 0, t: 0 };
    if (Date.now() - f.t > 60000) { f.n = 0; f.t = Date.now(); }
    if (f.n >= 5) return { code: 429, msg: 'Nhập sai nhiều lần, thử lại sau 1 phút.' };
    const got = String(req.headers['x-pin'] || ''); if (!got) return { code: 401, msg: 'Cần mã PIN.' };
    const a = Buffer.from(got), b = Buffer.from(p);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) { fails.delete(ip); return null; }
    f.n++; f.t = f.t || Date.now(); fails.set(ip, f); return { code: 403, msg: 'Sai mã PIN.' };
  }
  function sameOrigin(req) { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch { return false; } }

  // ---------- hành động ----------
  function action(b) {
    const r = primary(); if (!r) return { ok: false, error: 'Chưa có phòng nào chạy' };
    switch (b && b.do) {
      case 'mute': { const min = Math.round(+b.min); if (!(min >= 0 && min <= 30)) return { ok: false, error: 'Chỉ từ 0 đến 30 phút' }; for (const x of Object.values(rooms)) x.muteVoice(min * 60000); return { ok: true, muted: min * 60 }; }
      case 'clear-queue': for (const x of Object.values(rooms)) x.clearVoice(); return { ok: true };
      case 'jump': { if (!SEG_BTN.some(s => s[0] === b.seg)) return { ok: false, error: 'Không có tiết này' }; for (const x of Object.values(rooms)) x.jumpTo(b.seg); return { ok: true }; }
      case 'next-game': { if (b.game === '' || b.game == null) { for (const x of Object.values(rooms)) x.forceGame = null; return { ok: true }; } if (!Games.GAMES.includes(b.game)) return { ok: false, error: 'Không có trò này' }; for (const x of Object.values(rooms)) x.forceGame = b.game; return { ok: true }; }
      case 'notice': { const c = r.noticeCheck(b.text); if (!c.ok) return { ok: false, error: c.reason }; let out; for (const x of Object.values(rooms)) out = x.showNotice(b.text, b.sec); return { ...out }; }
      case 'notice-clear': for (const x of Object.values(rooms)) x.clearNotice(); return { ok: true };
      case 'reset-defaults': return resetDefaults();
      case 'reset-students': {      // 2 bước: bước 1 lấy mã dùng 1 lần (30 giây), bước 2 gửi lại mã mới chạy
        if (b.step === 1) { rtok = { t: crypto.randomBytes(8).toString('hex'), exp: Date.now() + 30000 }; return { ok: true, token: rtok.t, ms: 30000 }; }
        if (b.step === 2) { const t = rtok; rtok = null; if (!t || Date.now() > t.exp || typeof b.token !== 'string' || b.token !== t.t) return { ok: false, error: 'Mã xác nhận sai hoặc hết hạn — bấm lại từ đầu.' };
          try { const res = {}; for (const [k, x] of Object.entries(rooms)) res[k] = x.resetStudents(); return { ok: true, result: res }; } catch (e) { return { ok: false, error: 'Không reset được: ' + e.message }; } }
        return { ok: false, error: 'Thiếu bước' };
      }
    }
    return { ok: false, error: 'Lệnh không có' };
  }

  function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
  function handle(req, res, u) {
    const p = u.pathname;
    if (p === '/dieu-khien') {      // trang giao diện: máy này thì mở thẳng; máy khác chỉ khi có PIN (trang tự hỏi PIN)
      if (!isLocal(req) && !pin()) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Chỉ mở được từ máy đang chạy live.'); }
      let html = ''; try { html = fs.readFileSync(page, 'utf8'); } catch { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }); return res.end(html);
    }
    if (!p.startsWith('/api/dk/')) { res.writeHead(404); return res.end(); }
    const bad = authorize(req); if (bad) return send(res, bad.code, { ok: false, error: bad.msg });
    const what = p.slice(8);
    if (what === 'state') { if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Chỉ GET' }); return send(res, 200, state()); }
    if (!['set', 'action'].includes(what)) return send(res, 404, { ok: false, error: 'Không có' });
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Chỉ POST' });
    if (req.headers['x-dk'] !== '1' || !sameOrigin(req)) return send(res, 403, { ok: false, error: 'Yêu cầu không từ trang điều khiển' });
    let body = ''; req.on('data', d => { body += d; if (body.length > 8192) req.destroy(); });
    req.on('end', () => {
      let j; try { j = JSON.parse(body || '{}'); } catch { return send(res, 400, { ok: false, error: 'Dữ liệu hỏng' }); }
      try { const out = what === 'set' ? set(j) : action(j); send(res, out.ok === false ? 400 : 200, out); } catch (e) { console.log('[dieu-khien] lỗi:', e.message); send(res, 500, { ok: false, error: 'Lỗi máy chủ' }); }
    });
  }
  return { handle, authorize, isLocal, state, set, action, resetDefaults, overrides };
}

// khởi động: đọc data/dieu-khien.json rồi ghi đè lên config.lopHoc (gọi TRƯỚC khi tạo phòng); trả về bản chụp config gốc để "Về mặc định"
function applyStartup(cfg) {
  cfg.lopHoc = cfg.lopHoc || {}; const base = { ...cfg.lopHoc }, d = store.load(KEY); let n = 0;
  for (const [k, v] of Object.entries((d && d.values) || {})) { const c = check(k, v); if (c.ok) { cfg.lopHoc[k] = c.value; n++; } }
  if (n) console.log(`[dieu-khien] áp dụng ${n} mục sếp đã chỉnh từ bảng điều khiển`);
  return base;
}
module.exports = { createPanel, applyStartup, SCHEMA, check };
