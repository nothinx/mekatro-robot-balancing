import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import * as S from './sim.js';
import { rakitRobot, WARNA_KENOP } from './model.js';

const $ = id => document.getElementById(id);
const fmt = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',').replace('-', '−');
const lencana = $('lencana');

// ---------- Simulasi ----------
const s = S.buatRobot();
S.reset(s, S.sudutSetimbang(s) + 2);
let tMulai = 0, tBerdiri = 0;

// ---------- Three.js ----------
const wadah = $('layar');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  lencana.dataset.nada = 'bahaya';
  lencana.innerHTML = '<strong>Tampilan 3D tidak bisa dibuat.</strong>Browser ini tidak menyediakan WebGL. Buka di Chrome atau Edge terbaru dan aktifkan akselerasi grafis.';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
wadah.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdcdbd5);
scene.fog = new THREE.Fog(0xdcdbd5, 2.2, 6);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const kamera = new THREE.PerspectiveCamera(32, 1, 0.01, 40);
kamera.position.set(0.42, 0.26, 0.58);
const kontrol = new OrbitControls(kamera, renderer.domElement);
kontrol.target.set(0, 0.12, 0);
kontrol.enableDamping = true;
kontrol.minDistance = 0.15; kontrol.maxDistance = 3;
kontrol.maxPolarAngle = Math.PI / 2 - 0.03;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8577, 0.55));
const matahari = new THREE.DirectionalLight(0xffffff, 2.0);
matahari.position.set(0.9, 1.8, 0.7);
matahari.castShadow = true;
matahari.shadow.mapSize.set(2048, 2048);
Object.assign(matahari.shadow.camera, { left: -0.45, right: 0.45, top: 0.45, bottom: -0.45, near: 0.5, far: 4 });
matahari.shadow.bias = -0.0003; matahari.shadow.normalBias = 0.002;
scene.add(matahari, matahari.target);

// Lantai keramik lab 30 cm
function teksturLantai() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d');
  const ubin = 256;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 224 + Math.round(Math.random() * 10);
    x.fillStyle = `rgb(${v},${v - 2},${v - 7})`; x.fillRect(i * ubin, j * ubin, ubin, ubin);
    for (let k = 0; k < 500; k++) { const g = v - 18 + Math.random() * 30; x.fillStyle = `rgba(${g},${g},${g - 4},.35)`; x.fillRect(i * ubin + Math.random() * ubin, j * ubin + Math.random() * ubin, 2, 2); }
  }
  x.strokeStyle = '#a9a69c'; x.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * ubin, 0); x.lineTo(i * ubin, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i * ubin); x.lineTo(1024, i * ubin); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const tl = teksturLantai(); tl.repeat.set(30 / 1.2, 8 / 1.2);
const lantai = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshStandardMaterial({ map: tl, roughness: 0.55, metalness: 0 }));
lantai.rotation.x = -Math.PI / 2; lantai.receiveShadow = true; scene.add(lantai);

// Meteran pita sepanjang lintasan, nol di posisi awal robot
function meteran() {
  const pjg = 6, px = 6000, c = document.createElement('canvas'); c.width = px; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#f2c230'; x.fillRect(0, 0, px, 64);
  x.fillStyle = '#1d1f21'; x.font = '600 22px Segoe UI, sans-serif'; x.textAlign = 'center';
  for (let mm = 0; mm <= pjg * 1000; mm += 10) {
    const cm = (mm - pjg * 500) / 10, X = mm * px / (pjg * 1000);
    const panjang = cm % 10 === 0 ? 30 : cm % 5 === 0 ? 20 : 11;
    x.fillRect(X - 1, 0, 2, panjang);
    if (cm % 10 === 0) x.fillText(String(cm), X, 56);
  }
  x.fillStyle = '#b8322a'; x.fillRect(px / 2 - 2, 0, 4, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pjg, 0.026), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.0006, 0.13); m.receiveShadow = true;
  return m;
}
scene.add(meteran());

