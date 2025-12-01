const dbSecurity = require('../security/database-security');

class SnortAutomationService {
  constructor() {
    this.rules = [];
    this.loadRules();
  }

  /**
   * Kuralları yükle (veritabanından veya dosyadan)
   */
  loadRules() {
    // Şimdilik memory'de tut, sonra veritabanına taşınabilir
    this.rules = [
      {
        id: 1,
        name: 'Yüksek Öncelikli Otomatik Engelleme',
        enabled: true,
        condition: {
          priority: 'high',
          threshold: 5, // 5 yüksek öncelikli log
          timeWindow: 3600000 // 1 saat içinde
        },
        action: 'block',
        duration: null // Kalıcı engelleme
      },
      {
        id: 2,
        name: 'Tekrarlayan Saldırı Engelleme',
        enabled: true,
        condition: {
          sameIP: true,
          threshold: 10, // Aynı IP'den 10 log
          timeWindow: 1800000 // 30 dakika içinde
        },
        action: 'block',
        duration: 86400000 // 24 saat
      }
    ];
  }

  /**
   * Kural ekle
   */
  addRule(rule) {
    const newRule = {
      id: Date.now(),
      ...rule,
      createdAt: new Date().toISOString()
    };
    this.rules.push(newRule);
    return newRule;
  }

  /**
   * Kural güncelle
   */
  updateRule(id, updates) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates, updatedAt: new Date().toISOString() };
      return this.rules[index];
    }
    return null;
  }

  /**
   * Kural sil
   */
  deleteRule(id) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Tüm kuralları getir
   */
  getRules() {
    return this.rules;
  }

  /**
   * Aktif kuralları getir
   */
  getActiveRules() {
    return this.rules.filter(r => r.enabled);
  }

  /**
   * Logları analiz et ve kurallara göre işlem yap
   */
  async analyzeAndAct(logs) {
    const actions = [];

    for (const rule of this.getActiveRules()) {
      const matches = this.checkRule(logs, rule);
      if (matches.length > 0) {
        const action = await this.executeRule(rule, matches);
        if (action) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  /**
   * Kuralı kontrol et
   */
  checkRule(logs, rule) {
    const matches = [];
    const now = Date.now();
    const timeWindow = rule.condition.timeWindow || Infinity;

    // Zaman penceresi içindeki logları filtrele
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return (now - logTime) <= timeWindow;
    });

    if (rule.condition.priority) {
      // Öncelik bazlı kural
      const priorityLogs = recentLogs.filter(log => log.priority === rule.condition.priority);
      if (priorityLogs.length >= rule.condition.threshold) {
        // IP'leri grupla
        const ipGroups = this.groupByIP(priorityLogs);
        for (const [ip, ipLogs] of Object.entries(ipGroups)) {
          if (ipLogs.length >= rule.condition.threshold) {
            matches.push({ ip, logs: ipLogs, rule });
          }
        }
      }
    } else if (rule.condition.sameIP) {
      // Aynı IP bazlı kural
      const ipGroups = this.groupByIP(recentLogs);
      for (const [ip, ipLogs] of Object.entries(ipGroups)) {
        if (ipLogs.length >= rule.condition.threshold) {
          matches.push({ ip, logs: ipLogs, rule });
        }
      }
    }

    return matches;
  }

  /**
   * Logları IP'ye göre grupla
   */
  groupByIP(logs) {
    const groups = {};
    logs.forEach(log => {
      if (!groups[log.sourceIp]) {
        groups[log.sourceIp] = [];
      }
      groups[log.sourceIp].push(log);
    });
    return groups;
  }

  /**
   * Kuralı çalıştır
   */
  async executeRule(rule, matches) {
    for (const match of matches) {
      try {
        if (rule.action === 'block') {
          // IP'yi engelle
          const reason = `Snort Otomatik Engelleme - ${rule.name} - ${match.logs.length} log tespit edildi`;
          dbSecurity.blockIP(match.ip, reason);

          // Rate limiter'da da engelle
          if (global.rateLimiter && typeof global.rateLimiter.blockIP === 'function') {
            global.rateLimiter.blockIP(match.ip);
          }

          // Advanced security'de de engelle
          if (global.advancedSecurity && typeof global.advancedSecurity.increaseIPScore === 'function') {
            global.advancedSecurity.increaseIPScore(match.ip, 500);
          }

          return {
            type: 'block',
            ip: match.ip,
            reason,
            rule: rule.name,
            logsCount: match.logs.length,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error(`❌ Kural çalıştırma hatası (${rule.name}):`, error.message);
      }
    }

    return null;
  }

  /**
   * Whitelist yönetimi
   */
  async addToWhitelist(ip, reason) {
    // Veritabanına kaydet (şimdilik memory'de tut)
    if (!this.whitelist) {
      this.whitelist = new Set();
    }
    this.whitelist.add(ip);
    return { ip, reason, addedAt: new Date().toISOString() };
  }

  /**
   * Whitelist'ten kaldır
   */
  async removeFromWhitelist(ip) {
    if (this.whitelist) {
      this.whitelist.delete(ip);
    }
    return true;
  }

  /**
   * Whitelist kontrolü
   */
  isWhitelisted(ip) {
    return this.whitelist && this.whitelist.has(ip);
  }

  /**
   * Whitelist'i getir
   */
  getWhitelist() {
    return Array.from(this.whitelist || []);
  }
}

module.exports = new SnortAutomationService();

