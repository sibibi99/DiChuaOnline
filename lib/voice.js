// Giọng đọc: hàng chờ ưu tiên, chống spam, bộ nhớ đệm, gọi engine TTS
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { Vbee } = require('./vbee');

const CACHE_DIR = path.join(__dirname, '..', 'cache', 'voice');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const PRIO = { gift: 3, wish: 2, join: 1, like: 1, niem: 0 };
const hash = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 16);

function fillTemplate(obj, text) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return obj.split('{text}').join(text);
  if (Array.isArray(obj)) return obj.map(v => fillTemplate(v, text));
  if (typeof obj === 'object') { const o = {}; for (const k in obj) o[k] = fillTemplate(obj[k], text); return o; }
  return obj;
}

class VoiceEngine {
  constructor(cfg) {
    this.cfg = cfg || {}; this.inflight = new Map();
    if (this.cfg.engine === 'vbee') this.vbee = new Vbee(this.cfg.vbee);
  }

  // Trả về tên file trong cache (hoặc null nếu lỗi / tắt)
  async synth(text) {
    const c = this.cfg;
    if (!c.enabled || c.engine === 'none') return null;
    const key = c.engine === 'vbee' ? (c.vbee?.voiceCode + '|' + c.vbee?.speed) : (c.url || '');
    const id = hash((c.engine || '') + '|' + key + '|' + text);
    const ext = c.engine === 'espeak' ? 'wav' : c.engine === 'vbee' ? (c.vbee?.outputFormat || 'mp3') : (c.fileExt || 'wav');
    const file = `${id}.${ext}`, full = path.join(CACHE_DIR, file);
    if (fs.existsSync(full)) return file;
    if (this.inflight.has(id)) return this.inflight.get(id);
    const p = this._make(text, full).then(() => file).catch(e => { console.error('[voice] lỗi:', e.message); return null; })
      .finally(() => this.inflight.delete(id));
    this.inflight.set(id, p);
    return p;
  }

