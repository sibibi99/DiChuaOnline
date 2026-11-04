// Kiểm kho câu hỏi Lớp Học Vui: node tools/test-cau-hoi.js
// - đố vui: đủ 4 đáp án khác nhau, độ khó 1-3, chủ đề hợp lệ, không trùng đề, không chữ nhạy cảm, độ dài hợp lý
// - chính tả: từ đúng khác từ sai, không trùng từ, từ sai không phải là từ đúng của cặp khác
// Thoát mã 1 nếu có lỗi.
const { DOVUI, CHINHTA, TRUYEN } = require('../lib/lop-hoc/cau-hoi');
const MIN_DOVUI = +(process.env.MIN_DOVUI || 800), MIN_CHINHTA = +(process.env.MIN_CHINHTA || 250);
const TOPICS = ['vn', 'vh', 'tg', 'kh', 'dv', 'toan', 'tt', 'tv', 'me', 'en'];
const BAD = /đảng|chính trị|tổng thống|thủ tướng|chủ tịch|quốc kỳ|cờ đỏ|khăn quàng|phật|thiên chúa|chúa giê|nhà thờ|chùa|hồi giáo|tôn giáo|thần linh|cúng|xổ số|cá cược|cá độ|cờ bạc|lô đề|hoàng sa|trường sa|biển đông|chiến tranh|giết|súng|sex|khiêu dâm/i;
const norm = s => String(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const errs = [], warns = [];
const err = (m) => { errs.push(m); };

// ---- đố vui ----
const seenQ = new Map(), perTopic = {}, perDiff = { 1: 0, 2: 0, 3: 0 };
DOVUI.forEach((r, i) => {
  const tag = `DOVUI[${i}] "${String(r[0]).slice(0, 50)}"`;
  if (!Array.isArray(r) || r.length < 4) return err(`${tag}: sai cấu trúc`);
  const [q, a, d, tp] = r;
  if (typeof q !== 'string' || q.length < 8 || q.length > 140) err(`${tag}: độ dài câu hỏi ${String(q).length}`);
  if (!Array.isArray(a) || a.length !== 4) return err(`${tag}: cần đúng 4 đáp án`);
  if (a.some(t => typeof t !== 'string' || !t.trim())) err(`${tag}: đáp án rỗng`);
  if (new Set(a.map(t => String(t).trim().toLowerCase())).size !== 4) err(`${tag}: có đáp án trùng nhau`);
  if (a.some(t => t.length > 34)) err(`${tag}: đáp án quá dài (${a.find(t => t.length > 34)})`);
  if (![1, 2, 3].includes(d)) err(`${tag}: độ khó ${d}`);
  if (!TOPICS.includes(tp)) err(`${tag}: chủ đề ${tp}`);
  const all = q + ' | ' + a.join(' | '); if (BAD.test(all)) err(`${tag}: có chữ nhạy cảm (${(BAD.exec(all) || [])[0]})`);
  if (/'/.test(all)) err(`${tag}: có dấu nháy đơn`);
  const k = norm(q); if (seenQ.has(k)) err(`${tag}: trùng đề với DOVUI[${seenQ.get(k)}]`); else seenQ.set(k, i);
  if (a[0] && norm(q).includes(norm(a[0])) && norm(a[0]).length > 5 && !a.slice(1).some(w => norm(q).includes(norm(w)))) warns.push(`${tag}: câu hỏi nhắc lại đáp án đúng (câu đố mẹo thì chấp nhận được)`);
  perTopic[tp] = (perTopic[tp] || 0) + 1; if (perDiff[d] != null) perDiff[d]++;
});
if (DOVUI.length < MIN_DOVUI) err(`kho đố vui chỉ có ${DOVUI.length} < ${MIN_DOVUI}`);
for (const t of TOPICS) if ((perTopic[t] || 0) < Math.floor(MIN_DOVUI / 16)) err(`chủ đề ${t} chỉ có ${perTopic[t] || 0} câu`);

// ---- chính tả ----
const seenC = new Map(), rights = new Set(CHINHTA.map(r => norm(r[0])));
CHINHTA.forEach((r, i) => {
  const tag = `CHINHTA[${i}] "${r[0]}"`;
  if (!Array.isArray(r) || r.length < 3) return err(`${tag}: sai cấu trúc`);
  const [ok, bad, d] = r;
  if (typeof ok !== 'string' || typeof bad !== 'string' || !ok.trim() || !bad.trim()) return err(`${tag}: rỗng`);
  if (norm(ok) === norm(bad) || ok === bad) err(`${tag}: từ đúng giống từ sai`);
  if (![1, 2, 3].includes(d)) err(`${tag}: độ khó ${d}`);
  if (/\d/.test(ok + bad) || /'/.test(ok + bad)) err(`${tag}: có số hoặc dấu nháy`);
  if (ok.length > 24 || bad.length > 24) err(`${tag}: quá dài`);
  if (BAD.test(ok)) err(`${tag}: chữ nhạy cảm`);
  const k = norm(ok); if (seenC.has(k)) err(`${tag}: trùng từ đúng với CHINHTA[${seenC.get(k)}]`); else seenC.set(k, i);
  if (rights.has(norm(bad))) err(`${tag}: từ sai "${bad}" lại là từ đúng của một cặp khác`);
});
if (CHINHTA.length < MIN_CHINHTA) err(`kho chính tả chỉ có ${CHINHTA.length} < ${MIN_CHINHTA}`);

// ---- truyện ----
TRUYEN.forEach((t, i) => { if (!t[0] || !Array.isArray(t[1]) || t[1].length < 2 || BAD.test(t[0] + t[1].join(' '))) err(`TRUYEN[${i}] "${t[0]}": lỗi`); });

// ---- chọn câu: chưa hỏi trước; hết kho thì câu cũ >= 7 ngày (lâu nhất trước); không còn thì câu lâu nhất ----
{ const { Room } = require('../lib/lop-hoc/room'), pick = Room.prototype.pickRow, DAY = 86400000, now = Date.now();
  const mk = () => ({ dT: { dv: 2 }, effDiff: r => r[2], themes: () => null, saveUsedSoon() {}, qstat: new Map() });
  const bank = [0, 1, 2, 3, 4, 5].map(i => ['q' + i, ['a', 'b', 'c', 'd'], 2, 'vn']);
  let used = new Map([['q0', now - 100], ['q1', now - 100]]);                               // còn câu chưa hỏi → phải chọn q2..q5
  for (let i = 0; i < 40; i++) { const r = pick.call(mk(), bank, new Map(used), 'dv'); if (['q0', 'q1'].includes(r[0])) { err('chọn lại câu vừa hỏi khi còn câu chưa hỏi'); break; } }
  used = new Map(bank.map((r, i) => [r[0], i < 2 ? now - 9 * DAY : now - 1000]));            // hết kho: chỉ q0,q1 đã quá 7 ngày
  for (let i = 0; i < 40; i++) { const r = pick.call(mk(), bank, new Map(used), 'dv'); if (!['q0', 'q1'].includes(r[0])) { err('hết kho nhưng không ưu tiên câu cũ quá 7 ngày'); break; } }
  used = new Map(bank.map((r, i) => [r[0], now - 1000 * (10 - i)]));                         // tất cả mới hỏi: nhóm lâu nhất (q0..) được chọn, không lấy q5 (mới nhất)
  for (let i = 0; i < 40; i++) { const r = pick.call(mk(), bank, new Map(used), 'dv'); if (r[0] === 'q5') { err('lấy câu mới hỏi nhất khi hết kho'); break; } } }
console.log(`đố vui: ${DOVUI.length} câu · khó 1/2/3: ${perDiff[1]}/${perDiff[2]}/${perDiff[3]} · theo chủ đề: ${TOPICS.map(t => t + ' ' + (perTopic[t] || 0)).join(', ')}`);
if (warns.length) console.log(`(${warns.length} cảnh báo: ${warns.slice(0, 5).map(w => w.slice(0, 70)).join(' ; ')}${warns.length > 5 ? ' …' : ''})`);
console.log(`chính tả: ${CHINHTA.length} cặp · truyện: ${TRUYEN.length}`);
if (errs.length) { console.log(`\n${errs.length} LỖI:`); errs.slice(0, 60).forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('OK: kho câu hỏi hợp lệ');
