// Chùa Online Live — server chính
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { VoiceEngine, CACHE_DIR } = require('./lib/voice');

// CHUA_CONFIG=<đường dẫn> + PORT=<cổng>: chạy thêm 1 server thử song song server live
const cfgFile = process.env.CHUA_CONFIG || (fs.existsSync(path.join(__dirname, 'config.json')) ? 'config.json' : 'config.example.json');
const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, cfgFile), 'utf8'));
if (process.env.PORT) cfg.port = +process.env.PORT;
if (process.env.VOICE_ENGINE) cfg.voice.engine = process.env.VOICE_ENGINE;
// GAME=lop-hoc (hoặc "game" trong config): chạy Lớp Học Vui thay Chùa Online, cùng cổng / cùng link nguồn
const GAME = process.env.GAME || cfg.game || 'chua';
const { Room } = require(GAME === 'lop-hoc' ? './lib/lop-hoc/room' : './lib/room');
// Lớp Học Vui: giọng cô giáo riêng (mặc định Mai Anh, nữ miền Bắc của Voice Lab); đổi bằng config.lopHoc.voice
if (GAME === 'lop-hoc' && cfg.voice.voicelab) cfg.voice.voicelab = { ...cfg.voice.voicelab, voice: cfg.lopHoc?.voice || 'vi-mai-anh', fallbackVbee: false };      // CHỈ MỘT giọng cô giáo: Voice Lab tắt thì im, không đọc dự phòng bằng giọng nam Vbee
console.log('Cấu hình:', cfgFile, '| game:', GAME);

