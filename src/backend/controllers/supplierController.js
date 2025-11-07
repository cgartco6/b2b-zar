const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class SupplierController {
    // Get all suppliers with filtering and pagination
    async getSuppliers(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                category,
                bbbeeLevel,
                location,
                sortBy = 'rating',
                sortOrder = 'desc'
            } = req.query;

            // Build filter object
            const filter = { status: 'active', isVerified: true };
            
            if (category) filter.categories = category;
            if (bbbeeLevel) filter.bbbeeLevel = bbbeeLevel;
            if (location) filter['address.province'] = location;

            // Sort configuration
            const sortConfig = {};
            const sortFields = {
                'rating': 'rating.average',
                'name': 'businessName',
                'date': 'createdAt',
                'bbbee': 'bbbeeLevel'
            };
            
            sortConfig[sortFields[sortBy] || 'rating.average'] = sortOrder === 'desc' ? -1 : 1;

            // Execute query with pagination
            const suppliers = await Supplier.find(filter)
                .select('businessName description logo rating address bbbeeLevel categories productCount isVerified')
                .sort(sortConfig)
                .limit(limit * 1)
                .skip((page - 1) * limit);

            // Get total count for pagination
            const total = await Supplier.countDocuments(filter);

            res.json({
                success: true,
                data: suppliers,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            });

        } catch (error) {
            console.error('Get suppliers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch suppliers',
                error: error.message
            });
        }
    }

    // Get single supplier
    async getSupplier(req, res) {
        try {
            const supplier = await Supplier.findById(req.params.id)
                .populate('userId', 'firstName lastName email phone');

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }

            // Increment view count
            supplier.viewCount += 1;
            await supplier.save();

            res.json({
                success: true,
                data: supplier
            });

        } catch (error) {
            console.error('Get supplier error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier',
                error: error.message
            });
        }
    }

    // Search suppliers
    async searchSuppliers(req, res) {
        try {
            const { q, category, location, bbbeeOnly } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const searchQuery = {
                status: 'active',
                isVerified: true,
                $or: [
                    { businessName: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } },
                    { categories: { $in: [new RegExp(q, 'i')] } }
                ]
            };

            // Apply filters
            if (category) {
                searchQuery.categories = category;
            }

            if (location) {
                searchQuery['address.province'] = location;
            }

            if (bbbeeOnly === 'true') {
                searchQuery.bbbeeLevel = { $ne: 'non-compliant' };
            }

            const suppliers = await Supplier.find(searchQuery)
                .select('businessName description logo rating address bbbeeLevel categories')
                .sort({ 'rating.average': -1 })
                .limit(50);

            res.json({
                success: true,
                data: suppliers,
                query: q,
                filters: { category, location, bbbeeOnly }
            });

        } catch (error) {
            console.error('Search suppliers error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed',
                error: error.message
            });
        }
    }

    // Get supplier products
    async getSupplierProducts(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20, status = 'active' } = req.query;

            const products = await Product.find({
                supplier: id,
                status: status
            })
            .select('name description images price rating category stockQuantity')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            const total = await Product.countDocuments({
                supplier: id,
                status: status
            });

            res.json({
                success: true,
                data: products,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            });

        } catch (error) {
            console.error('Get supplier products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier products',
                error: error.message
            });
        }
    }

    // Get supplier reviews
    async getSupplierReviews(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const supplier = await Supplier.findById(id);
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }

            // In a real implementation, this would query a separate reviews collection
            // For now, we'll return sample data
            const reviews = await this.getSampleReviews(id, page, limit);

            res.json({
                success: true,
                data: reviews,
                averageRating: supplier.rating.average,
                totalReviews: supplier.rating.count
            });

        } catch (error) {
            console.error('Get supplier reviews error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier reviews',
                error: error.message
            });
        }
    }

    // Create new supplier
    async createSupplier(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const supplierData = req.body;

            // Check if user already has a supplier profile
            const existingSupplier = await Supplier.findOne({ userId: req.user.userId });
            if (existingSupplier) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier profile already exists for this user'
                });
            }

            // Create supplier
            const supplier = new Supplier({
                ...supplierData,
                userId: req.user.userId
            });

            await supplier.save();

            // Update user role to supplier
            await User.findByIdAndUpdate(req.user.userId, { 
                role: 'supplier',
                businessName: supplierData.businessName
            });

            res.status(201).json({
                success: true,
                message: 'Supplier profile created successfully',
                data: supplier
            });

        } catch (error) {
            console.error('Create supplier error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create supplier profile',
                error: error.message
            });
        }
    }

    // Update supplier
    async updateSupplier(req, res) {
        try {
            const supplier = await Supplier.findById(req.params.id);
            
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }

            // Check if user owns the supplier or is admin
            if (supplier.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this supplier'
                });
            }

            const updatedSupplier = await Supplier.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            res.json({
                success: true,
                message: 'Supplier profile updated successfully',
                data: updatedSupplier
            });

        } catch (error) {
            console.error('Update supplier error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update supplier profile',
                error: error.message
            });
        }
    }

    // Delete supplier
    async deleteSupplier(req, res) {
        try {
            const supplier = await Supplier.findById(req.params.id);
            
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }

            // Soft delete by setting status to inactive
            supplier.status = 'inactive';
            await supplier.save();

            res.json({
                success: true,
                message: 'Supplier profile deleted successfully'
            });

        } catch (error) {
            console.error('Delete supplier error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete supplier profile',
                error: error.message
            });
        }
    }

    // Verify supplier
    async verifySupplier(req, res) {
        try {
            const supplier = await Supplier.findById(req.params.id);
            
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }

            supplier.isVerified = true;
            supplier.verifiedAt = new Date();
            supplier.verifiedBy = req.user.userId;
            
            await supplier.save();

            res.json({
                success: true,
                message: 'Supplier verified successfully',
                data: supplier
            });

        } catch (error) {
            console.error('Verify supplier error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify supplier',
                error: error.message
            });
        }
    }

    // Upload supplier documents
    async uploadDocuments(req, res) {
        try {
            // This would handle file uploads for supplier documents
            // For now, we'll return a mock response
            res.json({
                success: true,
                message: 'Documents uploaded successfully',
                data: {
                    documents: req.files.map(file => ({
                        name: file.originalname,
                        url: file.path,
                        type: file.mimetype,
                        uploadedAt: new Date()
                    }))
                }
            });

        } catch (error) {
            console.error('Upload documents error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload documents',
                error: error.message
            });
        }
    }

    // Get supplier analytics
    async getSupplierAnalytics(req, res) {
        try {
            const { id } = req.params;
            const supplier = await Supplier.findById(id);
            
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }

            // Check ownership
            if (supplier.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view analytics for this supplier'
                });
            }

            // Get product statistics
            const productStats = await Product.aggregate([
                {
                    $match: { supplier: supplier._id }
                },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        activeProducts: { 
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        outOfStock: {
                            $sum: { $cond: [{ $lte: ['$stockQuantity', 0] }, 1, 0] }
                        },
                        totalRevenue: { $sum: { $multiply: ['$price', '$purchaseCount'] } },
                        averageRating: { $avg: '$rating.average' }
                    }
                }
            ]);

            // Get recent orders (simplified)
            const recentOrders = await this.getRecentSupplierOrders(supplier._id);

            const analytics = {
                overview: {
                    viewCount: supplier.viewCount,
                    productCount: productStats[0]?.totalProducts || 0,
                    activeProducts: productStats[0]?.activeProducts || 0,
                    outOfStock: productStats[0]?.outOfStock || 0,
                    totalRevenue: productStats[0]?.totalRevenue || 0,
                    averageRating: productStats[0]?.averageRating || 0
                },
                performance: {
                    rating: supplier.rating,
                    responseRate: supplier.responseRate || 0,
                    fulfillmentRate: supplier.fulfillmentRate || 0
                },
                recentOrders: recentOrders.slice(0, 10)
            };

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('Get supplier analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier analytics',
                error: error.message
            });
        }
    }

    // Get B-BBEE levels
    async getBbbeeLevels(req, res) {
        try {
            const levels = [
                { level: '1', name: 'Level 1', description: 'Top Contributor' },
                { level: '2', name: 'Level 2', description: 'Outstanding Contributor' },
                { level: '3', name: 'Level 3', description: 'Good Contributor' },
                { level: '4', name: 'Level 4', description: 'Satisfactory Contributor' },
                { level: '5', name: 'Level 5', description: 'Satisfactory Contributor' },
                { level: '6', name: 'Level 6', description: 'Satisfactory Contributor' },
                { level: '7', name: 'Level 7', description: 'Satisfactory Contributor' },
                { level: '8', name: 'Level 8', description: 'Satisfactory Contributor' },
                { level: 'non-compliant', name: 'Non-Compliant', description: 'Not B-BBEE Compliant' }
            ];

            res.json({
                success: true,
                data: levels
            });

        } catch (error) {
            console.error('Get B-BBEE levels error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch B-BBEE levels',
                error: error.message
            });
        }
    }

    // Get B-BBEE certified suppliers
    async getBbbeeCertifiedSuppliers(req, res) {
        try {
            const suppliers = await Supplier.find({
                status: 'active',
                isVerified: true,
                bbbeeLevel: { $ne: 'non-compliant' }
            })
            .select('businessName description logo bbbeeLevel categories rating')
            .sort({ bbbeeLevel: 1, 'rating.average': -1 })
            .limit(50);

            res.json({
                success: true,
                data: suppliers
            });

        } catch (error) {
            console.error('Get B-BBEE certified suppliers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch B-BBEE certified suppliers',
                error: error.message
            });
        }
    }

    // Get local manufacturers
    async getLocalManufacturers(req, res) {
        try {
            const suppliers = await Supplier.find({
                status: 'active',
                isVerified: true,
                isLocalManufacturer: true
            })
            .select('businessName description logo categories rating address')
            .sort({ 'rating.average': -1 })
            .limit(50);

            res.json({
                success: true,
                data: suppliers
            });

        } catch (error) {
            console.error('Get local manufacturers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch local manufacturers',
                error: error.message
            });
        }
    }

    // Get suppliers by category
    async getSuppliersByCategory(req, res) {
        try {
            const { category } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const suppliers = await Supplier.find({
                status: 'active',
                isVerified: true,
                categories: category
            })
            .select('businessName description logo rating categories productCount')
            .sort({ 'rating.average': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            const total = await Supplier.countDocuments({
                status: 'active',
                isVerified: true,
                categories: category
            });

            res.json({
                success: true,
                data: suppliers,
                category,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            });

        } catch (error) {
            console.error('Get suppliers by category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch suppliers by category',
                error: error.message
            });
        }
    }

    // Helper methods
    async getSampleReviews(supplierId, page, limit) {
        // This would query a real reviews collection
        // Returning sample data for demonstration
        return [
            {
                id: '1',
                user: { name: 'Business Buyer', company: 'ABC Corp' },
                rating: 5,
                comment: 'Excellent products and fast delivery. Highly recommended!',
                date: new Date('2024-01-15'),
                orderId: 'ORD-001'
            },
            {
                id: '2',
                user: { name: 'Procurement Manager', company: 'XYZ Ltd' },
                rating: 4,
                comment: 'Good quality products, reasonable pricing. Will order again.',
                date: new Date('2024-01-10'),
                orderId: 'ORD-002'
            }
        ];
    }

    async getRecentSupplierOrders(supplierId) {
        // This would query the orders collection
        // Returning sample data for demonstration
        return [
            {
                orderId: 'ORD-001',
                product: 'Industrial Generator 5000W',
                quantity: 2,
                total: 25000,
                status: 'delivered',
                date: new Date('2024-01-15')
            },
            {
                orderId: 'ORD-002',
                product: 'Safety Gear Pack',
                quantity: 5,
                total: 22500,
                status: 'shipped',
                date: new Date('2024-01-12')
            }
        ];
    }
}

module.exports = new SupplierController();
