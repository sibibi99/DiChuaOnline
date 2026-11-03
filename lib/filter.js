// Lọc nội dung trước khi đọc / hiển thị
const BAD_WORDS = [
  // có dấu
  'địt', 'đụ', 'lồn', 'cặc', 'buồi', 'đéo', 'đĩ', 'đần', 'óc chó', 'mẹ mày', 'má mày', 'chó chết', 'súc vật',
  'thằng ngu', 'con ngu', 'đồ ngu', 'ngu như', 'cút', 'khốn nạn', 'mất dạy', 'lừa đảo',
  // viết tắt, không dấu (so khớp nguyên từ)
  'dm', 'dmm', 'đm', 'đmm', 'vcl', 'vl', 'vkl', 'clm', 'cmm', 'cc', 'dit', 'du ma', 'deo', 'loz', 'lol', 'cac', 'buoi',
  'fuck', 'shit', 'bitch'
];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BAD_RE = new RegExp('(^|[^\\p{L}])(' + BAD_WORDS.map(esc).join('|') + ')(?=$|[^\\p{L}])', 'iu');
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|vn|net|org|xyz|me|io|link|shop|store|top|club|info)\b)/i;
const PHONE_RE = /(\+?84|0)[\s.-]?\d{2,3}([\s.-]?\d{3}){2}|\d{9,}/;
const AD_RE = /(zalo|telegram|inbox|ib\b|liên hệ|lien he|mua bán|mua ban|giảm giá|giam gia|khuyến mãi|khuyen mai|kiếm tiền|kiem tien|cá cược|ca cuoc|nhà cái|nha cai|tài xỉu|tai xiu|follow chéo|fl chéo)/i;

function isClean(text) {
  if (!text) return false;
  return !(BAD_RE.test(text) || LINK_RE.test(text) || PHONE_RE.test(text) || AD_RE.test(text));
}

// Nội dung nhạy cảm: mê tín / chữa bệnh / cờ bạc / chết chóc / chính trị. Không đọc, không hiện chữ (vẫn vào chỗ quỳ)
const SENSITIVE_PLAIN = /\b(chua (khoi )?benh|tri benh|benh nan y|ung thu|trung so|xo so|lo de|so de|danh de|ghi de|con de|giai han|cung sao|dang sao|xem boi|boi toan|xin am|goi hon|tram|tu tu|tu sat|muon chet|chet di|giet|trung phat|chinh tri|chinh phu|cong san|phan dong|bieu tinh|bo chinh tri|tong bi thu|chu tich nuoc|thu tuong|dang cs)\b/;
const SENSITIVE_VI = /(bùa|ngải|yểm|trù ẻo|trù yểm)/i;
function isSensitive(text) { return SENSITIVE_VI.test(String(text || '')) || SENSITIVE_PLAIN.test(plain(text)); }

// Bỏ emoji, ký tự lạ; giữ chữ (kể cả tiếng Việt), số, dấu câu cơ bản
function cleanText(text, maxChars = 120) {
  let t = String(text || '')
    .replace(/[\p{Extended_Pictographic}‍️]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s.,!?:;'"()\-/]/gu, ' ')
    .replace(/(.)\1{3,}/gu, '$1$1$1')   // "aaaaaa" -> "aaa"
    .replace(/\s+/g, ' ').trim();
  if (t.length > maxChars) t = t.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
  return t;
}

// Tên để HIỂN THỊ (giữ gần nguyên)
function displayName(name) {
  const t = String(name || '').replace(/[‍️]/g, '').trim();
  return t ? t.slice(0, 24) : 'Phật tử';
}

// Tên để ĐỌC: phải có chữ cái, không phải chuỗi ký tự khó đọc
function spokenName(name) {
  let t = cleanText(name, 30).replace(/[_.\d]+/g, ' ').replace(/\s+/g, ' ').trim();
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters < 2 || !isClean(t) || /^(user|tiktok|guest|khach)\s*$/i.test(t)) return 'một Phật tử';
  // tên toàn chữ không dấu, dài và không có nguyên âm hợp lý -> khó đọc
  if (!/[aeiouyàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(t)) return 'một Phật tử';
  return t;
}

// Bỏ dấu tiếng Việt để so khớp từ khoá khi người xem gõ sai / thiếu dấu ("thắp đẻn", "xin xam")
const plain = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

// Niệm Phật (so trên chữ không dấu): "Nam mô A Di Đà Phật", "niệm phâth", "Lễ Phật"…
const NIEM_PHAT_RE = /(nam\s*mo|a\s*di\s*da|adida|mo phat|quan the am|niem phat|niem phath|le phat)/;
const isNiemPhat = t => NIEM_PHAT_RE.test(plain(t));

// Biểu tượng cảm xúc TikTok gửi dạng chữ: "[laughcry]", "[smile]"
const stripEmotes = t => String(t || '').replace(/\[[a-zA-Z_]{2,20}\]/g, ' ');
const EMOTE_WORDS = /^(laughcry|smile|happy|angry|cry|lovely|wow|cool|proud|joyful|loveface|stun|shout|drool|thinking|wicked|evil|blink|kiss|rage|funnyface|yummy|surprised|complacent|scream|embarrassed|flushed|greedy|pride|hehe|haha|hihi|kk+|ok|oke|=+|\?+)$/i;
// Bình luận đáng đọc thành lời nguyện: đủ chữ cái, không phải chỉ dấu câu / biểu tượng / một từ lặp lại
function isMeaningful(t) {
  const words = String(t || '').split(/\s+/).filter(w => /\p{L}/u.test(w));
  const letters = words.join('').replace(/[^\p{L}]/gu, '').length;
  if (letters < 3 || !words.length) return false;
  if (words.every(w => EMOTE_WORDS.test(w.replace(/[^\p{L}=?]/gu, '')))) return false;
  if (words.length >= 2 && new Set(words.map(w => w.toLowerCase())).size === 1) return false;
  return true;
}

module.exports = { isClean, isSensitive, cleanText, displayName, spokenName, isNiemPhat, plain, stripEmotes, isMeaningful };