// ---------- Robot ----------
let model;
const garisTegak = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.27, 0)]), new THREE.LineDashedMaterial({ color: 0x1d1f21, dashSize: 0.008, gapSize: 0.006, depthTest: false }));
garisTegak.computeLineDistances(); garisTegak.renderOrder = 9;

function bangunModel() {
  if (model) {
    scene.remove(model.root);
    model.root.traverse(o => { if (o.geometry && !o.geometry.parameters?.shapes) o.geometry.dispose(); });
    model.lcd.dispose();
  }
  model = rakitRobot({ ...s.b, offsetBaterai: s.o.offsetBaterai / 1 }, s.o.motor, $('lcd'));
  model.root.add(garisTegak);
  scene.add(model.root);
  model.com.visible = garisTegak.visible = $('tampilCOM').checked;
}
bangunModel();

// ---------- Label komponen ----------
const LABEL = [['mpu', 'MPU6050', 'kiri'], ['l298n', 'L298N', 'kiri'], ['bp', 'Black Pill F411', 'kiri'], ['baterai', 'Baterai 2S 18650', 'atas'], ['kenop', 'Kenop Kp, Ki, Kd', 'kanan'], ['lcd', 'LCD 16x2 I2C', 'atas'], ['enc', 'Encoder LM393', 'kiri'], ['motor', 'Motor + gearbox', 'kanan'], ['com', 'Pusat massa', 'kanan']];
const lapisLabel = $('label');
const elLabel = LABEL.map(([k, teks, arah]) => { const e = document.createElement('span'); e.textContent = teks; e.className = arah; lapisLabel.appendChild(e); return [k, e]; });
const v3 = new THREE.Vector3();
function perbaruiLabel(w, h) {
  const tampil = $('tampilLabel').checked;
  for (const [k, e] of elLabel) {
    const obj = model.jangkar[k];
    if (!tampil || !obj || (k === 'com' && !model.com.visible)) { e.style.display = 'none'; continue; }
    obj.getWorldPosition(v3).project(kamera);
    if (v3.z > 1) { e.style.display = 'none'; continue; }
    e.style.display = '';
    e.style.left = ((v3.x + 1) / 2 * w) + 'px';
    e.style.top = ((1 - v3.y) / 2 * h) + 'px';
  }
}

