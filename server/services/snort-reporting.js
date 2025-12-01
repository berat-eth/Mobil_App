const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class SnortReportingService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../data/snort-reports');
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * PDF raporu oluştur
   */
  async generatePDFReport(logs, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `snort-report-${Date.now()}.pdf`;
        const filepath = path.join(this.reportsDir, filename);
        const stream = fs.createWriteStream(filepath);
        
        doc.pipe(stream);

        // Başlık
        doc.fontSize(20).text('Snort IDS Güvenlik Raporu', { align: 'center' });
        doc.moveDown();
        
        // Tarih aralığı
        if (options.startDate && options.endDate) {
          doc.fontSize(12).text(
            `Tarih Aralığı: ${new Date(options.startDate).toLocaleDateString('tr-TR')} - ${new Date(options.endDate).toLocaleDateString('tr-TR')}`,
            { align: 'center' }
          );
        } else {
          doc.fontSize(12).text(
            `Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
            { align: 'center' }
          );
        }
        
        doc.moveDown(2);

        // İstatistikler
        const stats = this.calculateStats(logs);
        doc.fontSize(16).text('Özet İstatistikler', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Toplam Log: ${stats.total}`);
        doc.text(`Yüksek Öncelik: ${stats.high}`);
        doc.text(`Orta Öncelik: ${stats.medium}`);
        doc.text(`Düşük Öncelik: ${stats.low}`);
        doc.text(`Engellenen: ${stats.dropped}`);
        doc.text(`Uyarılar: ${stats.alerts}`);
        doc.moveDown(2);

        // Log listesi
        doc.fontSize(16).text('Log Detayları', { underline: true });
        doc.moveDown();

        logs.forEach((log, index) => {
          if (index > 0 && index % 20 === 0) {
            doc.addPage();
          }

          doc.fontSize(10);
          doc.text(`Log #${log.id}`, { bold: true });
          doc.text(`Zaman: ${new Date(log.timestamp).toLocaleString('tr-TR')}`);
          doc.text(`Öncelik: ${log.priority.toUpperCase()}`);
          doc.text(`Aksiyon: ${log.action}`);
          doc.text(`Kaynak: ${log.sourceIp}:${log.sourcePort}`);
          doc.text(`Hedef: ${log.destIp}:${log.destPort}`);
          doc.text(`Protokol: ${log.protocol}`);
          doc.text(`Mesaj: ${log.message}`);
          doc.text(`Sınıflandırma: ${log.classification}`);
          doc.moveDown();
        });

        doc.end();

        stream.on('finish', () => {
          resolve({
            filename,
            filepath,
            size: fs.statSync(filepath).size
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * CSV raporu oluştur
   */
  generateCSVReport(logs) {
    const headers = ['ID', 'Zaman', 'Öncelik', 'Aksiyon', 'Kaynak IP', 'Kaynak Port', 'Hedef IP', 'Hedef Port', 'Protokol', 'Mesaj', 'Signature', 'Sınıflandırma'];
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.priority,
      log.action,
      log.sourceIp,
      log.sourcePort,
      log.destIp,
      log.destPort,
      log.protocol,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${log.signature.replace(/"/g, '""')}"`,
      log.classification
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return csv;
  }

  /**
   * JSON raporu oluştur
   */
  generateJSONReport(logs, options = {}) {
    const stats = this.calculateStats(logs);
    return {
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: options.startDate || null,
        end: options.endDate || null
      },
      statistics: stats,
      logs: logs
    };
  }

  /**
   * İstatistikleri hesapla
   */
  calculateStats(logs) {
    return {
      total: logs.length,
      high: logs.filter(l => l.priority === 'high').length,
      medium: logs.filter(l => l.priority === 'medium').length,
      low: logs.filter(l => l.priority === 'low').length,
      dropped: logs.filter(l => l.action === 'drop').length,
      alerts: logs.filter(l => l.action === 'alert').length,
      passed: logs.filter(l => l.action === 'pass').length
    };
  }

  /**
   * Rapor dosyasını oku
   */
  getReportFile(filename) {
    const filepath = path.join(this.reportsDir, filename);
    if (fs.existsSync(filepath)) {
      return {
        filepath,
        size: fs.statSync(filepath).size,
        created: fs.statSync(filepath).birthtime
      };
    }
    return null;
  }

  /**
   * Rapor dosyalarını listele
   */
  listReports() {
    if (!fs.existsSync(this.reportsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.reportsDir)
      .filter(file => file.endsWith('.pdf') || file.endsWith('.json') || file.endsWith('.csv'))
      .map(file => {
        const filepath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  }

  /**
   * Eski raporları temizle (30 günden eski)
   */
  cleanOldReports(days = 30) {
    if (!fs.existsSync(this.reportsDir)) {
      return 0;
    }

    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    const files = fs.readdirSync(this.reportsDir);
    files.forEach(file => {
      const filepath = path.join(this.reportsDir, file);
      const stats = fs.statSync(filepath);
      if (stats.birthtime.getTime() < cutoffDate) {
        fs.unlinkSync(filepath);
        deletedCount++;
      }
    });

    return deletedCount;
  }
}

module.exports = new SnortReportingService();

