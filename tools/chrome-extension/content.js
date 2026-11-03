// Đọc bình luận mới trên trang Facebook Live (Live Producer hoặc trang xem video live).
// Facebook đổi tên class liên tục nên chỉ dựa vào thuộc tính ổn định:
//   mỗi bình luận là [role="article"], aria-label dạng "Bình luận của <tên> …" / "Comment by <tên> …",
//   nội dung nằm trong div[dir="auto"].
(() => {
  const ACTIVE = () => /\/live\/producer|\/videos\/|\/watch\/live|[?&]v=/.test(location.href);
  const seenEl = new WeakSet();
  const recent = new Map();        // tên|nội dung -> lần cuối gửi (FB vẽ lại phần tử thì không gửi trùng)
  let primed = false;              // lần quét đầu: bỏ qua bình luận cũ đã có sẵn trên trang

  const LABEL = /^(?:Bình luận|Phản hồi|Comment|Reply)(?: của| by| dưới tên| from)?\s+(.+?)(?:\s+\d+\s*(?:giây|phút|giờ|ngày|tuần|năm|s|m|h|d|w|y)\b.*)?$/i;

  function parse(art) {
    const label = art.getAttribute('aria-label') || '';
    let name = (label.match(LABEL) || [])[1] || '';
    const link = art.querySelector('a[role="link"][href*="facebook.com"], a[href^="/"]');
    if (!name && link) name = (link.innerText || '').trim().split('\n')[0];
    name = name.replace(/\s+/g, ' ').trim();
    if (!name) return null;
    // nội dung: các div[dir=auto] không phải tên, không phải dòng thời gian / nút
    const parts = [];
    for (const d of art.querySelectorAll('div[dir="auto"], span[dir="auto"]')) {
      if (d.querySelector('div[dir="auto"]')) continue;            // chỉ lấy lớp trong cùng
      if (d.closest('[role="article"]') !== art) continue;         // bỏ phản hồi lồng bên trong
      const t = (d.innerText || '').trim();
      if (!t || t === name || /^(Thích|Phản hồi|Like|Reply|Chia sẻ|Share|Tác giả|Author|\d+\s*(giây|phút|giờ|s|m|h))$/i.test(t)) continue;
      if (!parts.includes(t)) parts.push(t);
    }
    const text = parts.join(' ').trim();
    if (!text) return null;
    const href = link?.getAttribute('href') || '';
    const uid = (href.match(/[?&]id=(\d+)/) || href.match(/facebook\.com\/([\w.]+)/) || [])[1];
    return { id: 'fb-' + (uid || name), name, text };
  }

  function scan() {
    if (!ACTIVE()) return;
    const arts = document.querySelectorAll('[role="article"]');
    const items = [], now = Date.now();
    for (const a of arts) {
      if (seenEl.has(a)) continue;
      const c = parse(a);
      if (!c) continue;                                            // chưa vẽ xong nội dung -> lần sau đọc lại
      seenEl.add(a);
      const k = c.name + '|' + c.text;
      if (recent.has(k) && now - recent.get(k) < 120000) continue;
      recent.set(k, now);
      if (primed) items.push(c);
    }
    primed = true;
    if (recent.size > 2000) for (const [k, t] of recent) if (now - t > 600000) recent.delete(k);
    try {
      chrome.runtime.sendMessage({ t: 'scan', info: { url: location.pathname, articles: arts.length } });
      if (items.length) chrome.runtime.sendMessage({ t: 'comments', items });
    } catch { /* tiện ích vừa được tải lại: trang cần F5 */ }
  }

  setInterval(scan, 1500);
})();
