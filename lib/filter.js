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

const NIEM_PHAT_RE = /(nam\s*m[oô]|a\s*di\s*[dđ][aà]|adida|a di da|di đà|mô phật|mo phat|quan th[eế] [aâ]m|nam mo)/i;
const isNiemPhat = t => NIEM_PHAT_RE.test(t || '');

module.exports = { isClean, cleanText, displayName, spokenName, isNiemPhat };
