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
 * (Tidak ada perubahan di fungsi ini)
 */
async function ambilHargaEmas() {
  try {
    console.log('🔄 Sedang mengambil data harga emas...');
    const response = await axios.get(TARGET_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    const prices = [];

    const lastUpdate = $('#GALERI\\ 24 .text-lg.font-semibold.mb-4').text().trim();
    const rows = $('#GALERI\\ 24 .min-w-\\[400px\\] > div.grid.grid-cols-5');

    rows.each((index, element) => {
      if (index === 0) return; 
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
 * --- MODIFIKASI BESAR DI FUNGSI INI ---
 * Sekarang menyimpan harga_jual dan harga_buyback
 */
function updateHistori(dataHarga) {
  console.log('🔄 Memperbarui histori...');
  let histori = [];

  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const dataLama = fs.readFileSync(HISTORY_FILE, 'utf8');
      histori = JSON.parse(dataLama);
    } catch (e) {
      console.error('Gagal membaca histori.json, membuat file baru.');
      histori = [];
    }
  }

  // 2. Ambil data penting dari scrape terbaru (item 1 gram)
  const item_1_gram = dataHarga.daftar_harga[1]; // [0] = 0.5g, [1] = 1g
  
  // Ubah "Rp1.234.000" menjadi 1234000
  const hargaJual = parseInt(item_1_gram.harga_jual.replace(/[^0-9]/g, ''));
  const hargaBuyback = parseInt(item_1_gram.harga_buyback.replace(/[^0-9]/g, ''));
  
  const tanggalHariIni = dataHarga.waktu_scraping.split('T')[0];
  
  const dataHariIniSudahAda = histori.some(entry => entry.tanggal === tanggalHariIni);

  if (!dataHariIniSudahAda && hargaJual > 0 && hargaBuyback > 0) {
    // 4. Tambahkan data baru dengan format baru
    histori.push({
      tanggal: tanggalHariIni,
      harga_jual: hargaJual,
      harga_buyback: hargaBuyback
    });
    
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(histori, null, 2));
    console.log(`✅ Data histori baru (jual & buyback) untuk ${tanggalHariIni} telah ditambahkan.`);
  } else {
    console.log(`ℹ️ Data histori untuk ${tanggalHariIni} sudah ada atau data harga 0, tidak perlu update.`);
  }
}

/**
 * Fungsi utama (Tidak ada perubahan)
 */
async function jalankanDanSimpan() {
  const dataHarga = await ambilHargaEmas();

  if (dataHarga && dataHarga.daftar_harga && dataHarga.daftar_harga.length > 1) {
    fs.writeFileSync(LATEST_FILE, JSON.stringify(dataHarga, null, 2));
    console.log(`✅ Data terbaru berhasil disimpan ke ${LATEST_FILE}`);
    updateHistori(dataHarga);
  } else {
    console.log('Gagal mengambil data atau data harga kosong, file tidak diupdate.');
  }
}

// Jalankan
jalankanDanSimpan();