// ---------- Kamera ----------
let modeKamera = 'ikuti';
document.querySelectorAll('[data-kamera]').forEach(b => b.addEventListener('click', () => {
  modeKamera = b.dataset.kamera;
  document.querySelectorAll('[data-kamera]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  kontrol.enabled = modeKamera !== 'samping';
  if (modeKamera === 'ikuti') { kamera.position.set(s.x + 0.42, 0.26, 0.58); kontrol.target.set(s.x, 0.12, 0); }
}));
function aturKamera(dt) {
  if (modeKamera === 'samping') {
    kamera.position.set(s.x, 0.13, 0.78); kontrol.target.set(s.x, 0.13, 0); kamera.lookAt(kontrol.target);
  } else if (modeKamera === 'ikuti') {
    const dx = (s.x - kontrol.target.x) * (1 - Math.exp(-6 * dt));
    kontrol.target.x += dx; kamera.position.x += dx;
  }
  matahari.position.set(s.x + 0.9, 1.8, 0.7); matahari.target.position.set(s.x, 0, 0);
}

// ---------- Kenop ----------
const KENOP = [
  { nama: 'Kp', satuan: 'PWM/°', maks: 'kpMax', d: 1 },
  { nama: 'Ki', satuan: 'PWM/(°·s)', maks: 'kiMax', d: 0 },
  { nama: 'Kd', satuan: 'PWM/(°/s)', maks: 'kdMax', d: 2 },
];
const SUDUT = 270;
const busur = (r, a0, a1) => {
  const p = a => [50 + r * Math.sin(a * Math.PI / 180), 50 - r * Math.cos(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const kenopEl = KENOP.map((k, i) => {
  const warna = '#' + WARNA_KENOP[i].toString(16).padStart(6, '0');
  const d = document.createElement('div'); d.className = 'kenop';
  d.innerHTML = `<span class="nama" id="nk${i}">${k.nama}</span>
    <svg viewBox="0 0 100 100" tabindex="0" role="slider" aria-labelledby="nk${i}" aria-valuemin="0" aria-valuemax="4095">
      <path d="${busur(40, -135, 135)}" fill="none" stroke="#dedcd4" stroke-width="7" stroke-linecap="round"/>
      <path class="isi" fill="none" stroke="${warna}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="29" fill="#2a2b2e"/><circle cx="50" cy="50" r="24" fill="#202124"/>
      <line class="jarum" x1="50" y1="50" x2="50" y2="28" stroke="#f4f4f0" stroke-width="4" stroke-linecap="round"/>
    </svg>
    <span class="nilai"></span><span class="adc"></span>`;
  $('kenopBaris').appendChild(d);
  const svg = d.querySelector('svg');
  const ubah = v => { s.o.adc[i] = Math.max(0, Math.min(1, v)); gambarKenop(i); };
  let y0 = 0, v0 = 0;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); y0 = e.clientY; v0 = s.o.adc[i]; svg.focus(); });
  svg.addEventListener('pointermove', e => { if (svg.hasPointerCapture(e.pointerId)) ubah(v0 + (y0 - e.clientY) / 220); });
  svg.addEventListener('wheel', e => { e.preventDefault(); ubah(s.o.adc[i] - Math.sign(e.deltaY) * 0.01); }, { passive: false });
  svg.addEventListener('keydown', e => {
    const langkah = { ArrowUp: 0.01, ArrowRight: 0.01, ArrowDown: -0.01, ArrowLeft: -0.01, PageUp: 0.1, PageDown: -0.1 }[e.key];
    if (langkah !== undefined) { ubah(s.o.adc[i] + langkah); e.preventDefault(); }
    else if (e.key === 'Home') { ubah(0); e.preventDefault(); }
    else if (e.key === 'End') { ubah(1); e.preventDefault(); }
  });
  return { svg, isi: d.querySelector('.isi'), jarum: d.querySelector('.jarum'), nilai: d.querySelector('.nilai'), adc: d.querySelector('.adc') };
});
function gambarKenop(i) {
  const k = KENOP[i], e = kenopEl[i], f = s.o.adc[i], a = -135 + f * SUDUT;
  const adc = Math.round(f * 4095);
  const g = s.o[k.maks] * f * f;
  e.isi.setAttribute('d', f > 0.004 ? busur(40, -135, a) : '');
  e.jarum.setAttribute('transform', `rotate(${a} 50 50)`);
  e.nilai.textContent = fmt(g, k.d);
  e.adc.textContent = `ADC ${adc} · ${k.satuan}`;
  e.svg.setAttribute('aria-valuenow', adc);
  e.svg.setAttribute('aria-valuetext', `${k.nama} ${fmt(g, k.d)} ${k.satuan}`);
}
KENOP.forEach((_, i) => gambarKenop(i));

// ---------- LCD 16x2 I2C (canvas yang sama dipakai panel dan tekstur 3D) ----------
const lcd = $('lcd'), lcdCtx = lcd.getContext('2d');
const kanan = (v, n, d) => Math.min(v, 10 ** (n - (d ? d + 1 : 0)) - 10 ** -d).toFixed(d).padStart(n);
const bertanda = (v, n, d) => ((v < 0 ? '-' : '+') + kanan(Math.abs(v), n - 1, d).trim()).padStart(n);
let tLCD = 0;
function tulisLCD() {
  const g = s.gain;
  const baris = [
    `P${kanan(g.kp, 4, 1)} I${kanan(g.ki, 3, 0)} D${kanan(g.kd, 4, 2)}`,
    s.o.motor === 'tt' ? `A${bertanda(s.est - s.offsetSudut, 5, 1)} v${bertanda(s.vEnc, 5, 2)}m/s` : `A${bertanda(s.est - s.offsetSudut, 5, 1)} tanpa enc`,
  ];
  const cw = 30, ch = 52, m = 16;
  lcdCtx.fillStyle = '#1f4fd6'; lcdCtx.fillRect(0, 0, lcd.width, lcd.height);
  lcdCtx.font = 'bold 40px Consolas, "Courier New", monospace'; lcdCtx.textAlign = 'center'; lcdCtx.textBaseline = 'middle';
  baris.forEach((b, j) => {
    for (let i = 0; i < 16; i++) {
      const x = m + i * cw, y = m + j * ch;
      lcdCtx.fillStyle = 'rgba(255,255,255,.08)'; lcdCtx.fillRect(x + 2, y + 3, cw - 4, ch - 6);
      lcdCtx.fillStyle = '#eef4ff'; lcdCtx.fillText(b[i] ?? ' ', x + cw / 2, y + ch / 2 + 2);
    }
  });
  lcd.setAttribute('aria-label', `LCD: ${baris[0]} / ${baris[1]}`);
  model.lcd.needsUpdate = true;
}

// ---------- Tombol ----------
const btn = { kalib: $('btnKalib'), nol: $('btnNol'), jalan: $('btnJalan'), maju: $('btnDorongMaju'), mundur: $('btnDorongMundur'), reset: $('btnReset') };
btn.kalib.onclick = () => S.kalibrasi(s);
btn.nol.onclick = () => S.setelTitikNol(s);
btn.jalan.onclick = () => {
  if (s.mode === 'jalan') S.matikan(s);
  else { S.nyalakan(s); tMulai = s.t; tBerdiri = 0; }
};
const gaya = () => +$('gayaDorong').value;
btn.maju.onclick = () => S.dorong(s, gaya());
btn.mundur.onclick = () => S.dorong(s, -gaya());
btn.reset.onclick = () => { if (s.mode === 'jalan') S.matikan(s); S.reset(s, S.sudutSetimbang(s) + 2); };
$('gayaDorong').oninput = e => { $('oDorong').textContent = fmt(+e.target.value, 1) + ' N'; };

// ---------- Pengaturan ----------
const pilihVarian = $('varian'), pilihMotor = $('motor');
for (const [k, v] of Object.entries(S.VARIAN)) pilihVarian.add(new Option(v.nama + (k === 'standar' ? ' (disarankan)' : ''), k, false, k === s.o.varian));
for (const [k, v] of Object.entries(S.MOTOR)) pilihMotor.add(new Option(v.nama, k, false, k === s.o.motor));
function ubahBadan() {
  if (s.mode === 'jalan') S.matikan(s);
  S.ubahFisik(s); bangunModel(); S.reset(s, S.sudutSetimbang(s) + 2); tulisDataFisik();
}
pilihVarian.onchange = () => { s.o.varian = pilihVarian.value; ubahBadan(); };
pilihMotor.onchange = () => { s.o.motor = pilihMotor.value; ubahBadan(); };
$('offsetBat').oninput = e => {
  s.o.offsetBaterai = +e.target.value / 1000; $('oOffset').textContent = fmt(+e.target.value, 0) + ' mm';
  const pegang = s.dipegang; S.ubahFisik(s); bangunModel(); tulisDataFisik();
  if (pegang) S.reset(s, S.sudutSetimbang(s) + 2);
};
$('vbat').oninput = e => { s.o.vbat = +e.target.value; $('oVbat').textContent = fmt(s.o.vbat, 1) + ' V'; tulisDataFisik(); };
$('backlash').onchange = e => { s.o.backlashAktif = e.target.checked; };
$('alpha').oninput = e => { s.o.alpha = +e.target.value; $('oAlpha').textContent = fmt(s.o.alpha, 3); };
$('pwmMin').oninput = e => { s.o.pwmMin = +e.target.value; $('oPwmMin').textContent = String(s.o.pwmMin); };
$('loopHz').onchange = e => { s.o.loopHz = +e.target.value; s.tKontrol = s.t; };
$('batas').oninput = e => { s.o.batasSudut = +e.target.value; $('oBatas').textContent = s.o.batasSudut + '°'; };
$('tampilCOM').onchange = e => { model.com.visible = garisTegak.visible = e.target.checked; };
['gayaDorong', 'offsetBat', 'vbat', 'alpha', 'pwmMin', 'batas'].forEach(id => $(id).dispatchEvent(new Event('input')));

function tulisDataFisik() {
  const b = s.b, m = s.m;
  const tau = Math.sqrt((b.Ib + b.M * b.l * b.l) / (b.M * S.G * b.l));
  const vMaks = m.rpmBebas * (Math.max(0, s.o.vbat - 2) / m.Vr) * 2 * Math.PI / 60 * S.RODA.r;
  const baris = [
    ['Massa badan', fmt(b.M * 1000, 0) + ' g'],
    ['Pusat massa di atas sumbu', fmt(b.l * 1000, 0) + ' mm'],
    ['Tinggi total', fmt(b.tinggiTotal * 1000, 0) + ' mm'],
    ['Jarak antar-dek', fmt(S.VARIAN[s.o.varian].jarak * 1000, 0) + ' mm'],
    ['Sudut setimbang', fmt(S.sudutSetimbang(s), 2) + '°'],
    ['Konstanta waktu jatuh', fmt(tau * 1000, 0) + ' ms'],
    ['Kecepatan maks roda', fmt(vMaks, 2) + ' m/s'],
  ];
  $('dataFisik').innerHTML = baris.map(([a, v]) => `<dt>${a}</dt><dd>${v}</dd>`).join('');
  $('ketVarian').textContent = S.VARIAN[s.o.varian].ket + ' Setelah badan diubah, setel titik nol lagi.';
}
tulisDataFisik();

// ---------- Rekaman, grafik, serial ----------
const rekaman = [];
let tRekam = 0, tSerial = 0;
const serialBaris = [];
function rekam() {
  if (s.t >= tRekam) {
    tRekam = s.t + 0.02;
    rekaman.push({ t: s.t, th: s.th * S.DEG, est: s.est, pwm: s.pwm, enc: s.enc, ...s.gain });
    while (rekaman.length && rekaman[0].t < s.t - 30) rekaman.shift();
  }
  if (s.t >= tSerial) {
    tSerial = s.t + 0.1;
    serialBaris.push(`${Math.round(s.t * 1000)},${(s.est - s.offsetSudut).toFixed(2)},${s.pwm},${s.gain.kp.toFixed(1)},${s.gain.ki.toFixed(0)},${s.gain.kd.toFixed(2)},${s.enc}`);
    if (serialBaris.length > 7) serialBaris.shift();
    $('serial').textContent = 't_ms,sudut,pwm,kp,ki,kd,enc\n' + serialBaris.join('\n');
  }
}
$('btnCsv').onclick = () => {
  if (!rekaman.length) return;
  const isi = 't_s,sudut_sebenarnya,sudut_estimasi,pwm,kp,ki,kd,enc\n' + rekaman.map(r => [r.t.toFixed(3), r.th.toFixed(3), r.est.toFixed(3), r.pwm, r.kp.toFixed(2), r.ki.toFixed(1), r.kd.toFixed(3), r.enc].join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([isi], { type: 'text/csv' }));
  a.download = `balancing-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const plot = $('plot'), ctx = plot.getContext('2d');
function gambarPlot() {
  const dpr = Math.min(devicePixelRatio, 2), W = plot.clientWidth, H = plot.clientHeight;
  if (plot.width !== Math.round(W * dpr)) { plot.width = Math.round(W * dpr); plot.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const kiri = 34, kanan = W - 6, hA = H * 0.6, pjg = 8, t1 = s.t, t0 = t1 - pjg;
  const data = rekaman.filter(r => r.t >= t0);
  let lim = 5;
  for (const r of data) while (Math.abs(r.th) > lim && lim < 90) lim = lim < 10 ? 10 : lim < 20 ? 20 : lim < 45 ? 45 : 90;
  const X = t => kiri + (t - t0) / pjg * (kanan - kiri);
  const Ya = v => 8 + (1 - (Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim)) * (hA - 16);
  const Yp = v => hA + 8 + (1 - (v + 255) / 510) * (H - hA - 16);
  ctx.font = '11px Segoe UI, sans-serif'; ctx.fillStyle = '#565b61'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#e4e2db'; ctx.lineWidth = 1;
  for (const v of [-lim, 0, lim]) { ctx.beginPath(); ctx.moveTo(kiri, Ya(v)); ctx.lineTo(kanan, Ya(v)); ctx.stroke(); ctx.fillText(`${v}°`, kiri - 4, Ya(v)); }
  for (const v of [-255, 0, 255]) { ctx.beginPath(); ctx.moveTo(kiri, Yp(v)); ctx.lineTo(kanan, Yp(v)); ctx.stroke(); ctx.fillText(String(v), kiri - 4, Yp(v)); }
  ctx.strokeStyle = '#c9c7bf'; ctx.beginPath(); ctx.moveTo(kiri, hA); ctx.lineTo(kanan, hA); ctx.stroke();
  const garis = (f, Y, warna, putus) => {
    ctx.strokeStyle = warna; ctx.lineWidth = 2; ctx.setLineDash(putus ? [5, 4] : []);
    ctx.beginPath(); data.forEach((r, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(r.t), Y(f(r)))); ctx.stroke(); ctx.setLineDash([]);
  };
  garis(r => r.th, Ya, '#1d1f21');
  garis(r => r.est, Ya, '#1f56b0', true);
  garis(r => r.pwm, Yp, '#a45200');
}

// ---------- Status ----------
const langkahEl = [$('l1'), $('l2'), $('l3')];
let statusTerakhir = '';
function perbaruiStatus() {
  const m = s.mode;
  if (m === 'jalan') tBerdiri = s.t - tMulai;
  const sibuk = m === 'kalibrasi' || m === 'titiknol';
  btn.kalib.disabled = !s.dipegang || sibuk;
  btn.nol.disabled = !s.dipegang || sibuk;
  btn.kalib.textContent = m === 'kalibrasi' ? 'Mengkalibrasi...' : 'Kalibrasi gyro';
  btn.nol.textContent = m === 'titiknol' ? 'Mengukur...' : 'Setel titik nol';
  btn.jalan.textContent = m === 'jalan' ? 'Matikan motor' : 'Nyalakan motor';
  btn.jalan.classList.toggle('bahaya', m === 'jalan');
  btn.jalan.disabled = sibuk || (m !== 'jalan' && s.jatuh);
  btn.maju.disabled = btn.mundur.disabled = s.dipegang;
  langkahEl[0].className = s.sudahKalibrasi ? 'selesai' : 'aktif';
  langkahEl[1].className = s.sudahTitikNol ? 'selesai' : s.sudahKalibrasi ? 'aktif' : '';
  langkahEl[2].className = m === 'jalan' ? 'selesai' : s.sudahKalibrasi && s.sudahTitikNol ? 'aktif' : '';

  let nada = '', judul, isi;
  if (m === 'kalibrasi') { nada = 'proses'; judul = 'Mengkalibrasi gyro'; isi = 'Robot harus diam. Firmware merata-rata 200 bacaan gyro sebagai bias.'; }
  else if (m === 'titiknol') { nada = 'proses'; judul = 'Mengukur titik setimbang'; isi = 'Robot dipegang tepat di posisi pusat massa di atas sumbu roda.'; }
  else if (m === 'jalan') {
    nada = 'jalan'; judul = `PID aktif, berdiri ${fmt(tBerdiri, 1)} detik`;
    isi = !s.sudahKalibrasi ? 'Gyro belum dikalibrasi: estimasi sudut melantur dan robot akan lari.' : !s.sudahTitikNol ? 'Titik nol belum disetel: robot mengejar sudut yang salah dan lari ke satu arah.' : Math.abs(s.xd) > 0.12 ? 'Robot tegak tetapi terus bergeser: PID sudut tidak tahu kecepatan roda. Encoder sudah mengukurnya (lihat LCD); pakai sebagai loop luar untuk menahannya.' : 'Putar kenop untuk melihat efek tiap gain. Coba dorong robotnya.';
  } else if (m === 'putus') { nada = 'bahaya'; judul = `Motor diputus setelah ${fmt(tBerdiri, 1)} detik`; isi = `Sudut melewati batas ${s.o.batasSudut}°. Klik "Angkat & pegang lagi", ubah kenop, lalu nyalakan lagi.`; }
  else if (s.jatuh) { nada = 'bahaya'; judul = 'Robot rebah'; isi = 'Klik "Angkat & pegang lagi".'; }
  else if (s.dipegang) { judul = 'Robot dipegang tangan'; isi = !s.sudahKalibrasi ? 'Mulai dari langkah 1: kalibrasi gyro.' : !s.sudahTitikNol ? 'Lanjut langkah 2: setel titik nol.' : 'Siap. Nyalakan motor untuk melepas robot.'; }
  else { judul = 'Motor mati'; isi = 'Robot dilepas tanpa kendali.'; }
  const teks = nada + judul + isi;
  if (teks !== statusTerakhir) { statusTerakhir = teks; lencana.dataset.nada = nada; lencana.innerHTML = `<strong>${judul}</strong>${isi}`; }

  const set = (id, v) => { $(id).textContent = v; };
  set('vGyro', fmt(s.gyroUkur, 1)); set('vAcc', fmt(s.sudutAcc, 1));
  set('vEst', fmt(s.est, 2)); set('vNyata', fmt(s.th * S.DEG, 2));
  for (const [k, u] of [['P', s.uP || 0], ['I', s.uI || 0], ['D', s.uD || 0]]) {
    const w = Math.min(1, Math.abs(u) / 255) * 50, b = $('b' + k);
    b.style.width = w + '%'; b.style.left = (u < 0 ? 50 - w : 50) + '%';
    set('v' + k, fmt(u, 0));
  }
  set('vPwm', String(s.pwm)); set('vVolt', fmt(s.pwm / 255 * Math.max(0, s.o.vbat - 2), 1));
  set('vRpm', fmt(s.psid * 60 / (2 * Math.PI), 0)); set('vPosisi', fmt(s.x * 100, 0));
  set('vEnc', s.o.motor === 'tt' ? String(s.enc).replace('-', '−') : '–');
}

// ---------- Loop ----------
const DT = 0.0005;
let akhir = performance.now(), sisa = 0, tUI = 0;
function ukur() {
  const w = wadah.clientWidth, h = wadah.clientHeight;
  renderer.setSize(w, h, false); kamera.aspect = w / h;
  kamera.fov = kamera.aspect < 1 ? Math.min(60, 24 / kamera.aspect) : 32; // layar tegak: perlebar sudut pandang
  kamera.updateProjectionMatrix();
}
new ResizeObserver(ukur).observe(wadah); ukur();

function frame(now) {
  const dt = Math.min(0.05, (now - akhir) / 1000); akhir = now;
  sisa += dt * +$('skalaWaktu').value;
  const n = Math.floor(sisa / DT);
  if (n > 0) { S.langkah(s, n * DT); sisa -= n * DT; }
  rekam();
  if (s.t >= tLCD) { tLCD = s.t + 0.2; tulisLCD(); }

  model.root.position.set(s.x, S.RODA.r, 0);
  model.badan.rotation.z = -s.th;
  for (const r of model.roda) r.rotation.z = -s.x / S.RODA.r;
  model.kenop.forEach((k, i) => { k.rotation.y = -(-135 + s.o.adc[i] * SUDUT) * Math.PI / 180; });
  const nyala = s.mode === 'jalan' && Math.floor(s.t * 4) % 2 === 0;
  model.led.emissive.setHex(nyala ? 0x3a7bff : 0x000000);

  aturKamera(dt);
  kontrol.update();
  renderer.render(scene, kamera);
  perbaruiLabel(wadah.clientWidth, wadah.clientHeight);
  if (now - tUI > 60) { tUI = now; perbaruiStatus(); gambarPlot(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
