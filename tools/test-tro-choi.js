// Thử 5 trò giờ ra chơi (không cần Voice Lab / trình duyệt): node tools/test-tro-choi.js
// Với từng trò: nhận lệnh (có dấu / không dấu), chống spam, điểm, giọng cô chỉ 1 câu mở + 1 câu kết (≤ 12 từ), lệnh không bị đọc thành bình luận.
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-trochoi-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), voice = [];
V.VoiceQueue.prototype.push = function (kind, text) { voice.push(String(text)); };
const Games = require(path.join(lib, 'lop-hoc', 'games')), { Room } = require(path.join(lib, 'lop-hoc', 'room'));
const room = new Room('t', { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0 }, lopHoc: { speed: 20, jokeSec: 0 } }, null);
room.live = true; room.clients.add({ readyState: 1, send() {} }); room.tok++;          // dừng vòng tiết, tự chạy trò
const msgs = []; const bc = room.broadcast.bind(room); room.broadcast = m => { msgs.push(m); bc(m); };
const U = i => ({ id: 'u' + i, name: 'Bạn ' + i }); for (let i = 1; i <= 30; i++) room.onJoin(U(i));
const say = (i, t) => room.onChat(U(i), t), until = async (f, ms = 8000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('hết giờ chờ'); await new Promise(r => setTimeout(r, 15)); } };
const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
const words = s => s.trim().split(/\s+/).length, pts = i => room.users.get('u' + i).points;
async function runGame(kind, during) {
  voice.length = 0; msgs.length = 0; const tok = room.tok, p = Games.run(room, kind, tok); await until(() => room.game); await during(); await p;
  const gv = voice.filter(v => !/^Cảm ơn .* đã tặng|tuyên dương/.test(v));                  // câu cảm ơn quà (thử ở trò kéo co) không tính vào giọng của trò
  ok(gv.length === 2 && gv.every(v => words(v) <= 12), `${kind}: giọng cô phải đúng 2 câu ≤ 12 từ (có ${gv.length}: ${gv.join(' | ')})`);
  ok(msgs.some(m => m.t === 'game' && m.on === false), `${kind}: thiếu tin kết thúc trò`);
}
(async () => {
  // lệnh trò chơi ngoài giờ chơi không bị đọc thành bình luận
  room.lastRead = 0; voice.length = 0; ['búa', 'kéo', 'bao', 'rồng rắn', 'rong ran', '✊', '✌️', '✋'].forEach((t, i) => say(20 + (i % 5), t)); ok(voice.length === 0, `lệnh trò chơi bị đọc thành bình luận: ${voice.join(' | ')}`);
  // xoay vòng: không lặp liền kề, đủ 5 trò mỗi vòng
  { let seq = []; for (let i = 0; i < 20; i++) seq.push(room.nextRecessGame()); ok(seq.every((k, i) => i === 0 || k !== seq[i - 1]), 'trò lặp liền kề: ' + seq.join(',')); ok(new Set(seq.slice(0, 5)).size === 5, 'vòng đầu không đủ 5 trò'); ok(new Set(seq.slice(5, 10)).size === 5, 'vòng hai không đủ 5 trò'); }
  // 1. oẳn tù tì
  await runGame('rps', async () => { await until(() => room.game.phase === 'open');
    say(1, 'búa'); say(2, 'Kéo'); say(3, 'BAO'); say(4, '✌️'); say(5, '✋'); say(1, 'kéo');            // lần 2 của bạn 1 không tính
    ok(room.game.picks.size === 5 && room.game.picks.get('u1') === 'bua' && room.game.picks.get('u4') === 'keo' && room.game.picks.get('u5') === 'bao', 'rps: nhận lệnh / chống spam sai: ' + JSON.stringify([...room.game.picks])); });
  ok(msgs.filter(m => m.t === 'rps' && m.phase === 'res').length === 5, 'rps: phải đủ 5 ván'); const rpsWins = [1, 2, 3, 4, 5].reduce((a, i) => a + pts(i), 0); ok(rpsWins >= 0, 'rps điểm');
  // 2. kéo co
  await runGame('tug', async () => { await until(() => room.game.on);
    const u4 = room.users.get('u4'); u4.team = 0; for (let i = 0; i < 5; i++) say(1, 'kéo');           // chống spam: 5 lần liên tiếp chỉ tính 1
    room.onLike(U(2), 10); room.onGift(U(3), 'Tim', 1, 99); say(4, 'kéo'); say(5, 'keo co');
    const f = room.game.f.reduce((a, b) => a + b, 0); ok(Math.abs(f - (1 + 2.5 + 1 + 1)) < .01, 'tug: lực sai (quà không được tính, kéo spam 1 lần/2s): ' + f);
    ok(u4.team >= 1 && u4.team <= 4, 'tug: bạn chưa vào tổ phải được tự xếp tổ'); });
  ok(msgs.some(m => m.t === 'tug' && m.phase === 'end'), 'tug: thiếu kết quả');
  // 3. đoán chữ
  await runGame('hang', async () => { await until(() => room.game.cur && !room.game.cur.done && msgs.some(m => m.t === 'hang' && m.phase === 'open'));
    const w = room.game.cur.word; say(1, 'xin chào'); say(2, w.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd'));                     // gõ không dấu vẫn đúng
    say(3, w);                                                                                                     // người thứ hai: không được thêm điểm
    ok(pts(2) >= 3 && room.game.wins.get('u2') === 3 && !room.game.wins.has('u3') && !room.game.wins.has('u1'), 'hang: chấm điểm đoán chữ sai');
    await until(() => msgs.some(m => m.t === 'hang' && m.phase === 'res')); });
  ok(msgs.filter(m => m.t === 'hang' && m.phase === 'open').every(m => m.pat.length > 0 && m.hint), 'hang: thiếu gợi ý / mẫu chữ'); ok(msgs.some(m => m.t === 'hang' && m.phase === 'res' && m.answer && m.win), 'hang: thiếu đáp án + người thắng');
  // 4. đếm nhanh
  await runGame('count', async () => { await until(() => room.game.phase === 'ask'); const n = room.game.n, before = [pts(1), pts(2), pts(3)];
    say(1, String(n)); say(2, String(n + 1)); say(3, String(n)); say(1, '99');
    await until(() => msgs.some(m => m.t === 'count' && m.phase === 'res'));
    ok(pts(1) - before[0] === 3 && pts(3) - before[2] === 1 && pts(2) === before[1], `count: điểm sai (u1 +${pts(1) - before[0]}, u3 +${pts(3) - before[2]})`); });
  ok(msgs.filter(m => m.t === 'count' && m.phase === 'show').every(m => m.n >= 3 && m.n <= 20), 'count: số hình ngoài 3–20'); ok(msgs.filter(m => m.t === 'count' && m.phase === 'res').length === 4, 'count: phải đủ 4 lượt');
  // 5. rồng rắn
  await runGame('dragon', async () => { await until(() => room.game.on); const p0 = pts(7);
    for (let i = 6; i <= 17; i++) say(i, i % 2 ? 'rồng rắn' : 'rong ran'); say(6, 'rồng rắn'); say(7, 'Rồng Rắn Lên Mây');
    ok(room.game.list.length === 12, 'dragon: số khúc sai ' + room.game.list.length); ok(pts(7) - p0 === 1, 'dragon: +1 điểm tham gia một lần');
    ok(msgs.filter(m => m.t === 'rong' && m.ms === 10).length === 1, 'dragon: mốc 10 khúc phải báo đúng 1 lần'); });
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: 5 trò giờ ra chơi (nhận lệnh có/không dấu, chống spam, điểm, giọng ≤ 2 câu, lệnh không bị đọc)');
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('LỖI test:', e.message); process.exit(1); });
