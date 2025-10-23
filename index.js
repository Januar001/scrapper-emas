const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');

// --- KONFIGURASI ---
const TARGET_URL = 'https://galeri24.co.id/harga-emas';
const LATEST_FILE = 'harga-emas.json'; // File untuk data terakhir (tabel)
const HISTORY_FILE = 'histori.json';   // File untuk data chart
// ---------------------

/**
 * Fungsi untuk mengambil data harga dari website.
 */
async function ambilHargaEmas() {
  try {
    console.log('🔄 Sedang mengambil data harga emas...');
    const response = await axios.get(TARGET_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    const prices = [];

    // Selector dari HTML snippet awalmu
    const lastUpdate = $('#GALERI\\ 24 .text-lg.font-semibold.mb-4').text().trim();
    const rows = $('#GALERI\\ 24 .min-w-\\[400px\\] > div.grid.grid-cols-5');

    rows.each((index, element) => {
      if (index === 0) return; // Lewati header
      const columns = $(element).find('div');
      const weight = $(columns[0]).text().trim();
      const sellPrice = $(columns[1]).text().trim();
      const buybackPrice = $(columns[2]).text().trim();
      prices.push({
        berat: weight,
        harga_jual: sellPrice,
        harga_buyback: buybackPrice,
      });
    });

    const waktuScraping = new Date().toISOString();

    const result = {
      sumber: 'GALERI 24',
      diperbarui: lastUpdate,
      waktu_scraping: waktuScraping,
      daftar_harga: prices,
    };
    return result;

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat scraping:', error.message);
    return null;
  }
}

/**
 * Fungsi untuk membaca histori, menambah data baru (jika beda hari),
 * dan menyimpannya kembali.
 */
function updateHistori(dataHarga) {
  console.log('🔄 Memperbarui histori...');
  let histori = [];

  // 1. Baca file histori yang sudah ada (jika ada)
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const dataLama = fs.readFileSync(HISTORY_FILE, 'utf8');
      histori = JSON.parse(dataLama);
    } catch (e) {
      console.error('Gagal membaca histori.json, membuat file baru.');
      histori = [];
    }
  }

  // 2. Ambil data penting dari scrape terbaru
  //    Kita ambil harga 1 gram (indeks ke-1 di array, setelah 0.5gr) sebagai patokan
  const harga_1_gram = dataHarga.daftar_harga[1].harga_jual;
  const hargaNumerik = parseInt(harga_1_gram.replace(/[^0-9]/g, ''));
  
  // Dapatkan tanggal hari ini (format YYYY-MM-DD) dari waktu scraping (UTC)
  const tanggalHariIni = dataHarga.waktu_scraping.split('T')[0];
  
  // 3. Cek apakah data untuk hari ini sudah ada
  const dataHariIniSudahAda = histori.some(entry => entry.tanggal === tanggalHariIni);

  if (!dataHariIniSudahAda) {
    // 4. Jika belum ada, tambahkan data baru
    histori.push({
      tanggal: tanggalHariIni,
      harga: hargaNumerik
    });
    
    // 5. Simpan kembali ke file
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(histori, null, 2));
    console.log(`✅ Data histori baru untuk ${tanggalHariIni} telah ditambahkan.`);
  } else {
    console.log(`ℹ️ Data histori untuk ${tanggalHariIni} sudah ada, tidak perlu update.`);
  }
}

/**
 * Fungsi utama yang akan dijalankan
 */
async function jalankanDanSimpan() {
  const dataHarga = await ambilHargaEmas();

  // Pastikan dataHarga ada DAN daftar_harga tidak kosong
  if (dataHarga && dataHarga.daftar_harga && dataHarga.daftar_harga.length > 1) {
    
    // 1. Simpan data TERBARU (untuk tabel)
    fs.writeFileSync(LATEST_FILE, JSON.stringify(dataHarga, null, 2));
    console.log(`✅ Data terbaru berhasil disimpan ke ${LATEST_FILE}`);
    
    // 2. Update file HISTORI (untuk chart)
    updateHistori(dataHarga);

  } else {
    console.log('Gagal mengambil data atau data harga kosong, file tidak diupdate.');
  }
}

// Langsung panggil fungsi utamanya
jalankanDanSimpan();