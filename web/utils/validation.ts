// Form validation ve sanitization utilities

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // XSS koruması
    .replace(/['"]/g, '') // SQL injection koruması
    .substring(0, 500) // Maksimum uzunluk
}

export const sanitizeHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

export const validatePhone = (phone: string): boolean => {
  // Türkiye telefon numarası formatı
  const cleanPhone = phone.replace(/[\s()-]/g, '')
  const phoneRegex = /^(\+90|0)?[0-9]{10}$/
  return phoneRegex.test(cleanPhone)
}

export const validateName = (name: string): boolean => {
  // Sadece harf, boşluk ve Türkçe karakterler
  const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{2,100}$/
  return nameRegex.test(name)
}

export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  // 1. Boyut kontrolü (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'Dosya boyutu 5MB\'dan küçük olmalıdır.' }
  }

  // 2. Minimum boyut kontrolü (1KB)
  if (file.size < 1024) {
    return { valid: false, error: 'Dosya çok küçük.' }
  }

  // 3. MIME type kontrolü
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Sadece PNG, JPEG veya PDF dosyaları yükleyebilirsiniz.' }
  }

  // 4. Dosya uzantısı kontrolü
  const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!validExtensions.includes(fileExtension)) {
    return { valid: false, error: 'Geçersiz dosya uzantısı.' }
  }

  // 5. Dosya adı kontrolü (zararlı karakterler)
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g
  if (dangerousChars.test(file.name)) {
    return { valid: false, error: 'Dosya adı geçersiz karakterler içeriyor.' }
  }

  return { valid: true }
}

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255)
}

export const validateQuantity = (quantity: string | number): boolean => {
  if (quantity === '' || quantity === null || quantity === undefined) {
    return false
  }
  const num = typeof quantity === 'number' ? quantity : parseInt(String(quantity).trim(), 10)
  return !isNaN(num) && num > 0 && num <= 100000
}

export const validateDate = (date: string): boolean => {
  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Geçmiş tarih olamaz
  if (selectedDate < today) {
    return false
  }

  // 2 yıldan fazla ileri tarih olamaz
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 2)

  return selectedDate <= maxDate
}
