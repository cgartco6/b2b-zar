-- B2B ZAR Marketplace Database Setup for AfriHost MySQL
SET FOREIGN_KEY_CHECKS = 0;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'supplier', 'admin') DEFAULT 'customer',
    
    -- Business Information
    business_name VARCHAR(255),
    business_type ENUM('sole_proprietor', 'pty_ltd', 'cc', 'partnership', 'other'),
    registration_number VARCHAR(100),
    vat_number VARCHAR(20),
    bbbee_level ENUM('1', '2', '3', '4', '5', '6', '7', '8', 'non-compliant') DEFAULT 'non-compliant',
    
    -- Address
    street VARCHAR(255),
    city VARCHAR(100),
    province ENUM(
        'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
        'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
    ),
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'South Africa',
    
    -- Verification
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_business_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    
    -- Preferences
    newsletter_subscribed BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    
    -- Security
    login_attempts INT DEFAULT 0,
    lock_until DATETIME,
    last_login DATETIME,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_business (business_name),
    INDEX idx_role (role),
    INDEX idx_created (created_at)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    image_url VARCHAR(255),
    parent_id INT,
    level INT DEFAULT 1,
    product_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id),
    INDEX idx_status (status)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    vat_rate DECIMAL(5,2) DEFAULT 15.00,
    
    -- Inventory
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    stock_quantity INT DEFAULT 0,
    low_stock_alert INT DEFAULT 10,
    track_quantity BOOLEAN DEFAULT TRUE,
    allow_backorders BOOLEAN DEFAULT FALSE,
    
    -- Categorization
    category_id INT NOT NULL,
    subcategory VARCHAR(100),
    
    -- Supplier
    supplier_id INT NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(100) NOT NULL,
    
    -- Compliance
    is_bbbee_compliant BOOLEAN DEFAULT FALSE,
    is_local_product BOOLEAN DEFAULT TRUE,
    
    -- Shipping
    weight_value DECIMAL(8,2),
    weight_unit ENUM('g', 'kg') DEFAULT 'kg',
    length DECIMAL(8,2),
    width DECIMAL(8,2),
    height DECIMAL(8,2),
    dimensions_unit ENUM('cm', 'm') DEFAULT 'cm',
    is_shipping_required BOOLEAN DEFAULT TRUE,
    shipping_class ENUM('standard', 'express', 'bulk', 'fragile') DEFAULT 'standard',
    
    -- SEO
    seo_title VARCHAR(200),
    seo_description VARCHAR(500),
    slug VARCHAR(200) UNIQUE NOT NULL,
    
    -- Ratings
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    rating_1 INT DEFAULT 0,
    rating_2 INT DEFAULT 0,
    rating_3 INT DEFAULT 0,
    rating_4 INT DEFAULT 0,
    rating_5 INT DEFAULT 0,
    
    -- Analytics
    view_count INT DEFAULT 0,
    purchase_count INT DEFAULT 0,
    wishlist_count INT DEFAULT 0,
    
    -- Status
    status ENUM('draft', 'active', 'inactive', 'out_of_stock', 'discontinued') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES users(id),
    
    INDEX idx_category (category_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_slug (slug),
    INDEX idx_price (price),
    INDEX idx_rating (average_rating),
    INDEX idx_featured (is_featured),
    FULLTEXT idx_search (name, description, short_description)
);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(200),
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_primary (is_primary)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer
    customer_id INT NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Billing Address
    billing_first_name VARCHAR(50),
    billing_last_name VARCHAR(50),
    billing_company VARCHAR(255),
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_province VARCHAR(50),
    billing_postal_code VARCHAR(10),
    billing_country VARCHAR(50) DEFAULT 'South Africa',
    billing_vat_number VARCHAR(20),
    
    -- Shipping Address
    shipping_first_name VARCHAR(50),
    shipping_last_name VARCHAR(50),
    shipping_company VARCHAR(255),
    shipping_street VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_province VARCHAR(50),
    shipping_postal_code VARCHAR(10),
    shipping_country VARCHAR(50) DEFAULT 'South Africa',
    shipping_instructions TEXT,
    
    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    vat_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Shipping
    shipping_method ENUM('standard', 'express', 'overnight', 'bulk') DEFAULT 'standard',
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(255),
    estimated_delivery DATE,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    
    -- Payment
    payment_method ENUM('payfast', 'yoco', 'ozow', 'eft', 'credit_card') NOT NULL,
    payment_status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_gateway VARCHAR(50),
    paid_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Order Status
    status ENUM(
        'pending', 'confirmed', 'processing', 'ready_for_shipment',
        'shipped', 'delivered', 'cancelled', 'returned', 'refunded'
    ) DEFAULT 'pending',
    
    -- Compliance
    tax_invoice_number VARCHAR(100),
    bbbee_points INT DEFAULT 0,
    is_bbbee_transaction BOOLEAN DEFAULT FALSE,
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (customer_id) REFERENCES users(id),
    
    INDEX idx_customer (customer_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created (created_at)
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    supplier_id INT NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 15.00,
    total_price DECIMAL(10,2) NOT NULL,
    
    weight DECIMAL(8,2),
    length DECIMAL(8,2),
    width DECIMAL(8,2),
    height DECIMAL(8,2),
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES users(id),
    
    INDEX idx_order (order_id),
    INDEX idx_product (product_id),
    INDEX idx_supplier (supplier_id)
);

