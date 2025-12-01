const fs = require('fs');
const path = require('path');

class SnortRealtimeService {
  constructor() {
    this.watchers = new Map();
    this.clients = new Set();
    this.lastFileSize = new Map();
    this.isWatching = false;
  }

  /**
   * Snort log dosyasını izle
   */
  watchLogFile(logPath, onNewLogs) {
    if (this.watchers.has(logPath)) {
      return; // Zaten izleniyor
    }

    try {
      // Dosya boyutunu kaydet
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        this.lastFileSize.set(logPath, stats.size);
      }

      // Dosyayı izle
      const watcher = fs.watchFile(logPath, { interval: 2000 }, (curr, prev) => {
        if (curr.size > prev.size) {
          // Yeni loglar var
          const newSize = curr.size - prev.size;
          this.readNewLogs(logPath, prev.size, newSize, onNewLogs);
          this.lastFileSize.set(logPath, curr.size);
        }
      });

      this.watchers.set(logPath, watcher);
      this.isWatching = true;
      console.log(`✅ Snort log dosyası izleniyor: ${logPath}`);
    } catch (error) {
      console.error(`❌ Log dosyası izleme hatası (${logPath}):`, error.message);
    }
  }

  /**
   * Yeni logları oku
   */
  readNewLogs(logPath, startPosition, size, callback) {
    try {
      const fd = fs.openSync(logPath, 'r');
      const buffer = Buffer.alloc(size);
      fs.readSync(fd, buffer, 0, size, startPosition);
      fs.closeSync(fd);

      const newContent = buffer.toString('utf-8');
      const lines = newContent.split('\n').filter(line => line.trim());

      if (lines.length > 0) {
        const parsedLogs = this.parseLogLines(lines);
        if (parsedLogs.length > 0) {
          callback(parsedLogs);
        }
      }
    } catch (error) {
      console.error(`❌ Yeni loglar okunamadı:`, error.message);
    }
  }

  /**
   * Log satırlarını parse et
   */
  parseLogLines(lines) {
    const parsedLogs = [];
    let logId = Date.now();

    for (const line of lines) {
      try {
        // Snort alert formatını parse et
        const alertMatch = line.match(/\[\*\*\]\s*\[(\d+):(\d+):(\d+)\]\s*(.+?)\s*\[\*\*\]\s*\[Classification:\s*(.+?)\]\s*\[Priority:\s*(\d+)\]\s*\{(\w+)\}\s*(\d+\.\d+\.\d+\.\d+):(\d+)\s*->\s*(\d+\.\d+\.\d+\.\d+):(\d+)/);
        
        if (alertMatch) {
          const [, sid, gid, rev, message, classification, priorityNum, protocol, srcIp, srcPort, dstIp, dstPort] = alertMatch;
          
          const priorityNumInt = parseInt(priorityNum);
          let priority = 'low';
          if (priorityNumInt >= 3) priority = 'high';
          else if (priorityNumInt >= 2) priority = 'medium';

          let action = 'alert';
          if (message.toLowerCase().includes('drop') || message.toLowerCase().includes('block')) {
            action = 'drop';
          } else if (message.toLowerCase().includes('pass')) {
            action = 'pass';
          }

          let timestamp = new Date().toISOString();
          const timestampMatch = line.match(/(\d{2}\/\d{2}-\d{2}:\d{2}:\d{2}\.\d+)/);
          if (timestampMatch) {
            const [datePart, timePart] = timestampMatch[1].split('-');
            const [month, day] = datePart.split('/');
            const [time, microseconds] = timePart.split('.');
            const currentYear = new Date().getFullYear();
            timestamp = new Date(`${currentYear}-${month}-${day}T${time}.${microseconds.substring(0, 3)}Z`).toISOString();
          }

          parsedLogs.push({
            id: logId++,
            timestamp,
            priority,
            classification: classification.trim(),
            sourceIp: srcIp,
            sourcePort: parseInt(srcPort),
            destIp: dstIp,
            destPort: parseInt(dstPort),
            protocol: protocol.toUpperCase(),
            message: message.trim(),
            signature: `[${sid}:${gid}:${rev}]`,
            action
          });
        }
      } catch (parseError) {
        // Parse hatası olursa bu satırı atla
        continue;
      }
    }

    return parsedLogs;
  }

  /**
   * SSE client ekle
   */
  addClient(client) {
    this.clients.add(client);
  }

  /**
   * SSE client kaldır
   */
  removeClient(client) {
    this.clients.delete(client);
  }

  /**
   * Tüm client'lara mesaj gönder
   */
  broadcast(data) {
    this.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('❌ SSE mesaj gönderme hatası:', error.message);
        this.removeClient(client);
      }
    });
  }

  /**
   * İzlemeyi durdur
   */
  stopWatching(logPath) {
    if (this.watchers.has(logPath)) {
      fs.unwatchFile(logPath);
      this.watchers.delete(logPath);
    }
  }

  /**
   * Tüm izlemeleri durdur
   */
  stopAll() {
    this.watchers.forEach((watcher, logPath) => {
      fs.unwatchFile(logPath);
    });
    this.watchers.clear();
    this.isWatching = false;
  }
}

module.exports = new SnortRealtimeService();

