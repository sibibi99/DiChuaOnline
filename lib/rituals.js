// 4 "pháp sự" lễ Phật: mỗi cái kích hoạt bằng quà (theo tên hoặc số xu), bình luận có từ khoá, hoặc chia sẻ live.
// Ghi đè được bằng config.rituals (cùng cấu trúc).
const DEFAULT_RITUALS = [
// chat: từ khoá viết KHÔNG DẤU (so trên bình luận đã bỏ dấu, nên "thắp đẻn", "xin xam" vẫn khớp).
// ask: từ khoá chỉ để nhận ra là "lệnh" (không kích hoạt, không đọc thành lời nguyện).
  { key: 'den', name: 'Thắp đèn lưu ly', icon: '🪔', gifts: ['hoa hồng', 'rose'], minCoins: 1,
    chat: ['thap den', 'den luu ly', 'thap nen', 'thap huong'], hint: 'Tặng Hoa Hồng hoặc chat: thắp đèn',
    say: '{name} thắp đèn lưu ly, nguyện ánh sáng trí tuệ soi đường.' },
  { key: 'cauan', name: 'Cầu an gia đạo', icon: '🏮', minCoins: 5, share: true,
    chat: ['cau an'], hint: 'Chia sẻ live / quà từ 5 xu hoặc chat: cầu an',
    say: '{name} cầu an gia đạo, nguyện gia đình bình an, mạnh khoẻ.' },
  { key: 'xinxam', name: 'Xin xăm quẻ pháp', icon: '🎋', minCoins: 30,
    chat: ['xin xam', 'xin que', 'que phap', 'xin cam que', 'gieo que', 'rut que', 'boc que'], hint: 'Quà từ 30 xu hoặc chat: xin xăm',
    say: '{name} xin được quẻ số {so}, {loai}. {loi}' },
  { key: 'chuong', name: 'Chuông đồng bát nhã', icon: '🔔', minCoins: 99,
    chat: [], ask: ['thinh chuong', 'chuong dong', 'go chuong', 'dong chuong'], hint: 'Quà từ 99 xu: thỉnh chuông đồng',
    say: 'A Di Đà Phật. Thỉnh chuông cảm ơn {name}. Nguyện cho {name} và gia đình bình an, vạn sự như ý.' },
];

// Quẻ xăm: lời khuyên nhẹ nhàng, không hứa hẹn cụ thể
const QUE = [
  ['Thượng cát', 'Tâm an vạn sự an, việc lành đang đến.'],
  ['Đại cát', 'Gieo nhân lành gặt quả ngọt, gia đạo hưng thịnh.'],
  ['Trung cát', 'Kiên nhẫn chờ thời, mây tan trăng sáng.'],
  ['Thượng cát', 'Quý nhân phù trợ, công việc hanh thông.'],
  ['Cát', 'Sức khoẻ dồi dào, nên giữ tâm thanh tịnh.'],
  ['Đại cát', 'Gia đình hoà thuận, phúc lộc đầy nhà.'],
  ['Trung cát', 'Bớt lo âu, việc khó sẽ có người giúp.'],
  ['Thượng cát', 'Học hành tấn tới, trí tuệ sáng suốt.'],
  ['Cát', 'Làm ăn thuận lợi khi giữ chữ tín.'],
  ['Đại cát', 'Lòng từ bi mở lối, an lạc tự tâm.'],
  ['Trung cát', 'Đi chậm mà chắc, cuối năm thành tựu.'],
  ['Thượng cát', 'Hữu duyên gặp phước, tâm sáng đời vui.'],
];

const { plain } = require('./filter');
const norm = s => String(s || '').toLowerCase().normalize('NFC');

function ritualForGift(list, giftName, coins) {
  const g = norm(giftName);
  const byName = list.find(r => (r.gifts || []).some(n => g.includes(norm(n))));
  if (byName) return byName;
  return list.filter(r => r.minCoins != null && coins >= r.minCoins).sort((a, b) => b.minCoins - a.minCoins)[0] || null;
}
function ritualForChat(list, text) {
  const t = plain(text);
  return list.find(r => (r.chat || []).some(k => t.includes(plain(k)))) || null;
}
// bình luận là "lệnh" pháp sự (kể cả lệnh chỉ làm được bằng quà) -> không đọc thành lời nguyện
function isRitualCommand(list, text) {
  const t = plain(text);
  return list.some(r => [...(r.chat || []), ...(r.ask || [])].some(k => t.includes(plain(k))));
}
function drawQue() { const i = Math.floor(Math.random() * QUE.length); return { so: i + 1, loai: QUE[i][0], loi: QUE[i][1] }; }

module.exports = { DEFAULT_RITUALS, ritualForGift, ritualForChat, isRitualCommand, drawQue };
