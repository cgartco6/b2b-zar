const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.get('/:id/products', categoryController.getCategoryProducts);
router.get('/:id/suppliers', categoryController.getCategorySuppliers);

// Category tree
router.get('/tree/hierarchy', categoryController.getCategoryTree);

// Popular categories
router.get('/popular/trending', categoryController.getTrendingCategories);

// Category analytics
router.get('/analytics/overview', categoryController.getCategoryAnalytics);

// Protected routes - admin only
router.post('/',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    categoryController.createCategory
);

router.put('/:id',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    categoryController.updateCategory
);

router.delete('/:id',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    categoryController.deleteCategory
);

// Category images
router.post('/:id/image',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    categoryController.uploadCategoryImage
);

module.exports = router;
