const tf = require('@tensorflow/tfjs-node');
const mongoose = require('mongoose');
const Product = require('../../backend/models/Product');
const Order = require('../../backend/models/Order');

class ProductRecommender {
    constructor() {
        this.model = null;
        this.productEmbeddings = new Map();
        this.userEmbeddings = new Map();
        this.isTrained = false;
        this.trainingHistory = [];
    }

    async initialize() {
        try {
            console.log('🔄 Initializing Product Recommendation Agent...');
            
            // Load or create model
            await this.loadOrCreateModel();
            
            // Load existing embeddings
            await this.loadEmbeddings();
            
            // Train model with existing data
            await this.retrainWithHistoricalData();
            
            console.log('✅ Product Recommendation Agent initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Product Recommendation Agent:', error);
            throw error;
        }
    }

    async loadOrCreateModel() {
        // Create a simple collaborative filtering model
        this.model = tf.sequential({
            layers: [
                tf.layers.dense({ units: 64, activation: 'relu', inputShape: [100] }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });

        this.model.compile({
            optimizer: 'adam',
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
    }

    async loadEmbeddings() {
        // Load products and create initial embeddings
        const products = await Product.find({ status: 'active' });
        
        products.forEach(product => {
            this.productEmbeddings.set(
                product._id.toString(),
                this.generateRandomEmbedding(50)
            );
        });

        console.log(`📦 Loaded embeddings for ${products.length} products`);
    }

    generateRandomEmbedding(dimensions) {
        return Array.from({ length: dimensions }, () => 
            Math.random() * 2 - 1 // Values between -1 and 1
        );
    }

    async retrainWithHistoricalData() {
        try {
            // Get recent orders for training
            const recentOrders = await Order.find({
                status: { $in: ['delivered', 'shipped'] },
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            }).populate('items.product');

            if (recentOrders.length === 0) {
                console.log('⚠️ No historical data available for training');
                return;
            }

            const trainingData = this.prepareTrainingData(recentOrders);
            await this.trainModel(trainingData);

            console.log(`🎯 Retrained model with ${recentOrders.length} historical orders`);

        } catch (error) {
            console.error('Failed to retrain with historical data:', error);
        }
    }

    prepareTrainingData(orders) {
        const features = [];
        const labels = [];

        orders.forEach(order => {
            order.items.forEach(item => {
                if (this.productEmbeddings.has(item.product._id.toString())) {
                    const productEmbedding = this.productEmbeddings.get(item.product._id.toString());
                    
                    // Create user embedding if not exists
                    if (!this.userEmbeddings.has(order.customer.toString())) {
                        this.userEmbeddings.set(
                            order.customer.toString(),
                            this.generateRandomEmbedding(50)
                        );
                    }

                    const userEmbedding = this.userEmbeddings.get(order.customer.toString());
                    
                    // Combine user and product embeddings
                    const combinedEmbedding = [...userEmbedding, ...productEmbedding];
                    
                    features.push(combinedEmbedding);
                    labels.push(1); // Positive interaction
                }
            });
        });

        return {
            features: tf.tensor2d(features),
            labels: tf.tensor1d(labels)
        };
    }

    async trainModel(trainingData) {
        if (trainingData.features.shape[0] === 0) {
            console.log('⚠️ No training data available');
            return;
        }

        const history = await this.model.fit(trainingData.features, trainingData.labels, {
            epochs: 10,
            batchSize: 32,
            validationSplit: 0.2,
            verbose: 0
        });

        this.trainingHistory.push({
            timestamp: new Date(),
            loss: history.history.loss[0],
            accuracy: history.history.acc[0],
            valLoss: history.history.val_loss[0],
            valAccuracy: history.history.val_acc[0]
        });

        this.isTrained = true;

        // Clean up tensors to prevent memory leaks
        trainingData.features.dispose();
        trainingData.labels.dispose();
    }

    async getRecommendations(productId, limit = 8, userId = null) {
        try {
            if (!this.isTrained) {
                return await this.getFallbackRecommendations(productId, limit);
            }

            const targetProduct = await Product.findById(productId);
            if (!targetProduct) {
                return await this.getFallbackRecommendations(null, limit);
            }

            let userEmbedding;
            if (userId && this.userEmbeddings.has(userId)) {
                userEmbedding = this.userEmbeddings.get(userId);
            } else {
                userEmbedding = this.generateRandomEmbedding(50);
            }

            // Get similarity scores for all products
            const recommendations = [];
            const targetEmbedding = this.productEmbeddings.get(productId);

            for (const [pid, embedding] of this.productEmbeddings.entries()) {
                if (pid === productId) continue;

                const similarity = this.calculateCosineSimilarity(targetEmbedding, embedding);
                
                // Combine with user preference if available
                let score = similarity;
                if (userId) {
                    const combinedEmbedding = [...userEmbedding, ...embedding];
                    const userPreference = this.model.predict(
                        tf.tensor2d([combinedEmbedding])
                    ).dataSync()[0];
                    
                    score = (similarity + userPreference) / 2;
                }

                recommendations.push({
                    productId: pid,
                    score: score
                });
            }

            // Sort by score and get top recommendations
            const topRecommendations = recommendations
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            // Get product details
            const productIds = topRecommendations.map(rec => rec.productId);
            const products = await Product.find({
                _id: { $in: productIds },
                status: 'active'
            }).populate('supplier', 'businessName bbbeeLevel');

            // Map products with their scores
            const productsWithScores = products.map(product => {
                const recommendation = topRecommendations.find(
                    rec => rec.productId === product._id.toString()
                );
                return {
                    ...product.toObject(),
                    recommendationScore: recommendation?.score || 0
                };
            });

            return productsWithScores;

        } catch (error) {
            console.error('Recommendation error:', error);
            return await this.getFallbackRecommendations(productId, limit);
        }
    }

    async getFallbackRecommendations(productId, limit) {
        // Fallback to popular products in the same category
        const targetProduct = await Product.findById(productId);
        
        if (!targetProduct) {
            // Return featured products if no target product
            return await Product.getFeaturedProducts(limit);
        }

        // Return popular products in same category
        return await Product.find({
            category: targetProduct.category,
            status: 'active',
            _id: { $ne: productId }
        })
        .sort({ 'rating.average': -1, 'purchaseCount': -1 })
        .limit(limit)
        .populate('supplier', 'businessName bbbeeLevel');
    }

    calculateCosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async trainWithNewProduct(product) {
        // Add embedding for new product
        this.productEmbeddings.set(
            product._id.toString(),
            this.generateRandomEmbedding(50)
        );

        // Retrain model with new product data
        await this.retrainWithHistoricalData();
    }

    async recordUserInteraction(userId, productId, interactionType) {
        try {
            // Update user embeddings based on interaction
            if (!this.userEmbeddings.has(userId)) {
                this.userEmbeddings.set(userId, this.generateRandomEmbedding(50));
            }

            const userEmbedding = this.userEmbeddings.get(userId);
            const productEmbedding = this.productEmbeddings.get(productId);

            if (!productEmbedding) return;

            // Simple update: move user embedding closer to product embedding
            const learningRate = this.getLearningRate(interactionType);
            
            for (let i = 0; i < userEmbedding.length; i++) {
                userEmbedding[i] = userEmbedding[i] * (1 - learningRate) + 
                                 productEmbedding[i] * learningRate;
            }

            this.userEmbeddings.set(userId, userEmbedding);

        } catch (error) {
            console.error('Error recording user interaction:', error);
        }
    }

    getLearningRate(interactionType) {
        const rates = {
            'view': 0.01,
            'add_to_cart': 0.05,
            'purchase': 0.1,
            'rating': 0.08
        };
        
        return rates[interactionType] || 0.01;
    }

    async getModelMetrics() {
        return {
            isTrained: this.isTrained,
            productCount: this.productEmbeddings.size,
            userCount: this.userEmbeddings.size,
            trainingHistory: this.trainingHistory.slice(-10), // Last 10 training sessions
            memoryUsage: process.memoryUsage()
        };
    }

    async shutdown() {
        if (this.model) {
            this.model.dispose();
        }
        console.log('🛑 Product Recommendation Agent shutdown complete');
    }
}

module.exports = ProductRecommender;
