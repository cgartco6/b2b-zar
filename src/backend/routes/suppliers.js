const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');

// Public routes
router.get('/', supplierController.getSuppliers);
router.get('/search', supplierController.searchSuppliers);
router.get('/:id', supplierController.getSupplier);
router.get('/:id/products', supplierController.getSupplierProducts);
router.get('/:id/reviews', supplierController.getSupplierReviews);

// Protected routes - supplier management
router.post('/',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    validationMiddleware.validateSupplier,
    supplierController.createSupplier
);

router.put('/:id',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin', 'supplier']),
    supplierController.updateSupplier
);

router.delete('/:id',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    supplierController.deleteSupplier
);

// Supplier verification routes
router.post('/:id/verify',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['admin']),
    supplierController.verifySupplier
);

router.post('/:id/documents',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['supplier', 'admin']),
    supplierController.uploadDocuments
);

// Supplier analytics
router.get('/:id/analytics',
    authMiddleware.verifyToken,
    authMiddleware.requireRole(['supplier', 'admin']),
    supplierController.getSupplierAnalytics
);

// B-BBEE compliance routes
router.get('/bbbee/levels', supplierController.getBbbeeLevels);
router.get('/bbbee/certified', supplierController.getBbbeeCertifiedSuppliers);

// Local suppliers
router.get('/local/manufacturers', supplierController.getLocalManufacturers);

// Supplier categories
router.get('/categories/:category', supplierController.getSuppliersByCategory);

module.exports = router;
