// Thử số người chọn từng đáp án + dải chữ rủ bạn bè: node tools/test-so-chon.js (~20 giây)
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-sochon-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), log = [];
V.VoiceQueue.prototype.push = function (kind, text) { log.push({ kind, text: String(text), t: Date.now() }); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), { SHARE } = require(path.join(lib, 'lop-hoc', 'meo-hoc')), errs = [], ok = (c, m) => { if (!c) errs.push(m); }, sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = (name, lop) => { const r = new Room(name, { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0, readJoins: false }, lopHoc: { jokeSec: 0, idleSec: 0, triAn: false, ...lop } }, null); r.live = true; r.clients.add({ readyState: 1, send() {} }); return r; };
const U = i => ({ id: 'u' + i, name: 'Bạn' + String.fromCharCode(65 + (i % 26)) + i }), words = s => s.trim().split(/\s+/).length;
(async () => {
  const r = mk('sochon', {}), msgs = []; const bc = r.broadcast.bind(r); r.broadcast = m => { msgs.push(m); return bc(m); };
  const tok = ++r.tok; for (let i = 1; i <= 10; i++) r.onJoin(U(i)); msgs.length = 0;
  const p = r.ask({ type: 'abcd', text: 'Hai cộng hai bằng mấy?', opts: ['3', '4', '5', '6'], ans: 1, tag: 'Thử' }, tok, 1, 1, { quick: true });
  await sleep(150); ok(r.q && Array.isArray(r.qView().dist) && r.qView().dist.length === 4, 'qView phải có dist cho câu A/B/C/D');
  const ans = (i, t) => r.onChat(U(i), t);
  ans(1, 'b'); ans(2, 'B'); ans(3, 'a'); ans(4, 'C'); ans(5, 'd'); ans(1, 'a'); ans(6, 'xin chào');      // bạn 1 đổi ý: giữ luật hiện có (phiếu đầu), bạn 6 chat thường không tính
  await sleep(1000); const qd = msgs.filter(m => m.t === 'qd');
  ok(qd.length >= 1 && qd.length <= 3, 'gom cập nhật ~400ms: số tin qd = ' + qd.length);
  const last = qd[qd.length - 1]; ok(last && last.dist.join() === '1,2,1,1' && last.n === 5, 'số phiếu từng đáp án sai: ' + JSON.stringify(last));
  const n0 = msgs.filter(m => m.t === 'qd').length; await sleep(900); ok(msgs.filter(m => m.t === 'qd').length === n0, 'không đổi mà vẫn gửi qd');
  await p; const qe = msgs.find(m => m.t === 'qend'); ok(qe && qe.dist.join() === '1,2,1,1' && qe.ans === 1 && qe.right === 2, 'qend: ' + JSON.stringify(qe && { d: qe.dist, a: qe.ans, r: qe.right }));
  ok(!log.some(l => /bạn đã chọn|phiếu/.test(l.text)), 'không được thêm lượt đọc giọng cho số phiếu');
  // câu đáp số: không có dist
  msgs.length = 0; const tok2 = ++r.tok; const p2 = r.ask({ type: 'num', text: '3 + 4 = ?', ans: 7, tag: 'Toán' }, tok2, 1, 1, { quick: true }); await sleep(150);
  ok(r.qView() && r.qView().dist === null, 'câu số không có dist'); r.onChat(U(1), '7'); await sleep(900); ok(!msgs.some(m => m.t === 'qd' && m.dist), 'câu số không gửi dist'); r.q.done = true; await p2;
  // dải chia sẻ (thử 1 giây) + câu rủ bạn
  const s = mk('strip', { shareStripSec: 1 }), sm = []; const sb = s.broadcast.bind(s); s.broadcast = m => { sm.push(m); return sb(m); };
  await sleep(3600); const st = sm.filter(m => m.t === 'strip'); ok(st.length >= 2 && st.every((m, i) => SHARE.includes(m.text) && m.ms >= 8000 && m.ms <= 10000 && (i === 0 || m.text !== st[i - 1].text)), 'dải chia sẻ: ' + JSON.stringify(st.map(m => m.text)));
 
  const BADS = /quà|điểm|\bxu\b|tiền|link|zalo|bio|inbox|điện thoại|nhận|tặng|thưởng|miễn phí|đảm bảo|\d{4}/i;
  ok(SHARE.length >= 6, 'cần ≥ 6 câu rủ bạn'); for (const t of SHARE) { ok(words(t) <= 12, 'câu rủ bạn dài: ' + t); ok(!BADS.test(t), 'câu rủ bạn có chữ cấm: ' + t); ok(!/'/.test(t), 'dấu nháy'); }
  // giọng: tối đa 1 lần / 5 phút trong vòng lấp chỗ trống
  const f = mk('fill', {}); let c = 0; for (let i = 0; i < 400; i++) { const t = f.fillText(); if (SHARE.includes(t)) c++; } ok(c === 1, 'giọng rủ bạn phải ≤ 1 lần / 5 phút (400 lượt lấp chỉ có ' + c + ')');
  f.shareVoiceAt = Date.now() - 301000; let c2 = 0; for (let i = 0; i < 400 && !c2; i++) { if (SHARE.includes(f.fillText())) c2++; } ok(c2 === 1, 'sau 5 phút giọng rủ bạn phải có lại');
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: số người chọn từng đáp án (gom 400ms, đúng phiếu đầu, qend, câu số không có), dải chia sẻ xoay vòng, giọng rủ bạn ≤ 1 lần / 5 phút, không quà / điểm / link'); process.exit(errs.length ? 1 : 0);
})();
