# Tugas Rancang · Robot Balancing PID dengan Kenop Potensiometer

| File / folder | Untuk | Isi |
| --- | --- | --- |
| `SPESIFIKASI.md` | Mahasiswa | Spesifikasi minimal mekanik, elektronik, firmware, uji, dan yang dikumpulkan |
| `simulasi/Buka simulasi.bat` | Semua | Membuka simulasi 3D di browser (offline, tanpa instalasi) |
| `simulasi/sim.js` | Penyusun | Fisika, model motor & sensor, firmware PID (satu sumber untuk browser dan tes) |
| `simulasi/model.js` | Penyusun | Model 3D robot dari primitif Three.js, ukuran nyata |
| `simulasi/main.js`, `index.html`, `gaya.css` | Penyusun | Tampilan, kenop, grafik, serial monitor |
| `simulasi/tes-sim.mjs` | Penyusun | Cek perilaku fisika: `node tes-sim.mjs` |
| `simulasi/vendor/` | | Three.js r160 (MIT) disimpan lokal supaya jalan tanpa internet |

## Menjalankan simulasi

Daring: https://nothinx.github.io/mekatro-robot-balancing/

Luring (tanpa internet): klik dua kali `simulasi/Buka simulasi.bat`. Server kecil PowerShell berjalan di `http://localhost:8137/`
dan browser terbuka otomatis. Biarkan jendela hitamnya terbuka selama simulasi dipakai.

Halaman tidak bisa dibuka langsung dari `index.html` (file://), karena browser memblokir modul JavaScript
dari file lokal.
