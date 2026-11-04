"""Pembantu python-docx bergaya handout Mekatronika (Times New Roman 11, A4)."""
import re
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

MONO = "Consolas"


def _font(style, nama="Times New Roman"):
    style.font.name = nama
    rpr = style.element.get_or_add_rPr()
    fonts = rpr.rFonts
    for attr in list(fonts.attrib):
        if "theme" in attr.lower():
            del fonts.attrib[attr]
    for k in ("ascii", "hAnsi", "eastAsia", "cs"):
        fonts.set(qn(f"w:{k}"), nama)


def _shade(el, warna):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), warna)
    el.append(shd)


class Dok:
    def __init__(self, judul_meta, subjek, header, footer):
        self.d = Document()
        sec = self.d.sections[0]
        sec.page_width, sec.page_height = Cm(21), Cm(29.7)
        sec.top_margin, sec.bottom_margin = Cm(2.0), Cm(2.0)
        sec.left_margin, sec.right_margin = Cm(2.5), Cm(2.5)
        st = self.d.styles
        for n in ("Normal", "Title", "Subtitle", "Heading 1", "Heading 2", "Caption", "Table Grid"):
            s = st[n]
            _font(s)
            s.font.color.rgb = RGBColor(0, 0, 0)
            s.font.size = Pt(11)
            s.paragraph_format.space_after = Pt(6)
            s.paragraph_format.line_spacing = 1.15
        st["Title"].font.size = Pt(15)
        st["Title"].font.bold = False
        st["Title"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        st["Title"].paragraph_format.space_after = Pt(4)
        for bdr in st["Title"].element.xpath(".//w:pBdr"):  # garis bawah judul bawaan template
            bdr.getparent().remove(bdr)
        st["Subtitle"].font.size = Pt(12)
        st["Subtitle"].font.italic = False
        st["Subtitle"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        st["Subtitle"].paragraph_format.space_after = Pt(2)
        for n, ukuran, sebelum in (("Heading 1", 12, 12), ("Heading 2", 11, 8)):
            st[n].font.size = Pt(ukuran)
            st[n].font.bold = True
            st[n].paragraph_format.space_before = Pt(sebelum)
            st[n].paragraph_format.space_after = Pt(4)
            st[n].paragraph_format.keep_with_next = True
        st["Caption"].font.size = Pt(9)
        st["Caption"].font.italic = True
        st["Caption"].font.bold = False
        st["Caption"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        st["Caption"].paragraph_format.space_after = Pt(10)
        # border tabel tipis
        if header:
            hp = sec.header.paragraphs[0]
            hp.text = header
            hp.runs[0].font.size = Pt(8)
            hp.runs[0].font.color.rgb = RGBColor(0x55, 0x55, 0x55)
        fp = sec.footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if footer:
            r = fp.add_run(footer + "   |   ")
            r.font.size = Pt(9)
        fld = OxmlElement("w:fldSimple")
        fld.set(qn("w:instr"), "PAGE")
        fp._p.append(fld)
        cp = self.d.core_properties
        cp.title, cp.subject, cp.author = judul_meta, subjek, "Tim Asisten Mekatronika"
        self.gambar_ke = 0

    # ---------------------------------------------------------- teks
    def judul(self, *baris):
        self.d.add_paragraph(baris[0], style="Title")
        for b in baris[1:]:
            self.d.add_paragraph(b, style="Subtitle")
        self.d.paragraphs[-1].paragraph_format.space_after = Pt(12)

    def h1(self, t):
        self.d.add_paragraph(t, style="Heading 1")

    def h2(self, t):
        self.d.add_paragraph(t, style="Heading 2")

    def p(self, teks, rata=True, ukuran=None, setelah=None):
        """Paragraf. **tebal**, *miring*, `kode` didukung secara sederhana."""
        par = self.d.add_paragraph()
        if rata:
            par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        for bagian in re.split(r"(\*\*.+?\*\*|`.+?`|\*.+?\*)", teks):
            if not bagian:
                continue
            if bagian.startswith("**"):
                r = par.add_run(bagian[2:-2])
                r.bold = True
            elif bagian.startswith("`"):
                r = par.add_run(bagian[1:-1])
                r.font.name = MONO
                r.font.size = Pt(9.5)
            elif bagian.startswith("*"):
                r = par.add_run(bagian[1:-1])
                r.italic = True
            else:
                r = par.add_run(bagian)
            if ukuran:
                r.font.size = Pt(ukuran)
        if setelah is not None:
            par.paragraph_format.space_after = Pt(setelah)
        return par

    def daftar(self, butir, angka=True):
        for i, b in enumerate(butir, 1):
            par = self.p(f"{i}. {b}" if angka else f"• {b}")
            par.paragraph_format.left_indent = Cm(0.6)
            par.paragraph_format.first_line_indent = Cm(-0.6)
            par.paragraph_format.space_after = Pt(3)

    def rumus(self, teks):
        par = self.d.add_paragraph()
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = par.add_run(teks)
        r.italic = True
        par.paragraph_format.space_after = Pt(6)

    # ---------------------------------------------------------- tabel
    def tabel(self, baris, lebar=None, ukuran=9.5, kepala=True, arsir=True):
        t = self.d.add_table(rows=len(baris), cols=len(baris[0]))
        t.style = "Table Grid"
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, row in enumerate(baris):
            for j, isi in enumerate(row):
                sel = t.cell(i, j)
                sel.text = ""
                par = sel.paragraphs[0]
                par.paragraph_format.space_after = Pt(0)
                par.paragraph_format.line_spacing = 1.0
                par.paragraph_format.keep_with_next = i < len(baris) - 1  # tabel tidak terpotong halaman
                r = par.add_run(str(isi))
                r.font.size = Pt(ukuran)
                if kepala and i == 0:
                    r.bold = True
                    if arsir:
                        _shade(sel._tc.get_or_add_tcPr(), "EDEDED")
                if lebar:
                    sel.width = Cm(lebar[j])
        if kepala:
            trpr = t.rows[0]._tr.get_or_add_trPr()
            h = OxmlElement("w:tblHeader")
            h.set(qn("w:val"), "true")
            trpr.append(h)
        self.d.add_paragraph().paragraph_format.space_after = Pt(2)
        return t

    # ---------------------------------------------------------- gambar
    def gambar(self, path, lebar_cm, keterangan):
        self.gambar_ke += 1
        par = self.d.add_paragraph()
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.paragraph_format.keep_with_next = True
        par.paragraph_format.space_after = Pt(2)
        par.add_run().add_picture(str(path), width=Cm(lebar_cm))
        self.d.add_paragraph(f"Gambar {self.gambar_ke}. {keterangan}", style="Caption")

    # ---------------------------------------------------------- kode
    def kode(self, teks, nama=None, isian=False):
        """Blok kode berlatar abu-abu. isian=True menyorot ___ dengan warna kuning."""
        if nama:
            par = self.d.add_paragraph()
            r = par.add_run(nama)
            r.bold = True
            r.font.name = MONO
            r.font.size = Pt(9)
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.keep_with_next = True
        for baris in teks.rstrip("\n").split("\n"):
            par = self.d.add_paragraph()
            pf = par.paragraph_format
            pf.space_after = Pt(0)
            pf.space_before = Pt(0)
            pf.line_spacing = 1.0
            pf.left_indent = Cm(0.2)
            _shade(par._p.get_or_add_pPr(), "F4F4F4")
            potongan = re.split(r"(___)", baris) if isian else [baris]
            for ptg in potongan:
                if ptg == "":
                    continue
                r = par.add_run(ptg if ptg.strip() or ptg else " ")
                r.font.name = MONO
                r.font.size = Pt(8.5)
                if isian and ptg == "___":
                    r.font.highlight_color = WD_COLOR_INDEX.YELLOW
                    r.bold = True
            if not baris:
                par.add_run(" ").font.size = Pt(8.5)
        self.d.add_paragraph().paragraph_format.space_after = Pt(2)

    def putus_halaman(self):
        self.d.add_page_break()

    def simpan(self, path):
        self.d.save(str(path))


def ke_pdf(daftar_docx):
    """Konversi .docx ke .pdf lewat Microsoft Word (COM)."""
    ps = ["$w = New-Object -ComObject Word.Application", "$w.Visible = $false"]
    for f in daftar_docx:
        f = str(Path(f).resolve())
        pdf = f[:-5] + ".pdf"
        ps.append(f"$d = $w.Documents.Open('{f}', $false, $true); $d.SaveAs2('{pdf}', 17); $d.Close($false)")
    ps.append("$w.Quit()")
    subprocess.run(["powershell", "-NoProfile", "-Command", "; ".join(ps)], check=True)
