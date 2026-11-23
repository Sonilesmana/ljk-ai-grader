# LJK Vision AI

Aplikasi koreksi Lembar Jawaban Siswa otomatis: **OMR** (bulatan/tanda silang), **OCR** (tulisan tangan esai),
dan **AI Grading semantik** dengan Gemini Vision. Antarmuka tetap SPA (HTML + Tailwind + JavaScript murni),
didampingi **backend serverless Vercel** di `api/gemini.js` untuk menyimpan API key dan membatasi akses.
Library **Mammoth.js** dipakai untuk mengekstrak teks kunci jawaban dari file `.docx`.

## Cara menjalankan

1. Buka `index.html` langsung di browser, atau jalankan server statis lokal:

   ```powershell
   cd "C:\Users\Soni Lesmana\ljk-ai-grader"
   python -m http.server 8000
   ```

   lalu buka `http://localhost:8000`.

2. Siapkan backend sekali di Vercel: **Project Settings → Environment Variables**, tambahkan
   `GEMINI_API_KEY` (kunci dari [Google AI Studio](https://aistudio.google.com/apikey)) dan `ACCESS_CODE`
   (kode rahasia pilihan Anda), lalu **Redeploy**. Keduanya tidak pernah dikirim ke browser.
3. Klik **Koneksi AI**, masukkan **Kode Akses** yang sama, pilih model `gemini-3.5-flash-lite`
   (cepat & hemat), **Simpan**, lalu **Uji Koneksi**. Model lain yang didukung: `gemini-4-hydrogen`,
   `gemini-4-carbon`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`.
   Kode akses hanya disimpan di `sessionStorage` (hilang saat tab ditutup). Model 2.5 yang deprecated otomatis diganti.
4. **Step 1** – upload kunci `.docx` atau tempel teks, lalu klik **Ekstrak & Parse dengan AI**.
   Tabel kunci yang muncul bisa disunting manual (tambah/hapus baris, ubah nomor, kunci, dan bobot esai).
5. **Step 2** – buka kamera belakang (overlay bingkai panduan) atau upload JPG/PNG, isi Nama & Kelas.
6. **Step 3** – AI membaca LJK; indikator tahapan menampilkan progres OMR → OCR → Grading.
7. **Step 4** – lihat ringkasan & rincian, lalu **Simpan ke Daftar Nilai** dan/atau **Export Excel**.
8. **Export Excel** menghasilkan `.xlsx` dengan sheet `Deskripsi` dan satu sheet per kelas, kolomnya mengikuti format nilai ASTS sekolah
   (`No`, `Nama Peserta Didik`, `NILAI FORMATIF` → `TP 2/3/4`, `NA (F)`, `NILAI SUMATIF` → `1/2/3/4`, `NA (S)`, `NILAI RAPOR`).

> **Catatan kamera:** `getUserMedia` hanya bekerja di `https://` atau `http://localhost`. Jika dibuka lewat `file://`,
> gunakan tombol upload gambar. Tombol **Mode Demo** di menu **Koneksi AI** menyimulasikan seluruh alur tanpa backend.
> Mode Demo juga dipakai untuk parsing kunci lokal, sehingga template `.docx` sekolah tetap terbaca tanpa API key.

## Teknis singkat

- Browser → `POST /api/gemini` (berisi `accessCode`, `model`, `prompt`, opsional `image`) → server →
  `generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` dengan header `x-goog-api-key`.
- Backend memvalidasi kode akses lebih dulu, membatasi model yang boleh dipakai, membatasi ukuran body 8 MB,
  dan menerjemahkan error Google ke pesan Indonesia. API key tidak pernah masuk ke browser/log URL.
- Parsing kunci dan koreksi memakai `responseMimeType: "application/json"` dan suhu rendah. Model default
  `gemini-3.5-flash-lite` sudah berpikir minimal secara bawaan (tidak memakai `thinkingBudget` yang sudah usang).
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
- Wajib: di **Project Settings → Environment Variables** tambahkan `GEMINI_API_KEY` dan `ACCESS_CODE`
  untuk **Production** (dan Preview bila ingin menguji), lalu **Redeploy**. Tanpa keduanya, tombol Uji Koneksi
  akan memberi pesan "Backend belum dikonfigurasi".
- Pengguna cukup membuka situs dan memasukkan **Kode Akses** di menu **Koneksi AI**. API key tidak perlu
  dibagikan ke siapa pun dan tidak tersimpan di browser.
- Karena kunci dipakai server, pembatasan *HTTP referrers* tidak diperlukan; cukup jaga kerahasiaan `ACCESS_CODE`.
  Jika kode bocor, ganti nilai `ACCESS_CODE` di Vercel lalu redeploy.
- Jika mengubah file, deploy ulang otomatis lewat `git push` ke repository GitHub yang sudah terhubung.

## Pembaruan terbaru

- **Backend serverless & API key di server:** browser tidak lagi menyimpan/mengirim API key. Semua panggilan Gemini lewat `/api/gemini` yang dilindungi `ACCESS_CODE`. Kode akses tersimpan di `sessionStorage`, dan API key lama di `localStorage` otomatis dihapus.
- **Parser lokal untuk template kunci sekolah:** kunci `.docx` dengan tabel `No | Kunci` 4 kolom, bagian Menjodohkan (kunci boleh huruf di luar A–E seperti H/M/J), dan rubrik Uraian (`Soal No. … (Skor maksimal 4)` atau tabel `No. Soal | Pokok-Pokok Jawaban | Skor`) kini terbaca otomatis menjadi 40 PG + 10 Menjodohkan + 10 Esai dengan bobot 4, **tanpa perlu API key** (juga berjalan di Mode Demo). Format lain tetap didukung lewat Gemini.
- **Logika koreksi lebih kuat:** pencocokan jawaban objektif kini mengenali `"B"`, `"(B)"`, `"Jawaban: C"`, dan `"bulatan D"` tanpa false positive; nomor yang tidak dikembalikan AI otomatis ditandai SALAH dengan catatan; nomor duplikat pada kunci dibuang otomatis.
- **Statistik rekap:** kartu Jumlah Siswa, Rata-rata, Tertinggi, dan Terendah.
- **Export .xlsx sesuai format sekolah:** tombol **Export Excel** menghasilkan sheet `Deskripsi` dengan 3 kolom (`Interval | Kriteria | Deskripsi`, kriteria: `Belum Mampu`, `Mampu`, `Sangat Mampu`) untuk kelas X dan XI, plus empat sheet tetap: `X TKJ PUTRA`, `X TKJ PUTRI`, `XI TKJ PUTRA`, `XI TKJ PUTRI` (KKM berturut-turut 70, 70, 72, 72). Kelas lain tidak diekspor. Nilai koreksi masuk ke kolom `1` (PG), `2` (Menjodohkan), `3` (Esai), `NA (S)`, dan `NILAI RAPOR`.
- **Template LJK dihapus:** tombol cetak template LJK tidak lagi tersedia.
- **Tombol Hapus Kunci:** di bawah tabel kunci, menghapus seluruh kunci (teks hasil ekstraksi `.docx`, tabel PG/MJ/Esai, dan data tersimpan di browser), lalu kembali ke Step 1 setelah konfirmasi.
- **Rincian tersimpan:** setiap baris rekap punya tombol **Detail** berisi jawaban siswa vs kunci per nomor, plus tombol **Export CSV Detail**.
- **CSV lebih lengkap:** kolom PG Benar/Salah dan Menjodohkan Benar/Salah kini terisi (sebelumnya kosong untuk data lama).
- **UI:** rincian PG/MJ dua kolom pada layar lebar, indikator demo di rekap, penanganan blokiran Gemini (`promptFeedback`).

> Data rekap lama yang dibuat sebelum pembaruan tidak menyimpan kolom per-group maupun rincian; kolom tersebut akan kosong sampai siswa dikoreksi ulang.

## File

- `index.html` — antarmuka & logika sisi browser
- `api/gemini.js` — backend serverless Vercel (proxy Gemini + validasi kode akses)
- `vercel.json` — konfigurasi deploy Vercel
- `README.md` — panduan ini
