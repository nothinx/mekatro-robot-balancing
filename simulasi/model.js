// Model 3D robot dari primitif Three.js, ukuran nyata dalam meter.
// Sumbu Three.js: x maju, y atas, z lateral. Titik asal = sumbu roda.
import * as THREE from 'three';
import { RODA, DEK, JEJAK } from './sim.js';

const std = (color, roughness = 0.5, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  pla: std(0xe9e5db, 0.62),
  kuningan: std(0xc8a24a, 0.32, 1),
  baja: std(0xb9bec4, 0.3, 1),
  karet: std(0x1b1b1b, 0.92),
  velg: std(0xf1c21b, 0.45),
  kuningTT: std(0xf2c230, 0.5),
  hitam: std(0x1e1f22, 0.55),
  hitamDop: std(0x111214, 0.8),
  pcbMerah: std(0xa61d24, 0.55),
  pcbBiru: std(0x1d4c9c, 0.5),
  pcbHitam: std(0x151618, 0.45),
  terminal: std(0x1f6fd0, 0.45),
  emas: std(0xd8b04c, 0.25, 1),
  aluminium: std(0x2a2c30, 0.4, 0.8),
  sel: std(0x2f9e57, 0.32, 0.1),
  breadboard: null,
  led: std(0x0b2a66, 0.3, 0, { emissive: 0x000000 }),
};

const kotak = (w, h, d, mat) => bayang(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
const silinder = (r, h, mat, seg = 24) => bayang(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat));
function bayang(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function di(obj, x, y, z, induk) { obj.position.set(x, y, z); if (induk) induk.add(obj); return obj; }

// ---------- Dek ----------
const LUBANG_SPACER = [[0.040, 0.048], [0.040, -0.048], [-0.040, 0.048], [-0.040, -0.048]];

function bentukDek() {
  const d = DEK.panjang, w = DEK.lebar, r = 0.016, cembung = 0.007;
  const x0 = -d / 2, x1 = d / 2, z0 = -w / 2, z1 = w / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + r, z0);
  s.lineTo(x1 - r, z0);
  s.quadraticCurveTo(x1, z0, x1, z0 + r);
  s.quadraticCurveTo(x1 + 2 * cembung, 0, x1, z1 - r);
  s.quadraticCurveTo(x1, z1, x1 - r, z1);
  s.lineTo(x0 + r, z1);
  s.quadraticCurveTo(x0, z1, x0, z1 - r);
  s.quadraticCurveTo(x0 - 2 * cembung, 0, x0, z0 + r);
  s.quadraticCurveTo(x0, z0, x0 + r, z0);
  for (const [x, z] of LUBANG_SPACER) { const h = new THREE.Path(); h.absarc(x, z, 0.0017, 0, Math.PI * 2, true); s.holes.push(h); }
  for (const z of [0.040, -0.040]) { // celah kabel
    const h = new THREE.Path();
    h.moveTo(0.016, z - 0.004); h.lineTo(0.032, z - 0.004); h.absarc(0.032, z, 0.004, -Math.PI / 2, Math.PI / 2, false);
    h.lineTo(0.016, z + 0.004); h.absarc(0.016, z, 0.004, Math.PI / 2, Math.PI * 1.5, false);
    s.holes.push(h);
  }
  return s;
}

let geoDek;
function dek() {
  if (!geoDek) {
    const t = DEK.tebal, b = 0.0007;
    geoDek = new THREE.ExtrudeGeometry(bentukDek(), { depth: t - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 28 });
    geoDek.rotateX(Math.PI / 2);
    geoDek.computeBoundingBox();
    geoDek.translate(0, -geoDek.boundingBox.min.y, 0);
  }
  return bayang(new THREE.Mesh(geoDek, M.pla));
}

function spacer(panjang) {
  const m = bayang(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, panjang, 6), M.kuningan));
  m.geometry.translate(0, panjang / 2, 0);
  return m;
}