const engine = new VoiceEngine(cfg.voice);
const PLATFORMS = ['tiktok', 'youtube', 'facebook'];
const rooms = {};
for (const p of PLATFORMS) {
  const pc = cfg.platforms[p] || {};
  if (!pc.enabled) continue;
  rooms[p] = new Room(p, cfg, engine);
  if (pc.demo) { require('./connectors/demo')(rooms[p], pc); console.log(`[${p}] chế độ DEMO`); }
  else if (p === 'tiktok') require('./connectors/tiktok')(rooms[p], pc);
  else if (p === 'youtube') require('./connectors/youtube')(rooms[p], pc);
  // source "extension": bình luận do tiện ích Chrome (tools/chrome-extension) đọc từ trang live gửi về /ingest/<platform>
  else if (pc.source === 'extension') console.log(`[${p}] chờ bình luận từ tiện ích Chrome`);
  else if (p === 'facebook') require('./connectors/facebook')(rooms[p], pc);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const seg = u.pathname.split('/').filter(Boolean);
  if (!seg.length) { res.writeHead(302, { Location: '/' + Object.keys(rooms)[0] }); return res.end(); }
  if (seg.length === 1 && rooms[seg[0]]) {   // gắn mã phiên bản vào trang để khung biết mình cũ hay mới
    const html = fs.readFileSync(path.join(PUB, PAGE), 'utf8').replace('__UIVER__', uiVersion());
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' }); return res.end(html);
  }
  if (seg[0] === 'voice' && seg[1] && /^[\w.]+$/.test(seg[1])) return sendFile(res, path.join(CACHE_DIR, seg[1]));
  // ảnh tĩnh của overlay (vd tượng Quan Âm): public/img/<file>
  if (seg[0] === 'img' && seg[1] && /^[\w.-]+$/.test(seg[1])) {
    if (seg[1] === 'chanh-dien.jpg') console.log(`[overlay] ${new Date().toLocaleTimeString('vi-VN')} tải ảnh nền | ${(req.headers['user-agent'] || '').replace(/.*\) /, '').slice(0, 60)}`);
    return sendFile(res, path.join(__dirname, 'public', 'img', seg[1]));
  }
  // nhạc nền lặp của overlay: public/audio/<file>
  if (seg[0] === 'audio' && seg[1] && /^[\w.-]+$/.test(seg[1])) return sendFile(res, path.join(__dirname, 'public', 'audio', seg[1]));
  // nhạc nền sếp tự bỏ vào thư mục music/ (nhạc có quyền sử dụng): /music = danh sách, /music/<tệp> = phát
  if (seg[0] === 'music') {
    const dir = path.join(__dirname, 'music');
    if (!seg[1]) {
      let l = []; try { l = fs.readdirSync(dir).filter(f => /\.(mp3|ogg|m4a|wav)$/i.test(f)); } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }); return res.end(JSON.stringify(l));
    }
    let f = ''; try { f = decodeURIComponent(seg[1]); } catch {}
    if (!f || /[\\/]|\.\./.test(f)) { res.writeHead(400); return res.end(); }
    return sendFile(res, path.join(dir, f));
  }
  // Vbee gọi lại khi tạo xong (nếu vbee.webhookUrl trỏ về đây)
  if (seg[0] === 'vbee-webhook' && req.method === 'POST') {
    let b = ''; req.on('data', d => b += d); req.on('end', () => { try { engine.vbee?.webhook(JSON.parse(b)); } catch {} res.end('ok'); });
    return;
  }
  // Tiện ích Chrome gửi bình luận: POST /ingest/facebook  {"items":[{"id","name","text"}]} — chỉ nhận từ chính máy này
  if (seg[0] === 'ingest' && rooms[seg[1]] && req.method === 'POST') {
    const ip = req.socket.remoteAddress || '';
    if (!/^(::1|127\.|::ffff:127\.)/.test(ip)) { res.writeHead(403); return res.end(); }
    let b = ''; req.on('data', d => { b += d; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const r = rooms[seg[1]]; let n = 0;
      try {
        for (const it of JSON.parse(b).items || []) {
          if (!it?.text || !it?.name) continue;
          r.onChat({ id: String(it.id || 'fb-' + it.name), name: String(it.name).slice(0, 60) }, String(it.text).slice(0, 300)); n++;
        }
      } catch {}
      if (n) { r.live = true; console.log(`[${seg[1]}] tiện ích gửi ${n} bình luận`); }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, n }));
    });
    return;
  }
  // Thử nhanh bằng trình duyệt: /test/tiktok/gift  /test/tiktok/chat?text=...
  if (seg[0] === 'test' && rooms[seg[1]]) {
    const name = u.searchParams.get('name') || 'Người thử', who = { id: 'test-' + name, name };
    const r = rooms[seg[1]];
    if (seg[2] === 'gift') r.onGift(who, u.searchParams.get('gift') || 'Sư tử', 1, +(u.searchParams.get('coins') || 299));
    else if (seg[2] === 'like') r.onLike(who, +(u.searchParams.get('count') || 5));
    else if (seg[2] === 'share') r.onShare(who);
    else if (seg[2] === 'game' && r.testGame) r.testGame(u.searchParams.get('kind') || '');
    else if (seg[2] === 'scene' && r.nextScene) r.nextScene(u.searchParams.get('id') || '');
    else if (seg[2] === 'seg') r.nextSeg();   // chuyển ngay sang khóa lễ / minigame kế (thử / người dẫn tự chuyển)
    else if (seg[2] === 'join') r.onJoin(who);
    else r.onChat(who, u.searchParams.get('text') || (GAME === 'lop-hoc' ? 'có mặt' : 'Nam mô A Di Đà Phật'));
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('ok');
  }
  res.writeHead(404); res.end('Không tìm thấy');
});
function sendFile(res, f) {
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(b);
  });
}

