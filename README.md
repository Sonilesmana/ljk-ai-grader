# LJK Vision AI

Single-Page Application (HTML + Tailwind CSS + JavaScript murni) untuk koreksi Lembar Jawaban Siswa otomatis:
**OMR** (bulatan/tanda silang), **OCR** (tulisan tangan esai), dan **AI Grading semantik** menggunakan Gemini Vision.
Library **Mammoth.js** dipakai untuk mengekstrak teks kunci jawaban dari file `.docx`.

## Cara menjalankan

1. Buka `index.html` langsung di browser, atau jalankan server statis lokal:

   ```powershell
   cd "C:\Users\Soni Lesmana\ljk-ai-grader"
   python -m http.server 8000
   ```

   lalu buka `http://localhost:8000`.

2. Klik **API Key**, masukkan kunci dari [Google AI Studio](https://aistudio.google.com/apikey), pilih model
   `gemini-2.5-flash`, lalu **Simpan**. Kunci hanya disimpan di `localStorage` browser (tanpa backend).
3. **Step 1** – upload kunci `.docx` atau tempel teks, lalu klik **Ekstrak & Parse dengan AI**.
   Tabel kunci yang muncul bisa disunting manual (tambah/hapus baris, ubah nomor, kunci, dan bobot esai).
4. **Step 2** – buka kamera belakang (overlay bingkai panduan) atau upload JPG/PNG, isi Nama & Kelas.
5. **Step 3** – AI membaca LJK; indikator tahapan menampilkan progres OMR → OCR → Grading.
6. **Step 4** – lihat ringkasan & rincian, lalu **Simpan ke Daftar Nilai** dan/atau **Export CSV**.
7. **Template LJK** – tombol di navbar/ sidebar membuka halaman cetak A4 berisi 40 PG, 10 Menjodohkan, dan 10 Esai.

> **Catatan kamera:** `getUserMedia` hanya bekerja di `https://` atau `http://localhost`. Jika dibuka lewat `file://`,
> gunakan tombol upload gambar. Tombol **Mode Demo** di menu API Key menyimulasikan seluruh alur tanpa koneksi API.

## Teknis singkat

- Endpoint: `generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
- Parsing kunci dan koreksi memakai `responseMimeType: "application/json"`, suhu rendah, dan `thinkingBudget: 0`
  pada model Flash agar cepat.
- Gambar dikompres ke maks. 1600 px (JPEG q=0.86) sebelum dikirim.
- Nilai akhir dihitung di browser: `(benar × bobot objektif + Σ skor esai) / total poin maksimal × 100`.
- Status esai: `BENAR` ≥ 90% bobot, `PARTIAL` untuk skor di antaranya, `SALAH` jika 0.
- Rekap dan kunci jawaban tersimpan di `localStorage` dengan prefix `ljkvision.*`.

## Deploy ke Vercel (online, gratis)

### Cara tercepat — drag & drop (tanpa install apa pun)

1. Buka **https://vercel.com/new** dan login (GitHub / Google / email).
2. Tarik (drag) seluruh folder `ljk-ai-grader` ke area **“Drag and drop your project here”**.
   - Alternatif: klik **Browse** lalu pilih folder tersebut.
3. Biarkan pengaturan default (Framework: *Other/Static*, Build Command kosong, Output Directory: `.`).
4. Klik **Deploy** dan tunggu ± 1–2 menit.
5. Selesai — Vercel akan memberi URL seperti `https://ljk-ai-grader-xxx.vercel.app`. Klik untuk membuka di browser.

### Cara alternatif — Vercel CLI (perlu Node.js terpasang)

```powershell
npm install -g vercel
cd "C:\Users\Soni Lesmana\ljk-ai-grader"
vercel          # untuk preview
vercel --prod   # untuk produksi
```

### Cara alternatif — GitHub

```powershell
cd "C:\Users\Soni Lesmana\ljk-ai-grader"
git init
git add .
git commit -m "Initial commit - LJK Vision AI"
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
git push -u origin main
```

Lalu di Vercel: **Add New → Project → Import** repository tersebut → **Deploy**.
Setiap `git push` setelahnya otomatis redeploy.

### Setelah online

- Kamera belakang otomatis bisa dipakai karena Vercel menyediakan **HTTPS**.
- Masukkan API Key Gemini di menu **API Key** (tersimpan di browser masing-masing pengunjung, bukan di server).
- Disarankan membatasi API Key di Google Cloud Console → *Credentials* → kunci tersebut → **Application restrictions: HTTP referrers** → isi domain Vercel Anda, agar tidak disalahgunakan di situs lain.
- Jika mengubah file, deploy ulang: drag folder lagi, `vercel --prod`, atau `git push`.

## Pembaruan terbaru

- **Parser lokal untuk template kunci sekolah:** kunci `.docx` dengan tabel `No | Kunci` 4 kolom, bagian Menjodohkan (kunci boleh huruf di luar A–E seperti H/M/J), dan rubrik Uraian (`Soal No. … (Skor maksimal 4)` atau tabel `No. Soal | Pokok-Pokok Jawaban | Skor`) kini terbaca otomatis menjadi 40 PG + 10 Menjodohkan + 10 Esai dengan bobot 4, **tanpa perlu API key** (juga berjalan di Mode Demo). Format lain tetap didukung lewat Gemini.
- **Logika koreksi lebih kuat:** pencocokan jawaban objektif kini mengenali `"B"`, `"(B)"`, `"Jawaban: C"`, dan `"bulatan D"` tanpa false positive; nomor yang tidak dikembalikan AI otomatis ditandai SALAH dengan catatan; nomor duplikat pada kunci dibuang otomatis.
- **Statistik rekap:** kartu Jumlah Siswa, Rata-rata, Tertinggi, dan Terendah.
- **Filter rekap:** cari nama/NIS dan pilih kelas; ekspor CSV mengikuti filter aktif.
- **Rincian tersimpan:** setiap baris rekap punya tombol **Detail** berisi jawaban siswa vs kunci per nomor, plus tombol **Export CSV Detail**.
- **CSV lebih lengkap:** kolom PG Benar/Salah dan Menjodohkan Benar/Salah kini terisi (sebelumnya kosong untuk data lama).
- **UI:** rincian PG/MJ dua kolom pada layar lebar, indikator demo di rekap, penanganan blokiran Gemini (`promptFeedback`).

> Data rekap lama yang dibuat sebelum pembaruan tidak menyimpan kolom per-group maupun rincian; kolom tersebut akan kosong sampai siswa dikoreksi ulang.

## File

- `index.html` — seluruh aplikasi (struktur, gaya, dan logika)
- `vercel.json` — konfigurasi deploy statis Vercel
- `README.md` — panduan ini
