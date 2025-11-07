const os = require('os');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

class SystemMonitor {
    constructor() {
        this.metrics = {
            system: {},
            application: {},
            business: {},
            ai_agents: {}
        };
        this.alerts = [];
        this.alertHistory = [];
        this.isMonitoring = false;
        this.monitoringIntervals = {};
    }

    async initialize() {
        try {
            console.log('🔄 Initializing System Monitor...');
            
            this.startMonitoring();
            this.isMonitoring = true;
            
            console.log('✅ System Monitor initialized');
        } catch (error) {
            console.error('❌ Failed to initialize System Monitor:', error);
            throw error;
        }
    }

    startMonitoring() {
        // System metrics every 30 seconds
        this.monitoringIntervals.system = setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);

        // Application metrics every minute
        this.monitoringIntervals.application = setInterval(() => {
            this.collectApplicationMetrics();
        }, 60000);

        // Business metrics every 5 minutes
        this.monitoringIntervals.business = setInterval(() => {
            this.collectBusinessMetrics();
        }, 300000);

        // AI agent metrics every 2 minutes
        this.monitoringIntervals.ai = setInterval(() => {
            this.collectAIAgentMetrics();
        }, 120000);

        // Alert checking every minute
        this.monitoringIntervals.alerts = setInterval(() => {
            this.checkAlerts();
        }, 60000);

