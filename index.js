const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs'); // Library untuk simpan file

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

    const result = {
      sumber: 'GALERI 24',
      diperbarui: lastUpdate,
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
    // Simpan data ke file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataHarga, null, 2));
    console.log(`✅ Data berhasil disimpan ke ${OUTPUT_FILE}`);
  } else {
    console.log('Gagal mengambil data, file tidak diupdate.');
  }
}

// Langsung panggil fungsi utamanya
jalankanDanSimpan();