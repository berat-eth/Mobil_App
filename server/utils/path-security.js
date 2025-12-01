/**
 * Path Security Utility
 * Path traversal saldırılarına karşı koruma
 */

const path = require('path');
const fs = require('fs');

/**
 * Path'in base directory içinde olup olmadığını kontrol et
 * Güçlendirilmiş versiyon - edge case'leri de kapsar
 */
function isPathInside(baseDir, targetPath) {
  try {
    // Normalize paths (Windows/Unix uyumluluğu için)
    const normalizedBase = path.resolve(baseDir);
    const normalizedTarget = path.resolve(targetPath);
    
    // Base directory'nin gerçek path'ini al
    const realBase = fs.realpathSync(normalizedBase);
    const realTarget = fs.realpathSync(normalizedTarget);
    
    // Path'lerin aynı olup olmadığını kontrol et
    if (realBase === realTarget) {
      return true;
    }
    
    // Relative path hesapla
    const relative = path.relative(realBase, realTarget);
    
    // Relative path boşsa veya '..' ile başlıyorsa güvensiz
    if (!relative || relative.startsWith('..')) {
      return false;
    }
    
    // Absolute path ise güvensiz
    if (path.isAbsolute(relative)) {
      return false;
    }
    
    // Windows drive letter kontrolü (C:, D:, vb.)
    if (/^[A-Z]:/.test(relative)) {
      return false;
    }
    
    // Null byte injection kontrolü
    if (relative.includes('\0')) {
      return false;
    }
    
    return true;
  } catch (error) {
    // Path resolution hatası - güvensiz kabul et
    console.error('❌ Path security check error:', error);
    return false;
  }
}

/**
 * Path normalization ve temizleme
 * Güvenli path oluşturur
 */
function normalizePath(inputPath, baseDir) {
  try {
    // String'e çevir ve trim
    let cleanPath = String(inputPath || '').trim();
    
    // Boş path kontrolü
    if (!cleanPath || cleanPath === '' || cleanPath === '/') {
      return baseDir;
    }
    
    // Null byte temizleme
    cleanPath = cleanPath.replace(/\0/g, '');
    
    // Path traversal karakterlerini kontrol et
    if (cleanPath.includes('..') || cleanPath.includes('//')) {
      throw new Error('Path traversal detected');
    }
    
    // Windows path separator'ları normalize et
    cleanPath = cleanPath.replace(/\\/g, '/');
    
    // Leading slash'ı kaldır (relative path için)
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    
    // Base directory ile birleştir
    const fullPath = path.join(baseDir, cleanPath);
    
    // Normalize et
    return path.normalize(fullPath);
  } catch (error) {
    throw new Error('Invalid path format');
  }
}

/**
 * Güvenli path oluştur ve doğrula
 * Path traversal koruması ile
 */
function createSafePath(inputPath, baseDir) {
  try {
    // Path'i normalize et
    const normalizedPath = normalizePath(inputPath, baseDir);
    
    // Path'in base directory içinde olduğunu doğrula
    if (!isPathInside(baseDir, normalizedPath)) {
      throw new Error('Path is outside allowed directory');
    }
    
    return normalizedPath;
  } catch (error) {
    throw new Error('Invalid or unsafe path');
  }
}

/**
 * Whitelist tabanlı path kontrolü
 * Sadece izin verilen dizinlere erişim
 */
function isPathAllowed(targetPath, allowedDirs) {
  if (!Array.isArray(allowedDirs) || allowedDirs.length === 0) {
    return false;
  }
  
  return allowedDirs.some(allowedDir => {
    try {
      return isPathInside(allowedDir, targetPath);
    } catch {
      return false;
    }
  });
}

/**
 * Dosya uzantısı kontrolü
 * Sadece izin verilen uzantılara sahip dosyalara erişim
 */
function isFileExtensionAllowed(filePath, allowedExtensions = []) {
  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return true; // Eğer whitelist yoksa tüm uzantılara izin ver
  }
  
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * Dosya adı güvenlik kontrolü
 * Tehlikeli karakterleri filtreler
 */
function sanitizeFileName(fileName) {
  // Tehlikeli karakterleri kaldır
  let safe = String(fileName || '')
    .replace(/[<>:"|?*\x00-\x1F]/g, '') // Windows yasak karakterleri
    .replace(/\.\./g, '') // Path traversal
    .replace(/\/|\\/g, '_') // Path separator'ları
    .trim();
  
  // Boş veya sadece nokta ise default isim ver
  if (!safe || safe === '.' || safe === '..') {
    safe = 'file';
  }
  
  // Maksimum uzunluk kontrolü
  if (safe.length > 255) {
    safe = safe.substring(0, 255);
  }
  
  return safe;
}

module.exports = {
  isPathInside,
  normalizePath,
  createSafePath,
  isPathAllowed,
  isFileExtensionAllowed,
  sanitizeFileName
};

