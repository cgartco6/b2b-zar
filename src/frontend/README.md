# B2B ZAR Marketplace - AfriHost Deployment

South Africa's Premier B2B E-commerce Platform optimized for AfriHost hosting.

## 🚀 Quick Deployment

### Prerequisites
- AfriHost Shared Hosting Package (2GB space, 50 emails, SQL database)
- Domain name configured with AfriHost
- SSH/FTP access to your hosting account

### Step 1: Repository Setup
1. Fork this repository
2. Add your AfriHost credentials to GitHub Secrets:
   - `AFRIHOST_FTP_SERVER`, `AFRIHOST_FTP_USERNAME`, `AFRIHOST_FTP_PASSWORD`
   - `AFRIHOST_SSH_HOST`, `AFRIHOST_SSH_USERNAME`, `AFRIHOST_SSH_KEY`
   - `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
   - `DOMAIN_NAME`, `JWT_SECRET`, `EMAIL_*` settings

### Step 2: Automated Deployment
1. Push to `main` branch triggers automatic deployment
2. Manual deployment: Go to Actions → Deploy to AfriHost → Run workflow

### Step 3: Post-Deployment Setup
1. Update `.env` file with your actual configuration
2. Configure domain in AfriHost control panel
3. Set up SSL certificate
4. Test email functionality

## 📋 AfriHost Configuration

### Database Setup
1. Create MySQL database in AfriHost control panel
2. Update database credentials in `.env`
3. Tables are automatically created during deployment

### Email Configuration
- 50 email accounts available
- SMTP: `mail.your-domain.co.za`
- Port: 587 (TLS) or 465 (SSL)

### File Structure on AfriHost
