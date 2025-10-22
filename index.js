const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs'); // Library untuk simpan file

// URL target (sudah diganti ke URL asli)
const TARGET_URL = 'https://galeri24.co.id/harga-emas';
const OUTPUT_FILE = 'harga-emas.json'; // Nama file untuk simpan hasil

/**
 * Fungsi untuk mengambil data dan mengembalikannya.
 */
async function ambilHargaEmas() {
  try {
    console.log('🔄 Sedang mengambil data harga emas...');
    
    // 1. Ambil data HTML dari website
    const response = await axios.get(TARGET_URL);
    const html = response.data;
    
    // 2. Muat HTML ke Cheerio
    const $ = cheerio.load(html);
    const prices = [];

    // 3. Ambil data "Diperbarui"
    //    (Selector ini dari HTML snippet awalmu)
    const lastUpdate = $('#GALERI\\ 24 .text-lg.font-semibold.mb-4').text().trim();

    // 4. Ambil semua baris data harga
    //    (Selector ini dari HTML snippet awalmu)
    const rows = $('#GALERI\\ 24 .min-w-\\[400px\\] > div.grid.grid-cols-5');

    // 5. Looping (ulangi) untuk setiap baris
    rows.each((index, element) => {
      // Lewati baris pertama (header)
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

    // 6. Buat stempel waktu (timestamp) saat ini
    const waktuScraping = new Date().toISOString();

    // 7. Gabungkan semua data
    const result = {
      sumber: 'GALERI 24',
      diperbarui: lastUpdate, // Waktu update dari website
      waktu_scraping: waktuScraping, // Waktu server kita mengambil data
      daftar_harga: prices,
    };
    return result;

  } catch (error) {
    console.error('❌ Terjadi kesalahan:', error.message);
    return null;
  }
}

/**
 * Fungsi utama yang akan dijalankan oleh GitHub Actions
 */
async function jalankanDanSimpan() {
  const dataHarga = await ambilHargaEmas();

  if (dataHarga) {
    // 8. Simpan data ke file JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataHarga, null, 2));
    console.log(`✅ Data berhasil disimpan ke ${OUTPUT_FILE}`);
  } else {
    console.log('Gagal mengambil data, file tidak diupdate.');
  }
}

// Langsung panggil fungsi utamanya
jalankanDanSimpan();