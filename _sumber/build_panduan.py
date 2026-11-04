"""Bangun Panduan Tugas Rancang (perintah + matriks penilaian), .docx dan .pdf.

Jalankan: python _sumber/build_panduan.py   (butuh python-docx dan Microsoft Word untuk PDF)
"""
from pathlib import Path

from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Cm

from docx_util import Dok, ke_pdf

ROOT = Path(__file__).resolve().parent.parent
SIMULASI = "https://nothinx.github.io/mekatro-robot-balancing/"

PERINTAH = [
    ("Rancang mekanik robot",
     ["Buat robot roda dua sesumbu tanpa roda bantu, roda berdiameter 60–70 mm.",
      "Badan minimal 2 tingkat dek yang kaku, tinggi total 180–280 mm dari lantai, jejak roda maksimal 200 mm, "
      "massa total maksimal 800 g.",
      "Pasang sensor kemiringan di bidang tengah robot, sedekat mungkin dengan sumbu roda, dengan salah satu "
      "sumbu sensor searah maju.",
      "Pasang baterai di dek atas dengan kuat dan tiga kenop di tempat yang terjangkau tangan.",
      "Buat gambar rancangan (sketsa atau CAD) dengan ukuran utama dan posisi pusat massa hasil hitung atau ukur."]),
    ("Rangkai sistem elektronik",
     ["Gunakan mikrokontroler Black Pill STM32F411CEU6.",
      "Pilih sendiri sensor kemiringan berupa IMU yang menyediakan gyro dan akselerometer, atau sudut hasil fusi "
      "(contoh: MPU6050, MPU9250, ICM-20948, BMI160, BNO055).",
      "Pilih sendiri motor (DC bergearbox atau stepper, dua buah yang sama) beserta driver yang cocok dengan "
      "tegangan baterai dan arus motor (contoh: L298N, TB6612FNG, DRV8833, BTS7960, A4988, TMC2209).",
      "Lengkapi dengan baterai yang sesuai, saklar daya, sekring, 3 potensiometer linear, dan 1 tombol.",
      "Hubungkan kaki ujung potensiometer ke tegangan referensi ADC (3V3), bukan 5 V. Satukan semua GND.",
      "Susun peta pin sendiri: PWM/STEP dari pin timer, kenop di pin ADC, hindari PA0 (tombol KEY bawaan).",
      "Buat skema rangkaian lengkap beserta peta pin, dan tulis alasan pemilihan sensor, driver, dan motor."]),
    ("Buat program firmware",
     ["Loop kontrol berperiode tetap 5 ms (200 Hz) dengan micros(), tanpa delay() di dalam loop.",
      "Kalibrasi sensor saat robot diam: offset gyro dirata-rata dari minimal 200 bacaan, atau pakai prosedur "
      "kalibrasi bawaan sensor.",
      "Ukur dan simpan titik nol (sudut setimbang) saat robot dipegang di posisi setimbang.",
      "Hitung sudut dengan fusi gyro dan akselerometer (filter komplementer, Kalman, Madgwick/Mahony, atau fusi "
      "bawaan sensor) dan beri alasan parameter yang dipilih.",
      "Baca kenop maksimal 20 Hz, haluskan, lalu petakan ke gain dengan K = Kmaks × (ADC/ADC maks)².",
      "Hitung PID dengan suku D dari laju sudut gyro dan suku I dengan anti-windup.",
      "Petakan keluaran PID ke motor: PWM dengan kompensasi deadband untuk motor DC, atau kecepatan langkah "
      "berbatas untuk stepper.",
      "Matikan motor bila kemiringan melebihi 40° dan nyalakan lagi hanya lewat tombol.",
      "Kirim log serial CSV minimal 50 Hz dengan format t_ms,sudut,keluaran,kp,ki,kd; LED PC13 berkedip saat "
      "PID aktif."]),
    ("Pelajari sistem dengan simulasi",
     [f"Buka simulasi di {SIMULASI} atau dari folder simulasi/ di repositori.",
      "Coba P saja, PD, dan PID; lewati kalibrasi; geser baterai; bandingkan varian badan. "
      "Komponen di simulasi (MPU6050, L298N, motor TT) hanya contoh; prinsipnya sama untuk komponen pilihan "
      "kelompok."]),
    ("Tuning dan uji robot",
     ["U1 Berdiri: robot dilepas di lantai datar setelah kalibrasi, berdiri minimal 30 detik tanpa disentuh, "
      "3 kali percobaan.",
      "U2 Gangguan: dorongan standar di dek atas yang sama untuk semua kelompok, robot pulih tanpa jatuh, "
      "3 kali percobaan.",
      "U3 Efek gain: rekam log untuk P saja, PD, dan PID, lalu buat plot sudut terhadap waktu.",
      "U4 Pemutus: miringkan robot melewati 40°, motor harus berhenti dan tidak menyala sendiri.",
      "U5 Loop: ukur periode loop dengan osiloskop atau micros(), rata-rata 5 ms ± 0,2 ms."]),
    ("Susun laporan dan video",
     ["Laporan berisi gambar rancangan, skema, alasan pemilihan sensor, driver, dan motor, perhitungan "
      "(tegangan dan arus efektif motor setelah driver, kecepatan roda maksimum, pusat massa), prosedur tuning, plot U3, nilai gain akhir, dan analisis kegagalan "
      "selama tuning.",
      "Kode program dikomentari dan dilampirkan.",
      "Video maksimal 2 menit yang memperlihatkan U1 dan U2."]),
]

