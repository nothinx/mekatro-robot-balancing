// Inti simulasi: geometri robot, fisika pendulum terbalik beroda, motor DC + L298N,
// MPU6050, dan firmware (filter komplementer + PID dengan kenop potensiometer).
// Dipakai oleh browser (main.js) dan tes Node (tes-sim.mjs). Satuan SI kecuali disebut lain.

export const G = 9.81;
const DEG = 180 / Math.PI;

// ---------- Geometri & massa ----------
// Semua ukuran meter, sumbu badan: x maju, y ke kiri, z ke atas dari sumbu roda.
export const RODA = { r: 0.0325, lebar: 0.026, massa: 0.035 }; // roda TT 65 mm (perkiraan massa)
export const DEK = { panjang: 0.100, lebar: 0.120, tebal: 0.004, massa: 0.032 }; // PLA 4 mm
export const JEJAK = 0.166; // jarak antar-tengah roda

export const VARIAN = {
  kompak:  { nama: 'Kompak',  jarak: 0.042, ket: 'Dek rapat, pusat massa rendah: jatuh lebih cepat, tuning lebih sulit.' },
  standar: { nama: 'Standar', jarak: 0.058, ket: 'Proporsi yang disarankan: tinggi total sekitar 2,4 kali diameter roda.' },
  tinggi:  { nama: 'Tinggi',  jarak: 0.080, ket: 'Pusat massa tinggi: jatuh lebih lambat, lebih mudah diseimbangkan, tetapi lebih goyah saat didorong.' },
};

// Nilai motor = perkiraan dari lembar data penjual; ukur motor sendiri untuk angka sebenarnya.
export const MOTOR = {
  tt:  { nama: 'TT kuning 1:48 (6 V)', Vr: 6, torsiMacet: 0.078, rpmBebas: 200, gesek: 0.006, backlash: 3.0, Jm: 2.0e-4 },
  n20: { nama: 'JGA25-370 1:34 (6 V)', Vr: 6, torsiMacet: 0.22, rpmBebas: 280, gesek: 0.010, backlash: 1.0, Jm: 3.0e-4 },
};

// Daftar komponen yang menempel di badan: [nama, massa kg, x, z] (z dari sumbu roda).
export function komponen(varianId, offsetBaterai = 0) {
  const d = VARIAN[varianId].jarak;
  const z1 = 0.056, z2 = z1 + d, z3 = z2 + d;
  return {
    z: [z1, z2, z3],
    daftar: [
      ['Motor TT + gearbox (2)', 0.060, 0, 0.012],
      ['Braket motor (2)', 0.012, 0, 0.040],
      ['Dek bawah', DEK.massa, 0, z1],
      ['Dek tengah', DEK.massa, 0, z2],
      ['Dek atas', DEK.massa, 0, z3],
      ['Spacer kuningan (12)', 0.030, 0, (z1 + z3) / 2],
      ['MPU6050', 0.003, 0, z1 - 0.006],
      ['L298N + heatsink', 0.033, 0, z1 + 0.018],
      ['Black Pill + papan', 0.020, 0, z2 + 0.008],
      ['Kenop potensio (3)', 0.020, 0.038, z3 + 0.012],
      ['Baterai 2x18650 + holder', 0.107, offsetBaterai, z3 + 0.013],
      ['Kabel & baut', 0.025, 0, (z1 + z2) / 2],
    ],
  };
}

export function sifatBadan(varianId, offsetBaterai = 0) {
  const k = komponen(varianId, offsetBaterai);
  let M = 0, mx = 0, mz = 0;
  for (const [, m, x, z] of k.daftar) { M += m; mx += m * x; mz += m * z; }
  const cx = mx / M, cz = mz / M;
  let I = 0; // inersia pitch terhadap pusat massa, komponen dianggap titik + tambahan pelat
  for (const [, m, x, z] of k.daftar) I += m * ((x - cx) ** 2 + (z - cz) ** 2);
  I += 3 * DEK.massa * DEK.panjang ** 2 / 12;
  return { M, l: Math.hypot(cx, cz), sudutCOM: Math.atan2(cx, cz), Ib: I, zDek: k.z, tinggiTotal: RODA.r + k.z[2] + 0.030, daftar: k.daftar };
}

