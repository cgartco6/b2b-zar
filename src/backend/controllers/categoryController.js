const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { validationResult } = require('express-validator');

class CategoryController {
    // Get all categories
    async getCategories(req, res) {
        try {
            const { includeProducts = 'false', includeSuppliers = 'false' } = req.query;

            const categories = await Category.find({ status: 'active' })
                .select('name description image productCount supplierCount slug')
                .sort({ name: 1 });

            // Include product and supplier counts if requested
            let enhancedCategories = categories;
            
            if (includeProducts === 'true') {
                enhancedCategories = await Promise.all(
                    categories.map(async (category) => {
                        const products = await Product.find({
                            category: category.name,
                            status: 'active'
                        }).limit(5).select('name images price rating');
                        
                        return {
                            ...category.toObject(),
                            recentProducts: products
                        };
                    })
                );
            }

            if (includeSuppliers === 'true') {
                enhancedCategories = await Promise.all(
                    enhancedCategories.map(async (category) => {
                        const suppliers = await Supplier.find({
                            categories: category.name,
                            status: 'active',
                            isVerified: true
                        }).limit(5).select('businessName logo rating');
                        
                        return {
                            ...category.toObject(),
                            topSuppliers: suppliers
                        };
                    })
                );
            }

            res.json({
                success: true,
                data: enhancedCategories,
                total: categories.length
            });

        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: error.message
            });
        }
    }

    // Get single category
    async getCategory(req, res) {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Increment view count
            category.viewCount += 1;
            await category.save();

            res.json({
                success: true,
                data: category
            });

        } catch (error) {
            console.error('Get category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category',
                error: error.message
            });
        }
    }

    // Get category products
    async getCategoryProducts(req, res) {
        try {
            const { id } = req.params;
            const { 
                page = 1, 
                limit = 20, 
                sortBy = 'rating',
                sortOrder = 'desc',
                minPrice,
                maxPrice,
                supplier,
                bbbeeOnly 
            } = req.query;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Build filter for products
            const filter = {
                category: category.name,
                status: 'active'
            };

            // Price range filter
            if (minPrice || maxPrice) {
                filter.price = {};
                if (minPrice) filter.price.$gte = parseFloat(minPrice);
                if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
            }

            // Supplier filter
            if (supplier) {
                filter.supplierName = supplier;
            }

            // B-BBEE filter
            if (bbbeeOnly === 'true') {
                filter.isBbbeeCompliant = true;
            }

            // Sort configuration
            const sortConfig = {};
            const sortFields = {
                'rating': 'rating.average',
                'price': 'price',
                'name': 'name',
                'date': 'createdAt',
                'popular': 'purchaseCount'
            };
            
            sortConfig[sortFields[sortBy] || 'rating.average'] = sortOrder === 'desc' ? -1 : 1;

            const products = await Product.find(filter)
                .select('name description images price rating supplierName stockQuantity isBbbeeCompliant')
                .populate('supplier', 'businessName bbbeeLevel')
                .sort(sortConfig)
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Product.countDocuments(filter);

            res.json({
                success: true,
                data: products,
                category: category.name,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            });

        } catch (error) {
            console.error('Get category products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category products',
                error: error.message
            });
        }
    }

    // Get category suppliers
    async getCategorySuppliers(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            const suppliers = await Supplier.find({
                categories: category.name,
                status: 'active',
                isVerified: true
            })
            .select('businessName description logo rating address bbbeeLevel productCount')
            .sort({ 'rating.average': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            const total = await Supplier.countDocuments({
                categories: category.name,
                status: 'active',
                isVerified: true
            });

            res.json({
                success: true,
                data: suppliers,
                category: category.name,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            });

        } catch (error) {
            console.error('Get category suppliers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category suppliers',
                error: error.message
            });
        }
    }

    // Get category tree hierarchy
    async getCategoryTree(req, res) {
        try {
            const categories = await Category.find({ status: 'active' })
                .select('name description parentCategory slug productCount level')
                .sort({ level: 1, name: 1 });

            // Build tree structure
            const categoryTree = this.buildCategoryTree(categories);

            res.json({
                success: true,
                data: categoryTree
            });

        } catch (error) {
            console.error('Get category tree error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category tree',
                error: error.message
            });
        }
    }

    // Get trending categories
    async getTrendingCategories(req, res) {
        try {
            const { limit = 10 } = req.query;

            // Get categories with most products and highest view counts
            const trendingCategories = await Category.find({ status: 'active' })
                .select('name description image productCount viewCount slug')
                .sort({ productCount: -1, viewCount: -1 })
                .limit(parseInt(limit));

            res.json({
                success: true,
                data: trendingCategories
            });

        } catch (error) {
            console.error('Get trending categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch trending categories',
                error: error.message
            });
        }
    }

    // Get category analytics
    async getCategoryAnalytics(req, res) {
        try {
            const categories = await Category.find({ status: 'active' });
            
            const analytics = await Promise.all(
                categories.map(async (category) => {
                    const productStats = await Product.aggregate([
                        {
                            $match: { 
                                category: category.name,
                                status: 'active'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalProducts: { $sum: 1 },
                                averagePrice: { $avg: '$price' },
                                totalRevenue: { $sum: { $multiply: ['$price', '$purchaseCount'] } },
                                averageRating: { $avg: '$rating.average' }
                            }
                        }
                    ]);

                    const supplierCount = await Supplier.countDocuments({
                        categories: category.name,
                        status: 'active',
                        isVerified: true
                    });

                    return {
                        category: category.name,
                        productCount: productStats[0]?.totalProducts || 0,
                        supplierCount: supplierCount,
                        averagePrice: productStats[0]?.averagePrice || 0,
                        totalRevenue: productStats[0]?.totalRevenue || 0,
                        averageRating: productStats[0]?.averageRating || 0,
                        viewCount: category.viewCount
                    };
                })
            );

            // Sort by total revenue
            analytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('Get category analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category analytics',
                error: error.message
            });
        }
    }

    // Create new category
    async createCategory(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const categoryData = req.body;

            // Check if category already exists
            const existingCategory = await Category.findOne({ 
                name: categoryData.name,
                status: 'active'
            });
            
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category already exists'
                });
            }

            const category = new Category(categoryData);
            await category.save();

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category
            });

        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create category',
                error: error.message
            });
        }
    }

    // Update category
    async updateCategory(req, res) {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            const updatedCategory = await Category.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            res.json({
                success: true,
                message: 'Category updated successfully',
                data: updatedCategory
            });

        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update category',
                error: error.message
            });
        }
    }

    // Delete category (soft delete)
    async deleteCategory(req, res) {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if category has products
            const productCount = await Product.countDocuments({
                category: category.name,
                status: 'active'
            });

            if (productCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete category with ${productCount} active products`
                });
            }

            // Soft delete
            category.status = 'inactive';
            await category.save();

            res.json({
                success: true,
                message: 'Category deleted successfully'
            });

        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category',
                error: error.message
            });
        }
    }

    // Upload category image
    async uploadCategoryImage(req, res) {
        try {
            const category = await Category.findById(req.params.id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // This would handle file upload in production
            // For now, we'll assume the file URL is provided in the request
            const { imageUrl } = req.body;

            if (imageUrl) {
                category.image = imageUrl;
                await category.save();
            }

            res.json({
                success: true,
                message: 'Category image updated successfully',
                data: category
            });

        } catch (error) {
            console.error('Upload category image error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload category image',
                error: error.message
            });
        }
    }

    // Helper method to build category tree
    buildCategoryTree(categories) {
        const categoryMap = new Map();
        const rootCategories = [];

        // Create a map of all categories
        categories.forEach(category => {
            categoryMap.set(category.name, {
                ...category.toObject(),
                children: []
            });
        });

        // Build tree structure
        categories.forEach(category => {
            const categoryNode = categoryMap.get(category.name);
            
            if (category.parentCategory && categoryMap.has(category.parentCategory)) {
                // Add as child of parent category
                const parentNode = categoryMap.get(category.parentCategory);
                parentNode.children.push(categoryNode);
            } else {
                // Add as root category
                rootCategories.push(categoryNode);
            }
        });

        return rootCategories;
    }
}

module.exports = new CategoryController();
