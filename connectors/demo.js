// Chế độ Demo: giả lập người xem để thử giao diện, âm thanh, giọng đọc
const NAMES = ['Minh Anh', 'Thu Hà', 'Quốc Bảo', 'Ngọc Diệp', 'Hoàng Nam', 'Lan Chi', 'Đức Huy', 'Mai Phương', 'Tuấn Kiệt',
  'Bảo Ngọc', 'Văn Lợi', 'Thanh Tâm', 'Kim Ngân', 'Gia Hân', 'Phúc An', 'Hải Đăng', 'Tú Anh', 'Minh Khôi', 'Ánh Dương',
  'Trâm Anh', 'Khánh Linh', 'Nhật Minh', 'Thảo My', 'Công Danh', 'Hồng Nhung', 'Quang Vinh', 'Yến Nhi', 'Bích Ngọc',
  'Tiến Đạt', 'Diễm My', 'Anh Thư', 'Gia Bảo', 'Như Ý', 'Trọng Nghĩa', 'Cẩm Tú', 'Hữu Phước', 'user8823901', '✨🌸✨'];
const CHATS = ['Nam mô A Di Đà Phật', 'Nam mô a di đà phật 🙏', 'A Di Đà Phật', 'Nam mô Đại Bi Quán Thế Âm Bồ Tát',
  'Cầu cho mẹ con mau khỏe', 'Con cầu thi đỗ đại học ạ', 'Cầu cho gia đình bình an', 'Cầu buôn bán thuận lợi',
  'Con xin cho ba qua khỏi bệnh', 'Cầu cho con có việc làm ổn định', 'Nam mô a di đà phật', 'Cầu bình an cho cả nhà',
  'vào zalo 0909123456 nhận quà', 'đm live gì chán', 'thắp đèn', 'cầu an cho cả nhà', 'xin xăm đầu năm'];
const GIFTS = [['Hoa hồng', 1], ['Hoa hồng', 1], ['Hoa hồng', 1], ['Hoa hồng', 1], ['Tim', 5], ['Kẹo bông', 10], ['Tim', 5], ['Nhẫn kim cương', 30], ['Mũ chúc mừng', 99]];
const pick = a => a[Math.floor(Math.random() * a.length)];

module.exports = function startDemo(room, opt = {}) {
  const speed = opt.speed || 1;
  const user = () => { const n = pick(NAMES); return { id: 'demo-' + n, name: n }; };
  const timers = [];
  const every = (ms, fn) => timers.push(setInterval(fn, ms / speed));
  // vào phòng dồn dập lúc đầu cho đầy chùa
  for (let i = 0; i < 22; i++) timers.push(setTimeout(() => room.onJoin(user()), (200 + i * 260) / speed));
  every(1800, () => room.onChat(user(), pick(CHATS)));
  every(1400, () => room.onLike(user(), 1 + Math.floor(Math.random() * 8)));
  every(7000, () => { const [g, c] = pick(GIFTS); const n = g === 'Hoa hồng' ? 1 + Math.floor(Math.random() * 5) : 1; room.onGift(user(), g, n, c * n); });
  every(3000, () => room.onJoin(user()));
  every(15000, () => room.onShare(user()));
  return () => timers.forEach(t => { clearInterval(t); clearTimeout(t); });
};
