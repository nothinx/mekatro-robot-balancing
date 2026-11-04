# Tugas Rancang Mekatronika: Robot Balancing Roda Dua dengan PID

> **Dokumen acuan, bukan syarat.** Yang wajib hanya bagian *Ketentuan* di
> `Panduan_Tugas_Rancang_Robot_Balancing.pdf`. Angka dan cara di bawah ini (termasuk kolom "Minimal (wajib)")
> adalah contoh rancangan yang terbukti bekerja di simulasi; boleh dipakai sebagai titik awal, boleh juga
> diganti dengan rancangan kelompok sendiri asalkan alasannya ditulis di laporan.

## 1. Tujuan

Mahasiswa merancang, merakit, dan memprogram robot roda dua yang bisa berdiri tegak sendiri. Robot
menggunakan kendali PID dengan masukan sudut kemiringan dari sensor inersia (IMU). Ketiga penguatan PID
(Kp, Ki, Kd) diatur langsung dengan tiga potensiometer, sehingga efek setiap suku bisa dirasakan saat robot
berjalan.

Jenis sensor, driver motor, dan motor bebas dipilih kelompok, asalkan memenuhi fungsi di bawah dan
alasan pemilihannya ditulis di laporan. Tugas ini melanjutkan materi Topik 3 (sensor I2C) dan Topik 6
(motor DC, driver, PID).

## 2. Ketentuan umum

| Hal | Ketentuan |
|---|---|
| Mikrokontroler | Black Pill STM32F411CEU6, Arduino IDE, sama seperti praktikum |
| Simulasi pendukung | `simulasi/` di folder ini; dipakai untuk memahami cara kerja dan memilih rentang gain sebelum merakit |

## 3. Spesifikasi mekanik

| No | Item | Minimal (wajib) | Disarankan |
|---|---|---|---|
| M1 | Konfigurasi | 2 roda sesumbu, tanpa roda bantu saat diuji | |
| M2 | Roda | Diameter 60–70 mm, ban karet | Roda TT 65 mm |
| M3 | Badan | Minimal 2 tingkat dek yang kaku (akrilik 3 mm, PLA ≥ 3 mm, atau PCB polos) | 3 dek, jarak antar-dek 55–60 mm |
| M4 | Tinggi total | 180–280 mm dari lantai | ± 235 mm (sekitar 3,6 kali diameter roda) |
| M5 | Jejak roda (tengah ke tengah) | ≤ 200 mm | ± 165 mm |
| M6 | Massa total | ≤ 800 g | 450–550 g |
| M7 | Letak sensor | Di bidang tengah robot, sedekat mungkin dengan sumbu roda, salah satu sumbu sensor searah maju | Di bawah dek bawah, tepat di atas sumbu roda |
| M8 | Letak baterai | Di dek atas, terpasang kuat (tidak bergeser saat robot jatuh) | Holder 2×18650 dengan pengunci |
| M9 | Kenop | 3 potensiometer terjangkau tangan tanpa membongkar robot | Di tepi depan dek atas, diberi label Kp, Ki, Kd |
| M10 | Kekakuan | Tidak ada bagian yang bergoyang terhadap badan; motor dibaut ke braket, bukan hanya dilem | Spacer kuningan M3 di empat sudut |
| M11 | Pelindung | Robot boleh jatuh berkali-kali tanpa rusak | Spacer atas sedikit menonjol sebagai bumper |

Alasan M4: badan yang lebih tinggi jatuh lebih lambat, jadi lebih mudah dikendalikan. Simulasi
menampilkan konstanta waktu jatuh tiap varian (sekitar 125 ms untuk varian Standar).

## 4. Spesifikasi elektronik

