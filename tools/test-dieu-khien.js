// Thử bảng điều khiển /dieu-khien: node tools/test-dieu-khien.js (~15 giây)
// chặn IP ngoài / Host lạ / PIN · chỉ POST + x-dk + cùng nguồn · áp dụng ngay · giới hạn an toàn · lưu / đọc lại / về mặc định · thông báo (lọc chữ, không đọc giọng)
// tạm im · xoá hàng chờ · nhảy tiết · trò kế tiếp · reset học sinh 2 bước có sao lưu, giữ điểm trọn đời · trạng thái
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
process.env.CHUA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-dk-'));
const lib = path.join(__dirname, '..', 'lib'), V = require(path.join(lib, 'voice')), log = [];
V.VoiceQueue.prototype.push = function (kind, text) { log.push({ kind, text: String(text) }); this.items.push({ kind, text: String(text) }); };
const { Room } = require(path.join(lib, 'lop-hoc', 'room')), DK = require(path.join(lib, 'lop-hoc', 'dieu-khien')), Games = require(path.join(lib, 'lop-hoc', 'games')), errs = [], ok = (c, m) => { if (!c) errs.push(m); }, sleep = ms => new Promise(r => setTimeout(r, ms));
const mkCfg = (lop) => ({ voice: { enabled: true, engine: 'none', maxChars: 120, announceMin: 0, readJoins: false }, platforms: { tiktok: { enabled: true } }, lopHoc: { jokeSec: 0, idleSec: 0, triAn: false, shareStripSec: 0, ...lop } });
const mkRoom = (cfg) => { const r = new Room('tiktok', cfg, null); r.live = true; const out = []; r.clients.add({ readyState: 1, send: s => out.push(JSON.parse(s)) }); r.out = out; return r; };
const PAGE = path.join(__dirname, '..', 'public', 'dieu-khien.html');
const req = (port, method, url, body, headers = {}) => new Promise((res, rej) => {
  const data = body === undefined ? null : JSON.stringify(body), h = { ...headers }; if (data) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(data); }
  const r = http.request({ host: '127.0.0.1', port, method, path: url, headers: h }, rs => { let b = ''; rs.on('data', d => b += d); rs.on('end', () => { let j = null; try { j = JSON.parse(b); } catch {} res({ code: rs.statusCode, j, text: b }); }); });
  r.on('error', rej); if (data) r.write(data); r.end();
});
const WR = { 'x-dk': '1' };
const fake = (ip, host, h = {}) => ({ socket: { remoteAddress: ip }, headers: { host, ...h } });

