// Kiểm toán nhẩm theo khối lớp: tính lại ĐỘC LẬP từ chữ hiện trên bảng và so với đáp án: node tools/test-toan-khoi.js
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-toan-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')); V.VoiceQueue.prototype.push = function () {};
const { mathQ } = require(path.join(lib, 'lop-hoc', 'room'));
const errs = [], N = 400;
function solve(t) {                       // trả về giá trị đúng tính lại từ chữ; null nếu không nhận ra dạng câu
  let m;
  if ((m = /^Chu vi hình chữ nhật dài (\d+), rộng (\d+) = \?$/.exec(t))) return 2 * (+m[1] + +m[2]);
  if ((m = /^Diện tích hình chữ nhật dài (\d+), rộng (\d+) = \?$/.exec(t))) return +m[1] * +m[2];
  if ((m = /^(\d+)% của (\d+) = \?$/.exec(t))) return +m[1] * +m[2] / 100;
  if ((m = /^Trung bình cộng của (\d+), (\d+), (\d+) = \?$/.exec(t))) return (+m[1] + +m[2] + +m[3]) / 3;
  if ((m = /^(\d+)x \+ (\d+) = (\d+), x = \?$/.exec(t))) return (+m[3] - +m[2]) / +m[1];
  if ((m = /^√(\d+) = \?$/.exec(t))) return Math.sqrt(+m[1]);
  if (/^[\d\s+−×÷()²−-]+ = \?$/.test(t)) { const e = t.replace(/ = \?$/, '').replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/(\d+)²/g, '($1**2)'); return Function('"use strict";return (' + e + ')')(); }
  return null;
}
for (let g = 1; g <= 3; g++) for (let d = 1; d <= 3; d++) {
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const [t, a, say] = mathQ(g, d), tag = `khối ${g} khó ${d}: "${t}" → ${a}`;
    if (!Number.isInteger(a) || Math.abs(a) > 5000) { errs.push(tag + ' (đáp án không phải số nguyên nhỏ)'); continue; }
    const v = solve(t); if (v == null) { errs.push(tag + ' (dạng câu lạ, test chưa nhận ra)'); continue; }
    if (Math.abs(v - a) > 1e-9) errs.push(tag + ` (tính lại ra ${v})`);
    if (/undefined|NaN/.test(t + (say || ''))) errs.push(tag + ' (chữ lỗi)');
    if (say && (say.length > 90 || /[0-9]x|²|√|%/.test(say))) errs.push(tag + ' (câu đọc còn ký hiệu: ' + say + ')');
    if (g === 1 && Math.abs(a) > 100) errs.push(tag + ' (lớp 1–2 vượt 100)'); if (g === 1 && /[²√%x]/.test(t)) errs.push(tag + ' (lớp 1–2 có ký hiệu cấp cao)');
    if (g === 3 && d === 1 && a >= 0 && !/−/.test(t)) {}   // cho phép
    seen.add(t);
  }
  if (seen.size < 12) errs.push(`khối ${g} khó ${d}: chỉ ${seen.size} câu khác nhau trong ${N} lần`);
}
console.log(errs.length ? `LỖI (${errs.length}):\n - ` + errs.slice(0, 20).join('\n - ') : `OK: ${9 * N} câu toán nhẩm tính lại đúng, đủ 3 khối × 3 mức khó, câu đọc không còn ký hiệu`); process.exit(errs.length ? 1 : 0);