// ---------- Roda TT 65 mm ----------
function roda() {
  const g = new THREE.Group();
  const r = RODA.r, w = RODA.lebar, ri = 0.0245, rr = 0.0055;
  const p = [];
  p.push(new THREE.Vector2(ri, -w / 2 + 0.0015));
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI / 2; p.push(new THREE.Vector2(r - rr + rr * Math.cos(a), -w / 2 + rr + rr * Math.sin(a))); }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; p.push(new THREE.Vector2(r - rr + rr * Math.cos(a), w / 2 - rr + rr * Math.sin(a))); }
  p.push(new THREE.Vector2(ri, w / 2 - 0.0015));
  const geoBan = new THREE.LatheGeometry(p, 64);
  geoBan.rotateX(Math.PI / 2);
  g.add(bayang(new THREE.Mesh(geoBan, new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.92, side: THREE.DoubleSide }))));

  // kembang ban: dua baris berselang
  const N = 32, kembang = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0018, 0.0042, 0.0085), M.karet, N * 2);
  const o = new THREE.Object3D();
  for (let i = 0; i < N * 2; i++) {
    const baris = i % 2, a = (Math.floor(i / 2) + baris * 0.5) / N * Math.PI * 2;
    o.position.set(Math.cos(a) * (r - 0.0002), Math.sin(a) * (r - 0.0002), baris ? 0.0055 : -0.0055);
    o.rotation.set(0, 0, a); o.updateMatrix(); kembang.setMatrixAt(i, o.matrix);
  }
  kembang.castShadow = true; g.add(kembang);

  // velg kuning: cincin, 5 jari-jari, hub
  const cincin = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, w * 0.86, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xf1c21b, roughness: 0.45, side: THREE.DoubleSide }));
  cincin.rotation.x = Math.PI / 2; g.add(bayang(cincin));
  const bibir = new THREE.Mesh(new THREE.TorusGeometry(ri - 0.0012, 0.0016, 10, 48), M.velg);
  di(bibir, 0, 0, w * 0.36, g);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, j = kotak(ri - 0.006, 0.0055, 0.0035, M.velg);
    j.position.set(Math.cos(a) * (ri / 2 + 0.003), Math.sin(a) * (ri / 2 + 0.003), w * 0.30);
    j.rotation.z = a; g.add(j);
  }
  const hub = silinder(0.0075, w * 0.8, M.velg, 20); hub.rotation.x = Math.PI / 2; g.add(hub);
  const baut = silinder(0.0028, 0.002, M.baja, 12); baut.rotation.x = Math.PI / 2; di(baut, 0, 0, w * 0.41, g);
  return g;
}

// ---------- Motor ----------
function motorTT() {
  const g = new THREE.Group();
  di(kotak(0.0225, 0.026, 0.0185, M.kuningTT), 0, 0.013, 0, g);
  const ujung = silinder(0.01125, 0.0185, M.kuningTT, 28); ujung.rotation.x = Math.PI / 2; g.add(ujung);
  const poros = silinder(0.0027, 0.010, M.kuningTT, 12); poros.rotation.x = Math.PI / 2; di(poros, 0, 0, 0.014, g);
  di(silinder(0.0105, 0.025, M.baja, 28), 0, 0.0385, 0, g);
  di(silinder(0.0102, 0.003, M.hitam, 28), 0, 0.0525, 0, g);
  for (const x of [-0.0035, 0.0035]) di(kotak(0.002, 0.004, 0.0008, M.emas), x, 0.0555, 0, g);
  for (const y of [0.006, 0.019]) { const b = silinder(0.0015, 0.022, M.baja, 10); b.rotation.x = Math.PI / 2; di(b, 0.0075, y, 0, g); }
  return g;
}

function motorJGA() {
  const g = new THREE.Group();
  const gb = silinder(0.0125, 0.021, M.kuningan, 32); gb.rotation.x = Math.PI / 2; di(gb, 0, 0, -0.0105, g);
  const mt = silinder(0.0122, 0.028, M.baja, 32); mt.rotation.x = Math.PI / 2; di(mt, 0, 0, -0.0355, g);
  const tutup = silinder(0.0118, 0.004, M.hitam, 32); tutup.rotation.x = Math.PI / 2; di(tutup, 0, 0, -0.0515, g);
  const poros = silinder(0.002, 0.012, M.baja, 12); poros.rotation.x = Math.PI / 2; di(poros, 0, 0, 0.006, g);
  di(kotak(0.032, 0.046, 0.0022, M.aluminium), 0, 0.033, 0.001, g); // braket L
  di(kotak(0.032, 0.0022, 0.016, M.aluminium), 0, 0.055, -0.007, g);
  return g;
}