  async _make(text, out) {
    const c = this.cfg;
    if (c.engine === 'espeak') {
      // Giọng máy dùng để THỬ khi chưa nối giọng Thiện Đức
      await new Promise((ok, no) => execFile('espeak-ng', ['-v', 'vi', '-s', '150', '-w', out, text], e => e ? no(e) : ok()));
      return;
    }
    if (c.engine === 'vbee') {
      // mạng chập chờn ("fetch failed"): thử lại tối đa 2 lần trước khi bỏ câu
      for (let k = 0; ; k++) {
        try { fs.writeFileSync(out, await this.vbee.synth(text)); return; }
        catch (e) {
          if (k >= 2 || !/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket|network|quá thời gian/i.test(e.message + ' ' + (e.cause?.code || ''))) throw e;
          console.log('[voice] Vbee lỗi mạng, thử lại lần', k + 1);
          await new Promise(r => setTimeout(r, 800 * (k + 1)));
        }
      }
    }
    // engine "http": gọi API giọng đọc khác (máy của bạn / dịch vụ)
    if (c.http_khac && !c.url) Object.assign(c, c.http_khac);
    const u = new URL(c.url);
    const q = fillTemplate(c.query || {}, text);
    for (const k in q) u.searchParams.set(k, q[k]);
    const method = (c.method || 'GET').toUpperCase();
    const headers = Object.assign({}, c.headers || {});
    let body;
    if (method !== 'GET' && c.body != null) {
      body = typeof c.body === 'string' ? fillTemplate(c.body, text) : JSON.stringify(fillTemplate(c.body, text));
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), c.timeoutMs || 20000);
    try {
      const res = await fetch(u, { method, headers, body, signal: ac.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
      let buf;
      if (c.responseType === 'json-base64') {
        const j = await res.json(); const b64 = c.jsonField ? c.jsonField.split('.').reduce((o, k) => o && o[k], j) : j.audio;
        buf = Buffer.from(String(b64).replace(/^data:[^,]+,/, ''), 'base64');
      } else if (c.responseType === 'json-url') {
        const j = await res.json(); const url = c.jsonField ? c.jsonField.split('.').reduce((o, k) => o && o[k], j) : j.url;
        buf = Buffer.from(await (await fetch(new URL(url, c.url))).arrayBuffer());
      } else {
        buf = Buffer.from(await res.arrayBuffer());
      }
      if (buf.length < 500) throw new Error('âm thanh trả về quá ngắn');
      fs.writeFileSync(out, buf);
    } finally { clearTimeout(to); }
  }
}

// Hàng chờ đọc cho 1 phòng (1 nền tảng)
class VoiceQueue {
  constructor(engine, cfg, send) {
    this.engine = engine; this.cfg = cfg || {}; this.send = send;
    this.items = []; this.playing = null; this.lastByUser = new Map(); this.lastLike = new Map(); this.lastJoin = new Map(); this.seq = 0;
  }
  push(kind, text, userId) {
    if (!this.cfg.enabled) return;
    const now = Date.now(), cd = (this.cfg.perUserCooldownSec ?? 30) * 1000;
    if (kind === 'like' || (kind === 'join' && userId)) {
      // cảm ơn thả tim / chào người mới vào: giãn cách riêng, không chiếm lượt đọc bình luận của người đó,
      // tối đa 2 câu mỗi loại chờ trong hàng
      const m = kind === 'like' ? this.lastLike : this.lastJoin;
      const cdl = (kind === 'like' ? this.cfg.likeCooldownSec ?? 60 : this.cfg.joinCooldownSec ?? 600) * 1000;
      if (now - (m.get(userId) || 0) < cdl || now - (this.lastByUser.get(userId) || 0) < cd) return;
      if (this.items.filter(i => i.kind === kind).length >= 2) return;
      m.set(userId, now);
    } else if (kind !== 'gift' && userId) {
      if (now - (this.lastByUser.get(userId) || 0) < cd) return;
      this.lastByUser.set(userId, now);
    }
    if (kind === 'niem' && this.items.some(i => i.kind === 'niem' && i.text === text)) return;
    const it = { id: ++this.seq, kind, prio: PRIO[kind] ?? 0, text, t: now };
    this.items.push(it);
    this.items.sort((a, b) => b.prio - a.prio || a.t - b.t);
    const max = this.cfg.maxQueue || 8;
    while (this.items.length > max) {
      // bỏ câu ưu tiên thấp nhất, cũ nhất; không bỏ lời cảm ơn quà
      let idx = -1;
      for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i].kind !== 'gift') { idx = i; break; }
      if (idx < 0) break; this.items.splice(idx, 1);
    }
    this.engine.synth(this.items[0].text); // tạo trước câu sắp đọc
    this._next();
  }
  async _next() {
    if (this.playing || !this.items.length) return;
    if (this.hasListener && !this.hasListener()) return; // chưa có overlay nào mở -> giữ hàng chờ
    const it = this.items.shift(); this.playing = it;
    const file = await this.engine.synth(it.text);
    if (this.items[0]) this.engine.synth(this.items[0].text);
    console.log(`[voice] đọc (${it.kind}):`, it.text, file ? '' : '— không tạo được âm thanh');
    this.send({ t: 'speak', id: it.id, kind: it.kind, text: it.text, url: file ? '/voice/' + file : null });
    clearTimeout(this.guard);
    this.guard = setTimeout(() => this.done(it.id), 8000 + it.text.length * 120); // phòng khi overlay không báo xong
  }
  kick() { this._next(); }
  done(id) {
    if (!this.playing || (id && this.playing.id !== id)) return;
    clearTimeout(this.guard); this.playing = null; setTimeout(() => this._next(), 350);
  }
}

module.exports = { VoiceEngine, VoiceQueue, CACHE_DIR };