(async () => {
  const cfg = mkCfg({}), base = DK.applyStartup(cfg), room = mkRoom(cfg), rooms = { tiktok: room };
  const panel = DK.createPanel({ rooms, cfg, base, getLogs: n => ['dòng 1', 'dòng 2'].slice(-n), version: 'abc1234', page: PAGE });
  const srv = http.createServer((q, s) => panel.handle(q, s, new URL(q.url, 'http://x'))); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;

  // ---- an ninh ----
  let r = await req(port, 'GET', '/dieu-khien'); ok(r.code === 200 && /BẢNG ĐIỀU KHIỂN/.test(r.text), 'trang /dieu-khien phải mở được từ máy này');
  r = await req(port, 'GET', '/api/dk/state'); ok(r.code === 200 && r.j.schema.length >= 20 && r.j.status.version === 'abc1234' && Array.isArray(r.j.logs), 'state từ máy này');
  r = await req(port, 'GET', '/api/dk/state', undefined, { Host: 'evil.example.com' }); ok(r.code === 403, 'Host lạ (DNS rebinding) phải bị chặn: ' + r.code);
  r = await req(port, 'GET', '/api/dk/state', undefined, { 'X-Forwarded-For': '8.8.8.8' }); ok(r.code === 403, 'qua proxy (X-Forwarded-For) phải bị chặn: ' + r.code);
  ok(panel.authorize(fake('192.168.1.20', '192.168.1.5:3100')) && panel.authorize(fake('192.168.1.20', '192.168.1.5:3100')).code === 403, 'IP LAN không PIN phải bị chặn 403');
  ok(panel.authorize(fake('::ffff:192.168.1.20', 'localhost:3100')).code === 403, 'IP ngoài giả Host localhost vẫn bị chặn');
  ok(panel.authorize(fake('127.0.0.1', 'localhost:3100')) === null && panel.authorize(fake('::1', '[::1]:3100')) === null && panel.authorize(fake('::ffff:127.0.0.1', '127.0.0.1:3100')) === null, '127.0.0.1 / ::1 phải được phép');
  r = await req(port, 'POST', '/api/dk/set', { music: false }); ok(r.code === 403, 'POST thiếu x-dk phải bị chặn: ' + r.code);
  r = await req(port, 'POST', '/api/dk/set', { music: false }, { ...WR, Origin: 'http://evil.example.com' }); ok(r.code === 403, 'POST khác nguồn (Origin) phải bị chặn: ' + r.code);
  r = await req(port, 'GET', '/api/dk/set'); ok(r.code === 405, 'lệnh ghi bằng GET phải bị từ chối: ' + r.code);
  r = await req(port, 'POST', '/api/dk/set', { music: false }, { ...WR, Origin: 'http://127.0.0.1:' + port }); ok(r.code === 200 && r.j.applied.music === false, 'POST đúng nguồn được nhận');
  // PIN do sếp tự đặt (giá trị thử trong test, không dùng ở đâu khác)
  const PINV = 'thu-' + Math.random().toString(36).slice(2, 8); cfg.lopHoc.panelPin = PINV;
  const lan = (h = {}) => fake('192.168.1.20', '192.168.1.5:3100', h);
  ok(panel.authorize(lan()).code === 401, 'LAN có đặt PIN nhưng không gửi → 401');
  ok(panel.authorize(lan({ 'x-pin': 'sai' })).code === 403, 'LAN sai PIN → 403');
  ok(panel.authorize(lan({ 'x-pin': PINV })) === null, 'LAN đúng PIN → được phép');
  for (let i = 0; i < 6; i++) panel.authorize(lan({ 'x-pin': 'sai' })); ok(panel.authorize(lan({ 'x-pin': PINV })).code === 429, 'sai quá 5 lần thì khoá 1 phút kể cả nhập đúng');
  ok(JSON.stringify(panel.state()).indexOf(PINV) < 0, 'state không được lộ PIN'); delete cfg.lopHoc.panelPin;

  // ---- áp dụng ngay + giới hạn ----
  const set = (o) => req(port, 'POST', '/api/dk/set', o, WR);
  room.out.length = 0; r = await set({ shareStripLowSec: 30, musicVol: 40, voiceVol: 80, music: true }); ok(r.code === 200 && room.B.shareStripLowSec === 30 && cfg.lopHoc.shareStripLowSec === 30, 'đổi xong áp dụng ngay vào room.B');
  const au = room.out.filter(m => m.t === 'audio'); ok(au.length >= 1 && au[au.length - 1].mv === 40 && au[au.length - 1].vv === 80 && au[au.length - 1].on === true, 'âm thanh được phát tới giao diện: ' + JSON.stringify(au.slice(-1)));
  ok(room.snapshot().audio.mv === 40, 'snapshot có âm thanh');
  r = await set({ readGapSec: 5 }); ok(r.j.applied.readGapSec === 20 && r.j.clamped.includes('readGapSec') && room.B.readGapSec === 20, 'readGapSec tối thiểu 20: ' + JSON.stringify(r.j));
  r = await set({ idleSec: 3 }); ok(r.j.applied.idleSec === 10, 'idleSec tối thiểu 10');
  r = await set({ idleSec: 0 }); ok(r.j.applied.idleSec === 0, 'idleSec = 0 là tắt');
  r = await set({ musicVol: 500 }); ok(r.j.applied.musicVol === 100, 'âm lượng tối đa 100');
  r = await set({ voiceVol: 0 }); ok(r.j.applied.voiceVol === 10, 'âm lượng giọng thấp nhất 10 (im hẳn dùng nút tạm im)');
  r = await set({ speed: 9 }); ok(r.j.applied.speed === 1.5, 'tốc độ tối đa 1,5');
  r = await set({ jokeSec: 20 }); ok(r.j.applied.jokeSec === 60, 'câu đùa tối thiểu 60 giây');
  r = await set({ maxDiff: 7 }); ok(r.j.applied.maxDiff === 3 && room.maxDiff() === 3, 'mức khó chỉ 1–3');
  r = await set({ grade: 2 }); ok(r.j.applied.grade === 2 && room.curGrade() === 2, 'khối cố định lớp 3–5 áp dụng ngay');
  r = await set({ grade: 0 }); ok(room.curGrade() === null || room.curGrade() !== 2, 'grade 0 → học sinh chọn');
  r = await set({ grade: 9 }); ok(r.code === 400, 'khối không có trong danh sách → 400');
  r = await set({ nopeKey: 1 }); ok(r.code === 400, 'mục lạ → 400');
  r = await set({ ['__proto__']: 1 }); ok(r.code === 400 && ({}).polluted === undefined, 'không cho ghi __proto__');
  r = await set({ music: 'yes' }); ok(r.code === 400, 'bật / tắt phải là boolean');
  r = await set({ musicVol: 'cao' }); ok(r.code === 400, 'thanh trượt phải là số');
  r = await set({ vote: false }); ok(room.voteOn() === false, 'tắt bình chọn áp dụng ngay'); await set({ vote: true });
  r = await set({ readChat: false, thankFollow: false }); ok(room.B.readChat === false && room.B.thankFollow === false, 'tắt đọc bình luận / cảm ơn theo dõi');
  log.length = 0; room.voice.items.length = 0; room.onFollow({ id: 'f1', name: 'Bé Hoa' }); room.flushThanks(); ok(!log.some(l => /theo dõi/.test(l.text)), 'tắt cảm ơn theo dõi thì không đọc');
  await set({ readChat: true, thankFollow: true });
  r = await set({ shareTarget: 0 }); ok(room.lowCrowd() === false, 'shareTarget 0 → coi như không có mục tiêu'); await set({ shareTarget: 100 });

  // ---- lưu / đọc lại / về mặc định ----
  const f = path.join(process.env.CHUA_DATA_DIR, 'dieu-khien.json'); ok(fs.existsSync(f), 'phải có data/dieu-khien.json');
  const saved = JSON.parse(fs.readFileSync(f, 'utf8')); ok(saved.values.shareStripLowSec === 30 && saved.values.musicVol === 100, 'file lưu đúng giá trị');
  const cfg2 = mkCfg({ shareStripLowSec: 77, shareTail: false }); DK.applyStartup(cfg2); ok(cfg2.lopHoc.shareStripLowSec === 30 && cfg2.lopHoc.speed === 1.5 && cfg2.lopHoc.shareTail !== false ? true : cfg2.lopHoc.shareStripLowSec === 30, 'khởi động lại: dieu-khien.json ghi đè config.lopHoc');
  fs.writeFileSync(f, JSON.stringify({ values: { musicVol: 9999, idleSec: 2, nopeKey: 1, readGapSec: 'x' } })); const cfg3 = mkCfg({}); DK.applyStartup(cfg3); ok(cfg3.lopHoc.musicVol === 100 && cfg3.lopHoc.idleSec === 10 && cfg3.lopHoc.nopeKey === undefined && cfg3.lopHoc.readGapSec === undefined, 'tệp bị sửa tay vẫn bị kéo về giới hạn / bỏ mục lạ: ' + JSON.stringify(cfg3.lopHoc));
  fs.writeFileSync(f, JSON.stringify(saved));
  r = await req(port, 'POST', '/api/dk/action', { do: 'reset-defaults' }, WR); ok(r.code === 200 && cfg.lopHoc.shareStripLowSec === undefined && room.B.musicVol === undefined && room.B.jokeSec === 0 && room.B.shareStripSec === 0, 'Về mặc định: trả lại giá trị trong config (mục config có thì giữ, mục chỉ do bảng đặt thì bỏ)');
  ok(Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')).values).length === 0, 'Về mặc định xoá hết mục đã lưu');
  ok(panel.state().schema.every(s => !s.changed), 'sau về mặc định không còn mục "đã chỉnh"');

  // ---- thông báo trên bảng ----
  const act = (o) => req(port, 'POST', '/api/dk/action', o, WR);
  log.length = 0; room.out.length = 0; r = await act({ do: 'notice', text: 'Chào mừng các bạn mới vào lớp!', sec: 15 });
  const nt = room.out.filter(m => m.t === 'notice'); ok(r.code === 200 && nt.length === 1 && nt[0].text === 'Chào mừng các bạn mới vào lớp!' && nt[0].ms === 15000, 'thông báo sạch phải hiện: ' + JSON.stringify(r.j));
  ok(log.length === 0, 'thông báo KHÔNG được đọc bằng giọng');
  ok(room.snapshot().notice && room.snapshot().notice.text === 'Chào mừng các bạn mới vào lớp!', 'snapshot có thông báo đang hiện (khung mở sau vẫn thấy)');
  const bads = ['Gọi 0912345678 nhé', 'Vào https://abc.vn nha', 'Kết bạn zalo cô nhé', 'Xem link bio nha', 'Ủng hộ 50k cho lớp', 'Chuyển khoản vào đây', 'Nhắn inbox cô nhé', 'Liên hệ 0123 456 789', 'x', 'a'.repeat(81), 'Chúc mừng bạn nhận quà', 'đồ ngu', 'Facebook của cô', 'hotline 1900'];
  for (const t of bads) { room.out.length = 0; r = await act({ do: 'notice', text: t, sec: 10 }); ok(r.code === 400 && !room.out.some(m => m.t === 'notice' && m.text), 'phải chặn: "' + t.slice(0, 30) + '" → ' + r.code); }
  for (const t of ['Trời mưa, các bạn nhớ mang áo mưa nhé!', 'Hôm nay học Toán lớp 5 nhé!', 'Cô chào các bạn ở nhà ạ!']) { r = await act({ do: 'notice', text: t, sec: 10 }); ok(r.code === 200, 'phải cho qua: "' + t + '" → ' + JSON.stringify(r.j)); }
  r = await act({ do: 'notice', text: 'Thử thời gian', sec: 99999 }); ok(r.j.ms === 300000, 'thời gian tối đa 5 phút');
  room.out.length = 0; await act({ do: 'notice-clear' }); ok(room.out.some(m => m.t === 'notice' && !m.text) && room.snapshot().notice === null, 'tắt thông báo');

  // ---- tạm im, hàng chờ, nhảy tiết, trò kế tiếp ----
  log.length = 0; room.voice.items.length = 0; room.voice.push('talk', 'câu 1'); room.voice.push('talk', 'câu 2'); room.out.length = 0;
  r = await act({ do: 'mute', min: 5 }); ok(r.code === 200 && room.voice.items.length === 0 && room.out.some(m => m.t === 'hush'), 'tạm im xoá hàng chờ và ngắt câu đang đọc');
  log.length = 0; room.voice.push('talk', 'câu 3'); room.say('câu 4'); ok(log.length === 0, 'đang tạm im: không nhận lượt đọc mới');
  ok(room.statusView().muted > 290 && room.statusView().muted <= 300, 'trạng thái cho biết còn tạm im bao lâu');
  r = await act({ do: 'mute', min: 0 }); room.voice.push('talk', 'câu 5'); ok(log.some(l => l.text === 'câu 5'), 'bỏ im thì đọc lại');
  r = await act({ do: 'mute', min: 99 }); ok(r.code === 400, 'tạm im tối đa 30 phút'); await act({ do: 'mute', min: 0 });
  room.voice.push('talk', 'x'); r = await act({ do: 'clear-queue' }); ok(r.code === 200 && room.voice.items.length === 0, 'xoá hàng chờ');
  for (const [k, i] of [['rachoi', 3], ['dovui', 1], ['tongket', 6]]) { r = await act({ do: 'jump', seg: k }); ok(r.code === 200 && room.segI === i, 'nhảy tới tiết ' + k + ' → segI ' + room.segI); await sleep(30); }
  room.tok++; r = await act({ do: 'jump', seg: 'khongco' }); ok(r.code === 400, 'tiết không có → 400');
  r = await act({ do: 'next-game', game: 'tug' }); ok(r.code === 200 && room.nextRecessGame() === 'tug', 'trò kế tiếp đặt được'); ok(room.nextRecessGame() !== undefined && room.forceGame === null, 'chỉ dùng 1 lần');
  r = await act({ do: 'next-game', game: 'cuopbien' }); ok(r.code === 400, 'trò không có → 400');
  r = await act({ do: 'xoa-het' }); ok(r.code === 400, 'lệnh lạ → 400');

  // ---- reset học sinh 2 bước ----
  for (let i = 1; i <= 4; i++) { room.onJoin({ id: 'h' + i, name: 'Bé' + String.fromCharCode(64 + i) }); }
  room.users.get('h1').points = 120; room.users.get('h1').wp = 30; room.users.get('h1').sao = 5; room.users.get('h2').points = 8; room.users.get('h2').wp = 8; room.award(room.users.get('h3'), 0);
  room.tps = [3, 4, 5, 6]; room.flush();
  r = await act({ do: 'reset-students', step: 2, token: 'chua-co' }); ok(r.code === 400 && room.users.has('h4'), 'bước 2 khi chưa bước 1 → từ chối, không xoá gì');
  r = await act({ do: 'reset-students' }); ok(r.code === 400, 'thiếu bước → từ chối');
  r = await act({ do: 'reset-students', step: 1 }); const tk = r.j.token; ok(r.code === 200 && tk && r.j.ms === 30000, 'bước 1 trả mã dùng một lần');
  r = await act({ do: 'reset-students', step: 2, token: 'sai' }); ok(r.code === 400 && room.users.has('h4'), 'mã sai → không reset');
  r = await act({ do: 'reset-students', step: 2, token: tk }); ok(r.code === 400, 'mã đã bị huỷ sau lần sai (phải bấm lại từ đầu)');
  r = await act({ do: 'reset-students', step: 1 }); const tk2 = r.j.token; r = await act({ do: 'reset-students', step: 2, token: tk2 });
  ok(r.code === 200 && r.j.result.tiktok.backup && /^backup-reset-/.test(r.j.result.tiktok.backup), 'bước 2 đúng mã → reset: ' + JSON.stringify(r.j));
  const bk = path.join(process.env.CHUA_DATA_DIR, r.j.result.tiktok.backup, 'lop-hoc-tiktok.json'); ok(fs.existsSync(bk) && JSON.parse(fs.readFileSync(bk, 'utf8')).users.some(u => u.id === 'h1' && u.points === 120), 'có sao lưu TRƯỚC khi xoá, chứa dữ liệu cũ');
  const u1 = room.users.get('h1'), u2 = room.users.get('h2'); ok(u1 && u1.points === 120 && u1.sao === 5 && u1.wp === 0, 'giữ điểm trọn đời + sao, xoá điểm tuần'); ok(u2 && u2.points === 8 && u2.wp === 0, 'bạn có điểm vẫn được giữ');
  ok(!room.users.has('h4') && !room.users.has('h3'), 'bạn chưa có điểm nào bị xoá khỏi sổ'); ok(room.seats.every(s => s === null) && room.tps.every(v => v === 0), 'ghế ngồi và điểm tổ về 0');
  ok(JSON.parse(fs.readFileSync(path.join(process.env.CHUA_DATA_DIR, 'lop-hoc-tiktok.json'), 'utf8')).users.find(u => u.id === 'h1').points === 120, 'tệp dữ liệu sau reset vẫn giữ điểm trọn đời');
  r = await act({ do: 'reset-students', step: 2, token: tk2 }); ok(r.code === 400, 'mã đã dùng một lần');

  // ---- trạng thái ----
  r = await req(port, 'GET', '/api/dk/state'); const st = r.j.status; room.onViewers(37);
  ok(['live', 'viewers', 'active', 'queue', 'playing', 'muted', 'seg', 'voiceOn', 'engine', 'version', 'shareDay'].every(k => k in st), 'state đủ trường trạng thái: ' + Object.keys(st).join(','));
  ok(room.statusView().viewers === 37 && room.statusView().live === true, 'trạng thái: người xem, kết nối');
  ok(r.j.games.length === Games.GAMES.length && r.j.segs.length === 7, 'có danh sách tiết + trò ra chơi');
  const page = fs.readFileSync(PAGE, 'utf8'); ok(/viewport/.test(page) && /data-seg|segs/.test(page) && /XÁC NHẬN RESET/.test(page), 'trang có viewport di động + nút nhảy tiết + xác nhận reset');
  srv.close();
  console.log(errs.length ? 'LỖI:\n - ' + errs.join('\n - ') : 'OK: bảng điều khiển (chặn IP ngoài / Host lạ / PIN, POST + x-dk + cùng nguồn, áp dụng ngay, giới hạn an toàn, lưu + đọc lại + về mặc định, thông báo lọc chữ không đọc giọng, tạm im, nhảy tiết, reset 2 bước có sao lưu)'); process.exit(errs.length ? 1 : 0);
})();
