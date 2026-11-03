// "Bậc cúng dường": mỗi bậc xu là một pháp sự có hiệu ứng riêng, càng cao càng lớn.
// Kích hoạt bằng quà (theo số xu), bình luận có từ khoá, hoặc chia sẻ live. Ghi đè được bằng config.rituals.
const DEFAULT_RITUALS = [
// chat: từ khoá viết KHÔNG DẤU (so trên bình luận đã bỏ dấu, nên "rut the", "thắp đẻn" vẫn khớp).
// ask: từ khoá chỉ để nhận ra là "lệnh" (không kích hoạt, không đọc thành lời nguyện).
  { key: 'the', name: 'Rút thẻ phúc', minCoins: 1,
    chat: ['rut the', 'xin xam', 'xin que', 'gieo que', 'rut que', 'boc que', 'boc the'], hint: '1 xu (bông hồng) · chat: rút thẻ',
    say: '{name} rút được thẻ {loai}: {ten}. {loi}' },
  { key: 'den', name: 'Thắp đèn lưu ly', minCoins: 5,
    chat: ['thap den', 'den luu ly', 'thap nen', 'thap huong'], hint: '5 xu · chat: thắp đèn',
    say: '{name} thắp đèn lưu ly. Cảm ơn {name} đã ủng hộ kênh, chúc {name} luôn bình tâm, sáng suốt.' },
  { key: 'cauan', name: 'Thả đèn cầu an', minCoins: 10, share: true,
    chat: ['cau an'], hint: '10 xu · chia sẻ live · chat: cầu an',
    say: '{name} thả đèn cầu an. Chúc {name} và gia đình bình an, mạnh khoẻ.' },
  { key: 'sen', name: 'Hoa sen nở', minCoins: 30,
    chat: [], ask: ['hoa sen', 'dang sen'], hint: '30 xu: sen vàng nở giữa chánh điện',
    say: 'Hoa sen nở cảm ơn {name} đã ủng hộ kênh. Chúc {name} giữ tâm sáng như sen.' },
  { key: 'chuong', name: 'Thỉnh đại hồng chung', minCoins: 99,
    chat: [], ask: ['thinh chuong', 'chuong dong', 'go chuong', 'dong chuong'], hint: '99 xu: thỉnh chuông đồng',
    say: 'Thỉnh chuông cảm ơn {name} đã ủng hộ kênh. Chúc {name} và gia đình một ngày an yên.' },
  { key: 'phatquang', name: 'Phật quang phổ chiếu', minCoins: 299,
    chat: [], ask: ['phat quang'], hint: '299 xu: mưa hoa, cả chánh điện cùng lạy',
    say: 'Phật quang phổ chiếu. Cả chánh điện cùng cảm ơn {name} đã ủng hộ kênh. Chúc {name} luôn bình an, vui khoẻ.' },
];

