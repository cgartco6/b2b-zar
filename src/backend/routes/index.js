const express = require('express');
const router = express.Router();

// Import route modules
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const paymentRoutes = require('./payments');
const authRoutes = require('./auth');
const aiChatRoutes = require('./ai-chat');
const supplierRoutes = require('./suppliers');
const categoryRoutes = require('./categories');
const analyticsRoutes = require('./analytics');

// Mount routes
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/auth', authRoutes);
router.use('/ai-chat', aiChatRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/categories', categoryRoutes);
router.use('/analytics', analyticsRoutes);

// API information endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'B2B ZAR Marketplace API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            products: '/api/products',
            cart: '/api/cart',
            orders: '/api/orders',
            payments: '/api/payments',
            auth: '/api/auth',
            ai_chat: '/api/ai-chat',
            suppliers: '/api/suppliers',
            categories: '/api/categories',
            analytics: '/api/analytics'
        },
        documentation: '/api/docs',
        status: 'operational'
    });
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        documentation: {
            authentication: {
                description: 'JWT-based authentication system',
                endpoints: {
                    login: 'POST /api/auth/login',
                    register: 'POST /api/auth/register',
                    profile: 'GET /api/auth/profile',
                    refresh: 'POST /api/auth/refresh'
                }
            },
            products: {
                description: 'Product catalog and search',
                endpoints: {
                    list: 'GET /api/products',
                    search: 'GET /api/products/search',
                    get: 'GET /api/products/:id',
                    create: 'POST /api/products',
                    update: 'PUT /api/products/:id'
                }
            },
            payments: {
                description: 'Payment processing with South African gateways',
                endpoints: {
                    payfast: 'POST /api/payments/payfast',
                    yoco: 'POST /api/payments/yoco',
                    ozow: 'POST /api/payments/ozow'
                }
            }
        }
    });
});

module.exports = router;
