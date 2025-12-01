/**
 * File Security Utility
 * Dosya yükleme güvenliği için kapsamlı kontroller
 */

const fs = require('fs');

/**
 * Magic bytes (file signatures) tanımları
 * Dosya içeriğini kontrol etmek için kullanılır
 */
const FILE_SIGNATURES = {
  // Image formats
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // WebP (RIFF header)
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  
  // Video formats
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // MP4 (ftyp)
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // MP4 variant
  ],
  'video/quicktime': [
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // QuickTime
  ],
  'video/x-msvideo': [
    [0x52, 0x49, 0x46, 0x46], // AVI (RIFF header)
  ],
};

/**
 * Dosya içeriğini magic bytes ile kontrol et
 * MIME type ile uyumlu mu kontrol eder
 */
function validateFileContent(filePath, expectedMimeType) {
  try {
    // Dosyayı oku (ilk 16 byte yeterli)
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // Beklenen MIME type için signature'ları al
    const signatures = FILE_SIGNATURES[expectedMimeType];
    if (!signatures) {
      // Signature tanımlı değilse, sadece MIME type kontrolü yeterli
      return true;
    }

    // Signature'ları kontrol et
    for (const signature of signatures) {
      if (buffer.length < signature.length) {
        continue;
      }

      let match = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return true;
      }
    }

    // MP4 için özel kontrol (ftyp box farklı pozisyonlarda olabilir)
    if (expectedMimeType === 'video/mp4') {
      // İlk 12 byte içinde 'ftyp' arıyoruz
      const ftypIndex = buffer.indexOf(Buffer.from('ftyp'));
      if (ftypIndex >= 0 && ftypIndex <= 8) {
        return true;
      }
    }

    // AVI için özel kontrol (RIFF...AVI)
    if (expectedMimeType === 'video/x-msvideo') {
      const aviIndex = buffer.indexOf(Buffer.from('AVI '));
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && aviIndex >= 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Error validating file content:', error);
    return false;
  }
}

/**
 * Dosya uzantısını MIME type ile eşleştir
 */
function getMimeTypeFromExtension(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'm4a': 'audio/m4a',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
  };
  return mimeMap[ext] || null;
}

/**
 * Dosya adını güvenli hale getir
 * Geliştirilmiş sanitization
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return 'file-' + Date.now();
  }

  // Tehlikeli karakterleri kaldır
  let safe = fileName
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Windows yasak karakterleri
    .replace(/\.\./g, '') // Path traversal
    .replace(/\/|\\/g, '_') // Path separator'ları
    .replace(/[\s]+/g, '-') // Boşlukları tire ile değiştir
    .replace(/[^\w\-\.]/g, '') // Sadece alphanumeric, tire ve nokta
    .trim();

  // Boş veya sadece nokta ise default isim ver
  if (!safe || safe === '.' || safe === '..' || safe.length === 0) {
    safe = 'file-' + Date.now();
  }

  // Maksimum uzunluk kontrolü (uzantı dahil)
  if (safe.length > 200) {
    const ext = safe.substring(safe.lastIndexOf('.'));
    const nameWithoutExt = safe.substring(0, safe.lastIndexOf('.'));
    safe = nameWithoutExt.substring(0, 200 - ext.length) + ext;
  }

  // Çoklu nokta kontrolü (sadece son nokta uzantı için)
  const parts = safe.split('.');
  if (parts.length > 2) {
    safe = parts[0] + '.' + parts[parts.length - 1];
  }

  return safe;
}

/**
 * Dosya yükleme için kapsamlı validasyon
 */
function validateFileUpload(file, filePath = null) {
  const errors = [];

  // 1. Dosya var mı kontrolü
  if (!file) {
    errors.push('Dosya bulunamadı');
    return { valid: false, errors };
  }

  // 2. MIME type kontrolü
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'audio/m4a', 'audio/x-m4a', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac'
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    errors.push(`Geçersiz dosya tipi: ${file.mimetype}`);
  }

  // 3. Dosya uzantısı kontrolü
  const ext = file.originalname.toLowerCase().split('.').pop();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'avi', 'm4a', 'mp3', 'wav', 'aac'];
  if (!allowedExts.includes(ext)) {
    errors.push(`Geçersiz dosya uzantısı: ${ext}`);
  }

  // 4. MIME type ve uzantı uyumu kontrolü
  const mimeFromExt = getMimeTypeFromExtension(file.originalname);
  if (mimeFromExt && mimeFromExt !== file.mimetype) {
    // M4A için esnek kontrol (bazı sistemler audio/x-m4a kullanır)
    if (ext === 'm4a' && (file.mimetype === 'audio/m4a' || file.mimetype === 'audio/x-m4a')) {
      // Geçerli, hata ekleme
    } else {
      errors.push(`Dosya uzantısı ve MIME type uyuşmuyor: ${ext} != ${file.mimetype}`);
    }
  }

  // 5. Dosya boyutu kontrolü (10MB maksimum)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push(`Dosya boyutu çok büyük: ${(file.size / 1024 / 1024).toFixed(2)}MB (maksimum 10MB)`);
  }

  // 6. Minimum dosya boyutu kontrolü (boş dosya kontrolü)
  const minSize = 100; // 100 bytes
  if (file.size < minSize) {
    errors.push('Dosya çok küçük veya boş');
  }

  // 7. Magic bytes kontrolü (dosya yüklendikten sonra)
  if (filePath && fs.existsSync(filePath)) {
    try {
      const isValid = validateFileContent(filePath, file.mimetype);
      if (!isValid) {
        errors.push('Dosya içeriği MIME type ile uyuşmuyor (magic bytes kontrolü başarısız)');
      }
    } catch (error) {
      errors.push('Dosya içeriği kontrol edilemedi');
    }
  }

  // 8. Dosya adı sanitization
  const sanitizedName = sanitizeFileName(file.originalname);
  if (sanitizedName !== file.originalname) {
    // Dosya adı değiştirildi, bu bir uyarı ama hata değil
    console.warn(`⚠️ Dosya adı sanitize edildi: "${file.originalname}" -> "${sanitizedName}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedName
  };
}

module.exports = {
  validateFileContent,
  getMimeTypeFromExtension,
  sanitizeFileName,
  validateFileUpload,
  FILE_SIGNATURES
};