// Thẻ phúc: lời nhắn để chiêm nghiệm, không tiên đoán. 36 thẻ để sưu tầm (số 1–36).
// Độ hiếm NHƯ NHAU cho mọi người (chat miễn phí hay tặng quà): quà không mua được may rủi, chỉ được lật thẻ ngay.
const THE = {
  'Thường': [
    ['Thẻ Bình An', 'Hôm nay chậm lại một nhịp, mọi việc sẽ nhẹ nhàng hơn.'],
    ['Thẻ Tỉnh Thức', 'Hít thở sâu ba hơi trước khi trả lời người khác.'],
    ['Thẻ Biết Ơn', 'Nhắn một lời cảm ơn cho người bạn thương.'],
    ['Thẻ Kiên Nhẫn', 'Việc tốt cần thời gian, cứ đều tay là tới.'],
    ['Thẻ Gọn Gàng', 'Dọn một góc nhỏ, tâm cũng gọn theo.'],
    ['Thẻ Hiếu Thảo', 'Gọi điện hỏi thăm ba mẹ một câu hôm nay.'],
    ['Thẻ Nụ Cười', 'Cười với người đầu tiên bạn gặp sáng mai.'],
    ['Thẻ Đủ Đầy', 'Thấy mình đang có gì, lòng sẽ thấy đủ.'],
    ['Thẻ Lắng Nghe', 'Hôm nay nghe người khác nói hết câu rồi hãy đáp.'],
    ['Thẻ Ngủ Ngon', 'Tắt điện thoại sớm hơn ba mươi phút, giấc ngủ sẽ sâu hơn.'],
    ['Thẻ Nước Ấm', 'Một ly nước ấm buổi sáng là món quà cho cơ thể.'],
    ['Thẻ Đi Bộ', 'Đi bộ mười phút, đầu óc sẽ nhẹ hẳn.'],
    ['Thẻ Tha Thứ', 'Buông một chuyện nhỏ còn vướng, lòng sẽ rộng ra.'],
    ['Thẻ Tiết Kiệm', 'Bớt một món chưa cần, để dành cho việc đáng hơn.'],
    ['Thẻ Chậm Rãi', 'Ăn chậm một bữa, nếm cho trọn vị.'],
    ['Thẻ Lời Hay', 'Nói một lời khen thật lòng với ai đó hôm nay.'],
    ['Thẻ Ngăn Nắp', 'Viết ra ba việc cần làm, làm xong việc đầu tiên.'],
    ['Thẻ Bạn Hiền', 'Hỏi thăm một người bạn lâu rồi chưa gặp.'],
    ['Thẻ Thiên Nhiên', 'Ngắm trời xanh hay cây lá một phút, tâm sẽ dịu.'],
    ['Thẻ Khiêm Nhường', 'Nhận ra một điều mình chưa biết, đó là bắt đầu của học.'],
  ],
  'Hiếm': [
    ['Thẻ Quý Nhân', 'Người giúp bạn có thể ở rất gần, hãy mở lời.'],
    ['Thẻ Thuận Buồm', 'Việc đang làm dở, dồn sức thêm chút là xong.'],
    ['Thẻ Qua Sông', 'Chuyện khó hôm nay là bài học quý ngày mai.'],
    ['Thẻ Trí Tuệ', 'Đọc vài trang sách, đầu óc sẽ sáng ra.'],
    ['Thẻ Gieo Duyên', 'Làm một việc tốt không cần ai biết.'],
    ['Thẻ Khởi Đầu', 'Việc bạn ngại bắt đầu, làm thử năm phút thôi.'],
    ['Thẻ Kết Nối', 'Một cuộc gọi hôm nay có thể mở ra cơ hội mới.'],
    ['Thẻ Bền Bỉ', 'Giữ một thói quen tốt đủ bảy ngày, bạn sẽ khác.'],
    ['Thẻ Sẻ Chia', 'Chia một phần nhỏ cho người cần, niềm vui nhân đôi.'],
    ['Thẻ Bình Tâm', 'Gặp chuyện gấp, thở ba nhịp rồi mới quyết.'],
    ['Thẻ Hiểu Mình', 'Viết ra điều làm bạn vui nhất tuần này.'],
  ],
  'Huyền thoại': [
    ['Thẻ Phúc Lộc Song Toàn', 'Gieo nhân lành mỗi ngày, phúc lộc tự tìm đến.'],
    ['Thẻ Kim Liên', 'Tâm sáng như sen vàng, đi đâu cũng gặp điều lành.'],
    ['Thẻ Vạn Sự Như Ý', 'Giữ tâm an, việc gì cũng tròn đầy.'],
    ['Thẻ Bồ Đề Tâm', 'Thương mình, thương người, đi đâu cũng thấy bình an.'],
    ['Thẻ Viên Mãn', 'Biết đủ là giàu, biết cho là hạnh phúc.'],
  ],
};
const THE_LIST = Object.entries(THE).flatMap(([loai, l]) => l.map(([ten, loi]) => ({ loai, ten, loi })));
const THE_TOTAL = THE_LIST.length;

const { plain } = require('./filter');

function ritualForGift(list, giftName, coins) {
  const g = plain(giftName);
  const byName = list.find(r => (r.gifts || []).some(n => g.includes(plain(n))));
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
// tỉ lệ cố định cho mọi người: Huyền thoại 5%, Hiếm 25%, Thường 70% (không phụ thuộc số xu)
function drawThe() {
  const r = Math.random(), loai = r < .05 ? 'Huyền thoại' : r < .30 ? 'Hiếm' : 'Thường';
  const pool = THE_LIST.filter(c => c.loai === loai), c = pool[Math.floor(Math.random() * pool.length)];
  return { so: THE_LIST.indexOf(c) + 1, ...c };
}

module.exports = { DEFAULT_RITUALS, ritualForGift, ritualForChat, isRitualCommand, drawThe, THE_TOTAL };
