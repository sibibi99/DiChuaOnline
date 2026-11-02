// Tên quà TikTok (tiếng Anh) -> tên đọc tiếng Việt. Quà lạ chưa có trong bảng: đọc "món quà".
const VI = {
  'rose': 'Hoa hồng', 'tiktok': 'quà TikTok', 'heart me': 'Trái tim', 'finger heart': 'Tim ngón tay', 'hand hearts': 'Tim bàn tay',
  'heart': 'Trái tim', 'love you': 'Lời yêu thương', 'love you so much': 'Lời yêu thương', 'thumbs up': 'Like', 'gg': 'GG',
  'peach': 'Quả đào', 'wink wink': 'Nháy mắt', 'eye for an eye': 'Mắt kính', 'doughnut': 'Bánh vòng', 'ice cream cone': 'Kem ốc quế',
  'perfume': 'Nước hoa', 'hat and mustache': 'Mũ và ria', 'cap': 'Mũ', 'sunglasses': 'Kính râm', 'confetti': 'Pháo giấy',
  'hearts': 'Những trái tim', 'heart puff': 'Bóng tim', 'rosa': 'Hoa hồng', 'flower': 'Bông hoa', 'flowers': 'Bó hoa',
  'bouquet': 'Bó hoa', 'lollipop': 'Kẹo mút', 'cotton candy': 'Kẹo bông', 'paper crane': 'Hạc giấy', 'little crown': 'Vương miện nhỏ',
  'crown': 'Vương miện', 'lucky cat': 'Mèo may mắn', 'money gun': 'Súng tiền', 'gold mine': 'Mỏ vàng', 'galaxy': 'Thiên hà',
  'lion': 'Sư tử', 'universe': 'Vũ trụ', 'whale diving': 'Cá voi', 'swan': 'Thiên nga', 'train': 'Đoàn tàu', 'falcon': 'Chim ưng',
  'rocket': 'Tên lửa', 'interstellar': 'Liên hành tinh', 'sports car': 'Xe thể thao', 'mirror': 'Gương', 'garland': 'Vòng hoa',
  'friendship necklace': 'Vòng tình bạn', 'sending positive vibes': 'Năng lượng tích cực', 'mic': 'Micro', 'coffee': 'Ly cà phê',
  'cheer you up': 'Lời cổ vũ', 'go popular': 'Lời cổ vũ', 'team bracelet': 'Vòng tay', 'star': 'Ngôi sao', 'stars': 'Những ngôi sao',
  'rainbow': 'Cầu vồng', 'birthday cake': 'Bánh sinh nhật', 'cake slice': 'Bánh ngọt', 'fireworks': 'Pháo hoa', 'diamond': 'Kim cương',
};
// có dấu tiếng Việt hoặc ký tự ngoài ASCII -> coi là đã là tên tiếng Việt / tên riêng, giữ nguyên
function giftVi(name) {
  const n = String(name || '').trim();
  if (!n) return 'món quà';
  const k = n.toLowerCase();
  if (VI[k]) return VI[k];
  if (/^super chat/i.test(n)) return n;
  return /^[\x20-\x7e]+$/.test(n) ? 'món quà' : n;
}
module.exports = { giftVi };
