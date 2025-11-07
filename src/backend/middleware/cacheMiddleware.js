const NodeCache = require('node-cache');

class CacheMiddleware {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 300, // Default TTL: 5 minutes
            checkperiod: 60, // Check for expired keys every 60 seconds
            useClones: false // Better performance
        });

        // Cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            keys: 0
        };
    }

    // Middleware to cache GET requests
    cacheMiddleware(ttl = 300) {
        return (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }

            const key = this.generateCacheKey(req);
            const cachedResponse = this.cache.get(key);

            if (cachedResponse) {
                // Cache hit
                this.stats.hits++;
                
                // Check if cache should be revalidated
                if (this.shouldRevalidate(cachedResponse)) {
                    this.cache.del(key);
                    this.stats.misses++;
                    return next();
                }

                return res.json(cachedResponse.data);
            }

            // Cache miss
            this.stats.misses++;

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = (data) => {
                // Cache the successful response
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    this.cache.set(key, {
                        data: data,
                        timestamp: Date.now(),
                        headers: this.getResponseHeaders(res)
                    }, ttl);
                }

                // Restore original method
                res.json = originalJson;
                return res.json(data);
            };

            next();
        };
    }

    // Middleware to cache specific routes with custom TTL
    routeCache(ttl = 300, conditions = {}) {
        return (req, res, next) => {
            // Check conditions
            if (conditions.method && req.method !== conditions.method) {
                return next();
            }

            if (conditions.path && !req.path.match(conditions.path)) {
                return next();
            }

            return this.cacheMiddleware(ttl)(req, res, next);
        };
    }

    // Generate cache key from request
    generateCacheKey(req) {
        const keyParts = [
            req.method,
            req.originalUrl,
            JSON.stringify(req.query),
            JSON.stringify(req.params),
            req.user?.userId || 'anonymous'
        ];

        return `cache:${Buffer.from(keyParts.join('|')).toString('base64')}`;
    }

    // Get relevant response headers for cache validation
    getResponseHeaders(res) {
        return {
            'content-type': res.get('Content-Type'),
            'etag': res.get('ETag'),
            'last-modified': res.get('Last-Modified')
        };
    }

    // Check if cached response should be revalidated
    shouldRevalidate(cachedResponse) {
        // Implement revalidation logic based on headers
        // For now, simple timestamp-based revalidation
        const cacheAge = Date.now() - cachedResponse.timestamp;
        return cacheAge > (5 * 60 * 1000); // 5 minutes
    }

    // Clear cache for specific route pattern
    clearRouteCache(pattern) {
        const keys = this.cache.keys();
        const matchingKeys = keys.filter(key => key.includes(pattern));
        
        matchingKeys.forEach(key => {
            this.cache.del(key);
        });

        return matchingKeys.length;
    }

    // Clear all cache
    clearAllCache() {
        const keyCount = this.cache.keys().length;
        this.cache.flushAll();
        return keyCount;
    }

    // Get cache statistics
    getStats() {
        return {
            ...this.stats,
            hitRatio: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            keyCount: this.cache.keys().length,
            cacheSize: this.cache.getStats().keys
        };
    }

    // Manual cache set
    set(key, data, ttl = 300) {
        return this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        }, ttl);
    }

    // Manual cache get
    get(key) {
        const cached = this.cache.get(key);
        return cached ? cached.data : null;
    }

    // Manual cache delete
    del(key) {
        return this.cache.del(key);
    }

    // Cache with tags
    setWithTags(key, data, tags = [], ttl = 300) {
        this.set(key, data, ttl);
        
        // Store tag relationships
        tags.forEach(tag => {
            const tagKey = `tag:${tag}`;
            const taggedItems = this.get(tagKey) || [];
            if (!taggedItems.includes(key)) {
                taggedItems.push(key);
                this.set(tagKey, taggedItems, ttl * 2); // Longer TTL for tag index
            }
        });
    }

    // Clear cache by tag
    clearByTag(tag) {
        const tagKey = `tag:${tag}`;
        const taggedItems = this.get(tagKey) || [];
        
        taggedItems.forEach(key => {
            this.del(key);
        });
        
        this.del(tagKey);
        return taggedItems.length;
    }

    // Preload cache with important data
    async preloadCache() {
        const preloadData = {
            // Categories
            'cache:categories': await this.fetchCategories(),
            // B-BBEE levels
            'cache:bbbee-levels': await this.fetchBbbeeLevels(),
            // Popular products
            'cache:popular-products': await this.fetchPopularProducts()
        };

        Object.entries(preloadData).forEach(([key, data]) => {
            if (data) {
                this.set(key, data, 3600); // 1 hour TTL for preloaded data
            }
        });
    }

    async fetchCategories() {
        // Implementation to fetch categories
        return [];
    }

    async fetchBbbeeLevels() {
        // Implementation to fetch B-BBEE levels
        return [];
    }

    async fetchPopularProducts() {
        // Implementation to fetch popular products
        return [];
    }

    // Middleware to skip cache for specific conditions
    skipCache(conditions = {}) {
        return (req, res, next) => {
            req.skipCache = false;

            // Check conditions to skip cache
            if (conditions.queryParam && req.query[conditions.queryParam]) {
                req.skipCache = true;
            }

            if (conditions.header && req.headers[conditions.header]) {
                req.skipCache = true;
            }

            if (conditions.userRole && req.user?.role === conditions.userRole) {
                req.skipCache = true;
            }

            next();
        };
    }

    // Cache warming for frequently accessed endpoints
    async warmCache() {
        const endpoints = [
            '/api/products/featured',
            '/api/categories',
            '/api/suppliers/bbbee/certified'
        ];

        for (const endpoint of endpoints) {
            try {
                // Simulate request to warm cache
                const mockReq = {
                    method: 'GET',
                    originalUrl: endpoint,
                    query: {},
                    params: {},
                    user: null
                };

                const key = this.generateCacheKey(mockReq);
                
                // Set placeholder to prevent cache stampede
                this.set(key, { warming: true }, 30);

                // In production, this would make actual API calls
                console.log(`Warming cache for: ${endpoint}`);
                
            } catch (error) {
                console.error(`Cache warming failed for ${endpoint}:`, error);
            }
        }
    }

    // Cache invalidation on data changes
    onDataChange(event, data) {
        switch (event) {
            case 'product:created':
            case 'product:updated':
            case 'product:deleted':
                this.clearRouteCache('products');
                this.clearByTag('products');
                break;

            case 'category:updated':
                this.clearRouteCache('categories');
                this.clearByTag('categories');
                break;

            case 'supplier:updated':
                this.clearRouteCache('suppliers');
                this.clearByTag('suppliers');
                break;

            case 'order:created':
                this.clearRouteCache('analytics');
                this.clearByTag('analytics');
                break;
        }
    }

    // Health check for cache
    healthCheck() {
        try {
            // Test set and get
            const testKey = 'health-check';
            const testData = { timestamp: Date.now() };
            
            this.set(testKey, testData, 10);
            const retrieved = this.get(testKey);
            
            return {
                status: retrieved?.timestamp === testData.timestamp ? 'healthy' : 'unhealthy',
                stats: this.getStats(),
                memory: process.memoryUsage()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = new CacheMiddleware();
