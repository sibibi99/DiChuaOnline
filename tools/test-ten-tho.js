// Thử chặn từ thô trong tên + bình luận: node tools/test-ten-tho.js
const fs = require('fs'), os = require('os'), path = require('path');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-tho-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), voice = [];
V.VoiceQueue.prototype.push = function (kind, text) { voice.push(String(text)); };
const { Room, isVulgar, BADNAME } = require(path.join(lib, 'lop-hoc', 'room')), errs = [], ok = (c, m) => { if (!c) errs.push(m); };
const BAD = ['người mèn mén ỉa thối', 'Ỉa chảy', 'đái dầm', 'Cứt Chó', 'thối quá', 'địt', 'Đụ', 'lồn', 'BUỒI', 'cặc', 'đéo biết', 'vcl', 'VL luôn', 'dm', 'đm', 'ĐM nó', 'clm', 'cc', 'ia chay', 'dit me', 'cut di', 'bạn ỉa', 'xin chào, cứt!'];
const GOOD = ['Tia Sáng', 'Dịu Dàng', 'Dia Linh', 'Cúc Hoa', 'Đài Loan', 'Lê Đức', 'Hải Đăng', 'Minh Anh', 'ICC Team', 'Thơm Tho', 'Đụng Độ', 'Lớn Lên', 'Thôi Nào', 'Các Bạn', 'Buổi Sáng', 'Đèo Cả', 'Phú Thọ', 'Cơm Tấm', 'Vĩnh Long', 'Đa Mi', 'Mèn Mén', 'tia nắng', 'dia chi', 'Đài Bắc', 'cuc cung', 'du lich', 'lon bia', 'cac ban', 'thoi nao', 'dai dai', 'buoi sang', 'deo kinh'];
BAD.forEach(t => ok(isVulgar(t) && BADNAME.test(t), `phải chặn: "${t}"`)); GOOD.forEach(t => ok(!isVulgar(t) && !BADNAME.test(t), `không được chặn nhầm: "${t}"`));
const room = new Room('t', { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0 }, lopHoc: { jokeSec: 0 } }, null); room.live = true; room.clients.add({ readyState: 1, send() {} }); room.tok++;
const msgs = []; const bc = room.broadcast.bind(room); room.broadcast = m => { msgs.push(m); bc(m); };
// tên: hiện "Bạn nhỏ", đọc "một bạn"
room.onJoin({ id: 'x1', name: 'người mèn mén ỉa thối' }); ok(room.users.get('x1').name === 'Bạn nhỏ', 'tên thô phải hiện "Bạn nhỏ": ' + room.users.get('x1').name);
ok(msgs.some(m => m.t === 'join' && m.name === 'Bạn nhỏ'), 'tin join phải mang tên "Bạn nhỏ"');
room.onChat({ id: 'x2', name: 'Lan' }, 'lớp học vui quá cô ơi mọi người'); voice.length = 0; room.lastRead = 0;
// bình luận thô: không hiện, không đọc
msgs.length = 0; ['đéo biết', 'bạn ỉa chảy à, vui quá cô ơi', 'vcl cô ơi hay quá'].forEach(t => { room.lastRead = 0; room.onChat({ id: 'x2', name: 'Lan' }, t); });
ok(voice.length === 0, 'bình luận thô bị đọc: ' + voice.join(' | ')); ok(!msgs.some(m => m.t === 'chat' && m.text && /đéo|ỉa|vcl/i.test(m.text)), 'bình luận thô bị hiện lên bong bóng');
// bình luận sạch vẫn đọc được
room.lastRead = 0; room.onChat({ id: 'x3', name: 'Mai' }, 'cô giáo hôm nay xinh quá nhé cả lớp'); ok(voice.some(v => /cô giáo hôm nay/.test(v)), 'bình luận sạch phải còn đọc được');
// sổ lớp cũ có tên thô: đổi thành "Bạn nhỏ" khi nạp
const f = path.join(process.env.CHUA_DATA_DIR, 'lop-hoc-t2.json'); fs.writeFileSync(f, JSON.stringify({ users: [{ id: 'old1', name: 'thằng đụ', points: 5 }, { id: 'old2', name: 'Hoa', points: 7 }] }));
const r2 = new Room('t2', { voice: { enabled: false, engine: 'none', maxChars: 120, announceMin: 0 }, lopHoc: {} }, null);
ok(r2.users.get('old1').name === 'Bạn nhỏ' && r2.users.get('old2').name === 'Hoa', 'nạp sổ cũ: ' + [...r2.users.values()].map(u => u.name));
console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : `OK: chặn ${BAD.length} mẫu thô, không chặn nhầm ${GOOD.length} tên / câu thường, tên → "Bạn nhỏ", bình luận thô không hiện không đọc`); process.exit(errs.length ? 1 : 0);