KEPALA_RUBRIK = ["No", "Aspek", "Bobot", "4 · Sangat baik", "3 · Baik", "2 · Cukup", "1 · Kurang"]
RUBRIK = [
    ["1", "Rancangan mekanik dan gambar", "10",
     "Semua syarat mekanik terpenuhi; badan kaku; gambar lengkap dengan ukuran dan pusat massa",
     "Syarat terpenuhi; gambar lengkap tetapi pusat massa tidak dihitung",
     "Satu atau dua syarat tidak terpenuhi, atau gambar tanpa ukuran",
     "Lebih dari dua syarat tidak terpenuhi atau tanpa gambar"],
    ["2", "Pemilihan komponen, rangkaian, dan skema", "10",
     "Sensor, driver, dan motor dipilih dengan alasan dan perhitungan yang benar; kenop ke 3V3, pengaman "
     "lengkap, kabel rapi; skema dan peta pin lengkap",
     "Pemilihan beralasan dan rangkaian benar; perhitungan atau kerapian kurang",
     "Rangkaian bekerja tetapi pemilihan tanpa alasan, pengaman kurang, atau skema tidak lengkap",
     "Rangkaian salah, komponen tidak cocok, atau tanpa skema"],
    ["3", "Program firmware", "20",
     "Semua fitur wajib ada dan benar; kode terstruktur dan dikomentari",
     "Satu fitur wajib kurang tepat",
     "Dua atau tiga fitur wajib tidak ada atau salah",
     "Lebih dari tiga fitur wajib tidak ada"],
    ["4", "U1 Berdiri", "15",
     "Berdiri ≥ 30 detik pada 3 dari 3 percobaan",
     "Berdiri ≥ 30 detik pada 2 dari 3 percobaan",
     "Berdiri 10–30 detik",
     "Berdiri < 10 detik"],
    ["5", "U2 Gangguan", "10",
     "Pulih pada 3 dari 3 percobaan",
     "Pulih pada 2 dari 3 percobaan",
     "Pulih pada 1 dari 3 percobaan",
     "Tidak pernah pulih"],
    ["6", "U3 Analisis efek gain", "15",
     "Tiga plot lengkap; efek P, I, D dijelaskan benar dan dikaitkan dengan data",
     "Tiga plot lengkap; penjelasan benar tetapi kurang dikaitkan dengan data",
     "Plot tidak lengkap atau penjelasan sebagian keliru",
     "Tanpa plot atau penjelasan keliru"],
    ["7", "U4 Pemutus dan U5 Loop", "5",
     "U4 dan U5 lulus dengan bukti pengukuran",
     "U4 dan U5 lulus tanpa bukti pengukuran",
     "Hanya satu yang lulus",
     "Keduanya tidak lulus"],
    ["8", "Laporan", "10",
     "Perhitungan, prosedur tuning, gain akhir, dan analisis kegagalan lengkap dan benar",
     "Lengkap, ada kesalahan kecil",
     "Satu bagian wajib tidak ada",
     "Lebih dari satu bagian wajib tidak ada"],
    ["9", "Video dan demonstrasi", "5",
     "Video ≤ 2 menit memperlihatkan U1 dan U2 dengan jelas; kelompok menjawab pertanyaan dengan tepat",
     "Video lengkap; jawaban sebagian tepat",
     "Video tidak lengkap atau melebihi durasi",
     "Tanpa video"],
]


