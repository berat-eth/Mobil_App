const { poolWrapper } = require('../database-schema');
const AnalyticsService = require('./analytics-service');

class AggregationService {
  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Günlük özet verileri hesapla ve kaydet
   */
  async aggregateDaily(tenantId, date = null) {
    try {
      if (!date) {
        date = new Date();
        date.setHours(0, 0, 0, 0);
      }

      const dateStr = date.toISOString().split('T')[0];
      const timeRange = '24h';

      // Overview metriklerini al
      const overview = await this.analyticsService.getOverview(tenantId, timeRange);
      const userAnalytics = await this.analyticsService.getUserAnalytics(tenantId, timeRange);
      const funnelData = await this.analyticsService.getFunnelAnalysis(tenantId, timeRange);
      const performanceMetrics = await this.analyticsService.getPerformanceMetrics(tenantId, timeRange);

      // Veritabanına kaydet
      await poolWrapper.execute(`
        INSERT INTO analytics_aggregates (
          tenantId, aggregateDate, aggregateType,
          totalUsers, activeUsers, totalSessions, totalEvents, totalRevenue,
          avgSessionDuration, bounceRate, dau, wau, mau,
          newUsers, returningUsers, retentionRate, churnRate,
          productViews, addToCart, checkout, purchase,
          avgPageLoadTime, errorRate, crashRate, metadata
        ) VALUES (?, ?, 'daily', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          totalUsers = VALUES(totalUsers),
          activeUsers = VALUES(activeUsers),
          totalSessions = VALUES(totalSessions),
          totalEvents = VALUES(totalEvents),
          totalRevenue = VALUES(totalRevenue),
          avgSessionDuration = VALUES(avgSessionDuration),
          bounceRate = VALUES(bounceRate),
          dau = VALUES(dau),
          wau = VALUES(wau),
          mau = VALUES(mau),
          newUsers = VALUES(newUsers),
          returningUsers = VALUES(returningUsers),
          retentionRate = VALUES(retentionRate),
          churnRate = VALUES(churnRate),
          productViews = VALUES(productViews),
          addToCart = VALUES(addToCart),
          checkout = VALUES(checkout),
          purchase = VALUES(purchase),
          avgPageLoadTime = VALUES(avgPageLoadTime),
          errorRate = VALUES(errorRate),
          crashRate = VALUES(crashRate),
          metadata = VALUES(metadata),
          updatedAt = NOW()
      `, [
        tenantId,
        dateStr,
        overview.totalUsers,
        overview.activeUsers,
        overview.totalSessions,
        overview.totalEvents,
        overview.totalRevenue,
        overview.avgSessionDuration,
        overview.bounceRate,
        userAnalytics.dau,
        userAnalytics.wau,
        userAnalytics.mau,
        userAnalytics.newUsers,
        userAnalytics.returningUsers,
        userAnalytics.retentionRate,
        userAnalytics.churnRate,
        funnelData.funnel.productViews,
        funnelData.funnel.addToCart,
        funnelData.funnel.checkout,
        funnelData.funnel.purchase,
        performanceMetrics.pageLoadTime.avg,
        performanceMetrics.errorRate,
        performanceMetrics.crashRate,
        JSON.stringify({
          conversionRates: funnelData.conversionRates,
          dropOffPoints: funnelData.dropOffPoints
        })
      ]);

      console.log(`✅ Daily aggregation completed for tenant ${tenantId} on ${dateStr}`);
      return true;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error aggregating daily data:', error);
      }
      throw error;
    }
  }

  /**
   * Haftalık özet verileri hesapla ve kaydet
   */
  async aggregateWeekly(tenantId, weekStartDate = null) {
    try {
      if (!weekStartDate) {
        weekStartDate = new Date();
        // Haftanın başlangıcını bul (Pazartesi)
        const day = weekStartDate.getDay();
        const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1);
        weekStartDate = new Date(weekStartDate.setDate(diff));
        weekStartDate.setHours(0, 0, 0, 0);
      }

      const dateStr = weekStartDate.toISOString().split('T')[0];
      const timeRange = '7d';

      // Overview metriklerini al
      const overview = await this.analyticsService.getOverview(tenantId, timeRange);
      const userAnalytics = await this.analyticsService.getUserAnalytics(tenantId, timeRange);
      const funnelData = await this.analyticsService.getFunnelAnalysis(tenantId, timeRange);
      const performanceMetrics = await this.analyticsService.getPerformanceMetrics(tenantId, timeRange);

      // Veritabanına kaydet
      await poolWrapper.execute(`
        INSERT INTO analytics_aggregates (
          tenantId, aggregateDate, aggregateType,
          totalUsers, activeUsers, totalSessions, totalEvents, totalRevenue,
          avgSessionDuration, bounceRate, dau, wau, mau,
          newUsers, returningUsers, retentionRate, churnRate,
          productViews, addToCart, checkout, purchase,
          avgPageLoadTime, errorRate, crashRate, metadata
        ) VALUES (?, ?, 'weekly', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          totalUsers = VALUES(totalUsers),
          activeUsers = VALUES(activeUsers),
          totalSessions = VALUES(totalSessions),
          totalEvents = VALUES(totalEvents),
          totalRevenue = VALUES(totalRevenue),
          avgSessionDuration = VALUES(avgSessionDuration),
          bounceRate = VALUES(bounceRate),
          dau = VALUES(dau),
          wau = VALUES(wau),
          mau = VALUES(mau),
          newUsers = VALUES(newUsers),
          returningUsers = VALUES(returningUsers),
          retentionRate = VALUES(retentionRate),
          churnRate = VALUES(churnRate),
          productViews = VALUES(productViews),
          addToCart = VALUES(addToCart),
          checkout = VALUES(checkout),
          purchase = VALUES(purchase),
          avgPageLoadTime = VALUES(avgPageLoadTime),
          errorRate = VALUES(errorRate),
          crashRate = VALUES(crashRate),
          metadata = VALUES(metadata),
          updatedAt = NOW()
      `, [
        tenantId,
        dateStr,
        overview.totalUsers,
        overview.activeUsers,
        overview.totalSessions,
        overview.totalEvents,
        overview.totalRevenue,
        overview.avgSessionDuration,
        overview.bounceRate,
        userAnalytics.dau,
        userAnalytics.wau,
        userAnalytics.mau,
        userAnalytics.newUsers,
        userAnalytics.returningUsers,
        userAnalytics.retentionRate,
        userAnalytics.churnRate,
        funnelData.funnel.productViews,
        funnelData.funnel.addToCart,
        funnelData.funnel.checkout,
        funnelData.funnel.purchase,
        performanceMetrics.pageLoadTime.avg,
        performanceMetrics.errorRate,
        performanceMetrics.crashRate,
        JSON.stringify({
          conversionRates: funnelData.conversionRates,
          dropOffPoints: funnelData.dropOffPoints
        })
      ]);

      console.log(`✅ Weekly aggregation completed for tenant ${tenantId} for week starting ${dateStr}`);
      return true;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error aggregating weekly data:', error);
      }
      throw error;
    }
  }

  /**
   * Aylık özet verileri hesapla ve kaydet
   */
  async aggregateMonthly(tenantId, monthStartDate = null) {
    try {
      if (!monthStartDate) {
        monthStartDate = new Date();
        monthStartDate.setDate(1);
        monthStartDate.setHours(0, 0, 0, 0);
      }

      const dateStr = monthStartDate.toISOString().split('T')[0];
      const timeRange = '30d';

      // Overview metriklerini al (sıralı çağrı - queue limit hatası için)
      const overview = await this.analyticsService.getOverview(tenantId, timeRange);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 300ms → 1000ms delay
      
      const userAnalytics = await this.analyticsService.getUserAnalytics(tenantId, timeRange);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 300ms → 1000ms delay
      
      const funnelData = await this.analyticsService.getFunnelAnalysis(tenantId, timeRange);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 300ms → 1000ms delay
      
      const performanceMetrics = await this.analyticsService.getPerformanceMetrics(tenantId, timeRange);
      await new Promise(resolve => setTimeout(resolve, 1000)); // INSERT öncesi delay

      // Veritabanına kaydet
      await poolWrapper.execute(`
        INSERT INTO analytics_aggregates (
          tenantId, aggregateDate, aggregateType,
          totalUsers, activeUsers, totalSessions, totalEvents, totalRevenue,
          avgSessionDuration, bounceRate, dau, wau, mau,
          newUsers, returningUsers, retentionRate, churnRate,
          productViews, addToCart, checkout, purchase,
          avgPageLoadTime, errorRate, crashRate, metadata
        ) VALUES (?, ?, 'monthly', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          totalUsers = VALUES(totalUsers),
          activeUsers = VALUES(activeUsers),
          totalSessions = VALUES(totalSessions),
          totalEvents = VALUES(totalEvents),
          totalRevenue = VALUES(totalRevenue),
          avgSessionDuration = VALUES(avgSessionDuration),
          bounceRate = VALUES(bounceRate),
          dau = VALUES(dau),
          wau = VALUES(wau),
          mau = VALUES(mau),
          newUsers = VALUES(newUsers),
          returningUsers = VALUES(returningUsers),
          retentionRate = VALUES(retentionRate),
          churnRate = VALUES(churnRate),
          productViews = VALUES(productViews),
          addToCart = VALUES(addToCart),
          checkout = VALUES(checkout),
          purchase = VALUES(purchase),
          avgPageLoadTime = VALUES(avgPageLoadTime),
          errorRate = VALUES(errorRate),
          crashRate = VALUES(crashRate),
          metadata = VALUES(metadata),
          updatedAt = NOW()
      `, [
        tenantId,
        dateStr,
        overview.totalUsers,
        overview.activeUsers,
        overview.totalSessions,
        overview.totalEvents,
        overview.totalRevenue,
        overview.avgSessionDuration,
        overview.bounceRate,
        userAnalytics.dau,
        userAnalytics.wau,
        userAnalytics.mau,
        userAnalytics.newUsers,
        userAnalytics.returningUsers,
        userAnalytics.retentionRate,
        userAnalytics.churnRate,
        funnelData.funnel.productViews,
        funnelData.funnel.addToCart,
        funnelData.funnel.checkout,
        funnelData.funnel.purchase,
        performanceMetrics.pageLoadTime.avg,
        performanceMetrics.errorRate,
        performanceMetrics.crashRate,
        JSON.stringify({
          conversionRates: funnelData.conversionRates,
          dropOffPoints: funnelData.dropOffPoints
        })
      ]);

      console.log(`✅ Monthly aggregation completed for tenant ${tenantId} for month starting ${dateStr}`);
      return true;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error aggregating monthly data:', error);
      }
      throw error;
    }
  }

  /**
   * Tüm aktif tenant'lar için günlük özet hesapla
   */
  async aggregateAllTenantsDaily() {
    try {
      const [tenants] = await poolWrapper.execute(
        'SELECT id FROM tenants WHERE isActive = true'
      );

      for (const tenant of tenants) {
        try {
          await this.aggregateDaily(tenant.id);
        } catch (error) {
          // Don't log "Pool is closed" errors during shutdown
          if (error.message && !error.message.includes('Pool is closed')) {
            console.error(`❌ Error aggregating for tenant ${tenant.id}:`, error);
          }
        }
      }

      console.log('✅ Daily aggregation completed for all tenants');
      return true;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error in aggregateAllTenantsDaily:', error);
      }
      throw error;
    }
  }

  /**
   * Tüm aktif tenant'lar için haftalık özet hesapla
   */
  async aggregateAllTenantsWeekly() {
    try {
      const [tenants] = await poolWrapper.execute(
        'SELECT id FROM tenants WHERE isActive = true'
      );

      for (const tenant of tenants) {
        try {
          await this.aggregateWeekly(tenant.id);
        } catch (error) {
          // Don't log "Pool is closed" errors during shutdown
          if (error.message && !error.message.includes('Pool is closed')) {
            console.error(`❌ Error aggregating weekly for tenant ${tenant.id}:`, error);
          }
        }
      }

      console.log('✅ Weekly aggregation completed for all tenants');
      return true;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error in aggregateAllTenantsWeekly:', error);
      }
      throw error;
    }
  }

  /**
   * Tüm aktif tenant'lar için aylık özet hesapla
   */
  async aggregateAllTenantsMonthly() {
    try {
      const [tenants] = await poolWrapper.execute(
        'SELECT id FROM tenants WHERE isActive = true'
      );

      for (const tenant of tenants) {
        try {
          await this.aggregateMonthly(tenant.id);
          // Tenant'lar arasında delay ekle (queue limit hatası için)
          await new Promise(resolve => setTimeout(resolve, 2000)); // 500ms → 2000ms delay
        } catch (error) {
          // ER_USER_LIMIT_REACHED hatası için özel handling
          if (error.code === 'ER_USER_LIMIT_REACHED' || error.errno === 1226) {
            console.error(`⚠️ Connection limit reached, waiting 5 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 saniye bekle
            // Tekrar dene
            try {
              await this.aggregateMonthly(tenant.id);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (retryError) {
              if (retryError.message && !retryError.message.includes('Pool is closed')) {
                console.error(`❌ Error aggregating monthly for tenant ${tenant.id} after retry:`, retryError);
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            // Don't log "Pool is closed" errors during shutdown
            if (error.message && !error.message.includes('Pool is closed')) {
              console.error(`❌ Error aggregating monthly for tenant ${tenant.id}:`, error);
            }
            // Hata durumunda da delay ekle (queue'nun temizlenmesi için)
            await new Promise(resolve => setTimeout(resolve, 2000)); // 500ms → 2000ms delay
          }
        }
      }

      console.log('✅ Monthly aggregation completed for all tenants');
      return true;
    } catch (error) {
      // Don't log "Pool is closed" errors during shutdown
      if (error.message && !error.message.includes('Pool is closed')) {
        console.error('❌ Error in aggregateAllTenantsMonthly:', error);
      }
      throw error;
    }
  }
}

module.exports = AggregationService;

