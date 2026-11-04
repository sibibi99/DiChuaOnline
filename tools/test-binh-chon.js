// Thử bình chọn chủ đề + trình độ: node tools/test-binh-chon.js
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-vote-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), voice = [];
V.VoiceQueue.prototype.push = function (kind, text) { voice.push(String(text)); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), { DOVUI } = require(path.join(lib, 'lop-hoc', 'cau-hoi'));
const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = (name, lop) => { const r = new Room(name, { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0 }, lopHoc: { speed: 20, jokeSec: 0, idleSec: 0, ...lop } }, null); r.live = true; r.clients.add({ readyState: 1, send() {} }); r.tok++; return r; };
const msgs = []; const U = i => ({ id: 'u' + i, name: 'Bạn ' + i });
(async () => {
  const r = mk('v', {}); const bc = r.broadcast.bind(r); r.broadcast = m => { msgs.push(m); bc(m); }; for (let i = 1; i <= 12; i++) r.onJoin(U(i));
  ok(r.voteOn(), 'lớp đủ người phải bật bình chọn');
  voice.length = 0; const tok = r.tok, p = r.runVote(tok); await sleep(100);
  const opts = r.vote.opts; ok(opts.length === 4 && new Set(opts).size === 4, 'phải có 4 chủ đề khác nhau: ' + opts);
  const target = opts[2];
  [1, 2, 3, 4, 5].forEach(i => r.onChat(U(i), '3')); r.onChat(U(6), '1'); r.onChat(U(7), '4'); r.onChat(U(1), '1'); r.onChat(U(1), '3');        // u1 đổi ý rồi đổi lại: chỉ tính 1 phiếu
  ['khó', 'KHÓ', 'kho', 'Khó'].forEach((t, i) => r.onChat(U(i + 1), t)); r.onChat(U(5), 'vừa'); r.onChat(U(8), 'de'); r.onChat(U(9), 'xin chào cô'); r.onChat(U(9), '9');
  ok(r.tally().tc[2] === 5 && r.tally().tc[0] === 1 && r.tally().tc[3] === 1, 'đếm phiếu chủ đề sai: ' + JSON.stringify(r.tally())); ok(r.tally().lc[2] === 4 && r.tally().lc[1] === 1 && r.tally().lc[0] === 1, 'đếm phiếu trình độ sai: ' + JSON.stringify(r.tally()));
  await p; ok(r.pref && r.pref.topic === target && r.pref.level === 3, 'kết quả bình chọn sai: ' + JSON.stringify(r.pref) + ' mong ' + target);
  ok(voice.every(v => !/^[1-4]$|khó|vừa/.test(v)), 'phiếu bình chọn bị đọc thành bình luận: ' + voice.join(' | ')); ok(msgs.some(m => m.t === 'vote' && m.phase === 'res' && m.topic === target && m.level === 3), 'thiếu tin kết quả');
  // bộ câu hỏi theo bình chọn: đúng chủ đề, phần lớn đúng độ khó
  const rows = []; for (let i = 0; i < 6; i++) { const q = r.pickAbcd(); const row = DOVUI.find(x => x[0] === q.key); rows.push(row); }
  ok(rows.every(x => x[3] === target), 'câu hỏi không theo chủ đề đã chọn: ' + rows.map(x => x[3])); ok(rows.filter(x => x[2] === 3).length >= 4, 'câu hỏi không theo trình độ khó đã chọn: ' + rows.map(x => x[2]));
  r.pref = null; for (let i = 0; i < 12; i++) r.pickAbcd();   // bỏ bình chọn: lại chọn như thường
  // không ai bình chọn: cô chọn chủ đề của ngày, trình độ tự động
  const q = mk('v2', {}); for (let i = 1; i <= 5; i++) q.onJoin(U(i)); const p2 = q.runVote(q.tok); await sleep(100); const o2 = q.vote.opts.slice(); await p2; ok(q.pref && q.pref.topic === o2[0] && q.pref.level === null, 'không ai chọn: ' + JSON.stringify(q.pref));
  // giới hạn lopHoc.maxDiff: chỉ cho chọn mức dễ
  const m1 = mk('v3', { maxDiff: 1 }); for (let i = 1; i <= 5; i++) m1.onJoin(U(i)); const p3 = m1.runVote(m1.tok); await sleep(100); m1.onChat(U(1), 'khó'); m1.onChat(U(2), '2'); await p3;
  ok(m1.levelsAllowed().length === 1 && m1.pref.level === null && m1.tally && true, 'maxDiff=1: không được chọn mức khó');
  // lớp vắng: bỏ qua bình chọn
  const e = mk('v4', {}); e.onJoin(U(1)); ok(!e.voteOn(), 'lớp quá vắng không nên bình chọn'); const off = mk('v5', { voteSec: 0 }); for (let i = 1; i <= 8; i++) off.onJoin(U(i)); ok(!off.voteOn(), 'voteSec=0 phải tắt');
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: bình chọn chủ đề + trình độ (4 chủ đề, 1 phiếu / người, có/không dấu, kết quả áp vào bộ câu hỏi, không đọc thành bình luận, maxDiff, lớp vắng bỏ qua)'); process.exit(errs.length ? 1 : 0);
})();