// ---------- Robot ----------
export function buatRobot(opsi = {}) {
  const o = {
    varian: 'standar', motor: 'tt', vbat: 7.8, offsetBaterai: 0,
    backlashAktif: true, alpha: 0.995, pwmMin: 30, loopHz: 200, batasSudut: 40,
    kpMax: 60, kiMax: 400, kdMax: 3, adc: [0.707, 0.612, 0.577], seed: 7, ...opsi,
  };
  const s = {
    o,
    t: 0,
    // keadaan fisik
    x: 0, xd: 0, th: 0, thd: 0, psi: 0, psid: 0, phiRel: 0, // psi = sudut poros keluaran gearbox relatif badan
    rodaSudut: 0,
    gaya: 0, gayaSampai: 0, jatuh: false, dipegang: true, // dipegang tangan sampai motor dinyalakan
    // firmware
    mode: 'siap', // siap | kalibrasi | jalan | putus
    est: 0, I: 0, pwm: 0, gyroBias: 0, biasSebenarnya: 0, offsetSudut: 0,
    kalib: { n: 0, sum: 0 }, gain: { kp: 0, ki: 0, kd: 0 }, adcHalus: [...o.adc].map(v => v * 4095),
    tKontrol: 0, tPot: 0, gyroUkur: 0, sudutAcc: 0, u: 0, arus: 0,
    rnd: rng(o.seed),
  };
  s.biasSebenarnya = (s.rnd() - 0.5) * 3; // bias gyro MPU6050 sebelum kalibrasi, ±1,5 °/s
  ubahFisik(s);
  return s;
}

export function ubahFisik(s) {
  s.b = sifatBadan(s.o.varian, s.o.offsetBaterai);
  s.m = MOTOR[s.o.motor];
}

function rng(seed) { // mulberry32 + Box-Muller
  let a = seed >>> 0;
  const u = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  u.gauss = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  return u;
}

export function dorong(s, newton, detik = 0.08) { s.gaya = newton; s.gayaSampai = s.t + detik; }

export function reset(s, sudutAwalDeg = 0) {
  Object.assign(s, { x: 0, xd: 0, th: sudutAwalDeg / DEG, thd: 0, psi: 0, psid: 0, phiRel: 0, est: sudutAwalDeg, I: 0, pwm: 0, jatuh: false, gaya: 0, gayaSampai: 0, dipegang: true });
  if (s.mode === 'putus') s.mode = 'siap';
}

export function nyalakan(s) { if (!s.jatuh && s.mode !== 'kalibrasi') { s.I = 0; s.mode = 'jalan'; s.dipegang = false; } }
export function lepas(s) { s.dipegang = false; }
export function matikan(s) { s.mode = 'siap'; s.pwm = 0; }
export function sudutSetimbang(s) { return -s.b.sudutCOM * DEG; } // sudut badan saat pusat massa tepat di atas sumbu roda
// Robot harus dipegang diam. Rata-rata gyro selama 1 detik = bias.
export function kalibrasi(s) { if (!s.dipegang) return; s.mode = 'kalibrasi'; s.kalib = { n: 0, sum: 0 }; s.pwm = 0; }
// Tangan mencari posisi "tanpa bobot", firmware merata-rata sudut terukur selama 0,5 detik.
export function setelTitikNol(s) {
  if (!s.dipegang) return;
  s.th = sudutSetimbang(s) / DEG; s.mode = 'titiknol'; s.kalib = { n: 0, sum: 0 }; s.pwm = 0;
}

// ---------- Fisika (dt kecil, dipanggil 2 kHz) ----------
const DT = 0.0005;