// ---------- Elektronik ----------
function l298n() {
  const g = new THREE.Group();
  for (const [x, z] of [[0.0185, 0.0185], [0.0185, -0.0185], [-0.0185, 0.0185], [-0.0185, -0.0185]]) di(silinder(0.0025, 0.004, M.kuningan, 6), x, 0.002, z, g);
  di(kotak(0.043, 0.0016, 0.043, M.pcbMerah), 0, 0.0048, 0, g);
  const hs = new THREE.Group(); di(hs, 0.006, 0.0056, 0, g);
  di(kotak(0.016, 0.003, 0.023, M.aluminium), 0, 0.0015, 0, hs);
  for (let i = 0; i < 7; i++) di(kotak(0.0013, 0.024, 0.023, M.aluminium), -0.0075 + i * 0.0025, 0.012, 0, hs);
  di(kotak(0.0025, 0.016, 0.020, M.hitam), -0.010, 0.0136, 0, g); // IC L298
  for (const z of [0.0165, -0.0165]) di(kotak(0.010, 0.010, 0.008, M.terminal), 0.005, 0.0106, z, g);
  di(kotak(0.008, 0.010, 0.015, M.terminal), -0.0175, 0.0106, 0.008, g);
  for (const z of [-0.012, 0.0]) { di(silinder(0.0035, 0.010, M.hitam, 18), -0.017, 0.011, z - 0.006, g); }
  for (const z of [-0.008, -0.002, 0.004]) di(kotak(0.0025, 0.004, 0.005, M.hitamDop), 0.0185, 0.0076, z, g);
  return g;
}

function mpu6050() {
  const g = new THREE.Group();
  di(kotak(0.021, 0.0016, 0.016, M.pcbBiru), 0, 0, 0, g);
  di(kotak(0.004, 0.0009, 0.004, M.hitam), 0.002, -0.0012, 0, g);
  for (let i = 0; i < 8; i++) di(kotak(0.0006, 0.006, 0.0006, M.emas), -0.009 + i * 0.00254 * 0.92, 0.0035, 0.0068, g);
  di(kotak(0.0205, 0.0025, 0.0025, M.hitam), 0, 0.0018, 0.0068, g);
  return g;
}