// Phiên bản giao diện = dấu của index.html + ảnh nền. Đổi file → overlay (LIVE Studio / OBS) tự tải lại, không phải bấm tay.
const PUB = path.join(__dirname, 'public');
// CHUA_PAGE=<file>: server thử dùng trang khác trong public/ (sửa giao diện mới mà khung đang live không tự tải theo)
const PAGE = process.env.CHUA_PAGE || (GAME === 'lop-hoc' ? 'lop-hoc.html' : 'index.html');
const WATCH = [PAGE, path.join('img', 'chanh-dien.jpg'), path.join('img', 'co-giao.png')];
// Lớp Học Vui: ảnh nền tuỳ chọn cho từng bối cảnh (sếp tạo bằng Gemini) — thêm / đổi ảnh thì overlay tự tải lại
if (GAME === 'lop-hoc') for (const id of ['sang', 'hoanghon', 'dem', 'mua', 'thu', 'xuan', 'dong', 'thinghiem', 'thuvien', 'santruong']) WATCH.push(path.join('img', `lh-nen-${id}.jpg`));
function uiVersion() {
  const h = require('crypto').createHash('sha1');
  for (const f of WATCH) { try { h.update(fs.readFileSync(path.join(PUB, f))); } catch {} }
  return h.digest('hex').slice(0, 10);
}
let UIVER = uiVersion(), verT;
for (const f of WATCH) fs.watchFile(path.join(PUB, f), { interval: 2000 }, () => {
  clearTimeout(verT); verT = setTimeout(() => {
    const v = uiVersion(); if (v === UIVER) return; UIVER = v;
    console.log(`[overlay] ${new Date().toLocaleTimeString('vi-VN')} giao diện mới ${v} → báo các khung tự tải lại`);
    for (const r of Object.values(rooms)) r.broadcast({ t: 'ver', ver: v });
  }, 1500);
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const p = new URL(req.url, 'http://x').searchParams.get('p');
  const room = rooms[p]; if (!room) return ws.close();
  room.clients.add(ws); ws.at = Date.now();
  // mở nhiều khung (LIVE Studio + trình duyệt xem thử) thì chỉ 1 khung phát giọng, tránh đọc 2 lần: ưu tiên LIVE Studio / OBS, rồi khung mở sau cùng
  if (!room.voiceOne) {
    room.voiceOne = true; const all = room.broadcast.bind(room);
    room.broadcast = m => {
      if (m.t !== 'speak') return all(m);
      const live = [...room.clients].filter(c => c.readyState === 1), studio = live.filter(c => /TikTokLIVEStudio|OBS/i.test(c.ua || ''));
      const pick = (studio.length ? studio : live).sort((a, b) => b.at - a.at)[0];
      if (pick) pick.send(JSON.stringify(m));
    };
  }
  ws.send(JSON.stringify({ ...room.snapshot(), ver: uiVersion() }));   // khung cũ nối lại sau khi khởi động server → thấy khác bản → tự tải lại
  setTimeout(() => room.voice.kick(), 1500);
  ws.on('message', m => { try { const j = JSON.parse(m); if (j.t === 'spoken') room.voice.done(j.id);
    if (j.t === 'hello') ws.ua = String(j.ua || '');
    if (j.t === 'hello') console.log(`[overlay] ${new Date().toLocaleTimeString('vi-VN')} ${p} khung ${j.w}×${j.h} dpr ${j.dpr} → vẽ ${Math.round(720 * j.sc)}×${Math.round(1280 * j.sc)} | bản ${j.ver || 'CŨ (cần tải lại tay 1 lần)'} | ${j.ua}`); } catch {} });
  ws.on('close', () => { room.clients.delete(ws); if (room.voice.playing) room.voice.done(); });
});

// tắt server (Ctrl+C / đóng cửa sổ): ghi ngay bảng vàng, bộ đếm chưa kịp lưu
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'])
  process.on(sig, () => { for (const r of Object.values(rooms)) if (r.saveT) r.flush(); process.exit(0); });

server.listen(cfg.port || 3000, () => {
  console.log(`\n${GAME === 'lop-hoc' ? 'Lớp Học Vui' : 'Chùa Online'} đang chạy:`);
  for (const p of Object.keys(rooms)) console.log(`  ${p.padEnd(9)} → http://localhost:${cfg.port || 3000}/${p}`);
  console.log(`Giọng đọc: ${cfg.voice.enabled ? cfg.voice.engine : 'tắt'}\n`);
});
