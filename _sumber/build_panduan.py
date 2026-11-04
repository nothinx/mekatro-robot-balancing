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
     ["Tentukan sendiri bentuk, ukuran, material, dan susunan badan robot roda dua.",
      "Pertimbangkan tinggi pusat massa, letak sensor terhadap sumbu roda, kekakuan badan, letak baterai, "
      "dan kemudahan menjangkau kenop, lalu tulis alasan pilihan kelompok.",
      "Buat gambar rancangan (sketsa atau CAD) dengan ukuran utama dan perkiraan posisi pusat massa."]),
    ("Pilih komponen dan rangkai elektronik",
     ["Pilih sendiri sensor kemiringan, motor, driver, dan baterai yang saling cocok, dengan alasan dan "
      "perhitungan sederhana (tegangan, arus, kecepatan roda).",
      "Sediakan tiga kenop potensiometer untuk Kp, Ki, Kd dan satu cara menyalakan/mematikan motor.",
      "Lengkapi pengaman dasar: saklar daya utama dan proteksi arus.",
      "Buat skema rangkaian lengkap dengan peta pin."]),
    ("Buat program firmware",
     ["Fungsi minimum: membaca sensor dan memperkirakan sudut kemiringan, loop kontrol berperiode tetap, "
      "PID dengan gain dari kenop yang bisa diubah saat robot berjalan, motor mati otomatis saat robot jatuh, "
      "dan log data lewat serial untuk analisis.",
      "Cara mewujudkannya bebas: metode fusi sudut, periode loop, pemetaan kenop ke gain, struktur program. "
      "Jelaskan dan beri alasan tiap pilihan di laporan."]),
    ("Pelajari sistem dengan simulasi",
     [f"Gunakan simulasi di {SIMULASI} untuk memahami efek tiap suku PID, kalibrasi, dan bentuk badan "
      "sebelum merakit. Komponen di simulasi hanya contoh, tidak wajib ditiru."]),
    ("Uji dan tuning",
     ["Rancang sendiri prosedur tuning dan pengujian robot.",
      "Minimal tunjukkan: robot berdiri sendiri tanpa disentuh, pulih dari dorongan, dan perbandingan efek "
      "P, I, dan D berdasarkan data log (grafik sudut terhadap waktu).",
      "Buktikan juga bahwa pemutus motor dan periode loop bekerja sesuai rancangan."]),
    ("Susun laporan dan video",
     ["Laporan berisi rancangan dan alasannya, skema, perhitungan, prosedur dan hasil uji, analisis PID "
      "dengan data, nilai gain akhir, serta masalah yang ditemui dan cara mengatasinya.",
      "Lampirkan kode program yang dikomentari.",
      "Video singkat (maksimal 3 menit) yang memperlihatkan robot berdiri, pulih dari gangguan, dan fitur "
      "tambahan bila ada."]),
]

WAJIB = [
    "Robot beroda dua sesumbu, tanpa roda bantu saat diuji, dan menyeimbangkan diri dengan kendali PID.",
    "Kp, Ki, dan Kd diatur dengan tiga kenop potensiometer tanpa mengunggah ulang program.",
    "Mikrokontroler Black Pill STM32F411 seperti praktikum; mikrokontroler lain dengan persetujuan asisten.",
    "Ada saklar daya, proteksi arus, dan pemutus motor otomatis saat robot jatuh.",
]
BEBAS = ("Bentuk dan ukuran badan, material, sensor, motor, driver, baterai, metode estimasi sudut, "
         "struktur program, prosedur uji, dan fitur tambahan. SPESIFIKASI.md berisi angka acuan yang boleh "
         "dipakai sebagai titik awal, bukan syarat.")
KREASI = [
    "Encoder roda dan loop kecepatan supaya robot tidak bergeser.",
    "Kendali maju, mundur, dan belok lewat serial, Bluetooth, atau Wi-Fi.",
    "Tampilan nilai gain dan sudut (OLED, LED, aplikasi ponsel).",
    "Penyimpanan gain terbaik ke memori, atau penyetelan gain otomatis.",
    "Bentuk badan tak biasa, desain cetak 3D, atau pengaman jatuh yang cerdik.",
]

