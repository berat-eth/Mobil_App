const axios = require('axios');

class IPGeolocationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 saat
    this.apiKey = process.env.IPAPI_KEY || null;
  }

  /**
   * IP adresinden konum bilgisi al
   */
  async getLocation(ip) {
    // Private IP kontrolü
    if (this.isPrivateIP(ip)) {
      return {
        ip,
        country: 'Local',
        countryCode: 'LOC',
        city: 'Local Network',
        lat: null,
        lon: null,
        isp: 'Local',
        org: 'Local Network'
      };
    }

    // Cache kontrolü
    if (this.cache.has(ip)) {
      const cached = this.cache.get(ip);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
      this.cache.delete(ip);
    }

    try {
      // ip-api.com kullan (ücretsiz, rate limit: 45 req/min)
      const url = this.apiKey 
        ? `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query&key=${this.apiKey}`
        : `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query`;

      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data.status === 'success') {
        const data = {
          ip: response.data.query || ip,
          country: response.data.country || 'Unknown',
          countryCode: response.data.countryCode || 'XX',
          region: response.data.regionName || '',
          city: response.data.city || 'Unknown',
          lat: response.data.lat || null,
          lon: response.data.lon || null,
          timezone: response.data.timezone || '',
          isp: response.data.isp || 'Unknown',
          org: response.data.org || 'Unknown',
          as: response.data.as || ''
        };

        // Cache'e kaydet
        this.cache.set(ip, {
          data,
          timestamp: Date.now()
        });

        return data;
      } else {
        throw new Error(response.data.message || 'Geolocation API hatası');
      }
    } catch (error) {
      console.warn(`⚠️ IP geolocation hatası (${ip}):`, error.message);
      return {
        ip,
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown',
        lat: null,
        lon: null,
        isp: 'Unknown',
        org: 'Unknown'
      };
    }
  }

  /**
   * Çoklu IP için konum bilgisi al
   */
  async getBulkLocations(ips) {
    const results = [];
    // Rate limit için batch'ler halinde işle
    const batchSize = 10;
    
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const promises = batch.map(ip => this.getLocation(ip));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      
      // Rate limit için kısa bekleme
      if (i + batchSize < ips.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Private IP kontrolü
   */
  isPrivateIP(ip) {
    return /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|localhost)/.test(ip);
  }

  /**
   * Cache'i temizle
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Eski cache'leri temizle
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [ip, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cacheTTL) {
        this.cache.delete(ip);
      }
    }
  }
}

module.exports = new IPGeolocationService();

