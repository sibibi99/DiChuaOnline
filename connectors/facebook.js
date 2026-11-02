// Đọc bình luận Facebook Live của Trang (Graph API chính thức)
// Cần: pageId + pageAccessToken (quyền pages_read_engagement, pages_read_user_content)
const GRAPH = 'https://graph.facebook.com/v21.0';
const STREAM = 'https://streaming-graph.facebook.com';

module.exports = function startFacebook(room, opt) {
  let stopped = false, current = null, ac = null, timer;

  async function findLive() {
    const u = `${GRAPH}/${opt.pageId}/live_videos?broadcast_status=["LIVE"]&fields=id,status&access_token=${encodeURIComponent(opt.pageAccessToken)}`;
    const j = await (await fetch(u)).json();
    if (j.error) throw new Error(j.error.message);
    return j.data?.[0]?.id || null;
  }

  async function listen(videoId) {
    ac = new AbortController();
    const url = `${STREAM}/${videoId}/live_comments?access_token=${encodeURIComponent(opt.pageAccessToken)}` +
      `&comment_rate=one_hundred_per_second&fields=from{name,id},message`;
    const res = await fetch(url, { signal: ac.signal, headers: { Accept: 'text/event-stream' } });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    console.log('[facebook] đang đọc bình luận live', videoId); room.live = true;
    const dec = new TextDecoder(); let buf = '';
    for await (const chunk of res.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (!data) continue;
        try {
          const c = JSON.parse(data);
          const u = { id: c.from?.id || ('fb-' + (c.from?.name || Math.random())), name: c.from?.name || 'Phật tử' };
          if (c.message) room.onChat(u, c.message);
        } catch {}
      }
    }
  }

  async function loop() {
    if (stopped) return;
    try {
      const id = await findLive();
      if (!id) { console.log('[facebook] Trang chưa live → kiểm tra lại sau 60 giây'); }
      else if (id !== current) { current = id; await listen(id); console.log('[facebook] luồng bình luận đóng'); current = null; room.live = false; }
    } catch (e) {
      if (!stopped) console.log('[facebook] lỗi:', e.message); current = null;
    }
    if (!stopped) timer = setTimeout(loop, current ? 5000 : 60000);
  }
  loop();
  return () => { stopped = true; clearTimeout(timer); try { ac?.abort(); } catch {} };
};
