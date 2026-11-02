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
    say: '{name} thắp đèn lưu ly, nguyện ánh sáng trí tuệ soi đường.' },
  { key: 'cauan', name: 'Thả đèn cầu an', minCoins: 10, share: true,
    chat: ['cau an'], hint: '10 xu · chia sẻ live · chat: cầu an',
    say: '{name} thả đèn cầu an, nguyện gia đình bình an, mạnh khoẻ.' },
  { key: 'sen', name: 'Hoa sen nở', minCoins: 30,
    chat: [], ask: ['hoa sen', 'dang sen'], hint: '30 xu: sen vàng nở giữa chánh điện',
    say: 'Hoa sen nở cho {name}. Nguyện tâm sáng như sen, gặp nhiều may mắn.' },
  { key: 'chuong', name: 'Thỉnh đại hồng chung', minCoins: 99,
    chat: [], ask: ['thinh chuong', 'chuong dong', 'go chuong', 'dong chuong'], hint: '99 xu: thỉnh chuông đồng',
    say: 'A Di Đà Phật. Thỉnh chuông cảm ơn {name}. Nguyện cho {name} và gia đình bình an, vạn sự như ý.' },
  { key: 'phatquang', name: 'Phật quang phổ chiếu', minCoins: 299,
    chat: [], ask: ['phat quang'], hint: '299 xu: mưa hoa, cả chánh điện cùng lạy',
    say: 'Phật quang phổ chiếu. Cả chánh điện cùng lễ Phật cảm ơn {name}. Nguyện {name} phúc lộc đầy nhà.' },
];

// Thẻ phúc: lời nhắn để chiêm nghiệm, không tiên đoán. Độ hiếm như thẻ sưu tầm: quà càng lớn càng dễ ra thẻ hiếm.
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
  ],
  'Hiếm': [
    ['Thẻ Quý Nhân', 'Người giúp bạn có thể ở rất gần, hãy mở lời.'],
    ['Thẻ Thuận Buồm', 'Việc đang làm dở, dồn sức thêm chút là xong.'],
    ['Thẻ Qua Sông', 'Chuyện khó hôm nay là bài học quý ngày mai.'],
    ['Thẻ Trí Tuệ', 'Đọc vài trang sách, đầu óc sẽ sáng ra.'],
    ['Thẻ Gieo Duyên', 'Làm một việc tốt không cần ai biết.'],
  ],
  'Huyền thoại': [
    ['Thẻ Phúc Lộc Song Toàn', 'Gieo nhân lành mỗi ngày, phúc lộc tự tìm đến.'],
    ['Thẻ Kim Liên', 'Tâm sáng như sen vàng, đi đâu cũng gặp điều lành.'],
    ['Thẻ Vạn Sự Như Ý', 'Giữ tâm an, việc gì cũng tròn đầy.'],
  ],
};

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
// coins: quà càng lớn càng dễ ra thẻ hiếm (chat = 0 xu)
function drawThe(coins = 0) {
  const r = Math.random(), legend = .04 + Math.min(.2, coins / 500), rare = .22 + Math.min(.25, coins / 200);
  const loai = r < legend ? 'Huyền thoại' : r < legend + rare ? 'Hiếm' : 'Thường';
  const pool = THE[loai], i = Math.floor(Math.random() * pool.length);
  return { so: i + 1, loai, ten: pool[i][0], loi: pool[i][1] };
}

module.exports = { DEFAULT_RITUALS, ritualForGift, ritualForChat, isRitualCommand, drawThe };
