// Thử bản 2.2 "kêu gọi chia sẻ": node tools/test-chia-se.js (~20 giây)
// cảm ơn gọi tên (gộp ≤ 3 tên, ≤ 1 câu / khoảng shareThanksSec, lọc tên thô) · bộ đếm lượt rủ bạn theo ngày (lưu, qua restart) · đuôi rủ bạn ghép vào mở tiết điểm danh + tổng kết (không thêm lượt)
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-chiase-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), log = [];
V.VoiceQueue.prototype.push = function (kind, text) { log.push({ kind, text: String(text), t: Date.now() }); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), { SHARE_TAIL, THANK_SHARE, THANK_ANON } = require(path.join(lib, 'lop-hoc', 'meo-hoc')), errs = [], ok = (c, m) => { if (!c) errs.push(m); }, sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = (name, lop) => { const r = new Room(name, { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0, readJoins: false }, lopHoc: { jokeSec: 0, idleSec: 0, triAn: false, ...lop } }, null); r.live = true; r.clients.add({ readyState: 1, send() {} }); return r; };
const U = (i, name) => ({ id: 'u' + i, name: name || 'Bé' + String.fromCharCode(65 + (i % 26)) + i }), words = s => s.trim().split(/\s+/).length;
const BADS = /quà|điểm|\bxu\b|tiền|link|zalo|bio|inbox|điện thoại|nhận|tặng|thưởng|miễn phí|đảm bảo|\d{4}/i, isThanks = l => /rủ bạn vào lớp|chia sẻ lớp/.test(l.text);
(async () => {
  // ---- cảm ơn gọi tên + bộ đếm ----
  const r = mk('chiase', { shareThanksSec: 4 }), msgs = []; const bc = r.broadcast.bind(r); r.broadcast = m => { msgs.push(m); return bc(m); };
  for (let i = 1; i <= 6; i++) r.onJoin(U(i)); log.length = 0; msgs.length = 0;
  for (let i = 1; i <= 5; i++) r.onShare(U(i));                      // 5 bạn chia sẻ cùng lúc
  const sh = msgs.filter(m => m.t === 'share'); ok(sh.length === 5 && sh.every((m, i) => m.who && m.day === i + 1), 'tin share phải có who + day tăng dần: ' + JSON.stringify(sh.map(m => [m.who, m.day])));
  ok(r.shareToday().n === 5 && r.snapshot().sd === 5, 'bộ đếm hôm nay = 5 và có trong snapshot');
  await sleep(3200);
  let th = log.filter(isThanks); ok(th.length === 1, 'gộp 5 người thành 1 câu cảm ơn: ' + JSON.stringify(th.map(l => l.text)));
  ok(th[0] && /và các bạn khác/.test(th[0].text) && (th[0].text.match(/Bé[A-Z]/g) || []).length === 3, 'gọi tối đa 3 tên + "và các bạn khác": ' + (th[0] && th[0].text));
  ok(th[0] && !BADS.test(th[0].text), 'câu cảm ơn không chữ cấm');
  // thêm người ngay sau đó: phải chờ đủ shareThanksSec
  r.onShare(U(7)); await sleep(2000); ok(log.filter(isThanks).length === 1, 'chưa đủ khoảng cách thì không đọc thêm');
  await sleep(3800); th = log.filter(isThanks); ok(th.length === 2 && /BéH/.test(th[1].text), 'đủ khoảng cách thì cảm ơn người sau: ' + JSON.stringify(th.map(l => l.text)));
  ok(th[1] && th[1].t - th[0].t >= 3800, 'giãn cách ≥ shareThanksSec');
  { const u = r.users.get('u1'); ok(u && u.sao === 0, 'chia sẻ không tặng sao / huy hiệu'); }
  // tên thô / mặc định: vẫn đếm, hiện "Một bạn", không đọc tên
  const r2 = mk('chiase2', { shareThanksSec: 1 }), m2 = []; const b2 = r2.broadcast.bind(r2); r2.broadcast = m => { m2.push(m); return b2(m); }; log.length = 0;
  r2.onShare({ id: 'x1', name: 'Bạn nhỏ' }); r2.onShare({ id: 'x2', name: 'địt mẹ' }); await sleep(3200);
  const s2 = m2.filter(m => m.t === 'share'); ok(s2.length === 2 && s2.every(m => m.who === 'Một bạn') && r2.shareToday().n === 2, 'tên mặc định / thô hiện "Một bạn" nhưng vẫn đếm: ' + JSON.stringify(s2.map(m => m.who)));
  const t2 = log.filter(isThanks); ok(t2.length === 1 && THANK_ANON.includes(t2[0].text), 'không có tên sạch: dùng câu cảm ơn chung: ' + JSON.stringify(t2.map(l => l.text)));
  ok(THANK_SHARE.every(t => t.includes('{who}') && !BADS.test(t) && words(t) <= 12) && THANK_ANON.every(t => !BADS.test(t) && words(t) <= 12), 'mẫu cảm ơn hợp lệ');
  // ---- bộ đếm lưu theo ngày, qua khởi động lại ----
  r.flush(); const r3 = new Room('chiase', { voice: { enabled: false, engine: 'none' }, lopHoc: { jokeSec: 0, idleSec: 0 } }, null); ok(r3.shareToday().n === 6, 'nạp lại sau khởi động: ' + r3.shareToday().n);
  r3.shareDay.day = '2000-01-01'; ok(r3.shareToday().n === 0, 'sang ngày mới thì đếm lại từ 0');
  // ---- đuôi rủ bạn ----
  const q = mk('tail', {}); const seen = []; for (let i = 0; i < 18; i++) seen.push(q.shareTail());
  ok(new Set(seen).size === SHARE_TAIL.length && seen.every((s, i) => !i || s !== seen[i - 1]), 'đuôi xoay vòng đủ ' + SHARE_TAIL.length + ' câu, không lặp liền');
  ok(SHARE_TAIL.length >= 6 && SHARE_TAIL.every(t => words(t) <= 8 && !BADS.test(t) && !/'/.test(t)), 'đuôi ≤ 8 từ, không chữ cấm');
  { const p = mk('tail2', { speed: 100 }); for (let i = 1; i <= 3; i++) p.onJoin(U(i)); const says = []; p.say = (t) => says.push(t);
    await p.play(0, ++p.tok); ok(says.length === 1 && SHARE_TAIL.some(t => says[0].endsWith(t)), 'câu mở tiết điểm danh có đuôi và chỉ 1 lượt: ' + JSON.stringify(says));
    says.length = 0; p.sess.clear(); p.sess.set('u1', 9); p.sess.set('u2', 8); p.sess.set('u3', 7); p.tps = [0, 0, 0, 0]; await p.play(6, ++p.tok);
    ok(says.length === 2 && /Hạng nhất/.test(says[1]) && SHARE_TAIL.some(t => says[1].endsWith(t)), 'tổng kết (câu mở + câu top 3) có đuôi ở câu cuối, không thêm lượt: ' + JSON.stringify(says));
    says.length = 0; p.tps = [0, 9, 0, 0]; await p.play(6, ++p.tok); ok(says.length === 3 && /Tổ 2 dẫn đầu/.test(says[2]) && SHARE_TAIL.some(t => says[2].endsWith(t)) && !SHARE_TAIL.some(t => says[1].endsWith(t)), 'có tổ dẫn đầu: đuôi gắn vào câu cuối, không lặp hai đuôi: ' + JSON.stringify(says));
    p.B.shareTail = false; says.length = 0; await p.play(0, ++p.tok); ok(says.length === 1 && !SHARE_TAIL.some(t => says[0].includes(t)), 'shareTail:false tắt đuôi'); }
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: bản 2.2 kêu gọi chia sẻ (cảm ơn gọi tên gộp ≤ 3 tên, giãn cách, lọc tên thô, bộ đếm lưu theo ngày, đuôi rủ bạn ghép vào điểm danh + tổng kết không thêm lượt, không quà / điểm / link)'); process.exit(errs.length ? 1 : 0);
})();
