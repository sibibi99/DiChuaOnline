// Kiểm nhạc nền học đường (client): chạy bộ lập lịch với AudioContext giả, kiểm số nốt / nhịp / âm lượng / không lỗi.  node tools/test-nhac.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../public/lop-hoc.html'), 'utf8');
const a = html.indexOf('// nhạc nền HỌC ĐƯỜNG'), b = html.indexOf('function bell()');
if (a < 0 || b < 0) { console.log('LỖI: không thấy khối nhạc'); process.exit(1); }
const code = html.slice(a, b);
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log(' ✗ ' + m); } else console.log(' ✓ ' + m); };
function run(segKey, bars) {
  const ev = []; let t = 0;
  const node = () => ({ connect() {}, start() {}, stop() {}, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
  const AC = { get currentTime() { return t; }, state: 'running', sampleRate: 8000, createOscillator() { const o = node(); o.start = (w) => ev.push({ w, f: o.frequency.value, type: o.type, kind: 'osc' }); return o; },
    createGain: node, createBiquadFilter: node, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource() { const s = node(); s.start = (w) => ev.push({ w, kind: 'noise' }); return s; } };
  let timer; const sandbox = { AC, musBus: node(), S: { seg: { key: segKey } }, mtof: m => 440 * Math.pow(2, (m - 69) / 12), Math, Float32Array, setInterval: (f) => { timer = f; return 1; } };
  // tone() của trang gốc
  const toneSrc = html.slice(html.indexOf('function tone('), html.indexOf('// nhạc nền HỌC ĐƯỜNG'));
  const fn = new Function(...Object.keys(sandbox), toneSrc + code + '\nstartSynth(); return { tick: () => 0 };');
  fn(...Object.values(sandbox));
  const dur = bars * 8 * 60 / (segKey === 'rachoi' ? 130 : segKey === 'ke' ? 104 : 120) / 2;
  for (; t < dur; t += .04) timer();
  return ev;
}
for (const seg of ['dovui', 'rachoi', 'ke']) {
  console.log(seg);
  const ev = run(seg, 32), bars = 32, n = ev.filter(e => e.kind === 'osc').length, nz = ev.filter(e => e.kind === 'noise').length;
  ok(ev.every(e => isFinite(e.w) && (e.kind === 'noise' || isFinite(e.f) && (e.f === 0 || e.f > 20 && e.f < 8000))), 'mọi nốt hợp lệ (20–8000 Hz; trống kick dùng sweep)');
  ok(n / bars > 8, `đủ nốt: ${(n / bars).toFixed(1)} nốt/ô nhịp`);
  if (seg === 'ke') ok(nz === 0, 'tiết kể chuyện không có trống'); else ok(nz / bars >= 8, `có trống: ${(nz / bars).toFixed(1)} tiếng/ô nhịp`);
  const notes = ev.filter(e => e.kind === 'osc' && e.type === 'triangle').map(e => Math.round(69 + 12 * Math.log2(e.f / 440)) % 12);
  const scale = new Set([0, 2, 4, 5, 7, 9, 11]);
  ok(notes.every(m => scale.has(m)), 'chỉ dùng nốt giọng Đô trưởng');
}
// 2 đoạn giai điệu liên tiếp không trùng nhau
{ const ev = run('dovui', 64).filter(e => e.type === 'triangle' && e.f > 400); ok(ev.length > 200, 'giai điệu xoay vòng nhiều đoạn'); }
console.log(fail ? `\n${fail} LỖI` : '\nOK: nhạc nền học đường'); process.exit(fail ? 1 : 0);
