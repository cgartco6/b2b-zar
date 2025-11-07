const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

// All analytics routes require authentication
router.use(authMiddleware.verifyToken);

// Dashboard analytics
router.get('/dashboard', analyticsController.getDashboardAnalytics);

// Sales analytics
router.get('/sales/overview', analyticsController.getSalesOverview);
router.get('/sales/trends', analyticsController.getSalesTrends);
router.get('/sales/products', analyticsController.getProductPerformance);
router.get('/sales/categories', analyticsController.getCategoryPerformance);

// Customer analytics
router.get('/customers/overview', analyticsController.getCustomerAnalytics);
router.get('/customers/segmentation', analyticsController.getCustomerSegmentation);
router.get('/customers/retention', analyticsController.getCustomerRetention);

// Supplier analytics
router.get('/suppliers/performance', 
    authMiddleware.requireRole(['admin', 'supplier']),
    analyticsController.getSupplierPerformance
);

// Inventory analytics
router.get('/inventory/levels', 
    authMiddleware.requireRole(['admin', 'supplier']),
    analyticsController.getInventoryLevels
);

router.get('/inventory/turnover',
    authMiddleware.requireRole(['admin', 'supplier']),
    analyticsController.getInventoryTurnover
);

// Marketing analytics
router.get('/marketing/campaigns', 
    authMiddleware.requireRole(['admin']),
    analyticsController.getMarketingAnalytics
);

// AI performance analytics
router.get('/ai/performance',
    authMiddleware.requireRole(['admin']),
    analyticsController.getAIPerformance
);

// Real-time analytics
router.get('/realtime/activity', analyticsController.getRealTimeActivity);

// Export analytics data
router.get('/export/:type',
    authMiddleware.requireRole(['admin']),
    analyticsController.exportAnalyticsData
);

// Custom report generation
router.post('/reports/generate',
    authMiddleware.requireRole(['admin']),
    analyticsController.generateCustomReport
);

module.exports = router;
