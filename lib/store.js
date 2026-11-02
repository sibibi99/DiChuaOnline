// Lưu trạng thái lâu dài của mỗi phòng ra data/<nền tảng>.json: bảng vàng công đức, bộ đếm pháp sự, niệm Phật, tim.
// Khởi động lại server vẫn giữ; xoá file để làm lại từ đầu.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data');

function load(platform) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, platform + '.json'), 'utf8')); }
  catch { return null; }
}
function save(platform, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const f = path.join(DIR, platform + '.json');
  fs.writeFileSync(f + '.tmp', JSON.stringify(data));
  fs.renameSync(f + '.tmp', f);     // ghi file tạm rồi đổi tên: tắt máy giữa chừng không hỏng file cũ
}
module.exports = { load, save };
