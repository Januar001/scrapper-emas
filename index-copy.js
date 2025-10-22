const cheerio = require('cheerio');
const axios = require('axios');
const cron = require('node-cron'); // Panggil library cron
const fs = require('fs'); // Panggil library File System (untuk simpan file)

// GANTI INI dengan URL website target
const TARGET_URL = 'https://galeri24.co.id/harga-emas';
const OUTPUT_FILE = 'harga-emas.json'; // Nama file untuk simpan hasil

/**
 * Fungsi ini sama seperti sebelumnya,
 * tugasnya mengambil data dan mengembalikannya.
 */
async function ambilHargaEmas() {
  try {
    console.log('🔄 Sedang mengambil data harga emas...');
    
    // 1. Ambil data HTML
    const response = await axios.get(TARGET_URL);
    const html = response.data;
    
    // 2. Muat HTML ke Cheerio
    const $ = cheerio.load(html);
    const prices = [];

    // 3. Ambil data (selector masih sama)
    const lastUpdate = $('#GALERI\\ 24 .text-lg.font-semibold.mb-4').text().trim();
    const rows = $('#GALERI\\ 24 .min-w-\\[400px\\] > div.grid.grid-cols-5');

    // 4. Looping
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

    // 5. Gabungkan data
    const result = {
      sumber: 'GALERI 24',
      diperbarui: lastUpdate,
      daftar_harga: prices,
    };

    return result; // Kembalikan datanya

  } catch (error) {
    console.error('❌ Terjadi kesalahan:', error.message);
    return null; // Kembalikan null jika gagal
  }
}

/**
 * Ini adalah fungsi utama yang akan kita jalankan
 */
async function jalankanScraper() {
  const dataHarga = await ambilHargaEmas();

  // Jika datanya berhasil diambil
  if (dataHarga) {
    // 6. Simpan data ke file JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataHarga, null, 2));
    console.log(`✅ Data berhasil disimpan ke ${OUTPUT_FILE}`);
    console.log(`Update terakhir terdeteksi: ${dataHarga.diperbarui}`);
  }
}

// --- INI BAGIAN OTOMATISNYA ---

// "0 * * * *" artinya "jalankan setiap jam, di menit ke-0"
// (Misal: 13:00, 14:00, 15:00, dst.)
cron.schedule('0 * * * *', () => {
  console.log('--- ⏰ Waktunya Update Harga! (Jadwal per 1 jam) ---');
  jalankanScraper();
});

// Pesan ini hanya muncul sekali saat script pertama kali dijalankan
console.log('🔥 Scraper otomatis berjalan.');
console.log(`Scraper akan berjalan setiap jam untuk update file ${OUTPUT_FILE}`);

// Jalankan juga sekali saat script pertama kali hidup
jalankanScraper();