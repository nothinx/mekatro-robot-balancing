// Cek cepat inti simulasi: node tes-sim.mjs
import assert from 'node:assert/strict';
import * as S from './sim.js';

const adc = (kp, ki, kd) => [Math.sqrt(kp / 60), Math.sqrt(ki / 400), Math.sqrt(kd / 3)];

function jalankan(opsi, { kalib = true, nol = true, detik = 10, dorongN = 0 } = {}) {
  const s = S.buatRobot(opsi);
  S.reset(s, S.sudutSetimbang(s));
  if (kalib) { S.kalibrasi(s); S.langkah(s, 1.1); }
  if (nol) { S.setelTitikNol(s); S.langkah(s, 1.1); }
  S.reset(s, S.sudutSetimbang(s) + 2);
  S.nyalakan(s);
  for (let t = 0; t < detik; t += 0.1) {
    if (dorongN && Math.abs(t - 4) < 0.05) S.dorong(s, dorongN);
    S.langkah(s, 0.1);
    if (s.jatuh || s.mode === 'putus') return { jatuh: true, t };
  }
  return { jatuh: false, x: s.x, s };
}

// Pemetaan kenop: ujung 0 dan 4095
assert.deepEqual(S.gainDariAdc({ kpMax: 60, kiMax: 400, kdMax: 3 }, [0, 0, 0]), { kp: 0, ki: 0, kd: 0 });
assert.equal(S.gainDariAdc({ kpMax: 60, kiMax: 400, kdMax: 3 }, [4095, 4095, 4095]).kp, 60);

// Kalibrasi gyro menghapus bias
{ const s = S.buatRobot(); S.kalibrasi(s); S.langkah(s, 1.1); assert.ok(Math.abs(s.gyroBias - s.biasSebenarnya) < 0.05); }

// Hanya P: robot lari lalu jatuh (perlu suku I untuk melawan back-EMF motor)
assert.equal(jalankan({ adc: adc(30, 0, 1) }).jatuh, true);
// PID + kalibrasi: berdiri 10 detik dan tahan dorongan kecil
assert.equal(jalankan({ adc: adc(30, 150, 1) }).jatuh, false);
assert.equal(jalankan({ adc: adc(40, 250, 1) }, { dorongN: 0.6 }).jatuh, false);
// Tanpa kalibrasi titik nol: robot lari ke depan dan jatuh
assert.equal(jalankan({ adc: adc(30, 150, 1) }, { nol: false }).jatuh, true);

// Encoder: jarak dari pulsa cocok dengan putaran roda relatif badan (toleransi 3 celah, salah arah saat didorong)
{
  const { s } = jalankan({ adc: adc(40, 250, 1) }, { dorongN: 0.6 });
  const perCelah = 2 * Math.PI * S.RODA.r / S.ENCODER.celah;
  assert.ok(Math.abs(s.enc * perCelah - s.phiRel * S.RODA.r) < 3 * perCelah, `enc ${s.enc}, phiRel ${s.phiRel}`);
}

console.log('tes-sim: semua lulus');
