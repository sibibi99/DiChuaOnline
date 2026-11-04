// Thử lưu / nạp sơ đồ ghế: bạn hoạt động trong 30 phút gần nhất về đúng ghế cũ sau khi khởi động lại: node tools/test-ghe.js
const fs = require('fs'), os = require('os'), path = require('path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-ghe-')); process.env.CHUA_DATA_DIR = dir;
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')); V.VoiceQueue.prototype.push = function () {};
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), cfg = { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0 }, lopHoc: {} };
const a = new Room('t', cfg, null); a.live = true;
['An', 'Bình', 'Chi', 'Dũng', 'Em'].forEach(n => a.onChat({ id: 't-' + n, name: n }, 'có mặt'));
const before = a.seats.slice(); a.flush();
// cũ: sửa một người thành "hoạt động cách đây 50 phút" để thử luật 30 phút
const f = path.join(dir, 'lop-hoc-t.json'), d = JSON.parse(fs.readFileSync(f, 'utf8')); const old = d.seats.find(e => e && e.id === 't-Em'); old.last = Date.now() - 50 * 60000; fs.writeFileSync(f, JSON.stringify(d));
const b = new Room('t', cfg, null);
const same = ['t-An', 't-Bình', 't-Chi', 't-Dũng'].every(id => b.seats.indexOf(id) === before.indexOf(id) && b.seats.indexOf(id) >= 0), em = b.seats.includes('t-Em');
console.log('ghế trước:', before.map((x, i) => x && i + ':' + x.slice(2)).filter(Boolean).join(' '), '| ghế sau:', b.seats.map((x, i) => x && i + ':' + x.slice(2)).filter(Boolean).join(' '));
const ok = same && !em; console.log(ok ? 'OK: ghế cũ được xếp lại, bạn quá 30 phút không hoạt động nhường ghế' : 'LỖI sơ đồ ghế'); process.exit(ok ? 0 : 1);
