const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadMiddleware {
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads');
        this.createUploadDirectories();
    }

    createUploadDirectories() {
        const directories = [
            'products',
            'suppliers',
            'categories',
            'documents',
            'users'
        ];

        directories.forEach(dir => {
            const dirPath = path.join(this.uploadDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    // Configure storage for different file types
    getStorage(directory) {
        return multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(this.uploadDir, directory);
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                // Generate unique filename
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const extension = path.extname(file.originalname);
                const filename = file.fieldname + '-' + uniqueSuffix + extension;
                cb(null, filename);
            }
        });
    }

    // File filter for images
    imageFilter(req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }

    // File filter for documents
    documentFilter(req, file, cb) {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, and PNG files are allowed!'), false);
        }
    }

    // Multer configuration for product images
    getProductImageUpload() {
        return multer({
            storage: this.getStorage('products'),
            fileFilter: this.imageFilter,
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
                files: 10 // Maximum 10 files
            }
        });
    }

    // Multer configuration for supplier documents
    getSupplierDocumentUpload() {
        return multer({
            storage: this.getStorage('suppliers'),
            fileFilter: this.documentFilter,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 5 // Maximum 5 files
            }
        });
    }

    // Multer configuration for category images
    getCategoryImageUpload() {
        return multer({
            storage: this.getStorage('categories'),
            fileFilter: this.imageFilter,
            limits: {
                fileSize: 2 * 1024 * 1024, // 2MB limit
                files: 1 // Single file
            }
        });
    }

    // Multer configuration for user avatars
    getUserAvatarUpload() {
        return multer({
            storage: this.getStorage('users'),
            fileFilter: this.imageFilter,
            limits: {
                fileSize: 1 * 1024 * 1024, // 1MB limit
                files: 1 // Single file
            }
        });
    }

    // Multer configuration for general documents
    getGeneralDocumentUpload() {
        return multer({
            storage: this.getStorage('documents'),
            fileFilter: this.documentFilter,
            limits: {
                fileSize: 20 * 1024 * 1024, // 20MB limit
                files: 1 // Single file
            }
        });
    }

    // Middleware to handle single file upload
    handleSingleUpload(fieldName, uploadType = 'productImage') {
        const upload = this.getUploadByType(uploadType);
        return upload.single(fieldName);
    }

    // Middleware to handle multiple file upload
    handleMultipleUpload(fieldName, uploadType = 'productImage', maxCount = 10) {
        const upload = this.getUploadByType(uploadType);
        return upload.array(fieldName, maxCount);
    }

    // Middleware to handle mixed file uploads
    handleMixedUpload(fields, uploadType = 'productImage') {
        const upload = this.getUploadByType(uploadType);
        return upload.fields(fields);
    }

    // Get upload configuration by type
    getUploadByType(uploadType) {
        switch (uploadType) {
            case 'productImage':
                return this.getProductImageUpload();
            case 'supplierDocument':
                return this.getSupplierDocumentUpload();
            case 'categoryImage':
                return this.getCategoryImageUpload();
            case 'userAvatar':
                return this.getUserAvatarUpload();
            case 'generalDocument':
                return this.getGeneralDocumentUpload();
            default:
                return this.getProductImageUpload();
        }
    }

    // Error handling middleware
    handleUploadError(error, req, res, next) {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size too large. Please upload a smaller file.'
                });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Please upload fewer files.'
                });
            }
            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected file field.'
                });
            }
        }

        if (error.message.includes('Only image files')) {
            return res.status(400).json({
                success: false,
                message: 'Only image files are allowed!'
            });
        }

        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Please upload supported file formats.'
            });
        }

        // Generic error
        return res.status(500).json({
            success: false,
            message: 'File upload failed.',
            error: error.message
        });
    }

    // Middleware to process uploaded files and add to request
    processUploadedFiles(req, res, next) {
        if (!req.files && !req.file) {
            return next();
        }

        try {
            const processedFiles = {};

            if (req.file) {
                // Single file upload
                processedFiles.single = this.processFile(req.file);
            }

            if (req.files) {
                // Multiple files or mixed upload
                if (Array.isArray(req.files)) {
                    processedFiles.multiple = req.files.map(file => this.processFile(file));
                } else {
                    // Mixed upload (fields)
                    Object.keys(req.files).forEach(fieldName => {
                        processedFiles[fieldName] = req.files[fieldName].map(file => 
                            this.processFile(file)
                        );
                    });
                }
            }

            req.processedFiles = processedFiles;
            next();

        } catch (error) {
            next(error);
        }
    }

    // Process individual file and extract useful information
    processFile(file) {
        return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            encoding: file.encoding,
            destination: file.destination,
            url: this.generateFileUrl(file.path),
            uploadedAt: new Date()
        };
    }

    // Generate public URL for uploaded file
    generateFileUrl(filePath) {
        const relativePath = path.relative(this.uploadDir, filePath);
        return `/uploads/${relativePath.replace(/\\/g, '/')}`;
    }

    // Cleanup uploaded files on error
    cleanupFiles(files) {
        if (!files) return;

        const fileList = Array.isArray(files) ? files : Object.values(files).flat();

        fileList.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (error) {
                    console.error('Failed to delete file:', file.path, error);
                }
            }
        });
    }

    // Middleware to cleanup files on request error
    cleanupOnError(req, res, next) {
        const originalSend = res.send;

        res.send = function(data) {
            // If response indicates error, cleanup uploaded files
            if (res.statusCode >= 400 && req.processedFiles) {
                const uploadMiddleware = new UploadMiddleware();
                uploadMiddleware.cleanupFiles(req.processedFiles);
            }

            originalSend.call(this, data);
        };

        next();
    }

    // Validate file dimensions for images
    async validateImageDimensions(filePath, minWidth = 100, minHeight = 100) {
        try {
            const sharp = require('sharp');
            const metadata = await sharp(filePath).metadata();
            
            return metadata.width >= minWidth && metadata.height >= minHeight;
        } catch (error) {
            console.error('Error validating image dimensions:', error);
            return false;
        }
    }

    // Compress image file
    async compressImage(filePath, quality = 80) {
        try {
            const sharp = require('sharp');
            const compressedPath = filePath.replace(/(\.\w+)$/, '_compressed$1');
            
            await sharp(filePath)
                .jpeg({ quality: quality })
                .toFile(compressedPath);

            // Replace original with compressed version
            fs.unlinkSync(filePath);
            fs.renameSync(compressedPath, filePath);

            return true;
        } catch (error) {
            console.error('Error compressing image:', error);
            return false;
        }
    }

    // Generate thumbnail for image
    async generateThumbnail(filePath, width = 200, height = 200) {
        try {
            const sharp = require('sharp');
            const thumbnailPath = filePath.replace(/(\.\w+)$/, '_thumb$1');
            
            await sharp(filePath)
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 70 })
                .toFile(thumbnailPath);

            return thumbnailPath;
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return null;
        }
    }

    // Extract text from PDF (for document processing)
    async extractTextFromPDF(filePath) {
        try {
            // This would use a PDF parsing library like pdf-parse
            // For now, return empty string
            return '';
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            return '';
        }
    }

    // Scan file for viruses (placeholder - would integrate with antivirus service)
    async scanForViruses(filePath) {
        try {
            // In production, this would integrate with ClamAV or similar
            // For now, return true (clean)
            return true;
        } catch (error) {
            console.error('Error scanning file for viruses:', error);
            return false;
        }
    }
}

module.exports = new UploadMiddleware();
