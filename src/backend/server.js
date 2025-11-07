require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// Database configuration
const database = require('../config/database.config');
const emailConfig = require('../config/email.config');

class OptimizedServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    connectSrc: ["'self'"]
                }
            }
        }));

        // Compression middleware (save bandwidth)
        this.app.use(compression({
            level: 6,
            threshold: 100 * 1024 // Compress responses larger than 100KB
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.BASE_URL || 'https://your-domain.co.za',
            credentials: true
        }));

        // Body parsing with limits
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Static files with caching
        this.app.use(express.static(path.join(__dirname, '../../public'), {
            maxAge: '1y',
            etag: false
        }));

        // Rate limiting
        const rateLimit = require('express-rate-limit');
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP'
        });
        this.app.use(limiter);
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV
            });
        });

        // API routes
        this.app.use('/api/auth', require('./routes/auth'));
        this.app.use('/api/products', require('./routes/products'));
        this.app.use('/api/orders', require('./routes/orders'));
        this.app.use('/api/payments', require('./routes/payments'));

        // Serve frontend for all other routes (SPA)
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/index.html'));
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            
            res.status(error.status || 500).json({
                success: false,
                message: process.env.NODE_ENV === 'production' 
                    ? 'Internal server error' 
                    : error.message
            });
        });
    }

    async start() {
        try {
            // Initialize database
            await database.initialize();
            
            // Test email configuration
            await emailConfig.testConfiguration();
            
            // Start server
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 B2B Marketplace running on port ${this.port}`);
                console.log(`📍 Environment: ${process.env.NODE_ENV}`);
                console.log(`🌐 Domain: ${process.env.BASE_URL}`);
                console.log(`💾 Database: ${process.env.DB_NAME}`);
            });

            // Graceful shutdown
            process.on('SIGTERM', this.gracefulShutdown.bind(this));
            process.on('SIGINT', this.gracefulShutdown.bind(this));

        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    async gracefulShutdown() {
        console.log('🛑 Received shutdown signal...');
        
        // Close server
        if (this.server) {
            this.server.close(() => {
                console.log('✅ HTTP server closed');
            });
        }

        // Close database connections
        await database.close();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    }
}

// Start the server
if (require.main === module) {
    const server = new OptimizedServer();
    server.start();
}

module.exports = OptimizedServer;