function langkahFisika(s) {
  if (s.dipegang) { s.thd = s.xd = s.psid = s.xdd = s.thdd = 0; return; }
  const { M, l, Ib, sudutCOM } = s.b, { r, massa: mw } = RODA, m = s.m;
  const Iw = 0.5 * mw * r * r;
  // Tegangan ke motor dari L298N: jatuh tegangan sekitar 2 V pada arus kerja (lembar data: 1,8-3,2 V)
  const vEfektif = Math.max(0, s.o.vbat - 2.0);
  const V = (s.pwm / 255) * vEfektif;
  // Model motor dilihat dari poros gearbox: torsi = macet*(V/Vr) - (macet/wBebas)*kecepatan
  const wBebas = m.rpmBebas * 2 * Math.PI / 60;
  let tauM = m.torsiMacet * (V / m.Vr) - (m.torsiMacet / wBebas) * s.psid;
  tauM -= Math.abs(s.psid) > 1e-3 ? m.gesek * Math.sign(s.psid) : Math.max(-m.gesek, Math.min(m.gesek, tauM));
  s.arus = Math.abs(tauM) / m.torsiMacet * 1.5; // perkiraan kasar arus per motor, A

  // Backlash: gigi gearbox hanya menyalurkan torsi bila celah tertutup (pegas-redam kaku)
  const celah = s.o.backlashAktif ? m.backlash / DEG / 2 : 0;
  const d = s.psi - s.phiRel;
  const pen = d > celah ? d - celah : d < -celah ? d + celah : 0;
  const phiRelD = s.xd / r - s.thd;
  const tauG = pen !== 0 ? 6 * pen + 0.02 * (s.psid - phiRelD) : 0;

  // Poros gearbox (inersia rotor terpantul) dan dua motor identik
  const psidd = (tauM - tauG) / m.Jm;
  const T = 2 * tauG * 0.85; // dua roda, efisiensi gearbox

  // Gaya dorong pada dek atas
  const F = s.t < s.gayaSampai ? s.gaya : 0;
  const hF = s.b.zDek[2];

  // Persamaan gerak pendulum terbalik beroda (Lagrange), th diukur dari vertikal, positif condong maju
  const th = s.th + sudutCOM, c = Math.cos(th), sn = Math.sin(th);
  const a11 = M + 2 * mw + 2 * Iw / (r * r), a12 = M * l * c, a22 = Ib + M * l * l;
  const b1 = T / r + M * l * sn * s.thd * s.thd + F;
  const b2 = M * G * l * sn - T + F * hF * Math.cos(s.th);
  const det = a11 * a22 - a12 * a12;
  let xdd = (b1 * a22 - a12 * b2) / det, thdd = (a11 * b2 - a12 * b1) / det;
  // hambatan gelinding kecil
  xdd -= 0.15 * s.xd;

  s.psid += psidd * DT; s.psi += s.psid * DT;
  s.xd += xdd * DT; s.thd += thdd * DT;
  s.x += s.xd * DT; s.th += s.thd * DT;
  s.phiRel += (s.xd / r - s.thd) * DT;
  s.rodaSudut = s.x / r;
  s.xdd = xdd; s.thdd = thdd;

  // Badan rebah: sudut ketika ujung dek atas menyentuh lantai
  const z3 = s.b.zDek[2] + 0.02, p = DEK.panjang / 2, R = Math.hypot(z3, p);
  const batas = Math.atan2(z3, p) + Math.asin(RODA.r / R);
  if (Math.abs(s.th) > batas) {
    s.th = Math.sign(s.th) * batas; s.thd = 0; s.xd *= 0.9; s.jatuh = true;
  }
}

// ---------- Sensor MPU6050 (±2 g, ±250 °/s, DLPF 44 Hz) ----------
function bacaIMU(s) {
  const h = s.b.zDek[0] - 0.006, th = s.th, c = Math.cos(th), sn = Math.sin(th);
  const ax = (s.xdd || 0) + h * ((s.thdd || 0) * c - s.thd * s.thd * sn);
  const az = h * (-(s.thdd || 0) * sn - s.thd * s.thd * c);
  const getar = 0.03 * Math.min(1, Math.abs(s.psid) / 15) * G; // getaran gearbox ikut terbaca
  const fx = ax * c - (az + G) * sn + (0.004 * G + getar) * s.rnd.gauss();
  const fz = ax * sn + (az + G) * c + (0.004 * G + getar) * s.rnd.gauss();
  const q = v => Math.round(v / G * 16384) / 16384 * G; // kuantisasi 16 bit
  const gyroDps = s.thd * DEG + s.biasSebenarnya + 0.04 * s.rnd.gauss();
  return { fx: q(fx), fz: q(fz), gyro: Math.round(gyroDps * 131) / 131 };
}

