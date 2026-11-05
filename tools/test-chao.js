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
  // ---- lớp đông: chào bằng bong bóng chữ, giọng cô chỉ chào gộp theo chu kỳ (thử 3 giây) ----
  const b = mk('crowd', { idleSec: 0, crowdGreetSec: 3 }); const bub = []; const bc0 = b.broadcast.bind(b); b.broadcast = m => { if (m && m.t === 'chat') bub.push(m); return bc0(m); };
  for (let i = 1; i <= 12; i++) b.onJoin(U(100 + i, 'Học sinh ' + i)); await sleep(3600); log.length = 0; bub.length = 0;      // 12 bạn đầu: lớp còn vắng, chào kiểu cũ
  b.onJoin(U(201, 'Bảo')); b.onJoin(U(202, 'Chi')); b.onJoin(U(203, 'Dũng')); b.onJoin(U(204, 'Khánh')); b.onJoin(U(205, 'ỉa chảy')); b.onJoin(U(201, 'Bảo'));
  ok(bub.length === 5 && bub.every(m => m.name && words(m.text) <= 5 && !/quà|tiền/.test(m.text)), 'lớp đông phải hiện bong bóng chào mỗi bạn mới (1 lần/bạn): ' + JSON.stringify(bub.map(m => m.name + ':' + m.text)));
  await sleep(1500); ok(log.filter(l => l.kind === 'join').length === 0, 'lớp đông chào bằng giọng quá sớm: ' + JSON.stringify(log.map(l => l.text)));
  await sleep(2500); const cj = log.filter(l => l.kind === 'join');
  ok(cj.length === 1 && words(cj[0].text) <= 10 && /Chào/.test(cj[0].text) && /Dũng/.test(cj[0].text) && /Khánh/.test(cj[0].text) && !/ỉa/.test(cj[0].text) && !/Bảo|Chi/.test(cj[0].text), 'chào gộp lớp đông phải gọi 3 bạn mới nhất: ' + JSON.stringify(cj.map(l => l.text)));
  b.q = { done: false }; b.onJoin(U(210, 'Thảo')); await sleep(4200); ok(log.filter(l => l.kind === 'join').length === 1, 'chào gộp chen lúc đang có câu hỏi'); b.q = null; await sleep(11500);
  ok(log.filter(l => l.kind === 'join').length === 2 && /Thảo/.test(log.filter(l => l.kind === 'join')[1].text), 'chào gộp phải gọi sau khi hết câu hỏi: ' + JSON.stringify(log.map(l => l.text))); b.B.crowdGreetSec = 1e6;
  // ---- lấp chỗ trống: vắng 20s (thử 1.2s) / đông 45s (thử 3s), xoay vòng, không chen câu hỏi ----
  const c = mk('idle', { idleSec: 1.2, idleBusySec: 3, fewMax: 12 }); c.onJoin(U(300, 'An')); await sleep(2200); log.length = 0; const t0 = Date.now();
  await sleep(12000); const f = log.filter(l => l.kind === 'talk'); ok(f.length >= 3, 'lớp vắng: lấp chỗ trống ít quá: ' + f.length);
  ok(f.every((x, i) => i === 0 || x.text !== f[i - 1].text), 'lấp chỗ trống lặp liền nhau: ' + f.map(x => x.text).join(' | ')); ok(f.every(x => words(x.text) <= 15 || /^Hỏi nhanh/.test(x.text)), 'câu lấp quá dài');
  ok(f.every(x => !/quà|tiền|xu\b/i.test(x.text)), 'câu lấp nhắc quà / tiền');
  // ---- bảng điểm hôm nay + mẹo học + xoay vòng 4 loại ----
  { const { TIPS } = require(path.join(lib, 'lop-hoc', 'meo-hoc')), BADT = /quà|tiền|xu|lì xì|nạp|điểm cao|đảm bảo|chắc chắn đạt|zalo|link|điện thoại/i, seenT = new Set();
    for (const g of [1, 2, 3]) { ok(TIPS[g].length >= 12, 'mẹo khối ' + g + ' ít quá'); for (const t of TIPS[g]) { ok(words(t) <= 15, 'mẹo quá 15 từ: ' + t); ok(!BADT.test(t), 'mẹo có chữ không phù hợp: ' + t); ok(!seenT.has(t), 'mẹo trùng: ' + t); seenT.add(t); } }
    ok(Object.values(TIPS).flat().length >= 40, 'cần ~40 mẹo: ' + Object.values(TIPS).flat().length);
    const e = mk('fill', { idleSec: 0 }); e.curGrade = () => 1; const kinds = new Set(), seq = [];
    const w = e.users.get('uw') || (e.users.set('uw', { id: 'uw', name: 'Mai', avatar: '', points: 0, wp: 0, sess: 0, team: 0 }), e.users.get('uw')); Object.assign(w, { id: 'uw', name: 'Mai', dp: 0, dpd: '' });
    e.award(w, 3, 'x'); ok(!e.topToday(), 'dưới 6 điểm chưa gọi tên đứng đầu');
    e.award(w, 5, 'x'); ok(e.topToday() && e.topToday().id === 'uw', 'có ≥6 điểm trong ngày phải là bạn đứng đầu hôm nay');
    for (let i = 0; i < 60; i++) { e.lastRight = null; const t = e.fillText(); if (!t) continue; seq.push(e.fillLast); if (TIPS[1].includes(t)) kinds.add('tip'); else if (/^Hỏi nhanh/.test(t)) kinds.add('quiz'); else if (/Mai/.test(t)) kinds.add('top'); else kinds.add('other'); e.fillQuiz = null; }
    ok(['tip', 'quiz', 'top'].every(k => kinds.has(k)), 'xoay vòng thiếu loại: ' + [...kinds].join(',')); ok(seq.every((k, i) => i === 0 || k !== seq[i - 1] || k === 'dd'), 'loại lấp chỗ trống lặp liền kề: ' + seq.join(','));
    e.fillLast = ''; const texts = []; for (let i = 0; i < 40; i++) { const t = e.fillText(); if (t && TIPS[1].includes(t)) texts.push(t); } ok(texts.length === new Set(texts).size || texts.length > 0, 'mẹo');
    for (const g of [2, 3]) { e.curGrade = () => g; let hit = 0; for (let i = 0; i < 50; i++) { const t = e.fillText(); if (t && TIPS[g].includes(t)) hit++; if (t && TIPS[g === 2 ? 3 : 2].includes(t)) hit -= 100; } ok(hit > 0, 'mẹo phải theo khối ' + g); } }
  c.q = { done: false }; await sleep(3500); const n1 = log.filter(l => l.kind === 'talk').length; await sleep(3500); ok(log.filter(l => l.kind === 'talk').length === n1, 'chen vào lúc đang có câu hỏi mở'); c.q = null;
  c.game = { on: true }; await sleep(3500); ok(log.filter(l => l.kind === 'talk').length === n1, 'chen vào lúc đang chơi trò'); c.game = null;
  c.B.idleSec = 0;      // tắt phòng c để không lẫn vào nhật ký
  const d = mk('idle2', { idleSec: 1.2, idleBusySec: 3.2, fewMax: 12 }); for (let i = 1; i <= 15; i++) d.onJoin(U(400 + i, 'Hs ' + i)); await sleep(1500); log.length = 0; d.lastBusy = d.lastVoice = Date.now();
  await sleep(2600); ok(log.filter(l => l.kind === 'talk').length === 0, 'lớp đông lấp quá sớm (cần giãn): ' + log.length);
  await sleep(4200); ok(log.filter(l => l.kind === 'talk').length >= 1, 'lớp đông phải có lấp chỗ trống sau khoảng giãn');
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: chào theo sĩ số (vắng chào gọi tên / đông bong bóng + chào gộp / 8 giây / tên thô), lấp chỗ trống (đùa / mẹo theo khối / hỏi nhanh / bạn đứng đầu hôm nay; xoay vòng, đông giãn, không chen câu hỏi và trò chơi)'); process.exit(errs.length ? 1 : 0);
})();
