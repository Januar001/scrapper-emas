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

    const lastUpdate = $('#GALERI\\ 24 .text-lg.font-semibold.mb-4').text().trim();
    const rows = $('#GALERI\\ 24 .min-w-\\[400px\\] > div.grid.grid-cols-5');

    rows.each((index, element) => {
      if (index === 0) return; 
      const columns = $(element).find('div');
      const weight = $(columns[0]).text().trim();
      const sellPrice = $(columns[1]).text().trim();
      const buybackPrice = $(columns[2]).text().trim();
      
      if (weight) {
        prices.push({
          berat: weight,
          harga_jual: sellPrice,
          harga_buyback: buybackPrice,
        });
      }
    });

    // Perbaikan Timezone: Menggunakan waktu lokal server (bukan UTC)
    const waktuSekarang = new Date();
    const tahun = waktuSekarang.getFullYear();
    const bulan = String(waktuSekarang.getMonth() + 1).padStart(2, '0');
    const tanggal = String(waktuSekarang.getDate()).padStart(2, '0');
    
    // Format YYYY-MM-DD
    const tanggalLokal = `${tahun}-${bulan}-${tanggal}`; 
    const waktuScraping = `${tanggalLokal}T${waktuSekarang.toTimeString().split(' ')[0]}`;

    const result = {
      sumber: 'GALERI 24',
      diperbarui: lastUpdate,
      waktu_scraping: waktuScraping,
      tanggal_hari_ini: tanggalLokal, // Tambahan untuk mempermudah histori
      daftar_harga: prices,
    };
    return result;

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat scraping:', error.message);
    return null;
  }
}

/**
 * Fungsi untuk update histori (Format Baru)
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

  // Perbaikan: Cari dinamis berdasarkan nama "1 Gram", jangan hardcode index [1]
  const item_1_gram = dataHarga.daftar_harga.find(item => 
    item.berat.toLowerCase() === '1 gram' || 
    item.berat.toLowerCase() === '1 gr' || 
    item.berat === '1'
  );

  if (!item_1_gram) {
    console.error('❌ Harga 1 Gram tidak ditemukan di data terbaru. Histori tidak diupdate.');
    return;
  }
  
  // Ubah "Rp1.234.000" menjadi 1234000
  const hargaJual = parseInt(item_1_gram.harga_jual.replace(/[^0-9]/g, ''));
  const hargaBuyback = parseInt(item_1_gram.harga_buyback.replace(/[^0-9]/g, ''));
  
  const tanggalHariIni = dataHarga.tanggal_hari_ini;
  
  // Cari index data hari ini di histori
  const indexHariIni = histori.findIndex(entry => entry.tanggal === tanggalHariIni);

  // Cek apakah harganya valid (bukan 0 atau NaN)
  if (hargaJual > 0 && hargaBuyback > 0) {
    
    const dataBaru = {
      tanggal: tanggalHariIni,
      harga_jual: hargaJual,
      harga_buyback: hargaBuyback
    };

    if (indexHariIni !== -1) {
      // PERBAIKAN LOGIKA: Jika tanggal sudah ada, UPDATE dengan harga terbaru
      if (histori[indexHariIni].harga_jual !== hargaJual || histori[indexHariIni].harga_buyback !== hargaBuyback) {
        histori[indexHariIni] = dataBaru; // Menimpa harga lama di hari yang sama dengan harga baru
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(histori, null, 2));
        console.log(`✅ Data histori grafik untuk ${tanggalHariIni} telah DIPERBARUI dengan harga terbaru.`);
      } else {
        console.log(`ℹ️ Harga masih sama seperti sebelumnya hari ini, tidak perlu ubah grafik.`);
      }
    } else {
      // Jika belum ada, TAMBAHKAN data baru
      histori.push(dataBaru);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(histori, null, 2));
      console.log(`✅ Data histori grafik baru untuk ${tanggalHariIni} telah ditambahkan.`);
    }
    
  } else {
    console.log(`❌ Data harga tidak valid, histori tidak diupdate.`);
  }
}

/**
 * Fungsi utama
 */
async function jalankanDanSimpan() {
  const dataHarga = await ambilHargaEmas();

  if (dataHarga && dataHarga.daftar_harga && dataHarga.daftar_harga.length > 0) {
    fs.writeFileSync(LATEST_FILE, JSON.stringify(dataHarga, null, 2));
    console.log(`✅ Data terbaru (tabel) berhasil disimpan ke ${LATEST_FILE}`);
    
    // Panggil fungsi update histori
    updateHistori(dataHarga);

  } else {
    console.log('❌ Gagal mengambil data atau data harga kosong, file tidak diupdate.');
  }
}

// Jalankan
jalankanDanSimpan();