-- Shopping Cart Table
CREATE TABLE IF NOT EXISTS carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    discount_code VARCHAR(50),
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_type ENUM('percentage', 'fixed') DEFAULT 'fixed',
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    shipping_method VARCHAR(50) DEFAULT 'standard',
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    
    INDEX idx_cart (cart_id),
    INDEX idx_product (product_id)
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INT,
    user_context JSON,
    status ENUM('active', 'closed', 'escalated', 'archived') DEFAULT 'active',
    title VARCHAR(200),
    summary TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    country VARCHAR(50),
    region VARCHAR(50),
    city VARCHAR(50),
    referral_source VARCHAR(100),
    initial_query TEXT,
    
    -- Analytics
    message_count INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    average_response_time DECIMAL(8,2) DEFAULT 0.00,
    user_satisfaction DECIMAL(3,2) DEFAULT 0.00,
    escalation_count INT DEFAULT 0,
    
    tags JSON,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    assigned_to INT,
    
    closed_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    
    INDEX idx_session (session_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    message_id VARCHAR(100) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    
    -- Metadata
    tokens INT DEFAULT 0,
    response_time DECIMAL(8,2) DEFAULT 0.00,
    user_rating INT,
    user_feedback TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    
    INDEX idx_session (session_id),
    INDEX idx_created (created_at),
    INDEX idx_role (role)
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('error', 'warn', 'info', 'debug') DEFAULT 'info',
    message TEXT NOT NULL,
    context JSON,
    ip_address VARCHAR(45),
    user_id INT,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_level (level),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id)
);

-- Insert initial data
INSERT IGNORE INTO categories (name, description, slug, level) VALUES
('Industrial Equipment', 'Heavy machinery and industrial tools', 'industrial-equipment', 1),
('Office Supplies', 'Office furniture and stationery', 'office-supplies', 1),
('Safety Gear', 'Personal protective equipment', 'safety-gear', 1),
('Construction Materials', 'Building and construction supplies', 'construction-materials', 1),
('Electrical Supplies', 'Electrical components and tools', 'electrical-supplies', 1);

-- Insert default email templates
INSERT IGNORE INTO email_templates (name, subject, content, variables) VALUES
('welcome', 'Welcome to B2B ZAR Marketplace', '<p>Dear {{name}},</p><p>Welcome to South Africa''s premier B2B marketplace!</p>', '["name", "businessName"]'),
('order_confirmation', 'Order Confirmation - {{orderNumber}}', '<p>Dear {{customerName}},</p><p>Your order has been confirmed.</p>', '["orderNumber", "customerName", "orderTotal"]');

SET FOREIGN_KEY_CHECKS = 1;
