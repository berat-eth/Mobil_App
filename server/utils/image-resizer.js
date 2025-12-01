const axios = require('axios');
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('⚠️ Sharp kütüphanesi yüklü değil. Görsel boyutlandırma özelliği devre dışı.');
}
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Görseli URL'den indirir ve belirtilen boyutlara resize eder
 * @param {string} imageUrl - Görsel URL'i
 * @param {number} targetWidth - Hedef genişlik
 * @param {number} targetHeight - Hedef yükseklik
 * @param {string} outputDir - Çıktı dizini (opsiyonel)
 * @param {string} prefix - Dosya adı öneki (opsiyonel)
 * @returns {Promise<string>} - İşlenmiş görsel URL'i
 */
async function resizeImageFromUrl(imageUrl, targetWidth, targetHeight, outputDir = null, prefix = 'resized') {
  try {
    // Sharp kütüphanesi yoksa orijinal URL'i döndür
    if (!sharp) {
      console.warn('⚠️ Sharp kütüphanesi yüklü değil, görsel boyutlandırma atlandı');
      return imageUrl;
    }

    // URL'den görseli indir
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(response.data);
    
    // Görseli resize et
    const resizedBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'cover', // Görseli kırparak doldurur
        position: 'center'
      })
      .jpeg({ quality: 85 }) // JPEG formatında kaydet
      .toBuffer();

    // Eğer outputDir verilmişse dosyaya kaydet
    if (outputDir) {
      // Dizin yoksa oluştur
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Dosya adı oluştur
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 8);
      const fileName = `${prefix}_${hash}_${targetWidth}x${targetHeight}.jpg`;
      const filePath = path.join(outputDir, fileName);

      // Dosyayı kaydet
      fs.writeFileSync(filePath, resizedBuffer);
      
      // URL döndür (public klasörü için)
      const publicUrl = `/uploads/${fileName}`;
      return publicUrl;
    }

    // Eğer outputDir verilmemişse base64 veya data URL döndür
    // Alternatif olarak, görseli bir CDN veya storage servisine yükleyebilirsiniz
    const base64 = resizedBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Görsel resize hatası:', error);
    // Hata durumunda orijinal URL'i döndür
    return imageUrl;
  }
}

/**
 * Base64 veya data URL formatındaki görseli resize eder
 * @param {string} imageData - Base64 veya data URL
 * @param {number} targetWidth - Hedef genişlik
 * @param {number} targetHeight - Hedef yükseklik
 * @returns {Promise<string>} - İşlenmiş görsel base64 URL'i
 */
async function resizeImageFromBase64(imageData, targetWidth, targetHeight) {
  try {
    // Sharp kütüphanesi yoksa orijinal veriyi döndür
    if (!sharp) {
      console.warn('⚠️ Sharp kütüphanesi yüklü değil, görsel boyutlandırma atlandı');
      return imageData;
    }

    // Base64'ten buffer oluştur
    let imageBuffer;
    if (imageData.startsWith('data:')) {
      const base64Data = imageData.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      imageBuffer = Buffer.from(imageData, 'base64');
    }

    // Görseli resize et
    const resizedBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Base64'e dönüştür
    const base64 = resizedBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Base64 görsel resize hatası:', error);
    return imageData;
  }
}

/**
 * Slider görselleri için ideal boyut: 1920x1080 (16:9)
 */
async function resizeSliderImage(imageUrl) {
  return await resizeImageFromUrl(imageUrl, 1920, 1080, null, 'slider');
}

/**
 * Story görselleri için ideal boyut: 1080x1920 (9:16 dikey) veya 1080x1080 (kare)
 * Varsayılan olarak dikey format kullanılıyor
 */
async function resizeStoryImage(imageUrl) {
  return await resizeImageFromUrl(imageUrl, 1080, 1920, null, 'story');
}

module.exports = {
  resizeImageFromUrl,
  resizeImageFromBase64,
  resizeSliderImage,
  resizeStoryImage
};

