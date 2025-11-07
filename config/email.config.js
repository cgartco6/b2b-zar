class EmailConfig {
    constructor() {
        this.config = {
            host: process.env.EMAIL_HOST || 'mail.your-domain.co.za',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER || 'noreply@your-domain.co.za',
                pass: process.env.EMAIL_PASS || ''
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        this.templates = {
            welcome: this.getWelcomeTemplate(),
            order_confirmation: this.getOrderConfirmationTemplate(),
            password_reset: this.getPasswordResetTemplate()
        };
    }

    // Send email using AfriHost's SMTP
    async sendEmail(to, subject, html, text = '') {
        return new Promise((resolve, reject) => {
            // For AfriHost, we'll use PHP mail() function via API endpoint
            const formData = new FormData();
            formData.append('to', to);
            formData.append('subject', subject);
            formData.append('message', html);
            formData.append('from', this.config.auth.user);

            fetch('/mailer.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resolve(data);
                } else {
                    reject(new Error(data.error || 'Email sending failed'));
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    // Send template email
    async sendTemplateEmail(templateName, to, variables) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }

        let subject = template.subject;
        let html = template.html;

        // Replace variables in template
        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            subject = subject.replace(new RegExp(placeholder, 'g'), variables[key]);
            html = html.replace(new RegExp(placeholder, 'g'), variables[key]);
        });

        return this.sendEmail(to, subject, html);
    }

    // Welcome email template
    getWelcomeTemplate() {
        return {
            subject: 'Welcome to B2B ZAR Marketplace',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to B2B ZAR Marketplace</h1>
        </div>
        <div class="content">
            <h2>Hello {{name}}!</h2>
            <p>Welcome to South Africa's premier B2B e-commerce platform.</p>
            <p>Your business account has been successfully created.</p>
            <p><strong>Business:</strong> {{businessName}}</p>
            <p>You can now:</p>
            <ul>
                <li>Browse thousands of products from verified suppliers</li>
                <li>Connect with B-BBEE compliant businesses</li>
                <li>Manage your procurement efficiently</li>
                <li>Track orders and payments securely</li>
            </ul>
            <p><a href="https://your-domain.co.za/dashboard" style="background: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Your Dashboard</a></p>
        </div>
        <div class="footer">
            <p>B2B ZAR Marketplace &copy; 2024. All rights reserved.</p>
            <p>Need help? Contact support@your-domain.co.za</p>
        </div>
    </div>
</body>
</html>
            `
        };
    }

    // Order confirmation template
    getOrderConfirmationTemplate() {
        return {
            subject: 'Order Confirmation - {{orderNumber}}',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e8449; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .order-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed</h1>
        </div>
        <div class="content">
            <h2>Thank you for your order, {{customerName}}!</h2>
            <p>Your order <strong>#{{orderNumber}}</strong> has been confirmed and is being processed.</p>
            
            <div class="order-details">
                <h3>Order Summary</h3>
                <p><strong>Order Total:</strong> ZAR {{orderTotal}}</p>
                <p><strong>Items:</strong> {{itemCount}}</p>
                <p><strong>Estimated Delivery:</strong> {{deliveryDate}}</p>
            </div>
            
            <p>You can track your order status in your dashboard.</p>
            <p><a href="https://your-domain.co.za/orders/{{orderNumber}}" style="background: #1e8449; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order Details</a></p>
        </div>
        <div class="footer">
            <p>B2B ZAR Marketplace &copy; 2024</p>
            <p>For questions about your order, contact orders@your-domain.co.za</p>
        </div>
    </div>
</body>
</html>
            `
        };
    }

    // Password reset template
    getPasswordResetTemplate() {
        return {
            subject: 'Password Reset Request',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <h2>Hello {{name}},</h2>
            <p>We received a request to reset your password for your B2B ZAR Marketplace account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{{resetLink}}" style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>B2B ZAR Marketplace &copy; 2024</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
            `
        };
    }

    // Test email configuration
    async testConfiguration() {
        try {
            await this.sendEmail(
                this.config.auth.user,
                'Test Email Configuration',
                '<p>This is a test email from B2B ZAR Marketplace.</p>'
            );
            return true;
        } catch (error) {
            console.error('Email configuration test failed:', error);
            return false;
        }
    }
}

module.exports = new EmailConfig();
