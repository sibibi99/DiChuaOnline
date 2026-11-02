// Giọng đọc Vbee (https://api-docs.vbee.vn)
//  - Realtime (mode "sync"): trả âm thanh ngay, ~0,5 giây. Tài liệu chỉ liệt kê vài giọng có sẵn.
//  - Batch (mode "async"): dùng được mọi giọng (kể cả giọng riêng), lấy kết quả bằng cách hỏi lại theo requestId.
//  - mode "auto": thử Realtime trước; nếu Vbee báo giọng không hợp lệ cho Realtime thì chuyển hẳn sang Batch.
const API = 'https://api.vbee.vn/v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

class Vbee {
  constructor(cfg) {
    this.c = Object.assign({ mode: 'auto', outputFormat: 'mp3', bitrate: 64, speed: 1.0, pollMs: 600, timeoutMs: 30000 }, cfg || {});
    this.api = this.c.apiBase || API;
    this.useAsync = this.c.mode === 'async';
    this.waiters = new Map(); // requestId -> resolve(audioLink) khi Vbee gọi webhook
  }
  headers() {
    if (!this.c.token || !this.c.appId) throw new Error('chưa điền vbee.appId / vbee.token trong config.json');
    return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.c.token, 'App-Id': this.c.appId };
  }
  body(text, mode) {
    const b = { text: text.slice(0, 300), voiceCode: this.c.voiceCode, mode, outputFormat: this.c.outputFormat, bitrate: this.c.bitrate, speed: this.c.speed };
    if (this.c.sampleRate) b.sampleRate = this.c.sampleRate;
    if (mode === 'async') b.webhookUrl = this.c.webhookUrl || 'https://example.com/vbee-webhook';
    return JSON.stringify(b);
  }

  async synth(text) {
    if (!this.c.voiceCode) throw new Error('chưa điền vbee.voiceCode');
    if (!this.useAsync) {
      try { return await this.sync(text); }
      catch (e) {
        if (this.c.mode === 'auto' && e.fallback) {
          console.log('[vbee] giọng này không dùng được Realtime → chuyển sang Batch:', e.message);
          this.useAsync = true;
        } else throw e;
      }
    }
    return this.async(text);
  }

  async sync(text, retry = 2) {
    const res = await fetch(this.api + '/tts', { method: 'POST', headers: this.headers(), body: this.body(text, 'sync') });
    const type = res.headers.get('content-type') || '';
    if (res.ok && !type.includes('json')) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 500) return buf;
      throw new Error('Vbee trả âm thanh rỗng');
    }
    const j = await res.json().catch(() => ({}));
    const code = j?.error?.code || j?.error_code || res.status, msg = j?.error?.message || j?.error_message || '';
    if ((res.status === 429 || code === 'TTS_CCR_MAX_LIMIT_REACHED') && retry > 0) { await sleep(700); return this.sync(text, retry - 1); }
    const err = new Error(`Realtime ${code} ${msg}`.trim());
    // giọng không hỗ trợ realtime -> cho phép chuyển sang batch
    err.fallback = res.status === 400 && /voice|giọng|giong|not support|invalid/i.test(msg) && !/credit|text/i.test(msg);
    throw err;
  }

  async async(text, retry = 2) {
    const res = await fetch(this.api + '/tts', { method: 'POST', headers: this.headers(), body: this.body(text, 'async') });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.requestId) {
      if ((res.status === 429) && retry > 0) { await sleep(700); return this.async(text, retry - 1); }
      throw new Error(`Batch ${j?.error?.code || res.status} ${j?.error?.message || ''}`.trim());
    }
    const id = j.requestId, t0 = Date.now();
    const viaHook = new Promise(r => this.waiters.set(id, r));
    try {
      while (Date.now() - t0 < this.c.timeoutMs) {
        const link = await Promise.race([viaHook, sleep(this.c.pollMs).then(() => null)]);
        if (link) return this.download(link);
        const r = await fetch(`${this.api}/tts/requests/${id}`, { headers: this.headers() });
        const s = await r.json().catch(() => ({}));
        if (s.status === 'COMPLETED' && s.audioLink) return this.download(s.audioLink);
        if (s.status === 'FAILED' || s.error) throw new Error('Batch lỗi: ' + (s.error?.message || s.status));
      }
      throw new Error('Batch quá thời gian chờ');
    } finally { this.waiters.delete(id); }
  }

  async download(link) {
    const r = await fetch(link);
    if (!r.ok) throw new Error('không tải được file âm thanh Vbee: HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  }

  // Vbee gọi lại webhook (nếu webhookUrl trỏ về VPS này): /vbee-webhook
  webhook(payload) {
    const id = payload?.requestId || payload?.request_id;
    const link = payload?.audioLink || payload?.audio_link;
    if (id && link && this.waiters.has(id)) this.waiters.get(id)(link);
  }
}

module.exports = { Vbee };
