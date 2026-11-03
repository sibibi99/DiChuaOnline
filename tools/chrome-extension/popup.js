const $ = id => document.getElementById(id);
const ago = t => t ? Math.round((Date.now() - t) / 1000) + ' giây trước' : 'chưa có';

async function render() {
  const { st = {} } = await chrome.storage.local.get('st');
  $('server').innerHTML = st.ok === false ? `<span class="bad">✗ ${st.err}</span><br><small>Server Chùa Online (start.bat) đã chạy chưa?</small>`
    : st.ok ? '<span class="ok">✓ Đã kết nối server</span>' : '<small>Chưa gửi lần nào</small>';
  const sc = st.scan;
  $('scan').innerHTML = sc && Date.now() - st.scanAt < 10000
    ? `Đang theo dõi <b>${sc.url}</b><br><small>${sc.articles} khung bình luận trên trang</small>`
    : '<span class="bad">Chưa thấy trang live</span><br><small>Mở trang Live Producer (F5 lại nếu vừa cài tiện ích)</small>';
  $('sent').innerHTML = `Đã gửi: <b>${st.sent || 0}</b> bình luận <small>(${ago(st.at)})</small>`;
  $('last').innerHTML = (st.last || []).map(s => `<li>${s.replace(/</g, '&lt;')}</li>`).join('') || '<li><small>—</small></li>';
}

$('test').onclick = async () => { await chrome.runtime.sendMessage({ t: 'test' }); render(); };
render(); setInterval(render, 1000);