def matriks(d):
    d.h1("Matriks Penilaian")
    d.p("Setiap aspek diberi skor 1 sampai 4 menurut kriteria di bawah. Aspek yang tidak dikerjakan diberi skor 0. "
        "Nilai aspek = bobot × skor ÷ 4. Nilai akhir = jumlah nilai semua aspek (maksimal 100).")
    d.tabel([KEPALA_RUBRIK] + RUBRIK, lebar=[0.9, 3.4, 1.3, 5.0, 4.5, 4.5, 4.4], ukuran=9, arsir=False)

    d.putus_halaman()
    d.h2("Lembar Nilai")
    d.p("Kelompok: ..........................................   Anggota: ................................................"
        "..................................................", rata=False)
    lembar = [["No", "Aspek", "Bobot", "Skor (0–4)", "Nilai", "Catatan penilai"]]
    lembar += [[r[0], r[1], r[2], "", "", ""] for r in RUBRIK]
    lembar += [["", "Nilai akhir", "100", "", "", ""]]
    t = d.tabel(lembar, lebar=[0.9, 5.2, 1.5, 2.2, 2.2, 12.0], ukuran=10, arsir=False)
    for baris in t.rows[1:]:  # ruang tulis tangan
        baris.height = Cm(1.0)
        baris.cells[0].vertical_alignment = baris.cells[1].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        baris.cells[2].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for sel in t.rows[-1].cells:
        for r in sel.paragraphs[0].runs:
            r.bold = True
    d.p("Tanda tangan penilai: ..........................................     Tanggal: ....................", rata=False)


def bangun():
    d = Dok("Panduan Tugas Rancang Robot Balancing", "Robot balancing PID dengan kenop potensiometer",
            "TUGAS RANCANG MEKATRONIKA   |   ROBOT BALANCING", "Panduan Tugas Rancang")
    d.judul("PANDUAN TUGAS RANCANG MEKATRONIKA", "Robot Balancing Roda Dua dengan PID",
            "Penguatan Kp, Ki, Kd diatur dengan tiga potensiometer")

    d.h1("Perintah")
    for i, (judul, butir) in enumerate(PERINTAH, 1):
        d.h2(f"{i}. {judul}")
        d.daftar(butir, angka=False)

    sek = d.d.add_section(WD_SECTION.NEW_PAGE)
    sek.orientation = WD_ORIENT.LANDSCAPE
    sek.page_width, sek.page_height = Cm(29.7), Cm(21)
    sek.left_margin = sek.right_margin = Cm(2.0)
    sek.top_margin = sek.bottom_margin = Cm(1.8)
    matriks(d)

    p = ROOT / "Panduan_Tugas_Rancang_Robot_Balancing.docx"
    d.simpan(p)
    return p


if __name__ == "__main__":
    f = bangun()
    ke_pdf([f])
    print("selesai:", f, f.with_suffix(".pdf"))