function teksturBreadboard() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 340;
  const x = c.getContext('2d');
  x.fillStyle = '#f3f2ec'; x.fillRect(0, 0, 512, 340);
  x.fillStyle = '#c63b3b'; x.fillRect(8, 22, 496, 3); x.fillRect(8, 318, 496, 3);
  x.fillStyle = '#2f5fbf'; x.fillRect(8, 40, 496, 3); x.fillRect(8, 300, 496, 3);
  x.fillStyle = '#8a8a86'; x.fillRect(8, 166, 496, 8);
  x.fillStyle = '#2a2a28';
  for (let i = 0; i < 30; i++) {
    const px = 18 + i * 16.3;
    for (let j = 0; j < 5; j++) { x.fillRect(px, 60 + j * 19, 5, 5); x.fillRect(px, 186 + j * 19, 5, 5); }
    if (i % 6 !== 5) { x.fillRect(px, 28, 5, 5); x.fillRect(px, 306, 5, 5); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function blackPill() {
  const g = new THREE.Group();
  const bb = new THREE.Mesh(new THREE.BoxGeometry(0.083, 0.0085, 0.055), [std(0xefeee8, 0.7), std(0xefeee8, 0.7), new THREE.MeshStandardMaterial({ map: teksturBreadboard(), roughness: 0.7 }), std(0xefeee8, 0.7), std(0xefeee8, 0.7), std(0xefeee8, 0.7)]);
  di(bayang(bb), 0, 0.00425, 0, g);
  const atas = 0.0085;
  for (const z of [0.0089, -0.0089]) di(kotak(0.051, 0.0025, 0.0025, M.hitam), 0, atas + 0.00125, z, g);
  di(kotak(0.053, 0.0016, 0.021, M.pcbHitam), 0, atas + 0.0033, 0, g);
  const t = atas + 0.0041;
  di(kotak(0.007, 0.001, 0.007, std(0x2b2d31, 0.35)), 0.004, t + 0.0005, 0, g);
  di(kotak(0.0075, 0.0032, 0.009, M.baja), -0.0245, t + 0.0016, 0, g);
  for (const z of [0.0089, -0.0089]) for (let i = 0; i < 20; i++) di(kotak(0.0006, 0.0028, 0.0006, M.emas), -0.0241 + i * 0.00254, t + 0.0012, z, g);
  for (const x of [-0.012, -0.006]) di(kotak(0.003, 0.0012, 0.003, std(0xd8d8d8, 0.4)), x, t + 0.0006, -0.005, g);
  M.ledPC13 = std(0x0b2a66, 0.3, 0, { emissive: 0x000000 });
  di(kotak(0.0016, 0.0008, 0.0008, M.ledPC13), 0.013, t + 0.0004, 0.006, g);
  return g;
}

function baterai() {
  const g = new THREE.Group();
  const L = 0.077, W = 0.041;
  di(kotak(W, 0.002, L, M.hitam), 0, 0.001, 0, g);
  for (const x of [W / 2 - 0.001, -W / 2 + 0.001]) di(kotak(0.002, 0.012, L, M.hitam), x, 0.006, 0, g);
  for (const z of [L / 2 - 0.0015, -L / 2 + 0.0015]) di(kotak(W, 0.020, 0.003, M.hitam), 0, 0.010, z, g);
  for (const x of [-0.0102, 0.0102]) {
    const c = silinder(0.00925, 0.065, M.sel, 32); c.rotation.x = Math.PI / 2; di(c, x, 0.0115, 0, g);
    for (const z of [0.0326, -0.0326]) { const e = silinder(0.0085, 0.0008, M.baja, 24); e.rotation.x = Math.PI / 2; di(e, x, 0.0115, z, g); }
  }
  return g;
}

function kenop(warna) {
  const g = new THREE.Group();
  di(silinder(0.0082, 0.007, M.baja, 28), 0, 0.0035, 0, g);
  di(silinder(0.0035, 0.006, M.baja, 16), 0, 0.010, 0, g);
  const putar = new THREE.Group(); di(putar, 0, 0.0085, 0, g);
  di(silinder(0.0078, 0.013, M.hitamDop, 24), 0, 0.0065, 0, putar);
  di(silinder(0.0068, 0.0012, std(warna, 0.45), 32), 0, 0.0136, 0, putar);
  di(kotak(0.0058, 0.0006, 0.0011, std(0xf4f4f0, 0.4)), 0.0031, 0.0145, 0, putar);
  g.userData.putar = putar;
  return g;
}

function kabel(titik, warna, r = 0.00065) {
  const kurva = new THREE.CatmullRomCurve3(titik.map(p => new THREE.Vector3(...p)));
  return bayang(new THREE.Mesh(new THREE.TubeGeometry(kurva, 48, r, 6), std(warna, 0.55)));
}

// ---------- Rakit ----------
export const WARNA_KENOP = [0xc0392b, 0x1e8449, 0x1f5fbf];

export function rakitRobot(sifat, motorId) {
  const root = new THREE.Group();  // ikut posisi x
  const badan = new THREE.Group(); // ikut kemiringan
  root.add(badan);
  const [z1, z2, z3] = sifat.zDek, t = DEK.tebal;
  const jangkar = {};

  for (const y of [z1, z2, z3]) di(dek(), 0, y, 0, badan);
  for (const [x, z] of LUBANG_SPACER) {
    di(spacer(z2 - z1 - t), x, z1 + t, z, badan);
    di(spacer(z3 - z2 - t), x, z2 + t, z, badan);
    di(spacer(0.010), x, z1 - 0.010, z, badan);
    di(silinder(0.0027, 0.0022, M.baja, 6), x, z3 + t + 0.0011, z, badan);
  }

  // motor + braket
  const zm = JEJAK / 2 - RODA.lebar / 2 - 0.009 - 0.00925;
  for (const sisi of [1, -1]) {
    const m = motorId === 'tt' ? motorTT() : motorJGA();
    if (motorId === 'tt') {
      di(m, 0, 0, sisi * zm, badan);
      di(kotak(0.030, 0.024, 0.003, M.hitam), 0, 0.044, sisi * (zm - 0.0108), badan);
    } else di(m, 0, 0, sisi * (JEJAK / 2 - RODA.lebar / 2 - 0.004), badan);
    if (sisi < 0) m.scale.z = -1;
  }
  jangkar.motor = di(new THREE.Object3D(), 0.012, 0.012, zm, badan);

  // MPU6050 di bawah dek bawah, dekat sumbu roda
  const mpu = mpu6050(); di(mpu, 0, z1 - 0.009, 0, badan);
  jangkar.mpu = di(new THREE.Object3D(), -0.010, z1 - 0.010, 0.008, badan);

  const drv = l298n(); di(drv, -0.004, z1 + t, 0, badan);
  jangkar.l298n = di(new THREE.Object3D(), -0.026, z1 + t + 0.012, 0.012, badan);

  const bp = blackPill(); di(bp, -0.004, z2 + t, 0, badan);
  jangkar.bp = di(new THREE.Object3D(), -0.030, z2 + t + 0.012, 0.0, badan);

  const bat = baterai(); di(bat, -0.012 + (sifat.offsetBaterai || 0), z3 + t, 0, badan);
  jangkar.baterai = di(new THREE.Object3D(), -0.012, z3 + t + 0.022, -0.030, badan);

  const kenopKenop = WARNA_KENOP.map((w, i) => { const k = kenop(w); di(k, 0.036, z3 + t, (i - 1) * 0.030, badan); return k.userData.putar; });
  jangkar.kenop = di(new THREE.Object3D(), 0.036, z3 + t + 0.024, 0.030, badan);

  // tombol arm dan saklar daya di belakang
  di(kotak(0.012, 0.0035, 0.012, M.hitam), -0.042, z3 + t + 0.0018, 0.035, badan);
  di(silinder(0.0035, 0.004, std(0xb02020, 0.4), 20), -0.042, z3 + t + 0.0055, 0.035, badan);
  di(kotak(0.009, 0.006, 0.015, M.hitam), -0.042, z3 + t + 0.003, -0.035, badan);

  // kabel
  const dz = 0.002;
  [[0xc62828, 0], [0x212121, 1], [0xf9a825, 2], [0x2e7d32, 3]].forEach(([w, i]) => {
    const o = (i - 1.5) * dz;
    badan.add(kabel([[-0.004 + o, z1 - 0.0055, 0.0068], [0.010, z1 - 0.004, 0.030 + o], [0.024, z1 + 0.002, 0.040 + o], [0.024, z2 - 0.010, 0.040 + o], [0.024, z2 + t + 0.004, 0.040 + o], [0.008 + o * 2, z2 + t + 0.0095, 0.012]], w));
  });
  for (const sisi of [1, -1]) for (const [w, o] of [[0xc62828, -0.0015], [0x212121, 0.0015]]) {
    badan.add(kabel([[o * 2, 0.056 - 0.0005, sisi * zm], [0.012, 0.050, sisi * (zm - 0.006)], [0.024 + o, z1 - 0.002, sisi * 0.040], [0.024 + o, z1 + t + 0.004, sisi * 0.040], [0.001, z1 + t + 0.016, sisi * 0.0165]], w));
  }
  for (const [w, o] of [[0xc62828, 0.002], [0x212121, -0.002]]) {
    badan.add(kabel([[-0.012, z3 + t + 0.004, -0.0385 + o], [-0.030, z3 + t + 0.003, -0.035 + o], [-0.047, z3 - 0.002, -0.050], [-0.047, z1 + t + 0.020, -0.050], [-0.022, z1 + t + 0.012, 0.008 + o]], w));
  }
  WARNA_KENOP.forEach((w, i) => {
    const z = (i - 1) * 0.030;
    badan.add(kabel([[0.036, z3 + t + 0.0015, z + 0.0075], [0.030, z3 - 0.004, 0.040 + (i - 1) * 0.0018], [0.024, z2 + t + 0.004, 0.040 + (i - 1) * 0.0018], [0.010 - i * 0.0025, z2 + t + 0.0095, -0.012]], w, 0.0005));
  });

  // roda
  const roda2 = [1, -1].map(sisi => { const r = roda(); r.position.z = sisi * JEJAK / 2; if (sisi < 0) r.scale.z = -1; root.add(r); return r; });
  jangkar.roda = di(new THREE.Object3D(), 0, 0, -JEJAK / 2 - 0.02, root);

  // penanda pusat massa (pola catur)
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const cx = c.getContext('2d'); cx.fillStyle = '#111'; cx.fillRect(0, 0, 64, 64); cx.fillStyle = '#ffd400'; cx.fillRect(0, 0, 32, 32); cx.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const com = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, depthTest: false }));
  com.renderOrder = 10;
  com.position.set(Math.sin(sifat.sudutCOM) * sifat.l, Math.cos(sifat.sudutCOM) * sifat.l, 0);
  badan.add(com);
  jangkar.com = com;

  return { root, badan, roda: roda2, kenop: kenopKenop, jangkar, com, led: M.ledPC13 };
}