| No | Item | Minimal (wajib) | Catatan |
|---|---|---|---|
| E1 | Sensor kemiringan | IMU yang memberi laju sudut (gyro) dan arah gravitasi (akselerometer), atau sudut hasil fusi | Contoh: MPU6050, MPU9250, ICM-20948, BMI160, LSM6DS3, BNO055 |
| E2 | Driver motor | Driver yang cocok dengan motor, tegangan baterai, dan arus macet motor | Contoh: L298N, TB6612FNG, DRV8833, BTS7960; untuk stepper A4988, DRV8825, TMC2209 |
| E3 | Motor | 2 motor yang sama: DC bergearbox atau stepper | Motor dengan backlash kecil (metal gear atau stepper) lebih mudah di-tuning |
| E4 | Baterai | Sesuai tegangan motor dan driver, kapasitas cukup untuk ≥ 15 menit uji | 2S Li-ion 18650 umum dipakai; jangan dikosongkan di bawah batas sel (± 3,3 V/sel) |
| E5 | Pengaman | Saklar daya utama + sekring sesuai arus motor di kabel positif baterai | |
| E6 | Kenop | 3 potensiometer linear (mis. 10 kΩ) | **Kaki ujung ke tegangan referensi ADC** (3V3 pada Black Pill), bukan 5 V |
| E7 | Tombol | 1 tombol untuk kalibrasi dan menyalakan/mematikan motor | INPUT_PULLUP |
| E8 | Ground | Semua GND (baterai, driver, mikrokontroler, sensor, kenop) disatukan | |
| E9 | Pemantau baterai | Disarankan: pembagi tegangan ke ADC | Motor diputus otomatis bila baterai di bawah batas |

### Peta pin

Kelompok menyusun peta pin sendiri dan mencantumkannya di skema. Hal yang perlu diperhatikan pada
Black Pill:

- Sinyal PWM/STEP harus dari pin yang terhubung ke timer (mis. PA8 dan PA9 di TIM1).
- Kenop harus di pin ADC. PA0 sebaiknya tidak dipakai karena tombol KEY bawaan terhubung ke sana.
- Sensor I2C bisa memakai PB6 (SCL) dan PB7 (SDA) seperti Topik 3; sensor SPI memakai pin SPI1/SPI2.
- Serial lewat USB CDC, 115200 baud, seperti praktikum.

## 5. Spesifikasi firmware

| No | Item | Minimal (wajib) |
|---|---|---|
| F1 | Loop kontrol | Periode tetap 5 ms (200 Hz) diatur dengan `micros()`, tanpa `delay()` di dalam loop |
| F2 | Kalibrasi sensor | Saat menyala, robot diam ±1 detik, offset gyro dirata-rata dari ≥ 200 bacaan (atau prosedur kalibrasi bawaan sensor) |
| F3 | Titik nol | Sudut setimbang diukur saat robot dipegang di titik "tanpa bobot", lalu disimpan sebagai setpoint |
| F4 | Estimasi sudut | Fusi gyro dan akselerometer (filter komplementer, Kalman, Madgwick/Mahony, atau fusi bawaan sensor), parameter dipilih dan diberi alasan. Contoh komplementer: `sudut = a·(sudut + gyro·dt) + (1 − a)·sudut_acc` |
| F5 | Kenop | Dibaca ≤ 20 Hz, dihaluskan (rata-rata bergerak atau EMA), dipetakan non-linear: `K = Kmaks·(adc/adc_maks)²` |
| F6 | PID | Suku D dari laju sudut gyro (bukan dari selisih error); suku I dengan anti-windup (keluaran I dibatasi) |
| F7 | Keluaran motor | Motor DC: PWM minimum ditambahkan untuk mengatasi deadband (diukur sendiri). Stepper: keluaran PID dipetakan ke kecepatan/percepatan langkah dengan batas |
| F8 | Pemutus | Motor mati bila \|sudut\| > 40°; menyala lagi hanya lewat tombol |
| F9 | Log | Serial CSV ≥ 50 Hz: `t_ms,sudut,keluaran,kp,ki,kd` |
| F10 | Status | LED PC13 berkedip saat PID aktif |

