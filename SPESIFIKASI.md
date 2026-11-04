# Tugas Rancang Mekatronika: Robot Balancing Roda Dua dengan PID

Spesifikasi minimal perancangan. Bagian bertanda **[diisi dosen]** belum ditetapkan.

## 1. Tujuan

Mahasiswa merancang, merakit, dan memprogram robot roda dua yang bisa berdiri tegak sendiri. Robot
menggunakan kendali PID dengan masukan sudut kemiringan dari MPU6050. Ketiga penguatan PID (Kp, Ki, Kd)
diatur langsung dengan tiga potensiometer, sehingga efek setiap suku bisa dirasakan saat robot berjalan.

Tugas ini menggabungkan materi Topik 3 (MPU6050 lewat I2C) dan Topik 6 (motor DC, L298N, PID).

## 2. Ketentuan umum

| Hal | Ketentuan |
|---|---|
| Anggota kelompok | **[diisi dosen]** |
| Durasi | **[diisi dosen]** minggu |
| Pengadaan komponen | **[diisi dosen]**: disediakan lab atau dibeli kelompok |
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
| M7 | Letak MPU6050 | Di bidang tengah robot, sedekat mungkin dengan sumbu roda, sumbu X sensor searah maju | Di bawah dek bawah, tepat di atas sumbu roda |
| M8 | Letak baterai | Di dek atas, terpasang kuat (tidak bergeser saat robot jatuh) | Holder 2×18650 dengan pengunci |
| M9 | Kenop | 3 potensiometer terjangkau tangan tanpa membongkar robot | Di tepi depan dek atas, diberi label Kp, Ki, Kd |
| M10 | Kekakuan | Tidak ada bagian yang bergoyang terhadap badan; motor dibaut ke braket, bukan hanya dilem | Spacer kuningan M3 di empat sudut |
| M11 | Pelindung | Robot boleh jatuh berkali-kali tanpa rusak | Spacer atas sedikit menonjol sebagai bumper |

Alasan M4: badan yang lebih tinggi jatuh lebih lambat, jadi lebih mudah dikendalikan. Simulasi
menampilkan konstanta waktu jatuh tiap varian (sekitar 125 ms untuk varian Standar).

## 4. Spesifikasi elektronik

| No | Item | Minimal (wajib) | Catatan |
|---|---|---|---|
| E1 | Sensor | MPU6050 (I2C) | Alamat 0x68 |
| E2 | Driver motor | L298N, atau driver lain yang setara/lebih baik dengan alasan tertulis | Jatuh tegangan L298N sekitar 2 V; perhitungkan dalam laporan |
| E3 | Motor | 2 motor DC bergearbox, tegangan nominal 6 V, 150–300 rpm | TT 1:48 boleh. Motor metal gear (mis. JGA25-370 6 V) lebih presisi karena backlash kecil |
| E4 | Baterai | 2S Li-ion 18650 (7,4 V nominal, 8,4 V penuh) | Jangan dipakai di bawah 6,6 V |
| E5 | Pengaman | Saklar daya utama + sekring 2–3 A di kabel positif baterai | |
| E6 | Kenop | 3 potensiometer linear 10 kΩ (B10K) | **Kaki ujung ke 3V3, bukan 5 V**: ADC STM32 tidak toleran 5 V |
| E7 | Tombol | 1 tombol untuk kalibrasi dan menyalakan/mematikan motor | INPUT_PULLUP |
| E8 | Ground | Semua GND (baterai, L298N, Black Pill, MPU6050, kenop) disatukan | |
| E9 | Pemantau baterai | Disarankan: pembagi tegangan ke ADC | Motor diputus otomatis bila baterai < 6,6 V |

### Peta pin yang disarankan

Sama dengan Topik 3 (I2C) dan Topik 6 (L298N), ditambah kanal B dan kenop.

| Fungsi | Pin Black Pill | Ke |
|---|---|---|
| I2C SCL | PB6 | MPU6050 SCL |
| I2C SDA | PB7 | MPU6050 SDA |
| PWM motor kiri | PA8 (TIM1_CH1) | L298N ENA (jumper dilepas) |
| Arah motor kiri | PB12, PB13 | L298N IN1, IN2 |
| PWM motor kanan | PA9 (TIM1_CH2) | L298N ENB (jumper dilepas) |
| Arah motor kanan | PB14, PB15 | L298N IN3, IN4 |
| Kenop Kp, Ki, Kd | PA1, PA2, PA3 | Kaki tengah potensiometer |
| Tombol | PB0 | Tombol ke GND |
| Tegangan baterai (opsional) | PA4 | Pembagi 10 kΩ / 3,3 kΩ |
| LED status | PC13 (LED bawaan) | |