// ---------- Firmware (sama dengan yang ditulis mahasiswa) ----------
export function gainDariAdc(o, adc) {
  const n = a => (a / 4095) ** 2; // pemetaan kuadratik: resolusi halus di nilai kecil
  return { kp: o.kpMax * n(adc[0]), ki: o.kiMax * n(adc[1]), kd: o.kdMax * n(adc[2]) };
}

function firmware(s, dtK) {
  const o = s.o;
  // Kenop dibaca 10 Hz, ADC 12 bit dengan derau ±2 LSB, lalu dihaluskan (EMA)
  if (s.t >= s.tPot) {
    s.tPot = s.t + 0.1;
    for (let i = 0; i < 3; i++) {
      const raw = Math.max(0, Math.min(4095, Math.round(o.adc[i] * 4095 + s.rnd.gauss() * 2)));
      s.adcHalus[i] += 0.5 * (raw - s.adcHalus[i]);
    }
    s.gain = gainDariAdc(o, s.adcHalus);
  }
  const imu = bacaIMU(s);
  const sudutAcc = Math.atan2(-imu.fx, imu.fz) * DEG;
  const gyro = imu.gyro - s.gyroBias;
  s.est = o.alpha * (s.est + gyro * dtK) + (1 - o.alpha) * sudutAcc;
  s.gyroUkur = gyro; s.sudutAcc = sudutAcc;

  if (s.mode === 'kalibrasi') {
    s.kalib.sum += imu.gyro; s.kalib.n++;
    // selesai: simpan bias dan mulai ulang estimasi dari sudut akselerometer
    if (s.kalib.n >= o.loopHz) { s.gyroBias = s.kalib.sum / s.kalib.n; s.est = sudutAcc; s.mode = 'siap'; s.sudahKalibrasi = true; }
    s.pwm = 0; return;
  }
  if (s.mode === 'titiknol') {
    // robot diam: rata-rata sudut akselerometer 1 detik lebih jujur daripada estimasi filter
    s.kalib.sum += sudutAcc; s.kalib.n++;
    if (s.kalib.n >= o.loopHz) { s.offsetSudut = s.kalib.sum / s.kalib.n; s.est = s.offsetSudut; s.mode = 'siap'; s.sudahTitikNol = true; }
    s.pwm = 0; return;
  }
  if (s.mode !== 'jalan') { s.pwm = 0; s.u = s.uP = s.uI = s.uD = 0; return; }

  const e = s.est - s.offsetSudut;
  if (Math.abs(e) > o.batasSudut) { s.mode = 'putus'; s.pwm = 0; s.I = 0; return; }
  const { kp, ki, kd } = s.gain;
  s.I += e * dtK;
  if (ki > 1e-6) s.I = Math.max(-255 / ki, Math.min(255 / ki, s.I)); // anti-windup
  s.uP = kp * e; s.uI = ki * s.I; s.uD = kd * gyro; // suku D dari laju gyro, bukan selisih error
  let u = s.uP + s.uI + s.uD;
  s.u = u;
  if (Math.abs(u) > 1) u += Math.sign(u) * o.pwmMin; // kompensasi deadband motor
  s.pwm = Math.round(Math.max(-255, Math.min(255, u)));
}

// Majukan simulasi sejauh `detik`. Firmware jalan tiap 1/loopHz.
export function langkah(s, detik) {
  const dtK = 1 / s.o.loopHz;
  const n = Math.round(detik / DT);
  for (let i = 0; i < n; i++) {
    if (s.t >= s.tKontrol) { s.tKontrol += dtK; firmware(s, dtK); }
    langkahFisika(s);
    s.t += DT;
  }
}

export { DEG };
