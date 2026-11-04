// Thử chào theo sĩ số + lấp chỗ trống: node tools/test-chao.js (mất ~45 giây)
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-chao-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), log = [];
V.VoiceQueue.prototype.push = function (kind, text) { log.push({ kind, text: String(text), t: Date.now() }); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), errs = [], ok = (c, m) => { if (!c) errs.push(m); }, sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = (name, lop) => { const r = new Room(name, { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0, readJoins: true }, lopHoc: { jokeSec: 0, ...lop } }, null); r.live = true; r.clients.add({ readyState: 1, send() {} }); r.tok++; return r; };
const words = s => s.trim().split(/\s+/).length, U = (i, n) => ({ id: 'u' + i, name: n });
(async () => {
  // ---- lớp vắng: chào gọi tên, gộp, nhịp 8 giây ----
  const a = mk('few', { idleSec: 0 }); log.length = 0;
  a.onJoin(U(1, 'Lan')); await sleep(2300); const g1 = log.filter(l => l.kind === 'join');
  ok(g1.length === 1 && /Lan/.test(g1[0].text) && words(g1[0].text) <= 10, 'chào 1 người: ' + JSON.stringify(g1.map(l => l.text)));
  const t1 = g1[0] && g1[0].t; a.onJoin(U(2, 'Minh')); a.onJoin(U(3, 'Hoa')); a.onJoin(U(4, 'Nam')); a.onJoin(U(5, 'Đức')); a.onJoin(U(6, 'ỉa chảy')); a.onJoin(U(1, 'Lan'));   // Lan vào lại: không chào lại
  await sleep(3000); ok(log.filter(l => l.kind === 'join').length === 1, 'chào quá sớm (< 8 giây): ' + JSON.stringify(log.map(l => l.text)));
  await sleep(4500); const g2 = log.filter(l => l.kind === 'join');
  ok(g2.length === 2 && /Minh/.test(g2[1].text) && /bạn nữa|và/.test(g2[1].text) && !/ỉa/.test(g2[1].text), 'gộp tên: ' + JSON.stringify(g2.map(l => l.text)));
  ok(g2[1] && g2[1].t - t1 >= 7500, 'giãn cách chào < 8 giây: ' + (g2[1] && g2[1].t - t1));
  a.onJoin(U(7, 'ỉa thối')); await sleep(9500); const g3 = log.filter(l => l.kind === 'join'); ok(g3.length === 3 && !/ỉa|thối/.test(g3[2].text) && /Chào bạn mới/.test(g3[2].text), 'tên thô không được gọi tên: ' + (g3[2] && g3[2].text));
  // ---- lớp đông: không chào ----
  const b = mk('crowd', { idleSec: 0 }); for (let i = 1; i <= 15; i++) b.onJoin(U(100 + i, 'Học sinh ' + i)); log.length = 0;
  b.onJoin(U(200, 'Bạn mới')); await sleep(2500); ok(log.filter(l => l.kind === 'join').length === 0, 'lớp đông vẫn chào: ' + JSON.stringify(log.map(l => l.text)));
  // ---- lấp chỗ trống: vắng 20s (thử 1.2s) / đông 45s (thử 3s), xoay vòng, không chen câu hỏi ----
  const c = mk('idle', { idleSec: 1.2, idleBusySec: 3, fewMax: 12 }); c.onJoin(U(300, 'An')); await sleep(2200); log.length = 0; const t0 = Date.now();
  await sleep(12000); const f = log.filter(l => l.kind === 'talk'); ok(f.length >= 3, 'lớp vắng: lấp chỗ trống ít quá: ' + f.length);
  ok(f.every((x, i) => i === 0 || x.text !== f[i - 1].text), 'lấp chỗ trống lặp liền nhau: ' + f.map(x => x.text).join(' | ')); ok(f.every(x => words(x.text) <= 14 || /^Đố miệng/.test(x.text)), 'câu lấp quá dài');
  ok(f.every(x => !/quà|tiền|xu\b/i.test(x.text)), 'câu lấp nhắc quà / tiền');
  c.q = { done: false }; await sleep(3500); const n1 = log.filter(l => l.kind === 'talk').length; await sleep(3500); ok(log.filter(l => l.kind === 'talk').length === n1, 'chen vào lúc đang có câu hỏi mở'); c.q = null;
  c.game = { on: true }; await sleep(3500); ok(log.filter(l => l.kind === 'talk').length === n1, 'chen vào lúc đang chơi trò'); c.game = null;
  c.B.idleSec = 0;      // tắt phòng c để không lẫn vào nhật ký
  const d = mk('idle2', { idleSec: 1.2, idleBusySec: 3.2, fewMax: 12 }); for (let i = 1; i <= 15; i++) d.onJoin(U(400 + i, 'Hs ' + i)); await sleep(1500); log.length = 0; d.lastBusy = d.lastVoice = Date.now();
  await sleep(2600); ok(log.filter(l => l.kind === 'talk').length === 0, 'lớp đông lấp quá sớm (cần giãn): ' + log.length);
  await sleep(4200); ok(log.filter(l => l.kind === 'talk').length >= 1, 'lớp đông phải có lấp chỗ trống sau khoảng giãn');
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: chào theo sĩ số (vắng chào / đông không / gộp tên / 8 giây / tên thô), lấp chỗ trống (xoay vòng, đông giãn, không chen câu hỏi và trò chơi)'); process.exit(errs.length ? 1 : 0);
})();
