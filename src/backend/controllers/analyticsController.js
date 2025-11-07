const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const ChatSession = require('../models/ChatSession');

class AnalyticsController {
    // Get dashboard analytics
    async getDashboardAnalytics(req, res) {
        try {
            const timeRange = req.query.range || '7d';
            const userId = req.user.userId;
            const userRole = req.user.role;

            // Calculate date range
            const dateRange = this.calculateDateRange(timeRange);
            
            // Get analytics based on user role
            let analytics;
            
            if (userRole === 'admin') {
                analytics = await this.getAdminDashboardAnalytics(dateRange);
            } else if (userRole === 'supplier') {
                analytics = await this.getSupplierDashboardAnalytics(userId, dateRange);
            } else {
                analytics = await this.getCustomerDashboardAnalytics(userId, dateRange);
            }

            res.json({
                success: true,
                data: analytics,
                timeRange
            });

        } catch (error) {
            console.error('Get dashboard analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard analytics',
                error: error.message
            });
        }
    }

    // Get sales overview
    async getSalesOverview(req, res) {
        try {
            const { range = '30d', groupBy = 'day' } = req.query;
            const dateRange = this.calculateDateRange(range);

            const salesData = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                        status: { $in: ['delivered', 'shipped'] },
                        'payment.status': 'completed'
                    }
                },
                {
                    $group: {
                        _id: this.getGroupByExpression(groupBy),
                        totalSales: { $sum: '$pricing.total' },
                        orderCount: { $sum: 1 },
                        averageOrderValue: { $avg: '$pricing.total' },
                        productCount: { $sum: { $size: '$items' } }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            // Format the data for charts
            const formattedData = this.formatSalesData(salesData, groupBy);

            res.json({
                success: true,
                data: formattedData,
                summary: this.calculateSalesSummary(salesData)
            });

        } catch (error) {
            console.error('Get sales overview error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sales overview',
                error: error.message
            });
        }
    }

    // Get sales trends
    async getSalesTrends(req, res) {
        try {
            const { range = '90d' } = req.query;
            const dateRange = this.calculateDateRange(range);

            const trends = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                        'payment.status': 'completed'
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        revenue: { $sum: '$pricing.total' },
                        orders: { $sum: 1 },
                        customers: { $addToSet: '$customer' }
                    }
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
                }
            ]);

            // Calculate growth rates and trends
            const analysis = this.analyzeSalesTrends(trends);

            res.json({
                success: true,
                data: {
                    trends: trends,
                    analysis: analysis
                }
            });

        } catch (error) {
            console.error('Get sales trends error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sales trends',
                error: error.message
            });
        }
    }

    // Get product performance
    async getProductPerformance(req, res) {
        try {
            const { range = '30d', limit = 10 } = req.query;
            const dateRange = this.calculateDateRange(range);

            const productPerformance = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                        'payment.status': 'completed'
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        productName: { $first: '$items.productName' },
                        totalRevenue: { $sum: '$items.totalPrice' },
                        totalQuantity: { $sum: '$items.quantity' },
                        orderCount: { $sum: 1 },
                        averageRating: { $avg: '$items.rating' }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $project: {
                        productName: 1,
                        totalRevenue: 1,
                        totalQuantity: 1,
                        orderCount: 1,
                        averageRating: 1,
                        product: { $arrayElemAt: ['$productDetails', 0] }
                    }
                },
                {
                    $sort: { totalRevenue: -1 }
                },
                {
                    $limit: parseInt(limit)
                }
            ]);

            res.json({
                success: true,
                data: productPerformance
            });

        } catch (error) {
            console.error('Get product performance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product performance',
                error: error.message
            });
        }
    }

    // Get category performance
    async getCategoryPerformance(req, res) {
        try {
            const { range = '30d' } = req.query;
            const dateRange = this.calculateDateRange(range);

            const categoryPerformance = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                        'payment.status': 'completed'
                    }
                },
                { $unwind: '$items' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'items.product',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                {
                    $unwind: '$productInfo'
                },
                {
                    $group: {
                        _id: '$productInfo.category',
                        totalRevenue: { $sum: '$items.totalPrice' },
                        totalOrders: { $sum: 1 },
                        productCount: { $sum: 1 },
                        averageOrderValue: { $avg: '$items.totalPrice' }
                    }
                },
                {
                    $sort: { totalRevenue: -1 }
                }
            ]);

            res.json({
                success: true,
                data: categoryPerformance
            });

        } catch (error) {
            console.error('Get category performance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category performance',
                error: error.message
            });
        }
    }

    // Get customer analytics
    async getCustomerAnalytics(req, res) {
        try {
            const { range = '90d' } = req.query;
            const dateRange = this.calculateDateRange(range);

            const customerAnalytics = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                        'payment.status': 'completed'
                    }
                },
                {
                    $group: {
                        _id: '$customer',
                        totalSpent: { $sum: '$pricing.total' },
                        orderCount: { $sum: 1 },
                        firstOrderDate: { $min: '$createdAt' },
                        lastOrderDate: { $max: '$createdAt' },
                        averageOrderValue: { $avg: '$pricing.total' }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'customerInfo'
                    }
                },
                {
                    $project: {
                        totalSpent: 1,
                        orderCount: 1,
                        firstOrderDate: 1,
                        lastOrderDate: 1,
                        averageOrderValue: 1,
                        customer: { $arrayElemAt: ['$customerInfo', 0] }
                    }
                },
                {
                    $sort: { totalSpent: -1 }
                }
            ]);

            // Calculate customer metrics
            const metrics = this.calculateCustomerMetrics(customerAnalytics);

            res.json({
                success: true,
                data: {
                    customers: customerAnalytics,
                    metrics: metrics
                }
            });

        } catch (error) {
            console.error('Get customer analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch customer analytics',
                error: error.message
            });
        }
    }

    // Get customer segmentation
    async getCustomerSegmentation(req, res) {
        try {
            const segments = await this.calculateCustomerSegmentation();

            res.json({
                success: true,
                data: segments
            });

        } catch (error) {
            console.error('Get customer segmentation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch customer segmentation',
                error: error.message
            });
        }
    }

    // Get customer retention
    async getCustomerRetention(req, res) {
        try {
            const retentionData = await this.calculateCustomerRetention();

            res.json({
                success: true,
                data: retentionData
            });

        } catch (error) {
            console.error('Get customer retention error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch customer retention',
                error: error.message
            });
        }
    }

    // Get supplier performance
    async getSupplierPerformance(req, res) {
        try {
            const { range = '30d' } = req.query;
            const dateRange = this.calculateDateRange(range);
            const userId = req.user.userId;

            let matchFilter = {
                createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                'payment.status': 'completed'
            };

            // If user is supplier, only show their products
            if (req.user.role === 'supplier') {
                const supplier = await Supplier.findOne({ userId: userId });
                if (supplier) {
                    matchFilter['items.supplier'] = supplier._id;
                }
            }

            const supplierPerformance = await Order.aggregate([
                {
                    $match: matchFilter
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.supplier',
                        supplierName: { $first: '$items.supplierName' },
                        totalRevenue: { $sum: '$items.totalPrice' },
                        totalOrders: { $sum: 1 },
                        productCount: { $sum: '$items.quantity' },
                        averageRating: { $avg: '$items.rating' }
                    }
                },
                {
                    $lookup: {
                        from: 'suppliers',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'supplierDetails'
                    }
                },
                {
                    $project: {
                        supplierName: 1,
                        totalRevenue: 1,
                        totalOrders: 1,
                        productCount: 1,
                        averageRating: 1,
                        supplier: { $arrayElemAt: ['$supplierDetails', 0] }
                    }
                },
                {
                    $sort: { totalRevenue: -1 }
                }
            ]);

            res.json({
                success: true,
                data: supplierPerformance
            });

        } catch (error) {
            console.error('Get supplier performance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier performance',
                error: error.message
            });
        }
    }

    // Get inventory levels
    async getInventoryLevels(req, res) {
        try {
            const { threshold = 10 } = req.query;
            const userId = req.user.userId;

            let matchFilter = { status: 'active' };

            // If user is supplier, only show their products
            if (req.user.role === 'supplier') {
                const supplier = await Supplier.findOne({ userId: userId });
                if (supplier) {
                    matchFilter.supplier = supplier._id;
                }
            }

            const inventoryLevels = await Product.aggregate([
                {
                    $match: matchFilter
                },
                {
                    $project: {
                        name: 1,
                        sku: 1,
                        stockQuantity: 1,
                        lowStockAlert: 1,
                        price: 1,
                        category: 1,
                        status: 1,
                        isLowStock: { $lte: ['$stockQuantity', '$lowStockAlert'] },
                        isOutOfStock: { $lte: ['$stockQuantity', 0] }
                    }
                },
                {
                    $sort: { stockQuantity: 1 }
                }
            ]);

            const summary = {
                totalProducts: inventoryLevels.length,
                lowStock: inventoryLevels.filter(p => p.isLowStock && !p.isOutOfStock).length,
                outOfStock: inventoryLevels.filter(p => p.isOutOfStock).length,
                inStock: inventoryLevels.filter(p => !p.isLowStock && !p.isOutOfStock).length
            };

            res.json({
                success: true,
                data: {
                    products: inventoryLevels,
                    summary: summary
                }
            });

        } catch (error) {
            console.error('Get inventory levels error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory levels',
                error: error.message
            });
        }
    }

    // Get inventory turnover
    async getInventoryTurnover(req, res) {
        try {
            const { range = '90d' } = req.query;
            const dateRange = this.calculateDateRange(range);

            const turnover = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
                        'payment.status': 'completed'
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        productName: { $first: '$items.productName' },
                        totalSold: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: '$items.totalPrice' }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                {
                    $project: {
                        productName: 1,
                        totalSold: 1,
                        totalRevenue: 1,
                        currentStock: { $arrayElemAt: ['$productInfo.stockQuantity', 0] },
                        costPrice: { $arrayElemAt: ['$productInfo.costPrice', 0] }
                    }
                },
                {
                    $addFields: {
                        turnoverRate: {
                            $cond: [
                                { $gt: ['$currentStock', 0] },
                                { $divide: ['$totalSold', '$currentStock'] },
                                0
                            ]
                        }
                    }
                },
                {
                    $sort: { turnoverRate: -1 }
                }
            ]);

            res.json({
                success: true,
                data: turnover
            });

        } catch (error) {
            console.error('Get inventory turnover error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory turnover',
                error: error.message
            });
        }
    }

    // Get marketing analytics
    async getMarketingAnalytics(req, res) {
        try {
            // This would integrate with marketing platforms
            // Returning sample data for demonstration
            const marketingData = {
                campaigns: [
                    {
                        name: 'Q1 Business Promotion',
                        impressions: 15000,
                        clicks: 1200,
                        conversions: 85,
                        cost: 5000,
                        revenue: 25000,
                        roi: 400
                    },
                    {
                        name: 'B-BBEE Supplier Spotlight',
                        impressions: 8000,
                        clicks: 650,
                        conversions: 42,
                        cost: 2500,
                        revenue: 18000,
                        roi: 620
                    }
                ],
                channels: {
                    social_media: { leads: 45, conversionRate: 12.5 },
                    email: { leads: 28, conversionRate: 8.2 },
                    search_ads: { leads: 62, conversionRate: 15.8 },
                    referral: { leads: 15, conversionRate: 22.1 }
                }
            };

            res.json({
                success: true,
                data: marketingData
            });

        } catch (error) {
            console.error('Get marketing analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch marketing analytics',
                error: error.message
            });
        }
    }

    // Get AI performance
    async getAIPerformance(req, res) {
        try {
            const aiPerformance = await ChatSession.getSessionAnalytics('30d');

            // Additional AI-specific metrics
            const aiMetrics = {
                totalSessions: aiPerformance.totalSessions,
                activeSessions: aiPerformance.activeSessions,
                averageMessages: aiPerformance.averageMessagesPerSession,
                userSatisfaction: aiPerformance.averageSatisfaction,
                escalationRate: (aiPerformance.escalatedSessions / aiPerformance.totalSessions) * 100,
                averageResponseTime: 2.3, // This would be calculated from actual data
                costPerSession: 0.15,
                totalTokens: await this.getTotalAITokens()
            };

            res.json({
                success: true,
                data: aiMetrics
            });

        } catch (error) {
            console.error('Get AI performance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch AI performance',
                error: error.message
            });
        }
    }

    // Get real-time activity
    async getRealTimeActivity(req, res) {
        try {
            const recentOrders = await Order.find({})
                .populate('customer', 'firstName lastName businessName')
                .sort({ createdAt: -1 })
                .limit(10);

            const recentUsers = await User.find({})
                .sort({ createdAt: -1 })
                .limit(5);

            const activeChats = await ChatSession.find({ status: 'active' })
                .populate('userId', 'firstName lastName')
                .limit(5);

            const realTimeData = {
                recentOrders: recentOrders,
                recentUsers: recentUsers,
                activeChats: activeChats,
                timestamp: new Date()
            };

            res.json({
                success: true,
                data: realTimeData
            });

        } catch (error) {
            console.error('Get real-time activity error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch real-time activity',
                error: error.message
            });
        }
    }

    // Export analytics data
    async exportAnalyticsData(req, res) {
        try {
            const { type } = req.params;
            const { format = 'json' } = req.query;

            let data;
            let filename;

            switch (type) {
                case 'sales':
                    data = await this.getSalesExportData();
                    filename = `sales_export_${new Date().toISOString().split('T')[0]}`;
                    break;
                case 'customers':
                    data = await this.getCustomersExportData();
                    filename = `customers_export_${new Date().toISOString().split('T')[0]}`;
                    break;
                case 'products':
                    data = await this.getProductsExportData();
                    filename = `products_export_${new Date().toISOString().split('T')[0]}`;
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid export type'
                    });
            }

            if (format === 'csv') {
                // Convert to CSV format
                const csv = this.convertToCSV(data);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
                return res.send(csv);
            } else {
                res.json({
                    success: true,
                    data: data,
                    filename: filename
                });
            }

        } catch (error) {
            console.error('Export analytics data error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export analytics data',
                error: error.message
            });
        }
    }

    // Generate custom report
    async generateCustomReport(req, res) {
        try {
            const { reportType, parameters } = req.body;

            let report;

            switch (reportType) {
                case 'monthly_sales':
                    report = await this.generateMonthlySalesReport(parameters);
                    break;
                case 'customer_behavior':
                    report = await this.generateCustomerBehaviorReport(parameters);
                    break;
                case 'product_performance':
                    report = await this.generateProductPerformanceReport(parameters);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid report type'
                    });
            }

            res.json({
                success: true,
                data: report,
                generatedAt: new Date()
            });

        } catch (error) {
            console.error('Generate custom report error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate custom report',
                error: error.message
            });
        }
    }

    // Helper methods
    calculateDateRange(range) {
        const now = new Date();
        let startDate;

        switch (range) {
            case '24h':
                startDate = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        }

        return { start: startDate, end: now };
    }

    getGroupByExpression(groupBy) {
        switch (groupBy) {
            case 'hour':
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                    hour: { $hour: '$createdAt' }
                };
            case 'week':
                return {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                };
            case 'month':
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
            default: // day
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
        }
    }

    formatSalesData(salesData, groupBy) {
        return salesData.map(item => ({
            date: this.formatGroupedDate(item._id, groupBy),
            sales: item.totalSales,
            orders: item.orderCount,
            averageOrderValue: item.averageOrderValue,
            products: item.productCount
        }));
    }

    formatGroupedDate(dateGroup, groupBy) {
        switch (groupBy) {
            case 'hour':
                return `${dateGroup.year}-${dateGroup.month}-${dateGroup.day} ${dateGroup.hour}:00`;
            case 'week':
                return `Week ${dateGroup.week}, ${dateGroup.year}`;
            case 'month':
                return `${dateGroup.year}-${dateGroup.month.toString().padStart(2, '0')}`;
            default:
                return `${dateGroup.year}-${dateGroup.month.toString().padStart(2, '0')}-${dateGroup.day.toString().padStart(2, '0')}`;
        }
    }

    calculateSalesSummary(salesData) {
        const totalSales = salesData.reduce((sum, item) => sum + item.totalSales, 0);
        const totalOrders = salesData.reduce((sum, item) => sum + item.orderCount, 0);
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        return {
            totalSales,
            totalOrders,
            averageOrderValue,
            totalProducts: salesData.reduce((sum, item) => sum + item.productCount, 0)
        };
    }

    // Additional helper methods would be implemented here...
    // Due to length constraints, I'm showing the structure

    async getAdminDashboardAnalytics(dateRange) {
        // Implementation for admin dashboard
        return {
            // Admin-specific analytics
        };
    }

    async getSupplierDashboardAnalytics(userId, dateRange) {
        // Implementation for supplier dashboard
        return {
            // Supplier-specific analytics
        };
    }

    async getCustomerDashboardAnalytics(userId, dateRange) {
        // Implementation for customer dashboard
        return {
            // Customer-specific analytics
        };
    }

    analyzeSalesTrends(trends) {
        // Implementation for sales trend analysis
        return {
            // Trend analysis results
        };
    }

    calculateCustomerMetrics(customers) {
        // Implementation for customer metrics
        return {
            // Customer metrics
        };
    }

    async calculateCustomerSegmentation() {
        // Implementation for customer segmentation
        return {
            // Customer segments
        };
    }

    async calculateCustomerRetention() {
        // Implementation for customer retention
        return {
            // Retention data
        };
    }

    async getTotalAITokens() {
        // Implementation for AI token calculation
        return 0;
    }

    async getSalesExportData() {
        // Implementation for sales data export
        return [];
    }

    async getCustomersExportData() {
        // Implementation for customers data export
        return [];
    }

    async getProductsExportData() {
        // Implementation for products data export
        return [];
    }

    convertToCSV(data) {
        // Implementation for CSV conversion
        return '';
    }

    async generateMonthlySalesReport(parameters) {
        // Implementation for monthly sales report
        return {};
    }

    async generateCustomerBehaviorReport(parameters) {
        // Implementation for customer behavior report
        return {};
    }

    async generateProductPerformanceReport(parameters) {
        // Implementation for product performance report
        return {};
    }
}

module.exports = new AnalyticsController();
