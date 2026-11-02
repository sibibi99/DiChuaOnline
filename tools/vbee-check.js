// Kiểm tra Vbee: liệt kê giọng riêng (tìm mã giọng Thiện Đức) và tạo thử 1 câu
// Chạy:  node tools/vbee-check.js            -> liệt kê giọng
//        node tools/vbee-check.js thu         -> tạo thử "Nam mô A Di Đà Phật" bằng voiceCode trong config.json
const fs = require('fs'), path = require('path');
const cfgPath = path.join(__dirname, '..', 'config.json');
if (!fs.existsSync(cfgPath)) { console.log('Chưa có config.json — chạy start.bat một lần để tạo.'); process.exit(1); }
const v = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).voice.vbee || {};
const H = { Authorization: 'Bearer ' + v.token, 'App-Id': v.appId, 'app-id': v.appId, 'Content-Type': 'application/json' };

async function list() {
  for (const own of ['PERSONAL', 'COMMUNITY', 'VBEE']) {
    let found = null;
    for (const q of [`voice_ownership=${own}&language_code=vi-VN&limit=100`, `voiceOwnership=${own}&languageCode=vi-VN&limit=100`]) {
      const r = await fetch('https://vbee.vn/api/public/v1/voices?' + q, { headers: H }).catch(e => ({ ok: false, statusText: e.message }));
      if (!r.ok) { found = found || { err: r.status + ' ' + r.statusText }; continue; }
      const j = await r.json(); if (j?.result?.voices) { found = j.result.voices; break; }
    }
    console.log(`\n=== Giọng ${own} ===`);
    if (!found || found.err) { console.log('  Không đọc được:', found?.err || 'không rõ'); continue; }
    if (!found.length) console.log('  (không có)');
    for (const g of found) console.log(`  ${g.name.padEnd(28)} mã: ${g.code}`);
  }
  console.log('\n→ Sao chép "mã" của giọng Thiện Đức vào config.json → voice.vbee.voiceCode');
}

async function thu() {
  const { Vbee } = require('../lib/vbee');
  const vb = new Vbee(v); const t0 = Date.now();
  try {
    const buf = await vb.synth('A Di Đà Phật, cảm ơn Minh Anh đã cúng dường Hoa hồng.');
    const out = path.join(__dirname, '..', 'thu-giong-vbee.' + (v.outputFormat || 'mp3'));
    fs.writeFileSync(out, buf);
    console.log(`OK (${vb.useAsync ? 'Batch' : 'Realtime'}, ${Date.now() - t0} ms) → mở file để nghe: ${out}`);
  } catch (e) { console.log('LỖI:', e.message); }
}

(process.argv[2] === 'thu' ? thu : list)();
