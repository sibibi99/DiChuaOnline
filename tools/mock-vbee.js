// Server Vbee giả lập để test: voiceCode "custom_*" bị Realtime từ chối -> phải chuyển sang Batch
const http = require('http'); const fs = require('fs');
const AUDIO = fs.readFileSync(process.argv[2] || '/tmp/t.wav');
const reqs = new Map(); let n = 0;
const log = [];
http.createServer((req, res) => {
  let b = ''; req.on('data', d => b += d); req.on('end', () => {
    const auth = req.headers.authorization === 'Bearer TK' && req.headers['app-id'] === 'APP';
    log.push(req.method + ' ' + req.url);
    if (req.url === '/log') { res.end(JSON.stringify(log)); return; }
    if (req.url.startsWith('/audio/')) { res.writeHead(200, { 'Content-Type': 'audio/wav' }); return res.end(AUDIO); }
    if (!auth) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":{"code":"UNAUTHORIZED","message":"bad token"}}'); }
    if (req.url === '/v1/tts' && req.method === 'POST') {
      const j = JSON.parse(b);
      if (j.mode === 'sync') {
        if (j.voiceCode.startsWith('custom_')) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"error":{"code":"BAD_REQUEST","message":"Invalid voice for realtime"}}'); }
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); return res.end(AUDIO);
      }
      if (!j.webhookUrl) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"error":{"code":"BAD_REQUEST","message":"webhookUrl must be defined"}}'); }
      const id = 'req-' + (++n); reqs.set(id, Date.now());
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ requestId: id, status: 'PROCESSING' }));
    }
    const m = req.url.match(/^\/v1\/tts\/requests\/(.+)$/);
    if (m) {
      const done = Date.now() - reqs.get(m[1]) > 1500;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(done ? { requestId: m[1], status: 'COMPLETED', audioLink: 'http://localhost:4555/audio/' + m[1] + '.wav' } : { requestId: m[1], status: 'PROCESSING' }));
    }
    res.writeHead(404); res.end();
  });
}).listen(4555, () => console.log('mock vbee :4555'));
