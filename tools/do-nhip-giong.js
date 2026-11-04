// Đo nhịp giọng cô (số lượt đọc mỗi 10 phút) không cần Voice Lab: node tools/do-nhip-giong.js [thư-mục-lib] [giây=660] [tốc-độ=1]
// Chạy phòng Lớp Học Vui thật với ~40 người giả (chat / thả tim / quà), đếm số lần room.voice.push (mỗi lần = một lượt đọc).
// So sánh hai bản: git archive <sha> lib | tar -x -C <thư-mục-tạm>  rồi truyền <thư-mục-tạm>/lib.
const fs = require('fs'), os = require('os'), path = require('path');
const lib = path.resolve(process.argv[2] || path.join(__dirname, '..', 'lib')), secs = +process.argv[3] || 660, speed = +process.argv[4] || 1;
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-nhip-'));
const V = require(path.join(lib, 'voice')), pushes = [];
V.VoiceQueue.prototype.push = function (kind, text) { pushes.push({ kind, text: String(text) }); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room'));
let JOKES = null; try { JOKES = require(path.join(lib, 'lop-hoc', 'cau-dua')).JOKES; } catch {}
const jokeSet = JOKES ? Object.values(JOKES).flat() : [];
const room = new Room('test', { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 15, readJoins: true }, lopHoc: { speed, triAn: false } }, null);
room.live = true; room.clients.add({ readyState: 1, send() {} });
const names = Array.from({ length: 40 }, (_, i) => 'Hoc sinh ' + i), pick = a => a[Math.floor(Math.random() * a.length)];
names.forEach(n => room.onJoin({ id: 't-' + n, name: n }));
const CH = ['a', 'b', 'c', 'd', 'có mặt', 'lên bảng', 'học bạ', 'tổ 2', '12', '24', 'xin chào cô', 'lớp vui quá cô ơi', 'thưa cô', 'xem điểm'];
const t0 = Date.now();
const timer = setInterval(() => {
  const n = pick(names), who = { id: 't-' + n, name: n }, r = Math.random();
  if (r < .45) room.onChat(who, pick(CH)); else if (r < .85) room.onLike(who, 1 + Math.floor(Math.random() * 20)); else if (r < .88) room.onGift(who, 'Hoa hồng', 1, pick([1, 5, 30])); else if (r < .9) room.onShare(who);
  if (Date.now() - t0 > secs * 1000) { clearInterval(timer); finish(); }
}, 300);
function finish() {
  const mins = (Date.now() - t0) / 60000, per10 = x => +(x / mins * 10).toFixed(1), kinds = {};
  pushes.forEach(p => { kinds[p.kind] = (kinds[p.kind] || 0) + 1; });
  const words = pushes.reduce((a, p) => a + p.text.split(/\s+/).length, 0), jokes = pushes.filter(p => jokeSet.some(j => p.text.includes(j))).length;
  console.log(JSON.stringify({ lib, phut: +mins.toFixed(1), buoi: room.cycle, luotDoc: pushes.length, luotDocMoi10Phut: per10(pushes.length), tuMoi10Phut: per10(words), theoLoai: kinds, cauDua: jokes, cauDuaMoi10Phut: per10(jokes) }, null, 1));
  process.exit(0);
}
