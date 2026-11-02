// Chùa Online Live — server chính
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { Room } = require('./lib/room');
const { VoiceEngine, CACHE_DIR } = require('./lib/voice');

const cfgFile = fs.existsSync(path.join(__dirname, 'config.json')) ? 'config.json' : 'config.example.json';
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, cfgFile), 'utf8'));
if (process.env.VOICE_ENGINE) cfg.voice.engine = process.env.VOICE_ENGINE;
console.log('Cấu hình:', cfgFile);

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
  else if (p === 'facebook') require('./connectors/facebook')(rooms[p], pc);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const seg = u.pathname.split('/').filter(Boolean);
  if (!seg.length) { res.writeHead(302, { Location: '/' + Object.keys(rooms)[0] }); return res.end(); }
  if (seg.length === 1 && rooms[seg[0]]) return sendFile(res, path.join(__dirname, 'public', 'index.html'));
  if (seg[0] === 'voice' && seg[1] && /^[\w.]+$/.test(seg[1])) return sendFile(res, path.join(CACHE_DIR, seg[1]));
  // Vbee gọi lại khi tạo xong (nếu vbee.webhookUrl trỏ về đây)
  if (seg[0] === 'vbee-webhook' && req.method === 'POST') {
    let b = ''; req.on('data', d => b += d); req.on('end', () => { try { engine.vbee?.webhook(JSON.parse(b)); } catch {} res.end('ok'); });
    return;
  }
  // Thử nhanh bằng trình duyệt: /test/tiktok/gift  /test/tiktok/chat?text=...
  if (seg[0] === 'test' && rooms[seg[1]]) {
    const r = rooms[seg[1]], who = { id: 'test', name: u.searchParams.get('name') || 'Người thử' };
    if (seg[2] === 'gift') r.onGift(who, u.searchParams.get('gift') || 'Sư tử', 1, +(u.searchParams.get('coins') || 299));
    else r.onChat(who, u.searchParams.get('text') || 'Nam mô A Di Đà Phật');
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

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const p = new URL(req.url, 'http://x').searchParams.get('p');
  const room = rooms[p]; if (!room) return ws.close();
  room.clients.add(ws);
  ws.send(JSON.stringify(room.snapshot()));
  setTimeout(() => room.voice.kick(), 1500);
  ws.on('message', m => { try { const j = JSON.parse(m); if (j.t === 'spoken') room.voice.done(j.id); } catch {} });
  ws.on('close', () => { room.clients.delete(ws); if (room.voice.playing) room.voice.done(); });
});

server.listen(cfg.port || 3000, () => {
  console.log(`\nChùa Online đang chạy:`);
  for (const p of Object.keys(rooms)) console.log(`  ${p.padEnd(9)} → http://localhost:${cfg.port || 3000}/${p}`);
  console.log(`Giọng đọc: ${cfg.voice.enabled ? cfg.voice.engine : 'tắt'}\n`);
});
