// Thử số người chọn từng đáp án + dải chữ rủ bạn bè: node tools/test-so-chon.js (~20 giây)
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-sochon-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), log = [];
V.VoiceQueue.prototype.push = function (kind, text) { log.push({ kind, text: String(text), t: Date.now() }); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), { SHARE, GOAL, GOAL_VOICE } = require(path.join(lib, 'lop-hoc', 'meo-hoc')), errs = [], ok = (c, m) => { if (!c) errs.push(m); }, sleep = ms => new Promise(r => setTimeout(r, ms));
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
  const BADS = /quà|điểm|\bxu\b|tiền|link|zalo|bio|inbox|điện thoại|nhận|tặng|thưởng|miễn phí|đảm bảo|\d{4}/i;
  // dải chia sẻ (thử 1 giây) + câu rủ bạn
  const s = mk('strip', { shareStripSec: 1, shareTarget: 0 }), sm = []; const sb = s.broadcast.bind(s); s.broadcast = m => { sm.push(m); return sb(m); };
  await sleep(3600); const st = sm.filter(m => m.t === 'strip'); ok(st.length >= 2 && st.every((m, i) => SHARE.includes(m.text) && m.ms >= 8000 && m.ms <= 10000 && (i === 0 || m.text !== st[i - 1].text)), 'dải chia sẻ: ' + JSON.stringify(st.map(m => m.text)));
 
  // lớp < 100 bạn: dải dày hơn (shareStripLowSec) + câu mục tiêu có số bạn hiện có; ≥ 100 bạn: về nhịp cũ, không có câu mục tiêu
  { const lo = mk('lo', { shareStripSec: 2, shareStripLowSec: 1 }); lo.viewers = 37; const lm = []; const lb = lo.broadcast.bind(lo); lo.broadcast = m => { lm.push(m); return lb(m); };
    const hi = mk('hi', { shareStripSec: 2, shareStripLowSec: 1 }); hi.viewers = 150; const hm = []; const hb = hi.broadcast.bind(hi); hi.broadcast = m => { hm.push(m); return hb(m); };
    await sleep(4300); const ls = lm.filter(m => m.t === 'strip'), hs = hm.filter(m => m.t === 'strip');
    ok(ls.length >= 3 && ls.length > hs.length, 'lớp < 100 dải phải dày hơn: ' + ls.length + ' so với ' + hs.length);
    ok(ls.some(m => /37/.test(m.text) && /100/.test(m.text)), 'có câu mục tiêu kèm số bạn hiện có: ' + JSON.stringify(ls.map(m => m.text)));
    ok(ls.some(m => SHARE.includes(m.text)) && ls.every((m, i) => i === 0 || m.text !== ls[i - 1].text), 'xen câu rủ thường, không lặp liền');
    ok(hs.length >= 1 && hs.every(m => SHARE.includes(m.text)), '≥ 100 bạn: không có câu mục tiêu: ' + JSON.stringify(hs.map(m => m.text)));
    ok(lo.crowdSize() === 37 && hi.crowdSize() === 150, 'crowdSize lấy viewers');
    lo.viewers = 0; ok(lo.crowdSize() === lo.fewNow(), 'không có viewers thì lấy số bạn hoạt động 5 phút');
    const G = []; for (const g of GOAL) for (const [n, need] of [[1, 99], [37, 63], [99, 1]]) G.push(g.replace('{n}', n).replace('{t}', 100).replace('{need}', need));
    for (const g of G) { ok(words(g) <= 14, 'câu mục tiêu dài: ' + g); ok(!BADS.test(g), 'câu mục tiêu có chữ cấm: ' + g); ok(!/'/.test(g), 'dấu nháy mục tiêu'); }
    for (const g of GOAL_VOICE) { ok(words(g) <= 15, 'giọng mục tiêu dài: ' + g); ok(!BADS.test(g) && !/d/.test(g), 'giọng mục tiêu có chữ cấm / số: ' + g); }
  }
  ok(SHARE.length >= 6, 'cần ≥ 6 câu rủ bạn'); for (const t of SHARE) { ok(words(t) <= 12, 'câu rủ bạn dài: ' + t); ok(!BADS.test(t), 'câu rủ bạn có chữ cấm: ' + t); ok(!/'/.test(t), 'dấu nháy'); }
  // giọng: lớp < 100 bạn tối đa 1 lần / 3 phút, đủ 100 bạn 1 lần / 5 phút, trong vòng lấp chỗ trống
  const ALL = SHARE.concat(GOAL_VOICE), cnt = (r) => { let c = 0; for (let i = 0; i < 400; i++) if (ALL.includes(r.fillText())) c++; return c; };
  const f = mk('fill', {}); ok(cnt(f) === 1, 'lớp < 100: giọng rủ bạn phải ≤ 1 lần / 3 phút');
  f.shareVoiceAt = Date.now() - 170000; ok(cnt(f) === 0, 'lớp < 100: chưa đủ 3 phút thì không rủ lại');
  f.shareVoiceAt = Date.now() - 181000; let c2 = 0; for (let i = 0; i < 400 && !c2; i++) { if (ALL.includes(f.fillText())) c2++; } ok(c2 === 1, 'lớp < 100: sau 3 phút giọng rủ bạn phải có lại');
  const h = mk('fillhi', {}); h.viewers = 150; ok(cnt(h) === 1 && !GOAL_VOICE.some(g => { h.shareVoiceAt = 0; for (let i = 0; i < 400; i++) if (h.fillText() === g) return true; return false; }), 'lớp ≥ 100: giọng rủ ≤ 1 lần / 5 phút và không dùng câu mục tiêu');
  h.shareVoiceAt = Date.now() - 200000; ok(cnt(h) === 0, 'lớp ≥ 100: 3 phút chưa đủ');
  h.shareVoiceAt = Date.now() - 301000; let c3 = 0; for (let i = 0; i < 400 && !c3; i++) { if (SHARE.includes(h.fillText())) c3++; } ok(c3 === 1, 'lớp ≥ 100: sau 5 phút giọng rủ bạn phải có lại');
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: số người chọn từng đáp án (gom 400ms, đúng phiếu đầu, qend, câu số không có), dải chia sẻ xoay vòng, giọng rủ bạn ≤ 1 lần / 5 phút, không quà / điểm / link'); process.exit(errs.length ? 1 : 0);
})();