KEPALA_RUBRIK = ["No", "Aspek", "Bobot", "4 · Sangat baik", "3 · Baik", "2 · Cukup", "1 · Kurang"]
RUBRIK = [
    ["1", "Rancangan mekanik", "10",
     "Rancangan beralasan kuat (pusat massa, letak sensor, kekakuan); gambar lengkap dengan ukuran",
     "Rancangan beralasan; gambar lengkap tetapi analisis kurang",
     "Rancangan bekerja tetapi alasan lemah atau gambar tidak lengkap",
     "Tanpa gambar atau rancangan tidak bekerja"],
    ["2", "Pemilihan komponen dan rangkaian", "10",
     "Komponen cocok, dipilih dengan alasan dan perhitungan benar; pengaman lengkap; skema rapi dan lengkap",
     "Pemilihan beralasan dan rangkaian benar; perhitungan atau kerapian kurang",
     "Rangkaian bekerja tetapi pemilihan tanpa alasan atau skema tidak lengkap",
     "Rangkaian salah, komponen tidak cocok, atau tanpa skema"],
    ["3", "Program firmware", "15",
     "Semua fungsi minimum ada dan benar; pilihan implementasi dijelaskan; kode terstruktur dan dikomentari",
     "Semua fungsi ada; penjelasan atau struktur kurang",
     "Satu atau dua fungsi minimum tidak ada atau salah",
     "Lebih dari dua fungsi minimum tidak ada"],
    ["4", "Kinerja: berdiri sendiri", "15",
     "Berdiri stabil ≥ 30 detik secara konsisten",
     "Berdiri ≥ 30 detik tetapi tidak konsisten",
     "Berdiri 10–30 detik",
     "Berdiri < 10 detik"],
    ["5", "Kinerja: pulih dari gangguan", "10",
     "Selalu pulih dari dorongan",
     "Sering pulih",
     "Kadang pulih",
     "Tidak pernah pulih"],
    ["6", "Analisis PID dengan data", "15",
     "Efek P, I, D dibandingkan dengan data log dan dijelaskan benar",
     "Data lengkap; penjelasan benar tetapi kurang dikaitkan dengan data",
     "Data tidak lengkap atau penjelasan sebagian keliru",
     "Tanpa data atau penjelasan keliru"],
    ["7", "Keselamatan", "5",
     "Pemutus motor, saklar, dan proteksi arus terbukti bekerja",
     "Semua ada, tanpa bukti uji",
     "Salah satu tidak ada",
     "Tidak ada pengaman"],
    ["8", "Kreativitas dan inovasi", "10",
     "Ada gagasan atau fitur orisinal yang bekerja dan bermanfaat",
     "Ada fitur tambahan yang bekerja",
     "Fitur tambahan dicoba tetapi belum bekerja",
     "Tidak ada usaha di luar ketentuan wajib"],
    ["9", "Laporan", "5",
     "Lengkap, runtut, dan benar, termasuk masalah dan solusinya",
     "Lengkap, ada kesalahan kecil",
     "Satu bagian penting tidak ada",
     "Lebih dari satu bagian penting tidak ada"],
    ["10", "Video dan demonstrasi", "5",
     "Video jelas; kelompok menjawab pertanyaan dengan tepat",
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

    d.h1("Ketentuan")
    d.p("Wajib dipenuhi:")
    d.daftar(WAJIB, angka=False)
    d.p("Bebas dipilih kelompok: " + BEBAS)

    d.h1("Perintah")
    for i, (judul, butir) in enumerate(PERINTAH, 1):
        d.h2(f"{i}. {judul}")
        d.daftar(butir, angka=False)

    d.h1("Ruang Kreasi")
    d.p("Ketentuan di atas hanya batas minimum. Kelompok dianjurkan menambah gagasan sendiri, misalnya:")
    d.daftar(KREASI, angka=False)
    d.p("Gagasan lain di luar daftar ini justru dihargai lebih. Diskusikan dengan asisten bila ragu.")

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
