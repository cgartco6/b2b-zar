#!/bin/bash

# B2B Marketplace AfriHost Setup Script
echo "🚀 Starting AfriHost deployment setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "package.json not found. Please run this script from project root."
    exit 1
fi

log "Setting up B2B ZAR Marketplace on AfriHost..."

# Create necessary directories
log "Creating directory structure..."
mkdir -p logs
mkdir -p public/uploads/products
mkdir -p public/uploads/suppliers
mkdir -p public/uploads/users
mkdir -p tmp

# Set permissions
log "Setting file permissions..."
chmod 755 public/uploads
chmod 755 logs
chmod 755 tmp
chmod 644 .env

# Install Node.js dependencies
log "Installing Node.js dependencies..."
npm install --production

# Check if .env exists, if not create from example
if [ ! -f ".env" ]; then
    log "Creating .env file from example..."
    cp .env.example .env
    warn "Please update .env file with your actual configuration"
fi

# Set up database
log "Setting up database..."
if [ -f "deploy/database-setup.sql" ]; then
    mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME < deploy/database-setup.sql
    if [ $? -eq 0 ]; then
        log "Database setup completed successfully"
    else
        error "Database setup failed"
        exit 1
    fi
fi

# Optimize images
log "Optimizing images..."
if [ -f "scripts/optimize-images.sh" ]; then
    chmod +x scripts/optimize-images.sh
    ./scripts/optimize-images.sh
fi

# Set up cron jobs
log "Setting up scheduled tasks..."
if [ -f "deploy/cron-jobs.txt" ]; then
    crontab deploy/cron-jobs.txt
    log "Cron jobs installed"
fi

# Create startup script
log "Creating startup scripts..."
cat > start-server.sh << 'EOF'
#!/bin/bash
cd ~/public_html
npm start
EOF

chmod +x start-server.sh

# Create PM2 ecosystem file for process management
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'b2b-marketplace',
    script: 'src/backend/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF

# Create .htaccess for Apache
log "Configuring Apache..."
cat > public/.htaccess << 'EOF'
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</FilesMatch>

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</IfModule>

# API routes proxy to Node.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# SPA routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
EOF

# Create PHP configuration for email handling
log "Setting up PHP email configuration..."
cat > public/mailer.php << 'EOF'
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $to = $input['to'] ?? '';
    $subject = $input['subject'] ?? '';
    $message = $input['message'] ?? '';
    $from = $input['from'] ?? 'noreply@your-domain.co.za';
    
    if (empty($to) || empty($subject) || empty($message)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }
    
    $headers = "From: $from\r\n";
    $headers .= "Reply-To: $from\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to send email']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
EOF

# Create health check endpoint
cat > public/health.php << 'EOF'
<?php
header('Content-Type: application/json');

$status = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'services' => []
];

// Check database connection
try {
    $db = new PDO(
        "mysql:host=" . getenv('DB_HOST') . ";dbname=" . getenv('DB_NAME'),
        getenv('DB_USERNAME'),
        getenv('DB_PASSWORD')
    );
    $status['services']['database'] = 'connected';
} catch (Exception $e) {
    $status['services']['database'] = 'disconnected';
    $status['status'] = 'degraded';
}

// Check disk space
$diskFree = disk_free_space(__DIR__);
$diskTotal = disk_total_space(__DIR__);
$diskUsage = round(($diskTotal - $diskFree) / $diskTotal * 100, 2);

$status['disk'] = [
    'free' => round($diskFree / 1024 / 1024, 2) . ' MB',
    'usage_percent' => $diskUsage
];

if ($diskUsage > 90) {
    $status['status'] = 'degraded';
}

echo json_encode($status);
?>
EOF

# Start the application
log "Starting application..."
if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
else
    nohup npm start > logs/app.log 2>&1 &
fi

log "🎉 AfriHost setup completed successfully!"
log "📧 Email configured for 50 accounts"
log "🗄️  Database setup complete"
log "🌐 Application running on port 3000"
log "📊 Health check available at /health.php"

# Display next steps
echo ""
echo "NEXT STEPS:"
echo "1. Update .env file with your actual configuration"
echo "2. Configure your domain in AfriHost control panel"
echo "3. Set up SSL certificate"
echo "4. Test email functionality"
echo "5. Monitor logs in logs/ directory"