PA0 tidak dipakai untuk kenop karena tombol KEY bawaan Black Pill terhubung ke PA0. Serial lewat USB CDC,
115200 baud, seperti praktikum.

## 5. Spesifikasi firmware

| No | Item | Minimal (wajib) |
|---|---|---|
| F1 | Loop kontrol | Periode tetap 5 ms (200 Hz) diatur dengan `micros()`, tanpa `delay()` di dalam loop |
| F2 | Kalibrasi gyro | Saat menyala, robot diam ±1 detik, rata-rata ≥ 200 bacaan gyro disimpan sebagai bias |
| F3 | Titik nol | Sudut setimbang diukur saat robot dipegang di titik "tanpa bobot", lalu disimpan sebagai setpoint |
| F4 | Estimasi sudut | Filter komplementer: `sudut = a·(sudut + gyro·dt) + (1 − a)·sudut_acc`, nilai `a` dipilih dan diberi alasan (0,98–0,998) |
| F5 | Kenop | Dibaca ≤ 20 Hz, dihaluskan (rata-rata bergerak atau EMA), dipetakan non-linear: `K = Kmaks·(adc/4095)²` |
| F6 | PID | Suku D dari laju gyro (bukan dari selisih error); suku I dengan anti-windup (batas \|Ki·I\| ≤ 255) |
| F7 | Deadband motor | PWM minimum ditambahkan supaya motor langsung berputar; nilainya diukur sendiri |
| F8 | Pemutus | Motor mati bila \|sudut\| > 40°; menyala lagi hanya lewat tombol |
| F9 | Log | Serial CSV ≥ 50 Hz: `t_ms,sudut,pwm,kp,ki,kd` |
| F10 | Status | LED PC13 berkedip saat PID aktif |

Rentang gain awal dari simulasi (motor TT, varian Standar): Kp 0–60 PWM/°, Ki 0–400 PWM/(°·s),
Kd 0–3 PWM/(°/s). Robot berdiri di sekitar Kp 30, Ki 150, Kd 1. Robot nyata hampir pasti butuh nilai
lain; rentang ini hanya titik awal.

## 6. Pengujian dan kriteria lulus

| Uji | Prosedur | Lulus minimal |
|---|---|---|
| U1 Berdiri | Robot dilepas di lantai datar setelah kalibrasi | Berdiri ≥ 30 detik tanpa disentuh, 3 dari 3 percobaan |
| U2 Gangguan | Dorongan standar di dek atas: bandul **[diisi dosen: massa dan sudut lepas]** | Pulih tanpa jatuh, 2 dari 3 percobaan |
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
5. Laporan: perhitungan (tegangan efektif motor setelah L298N, kecepatan roda maksimum, pusat massa),
   prosedur tuning, plot U3, nilai gain akhir, dan analisis kegagalan yang terjadi selama tuning.
6. Video ≤ 2 menit: U1 dan U2.

## 8. Keselamatan

- Baterai Li-ion diisi dengan charger 2S yang benar, tidak diisi tanpa diawasi, dan tidak dipakai bila
  menggembung.
- Saat memprogram lewat USB, matikan saklar baterai atau angkat roda dari lantai.
- Uji pertama robot dipegang tangan atau diikat tali di atas meja, bukan dilepas di tepi meja.
- Heatsink L298N bisa panas; jangan disentuh setelah robot lama berjalan.

## 9. Simulasi pendukung

Buka `simulasi/Buka simulasi.bat` (Windows; tanpa instalasi, tanpa internet). Simulasi memodelkan
dinamika pendulum terbalik beroda, motor DC dengan back-EMF dan backlash gearbox, jatuh tegangan L298N,
derau dan bias MPU6050, filter komplementer, dan firmware PID dengan kenop yang sama seperti spesifikasi
di atas. Hal yang bisa dicoba mahasiswa:

- Robot dengan P saja: robot tegak sebentar lalu lari dan jatuh. Suku I dibutuhkan untuk melawan back-EMF motor.
- Lewati kalibrasi gyro atau titik nol: robot lari ke satu arah.
- Geser baterai beberapa milimeter tanpa menyetel ulang titik nol.
- Bandingkan varian Kompak, Standar, dan Tinggi, serta motor TT dan JGA25-370.
- Turunkan alpha filter ke 0,95: estimasi sudut tertipu percepatan maju.

Parameter motor, massa, dan derau sensor di simulasi adalah perkiraan dari lembar data, bukan hasil
pengukuran. Simulasi tidak memodelkan belok (kedua roda dianggap identik), lantai miring, atau slip roda.
