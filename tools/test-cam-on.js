// Thử cảm ơn quà nhỏ: quà đầu đọc ngay, quà dồn dập trong ~6 giây gộp tên một câu, không bỏ ai: node tools/test-cam-on.js
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-cam-on-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), out = [];
V.VoiceQueue.prototype.push = function (kind, text) { out.push(text); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room'));
const r = new Room('t', { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0 }, lopHoc: { jokeSec: 0 } }, null);
r.live = true; r.clients.add({ readyState: 1, send() {} }); out.length = 0;
const gift = (n, coins = 1) => r.onGift({ id: 't-' + n, name: n }, 'Tim', 1, coins);
gift('An'); ['Bình', 'Chi', 'Dũng', 'Em'].forEach(n => gift(n));
setTimeout(() => { gift('Giang'); setTimeout(() => {
  const t = out.filter(x => /Cảm ơn/.test(x)); console.log(t);
  const ok = t.length === 3 && /An/.test(t[0]) && /Bình/.test(t[1]) && /Chi/.test(t[1]) && /Giang/.test(t[2]) && !/xu|tiền|\d+ xu/.test(t.join(' '));
  console.log(ok ? 'OK: quà nhỏ nào cũng được cảm ơn gọi tên, dồn dập thì gộp' : 'LỖI cảm ơn quà nhỏ'); process.exit(ok ? 0 : 1); }, 7000); }, 6500);
