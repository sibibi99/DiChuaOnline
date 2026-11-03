// Nhận bình luận từ content.js, gửi về server Chùa Online trên máy này.
// Gửi từ đây (không gửi từ trang Facebook) để không vướng CSP/CORS của facebook.com.
const DEFAULT_SERVER = 'http://localhost:3000';

async function stats(patch) {
  const { st = {} } = await chrome.storage.local.get('st');
  const next = { ...st, ...patch };
  await chrome.storage.local.set({ st: next });
  return next;
}

async function send(items) {
  const { server = DEFAULT_SERVER } = await chrome.storage.local.get('server');
  try {
    const r = await fetch(server + '/ingest/facebook', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
    });
    const j = await r.json();
    const { st = {} } = await chrome.storage.local.get('st');
    const last = [...items.map(i => `${i.name}: ${i.text}`), ...(st.last || [])].slice(0, 8);
    await stats({ ok: true, err: '', sent: (st.sent || 0) + (j.n || 0), last, at: Date.now() });
    return { ok: true, n: j.n };
  } catch (e) {
    await stats({ ok: false, err: 'Không gửi được về server: ' + e.message, at: Date.now() });
    return { ok: false };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.t === 'comments' && msg.items?.length) { send(msg.items).then(reply); return true; }
  if (msg?.t === 'scan') { stats({ scan: msg.info, scanAt: Date.now() }); }
  if (msg?.t === 'test') { send([{ id: 'thu-tien-ich', name: 'Thử tiện ích', text: 'Nam mô A Di Đà Phật' }]).then(reply); return true; }
});
