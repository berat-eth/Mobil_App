/**
 * Alerting Service
 * Kritik durumlarda uyarı verme sistemi
 */
class AlertingService {
  constructor() {
    this.alertChannels = {
      email: [],
      slack: [],
      webhook: []
    };
    this.alertHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Alert kanalı ekle
   */
  addChannel(type, config) {
    if (!this.alertChannels[type]) {
      this.alertChannels[type] = [];
    }
    this.alertChannels[type].push(config);
  }

  /**
   * Alert gönder
   */
  async sendAlert(alert) {
    try {
      const alertData = {
        ...alert,
        timestamp: new Date().toISOString(),
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Alert history'ye ekle
      this.alertHistory.push(alertData);
      if (this.alertHistory.length > this.maxHistorySize) {
        this.alertHistory.shift();
      }

      // Tüm kanallara gönder
      const promises = [];

      // Email alerts
      if (this.alertChannels.email.length > 0) {
        promises.push(...this.alertChannels.email.map(channel => 
          this._sendEmailAlert(channel, alertData)
        ));
      }

      // Slack alerts
      if (this.alertChannels.slack.length > 0) {
        promises.push(...this.alertChannels.slack.map(channel => 
          this._sendSlackAlert(channel, alertData)
        ));
      }

      // Webhook alerts
      if (this.alertChannels.webhook.length > 0) {
        promises.push(...this.alertChannels.webhook.map(channel => 
          this._sendWebhookAlert(channel, alertData)
        ));
      }

      await Promise.allSettled(promises);

      return { success: true, alertId: alertData.id };
    } catch (error) {
      console.error('❌ Alert sending error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email alert gönder
   */
  async _sendEmailAlert(channel, alert) {
    try {
      // Email gönderme implementasyonu buraya eklenecek
      // Örnek: nodemailer, sendgrid, etc.
      console.log(`📧 Email alert sent to ${channel.to}: ${alert.message}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Email alert error:', error);
      return { success: false };
    }
  }

  /**
   * Slack alert gönder
   */
  async _sendSlackAlert(channel, alert) {
    try {
      // Slack webhook implementasyonu
      const axios = require('axios');
      const response = await axios.post(channel.webhookUrl, {
          text: `🚨 Alert: ${alert.title}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'good',
            fields: [
              { title: 'Message', value: alert.message, short: false },
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Source', value: alert.source || 'system', short: true }
            ]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return response.status === 200 ? { success: true } : { success: false };
    } catch (error) {
      console.error('❌ Slack alert error:', error);
      return { success: false };
    }
  }

  /**
   * Webhook alert gönder
   */
  async _sendWebhookAlert(channel, alert) {
    try {
      const axios = require('axios');
      const response = await axios.post(channel.url, alert, {
        headers: {
          'Content-Type': 'application/json',
          ...(channel.headers || {})
        }
      });

      return response.status === 200 ? { success: true } : { success: false };
    } catch (error) {
      console.error('❌ Webhook alert error:', error);
      return { success: false };
    }
  }

  /**
   * Queue overflow alert
   */
  async alertQueueOverflow(queueSize, threshold = 5000) {
    if (queueSize > threshold) {
      await this.sendAlert({
        type: 'queue_overflow',
        severity: queueSize > 10000 ? 'critical' : 'high',
        title: 'Event Queue Overflow',
        message: `Event queue size: ${queueSize} (threshold: ${threshold})`,
        source: 'event-queue'
      });
    }
  }

  /**
   * Database connection failure alert
   */
  async alertDatabaseFailure(error) {
    await this.sendAlert({
      type: 'database_failure',
      severity: 'critical',
      title: 'Database Connection Failure',
      message: error.message,
      source: 'database'
    });
  }

  /**
   * Anomaly detection alert
   */
  async alertAnomaly(anomaly) {
    await this.sendAlert({
      type: 'anomaly_detected',
      severity: anomaly.severity || 'medium',
      title: 'Anomaly Detected',
      message: anomaly.message,
      source: 'anomaly-detector',
      data: anomaly
    });
  }

  /**
   * Alert history'yi getir
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit).reverse();
  }
}

// Singleton instance
let instance = null;

module.exports = function getAlerting() {
  if (!instance) {
    instance = new AlertingService();
  }
  return instance;
};

module.exports.AlertingService = AlertingService;