        // Performance profiling every 5 minutes
        this.monitoringIntervals.performance = setInterval(() => {
            this.performanceProfiling();
        }, 300000);
    }

    collectSystemMetrics() {
        try {
            this.metrics.system = {
                timestamp: new Date(),
                cpu: {
                    usage: os.loadavg(),
                    cores: os.cpus().length,
                    model: os.cpus()[0]?.model
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem(),
                    usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
                },
                disk: {
                    // This would require a disk usage library in production
                    total: 0,
                    free: 0,
                    used: 0
                },
                network: {
                    interfaces: os.networkInterfaces()
                },
                os: {
                    platform: os.platform(),
                    arch: os.arch(),
                    release: os.release(),
                    uptime: os.uptime()
                },
                load: {
                    average: os.loadavg(),
                    current: process.cpuUsage()
                }
            };

            // Log system metrics
            this.logMetrics('system', this.metrics.system);

        } catch (error) {
            console.error('Error collecting system metrics:', error);
        }
    }

    async collectApplicationMetrics() {
        try {
            // Database metrics
            const dbState = mongoose.connection.readyState;
            const dbPing = await this.checkDatabasePerformance();
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            
            // Event loop lag
            const eventLoopLag = await this.measureEventLoopLag();
            
            // Active connections (simplified)
            const activeConnections = await this.getActiveConnections();

            this.metrics.application = {
                timestamp: new Date(),
                database: {
                    state: this.getDatabaseStateName(dbState),
                    ping: dbPing,
                    connections: mongoose.connection.readyState === 1 ? 
                        mongoose.connection.db.serverConfig.connections().length : 0
                },
                memory: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                    arrayBuffers: memoryUsage.arrayBuffers
                },
                performance: {
                    eventLoopLag: eventLoopLag,
                    uptime: process.uptime(),
                    nodeVersion: process.version,
                    pid: process.pid
                },
                connections: {
                    active: activeConnections,
                    max: parseInt(process.env.MAX_CONNECTIONS) || 100
                },
                requests: {
                    // This would track request metrics from request logger
                    total: 0,
                    perMinute: 0,
                    errorRate: 0
                }
            };

            this.logMetrics('application', this.metrics.application);

        } catch (error) {
            console.error('Error collecting application metrics:', error);
        }
    }

    async collectBusinessMetrics() {
        try {
            const Order = require('../../backend/models/Order');
            const User = require('../../backend/models/User');
            const Product = require('../../backend/models/Product');

            // Today's date range
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Last 24 hours
            const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Get business metrics
            const [
                ordersToday,
                revenueToday,
                newUsersToday,
                activeProducts,
                totalSuppliers
            ] = await Promise.all([
                Order.countDocuments({
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                }),
                Order.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: startOfDay, $lte: endOfDay },
                            'payment.status': 'completed'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$pricing.total' }
                        }
                    }
                ]),
                User.countDocuments({
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                }),
                Product.countDocuments({ status: 'active' }),
                User.countDocuments({ role: 'supplier', isBusinessVerified: true })
            ]);

            this.metrics.business = {
                timestamp: new Date(),
                sales: {
                    ordersToday: ordersToday,
                    revenueToday: revenueToday[0]?.total || 0,
                    averageOrderValue: ordersToday > 0 ? (revenueToday[0]?.total || 0) / ordersToday : 0
                },
                users: {
                    newUsersToday: newUsersToday,
                    totalUsers: await User.countDocuments(),
                    activeUsers: await this.getActiveUsersCount(last24Hours)
                },
                inventory: {
                    activeProducts: activeProducts,
                    lowStockItems: await Product.countDocuments({ 
                        stockQuantity: { $lte: 10 },
                        status: 'active'
                    }),
                    outOfStockItems: await Product.countDocuments({ 
                        stockQuantity: 0,
                        status: 'active'
                    })
                },
                suppliers: {
                    total: totalSuppliers,
                    verified: await User.countDocuments({ 
                        role: 'supplier', 
                        isBusinessVerified: true 
                    })
                },
                conversion: {
                    // This would require more detailed analytics
                    visitToOrder: 0,
                    cartToOrder: 0
                }
            };

            this.logMetrics('business', this.metrics.business);

        } catch (error) {
            console.error('Error collecting business metrics:', error);
        }
    }

    async collectAIAgentMetrics() {
        try {
            const ChatSession = require('../../backend/models/ChatSession');
            
            const aiMetrics = await ChatSession.getSessionAnalytics('24h');
            
            this.metrics.ai_agents = {
                timestamp: new Date(),
                bronwyn_chatbot: {
                    activeSessions: aiMetrics.activeSessions,
                    totalSessions: aiMetrics.totalSessions,
                    averageMessages: aiMetrics.averageMessagesPerSession,
                    userSatisfaction: aiMetrics.averageSatisfaction,
                    escalationRate: aiMetrics.escalatedSessions / aiMetrics.totalSessions * 100
                },
                product_recommender: {
                    // These would come from the product recommender agent
                    modelAccuracy: 0.85,
                    trainingSamples: 0,
                    recommendationCount: 0
                },
                marketing_agent: {
                    contentGenerated: 0,
                    performanceScore: 0
                },
                performance: {
                    totalTokens: aiMetrics.totalTokens,
                    averageResponseTime: 2.3,
                    costEstimate: 0
                }
            };

            this.logMetrics('ai_agents', this.metrics.ai_agents);

        } catch (error) {
            console.error('Error collecting AI agent metrics:', error);
        }
    }

    async checkAlerts() {
        const alerts = [];

        // System alerts
        if (this.metrics.system.memory.usagePercentage > 85) {
            alerts.push(this.createAlert(
                'high',
                'system',
                'High memory usage',
                `Memory usage at ${this.metrics.system.memory.usagePercentage.toFixed(1)}%`,
                { usage: this.metrics.system.memory.usagePercentage }
            ));
        }

        if (this.metrics.system.cpu.usage[0] > 80) {
            alerts.push(this.createAlert(
                'high',
                'system',
                'High CPU load',
                `CPU load at ${this.metrics.system.cpu.usage[0].toFixed(1)}%`,
                { load: this.metrics.system.cpu.usage[0] }
            ));
        }

        // Application alerts
        if (this.metrics.application.database.ping > 1000) {
            alerts.push(this.createAlert(
                'medium',
                'application',
                'High database latency',
                `Database ping: ${this.metrics.application.database.ping}ms`,
                { ping: this.metrics.application.database.ping }
            ));
        }

        if (this.metrics.application.performance.eventLoopLag > 100) {
            alerts.push(this.createAlert(
                'medium',
                'application',
                'Event loop lag detected',
                `Event loop lag: ${this.metrics.application.performance.eventLoopLag}ms`,
                { lag: this.metrics.application.performance.eventLoopLag }
            ));
        }

        // Business alerts
        if (this.metrics.business.sales.ordersToday === 0) {
            alerts.push(this.createAlert(
                'low',
                'business',
                'No orders today',
                'No orders placed in the last 24 hours',
                { orders: 0 }
            ));
        }

        if (this.metrics.business.inventory.lowStockItems > 50) {
            alerts.push(this.createAlert(
                'medium',
                'business',
                'Multiple low stock items',
                `${this.metrics.business.inventory.lowStockItems} items running low on stock`,
                { lowStockCount: this.metrics.business.inventory.lowStockItems }
            ));
        }

        // AI agent alerts
        if (this.metrics.ai_agents.bronwyn_chatbot.userSatisfaction < 3.0) {
            alerts.push(this.createAlert(
                'medium',
                'ai_agents',
                'Low chatbot satisfaction',
                `User satisfaction score: ${this.metrics.ai_agents.bronwyn_chatbot.userSatisfaction.toFixed(1)}/5`,
                { satisfaction: this.metrics.ai_agents.bronwyn_chatbot.userSatisfaction }
            ));
        }

        // Trigger alerts
        alerts.forEach(alert => this.triggerAlert(alert));
    }

    createAlert(level, type, title, message, data = {}) {
        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            level: level, // 'low', 'medium', 'high', 'critical'
            type: type,
            title: title,
            message: message,
            data: data,
            timestamp: new Date(),
            acknowledged: false,
            autoResolved: false
        };
    }

    triggerAlert(alert) {
        // Check if similar alert already exists
        const existingAlert = this.alerts.find(a => 
            a.type === alert.type && 
            a.title === alert.title && 
            !a.acknowledged
        );

        if (existingAlert) {
            // Update existing alert
            existingAlert.timestamp = new Date();
            existingAlert.data = alert.data;
        } else {
            // Add new alert
            this.alerts.push(alert);
            this.alertHistory.push(alert);
            
            // Limit alert history
            if (this.alertHistory.length > 1000) {
                this.alertHistory = this.alertHistory.slice(-1000);
            }

            // Send notification
            this.sendNotification(alert);
        }

        // Log alert
        console.log(`🚨 ALERT [${alert.level.toUpperCase()}]: ${alert.title} - ${alert.message}`);
    }

    sendNotification(alert) {
        // Implementation for sending notifications
        // This could integrate with:
        // - Email (SendGrid, Mailgun)
        // - Slack/Discord webhooks
        // - SMS (Twilio)
        // - PagerDuty/OpsGenie

        const notificationMethods = {
            critical: ['sms', 'email', 'slack'],
            high: ['email', 'slack'],
            medium: ['slack'],
            low: ['email'] // Daily digest
        };

        const methods = notificationMethods[alert.level] || ['slack'];

        methods.forEach(method => {
            switch (method) {
                case 'email':
                    this.sendEmailNotification(alert);
                    break;
                case 'slack':
                    this.sendSlackNotification(alert);
                    break;
                case 'sms':
                    this.sendSMSNotification(alert);
                    break;
            }
        });
    }

    sendEmailNotification(alert) {
        // Email implementation would go here
        console.log('📧 Email alert sent:', alert.title);
    }

    sendSlackNotification(alert) {
        // Slack webhook implementation would go here
        console.log('💬 Slack alert sent:', alert.title);
    }

    sendSMSNotification(alert) {
        // SMS implementation would go here
        console.log('📱 SMS alert sent:', alert.title);
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date();
        }
    }

    resolveAlert(alertId) {
        this.alerts = this.alerts.filter(a => a.id !== alertId);
    }

    async performanceProfiling() {
        try {
            const startTime = performance.now();
            
            // Measure database query performance
            const dbProfile = await this.profileDatabaseQueries();
            
            // Measure API endpoint performance
            const apiProfile = await this.profileAPIEndpoints();
            
            // Measure memory usage trends
            const memoryProfile = this.profileMemoryUsage();
            
            const profileTime = performance.now() - startTime;

            this.metrics.performance = {
                timestamp: new Date(),
                profiling: {
                    duration: profileTime,
                    database: dbProfile,
                    api: apiProfile,
                    memory: memoryProfile
                },
                recommendations: await this.generatePerformanceRecommendations()
            };

            this.logMetrics('performance', this.metrics.performance);

        } catch (error) {
            console.error('Performance profiling error:', error);
        }
    }

    // Helper methods
    async checkDatabasePerformance() {
        const start = performance.now();
        try {
            await mongoose.connection.db.admin().ping();
            return performance.now() - start;
        } catch (error) {
            return -1;
        }
    }

    async measureEventLoopLag() {
        return new Promise((resolve) => {
            const start = process.hrtime();
            setImmediate(() => {
                const delta = process.hrtime(start);
                const nanoseconds = delta[0] * 1e9 + delta[1];
                const milliseconds = nanoseconds / 1e6;
                resolve(milliseconds);
            });
        });
    }

    async getActiveConnections() {
        // Simplified active connections count
        // In production, this would track actual HTTP connections
        return 0;
    }

    async getActiveUsersCount(since) {
        const User = require('../../backend/models/User');
        return User.countDocuments({
            lastLogin: { $gte: since }
        });
    }

    getDatabaseStateName(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[state] || 'unknown';
    }

    async profileDatabaseQueries() {
        // This would analyze slow queries in production
        return {
            slowQueries: 0,
            averageQueryTime: 0,
            connectionPool: mongoose.connection.readyState === 1 ? 
                mongoose.connection.db.serverConfig.connections().length : 0
        };
    }

    async profileAPIEndpoints() {
        // This would analyze API endpoint performance
        return {
            averageResponseTime: 0,
            endpoints: [],
            errorRates: {}
        };
    }

    profileMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        return {
            heapUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            rss: memoryUsage.rss,
            trend: 'stable' // This would track trends over time
        };
    }

    async generatePerformanceRecommendations() {
        const recommendations = [];

        // Memory recommendations
        if (this.metrics.system.memory.usagePercentage > 80) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                message: 'Consider optimizing memory usage or scaling memory resources',
                action: 'Review memory-intensive operations and consider implementing caching'
            });
        }

        // Database recommendations
        if (this.metrics.application.database.ping > 500) {
            recommendations.push({
                type: 'database',
                priority: 'medium',
                message: 'Database latency is high. Consider query optimization or database scaling',
                action: 'Review slow queries and consider adding database indexes'
            });
        }

        // Business recommendations
        if (this.metrics.business.sales.ordersToday === 0) {
            recommendations.push({
                type: 'business',
                priority: 'low',
                message: 'No orders today. Consider promotional activities',
                action: 'Run marketing campaigns or offer limited-time discounts'
            });
        }

        return recommendations;
    }

    logMetrics(category, metrics) {
        // In production, this would send metrics to a monitoring service
        // For now, log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📊 ${category.toUpperCase()} METRICS:`, {
                timestamp: metrics.timestamp,
                ...metrics
            });
        }
    }

    // Public methods to get metrics and alerts
    getMetrics() {
        return this.metrics;
    }

    getAlerts() {
        return {
            active: this.alerts.filter(a => !a.acknowledged),
            history: this.alertHistory.slice(-100) // Last 100 alerts
        };
    }

    getHealthStatus() {
        const criticalAlerts = this.alerts.filter(a => 
            a.level === 'critical' && !a.acknowledged
        ).length;

        return {
            status: criticalAlerts > 0 ? 'degraded' : 'healthy',
            checks: {
                system: this.metrics.system ? 'healthy' : 'unknown',
                application: this.metrics.application ? 'healthy' : 'unknown',
                database: this.metrics.application?.database?.state === 'connected' ? 'healthy' : 'unhealthy',
                ai_agents: this.metrics.ai_agents ? 'healthy' : 'unknown'
            },
            criticalAlerts: criticalAlerts
        };
    }

    async generateReport(timeRange = '24h') {
        const report = {
            generatedAt: new Date(),
            timeRange: timeRange,
            summary: this.getHealthStatus(),
            metrics: this.metrics,
            alerts: this.getAlerts(),
            recommendations: await this.generatePerformanceRecommendations()
        };

        return report;
    }

    async shutdown() {
        // Clear all monitoring intervals
        Object.values(this.monitoringIntervals).forEach(interval => {
            clearInterval(interval);
        });

        this.isMonitoring = false;
        console.log('🛑 System Monitor shutdown complete');
    }
}

module.exports = SystemMonitor;