Rentang gain awal dari simulasi (contoh MPU6050, L298N, motor TT, varian Standar): Kp 0–60 PWM/°,
Ki 0–400 PWM/(°·s), Kd 0–3 PWM/(°/s). Robot berdiri di sekitar Kp 30, Ki 150, Kd 1. Sensor, driver, atau
motor lain membutuhkan nilai lain; rentang ini hanya titik awal.

## 6. Pengujian dan kriteria lulus

| Uji | Prosedur | Lulus minimal |
|---|---|---|
| U1 Berdiri | Robot dilepas di lantai datar setelah kalibrasi | Berdiri ≥ 30 detik tanpa disentuh, 3 dari 3 percobaan |
| U2 Gangguan | Dorongan standar di dek atas, sama untuk semua kelompok | Pulih tanpa jatuh, 2 dari 3 percobaan |
| U3 Efek gain | Rekam log untuk P saja, PD, dan PID | Tiga plot sudut terhadap waktu, beserta penjelasannya |
| U4 Pemutus | Robot dimiringkan paksa melewati 40° | Motor berhenti dan tidak menyala sendiri |
| U5 Loop | Ukur periode loop (toggle pin + osiloskop, atau `micros()`) | Rata-rata 5 ms ± 0,2 ms |

Bonus (tidak wajib): encoder roda dan loop kecepatan kedua supaya robot tidak bergeser; kendali maju-mundur
lewat serial.

## 7. Yang dikumpulkan

1. Robot fisik untuk diuji (U1–U5).
2. Gambar rancangan: sketsa atau CAD dengan ukuran utama, serta posisi pusat massa (dihitung atau diukur).
3. Skema rangkaian lengkap dengan peta pin.
4. Kode program yang dikomentari.
5. Laporan: alasan pemilihan sensor, driver, dan motor; perhitungan (tegangan dan arus efektif motor
   setelah driver, kecepatan roda maksimum, pusat massa), prosedur tuning, plot U3, nilai gain akhir, dan analisis kegagalan yang terjadi selama tuning.
6. Video ≤ 2 menit: U1 dan U2.

## 8. Keselamatan

- Baterai Li-ion diisi dengan charger 2S yang benar, tidak diisi tanpa diawasi, dan tidak dipakai bila
  menggembung.
- Saat memprogram lewat USB, matikan saklar baterai atau angkat roda dari lantai.
- Uji pertama robot dipegang tangan atau diikat tali di atas meja, bukan dilepas di tepi meja.
- Heatsink driver motor bisa panas; jangan disentuh setelah robot lama berjalan.

## 9. Simulasi pendukung

Buka `simulasi/Buka simulasi.bat` (Windows; tanpa instalasi, tanpa internet). Simulasi memodelkan
dinamika pendulum terbalik beroda, motor DC dengan back-EMF dan backlash gearbox, jatuh tegangan L298N,
derau dan bias MPU6050, filter komplementer, dan firmware PID dengan kenop. Komponen di simulasi
(MPU6050, L298N, motor TT) hanya contoh; prinsipnya sama untuk sensor, driver, dan motor lain. Hal yang
bisa dicoba mahasiswa:

- Robot dengan P saja: robot tegak sebentar lalu lari dan jatuh. Suku I dibutuhkan untuk melawan back-EMF motor.
- Lewati kalibrasi gyro atau titik nol: robot lari ke satu arah.
- Geser baterai beberapa milimeter tanpa menyetel ulang titik nol.
- Bandingkan varian Kompak, Standar, dan Tinggi, serta motor TT dan JGA25-370.
- Turunkan alpha filter ke 0,95: estimasi sudut tertipu percepatan maju.

Parameter motor, massa, dan derau sensor di simulasi adalah perkiraan dari lembar data, bukan hasil
pengukuran. Simulasi tidak memodelkan belok (kedua roda dianggap identik), lantai miring, atau slip roda.
