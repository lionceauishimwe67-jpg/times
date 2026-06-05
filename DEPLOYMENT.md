# Deployment Guide - School Timetable System

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- A server (Windows/Linux/Mac)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd time
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration (SQLite)
DB_PATH=./database.sqlite

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# Server Configuration
PORT=5000
NODE_ENV=production

# Client URL (for CORS)
CLIENT_URL=http://your-domain.com

# Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# SMS Notification Configuration
SMS_PROVIDER=mock
SMS_SENDER_ID=SCHOOL

# AfricasTalking Configuration (for Rwanda)
AFRICASTALKING_API_KEY=your_africastalking_api_key
AFRICASTALKING_USERNAME=your_africastalking_username
```

## Build Process

### 1. Build Frontend

```bash
cd frontend
npm run build
```

This creates a `build` directory with optimized production files.

### 2. Build Backend

```bash
cd ../backend
npm run build
```

This compiles TypeScript to JavaScript in the `dist` directory.

## Database Initialization

The database is automatically initialized on first run. However, you can manually initialize it:

```bash
cd backend
npm run init-db
```

## Running in Production

### Option 1: Direct Node.js

```bash
cd backend
npm start
```

### Option 2: Using PM2 (Recommended for Production)

Install PM2 globally:

```bash
npm install -g pm2
```

Start the application:

```bash
cd backend
pm2 start dist/server.js --name school-timetable
pm2 save
pm2 startup
```

### Option 3: Using systemd (Linux)

Create a service file `/etc/systemd/system/school-timetable.service`:

```ini
[Unit]
Description=School Timetable System
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/time/backend
ExecStart=/usr/bin/node /path/to/time/backend/dist/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable school-timetable
sudo systemctl start school-timetable
sudo systemctl status school-timetable
```

## Reverse Proxy (Optional but Recommended)

### Using Nginx

Create an Nginx configuration file:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        alias /path/to/time/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/school-timetable /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/HTTPS (Recommended)

### Using Let's Encrypt with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Common Issues and Solutions

### Issue 1: Database Path Error

**Problem**: Database file not found or path issues

**Solution**: Ensure the `DB_PATH` in `.env` is correct. Use absolute path for production:

```env
DB_PATH=/path/to/time/backend/database.sqlite
```

### Issue 2: Port Already in Use

**Problem**: Port 5000 is already in use

**Solution**: Change the port in `.env`:

```env
PORT=3000
```

### Issue 3: Frontend Not Loading

**Problem**: Frontend static files not served

**Solution**: Ensure you built the frontend:

```bash
cd frontend
npm run build
```

### Issue 4: CORS Errors

**Problem**: CORS errors in browser console

**Solution**: Update `CLIENT_URL` in `.env` to match your domain:

```env
CLIENT_URL=http://your-domain.com
```

### Issue 5: Upload Directory Permission

**Problem**: Cannot upload files

**Solution**: Ensure the `uploads` directory has write permissions:

```bash
chmod -R 755 backend/uploads
```

## Monitoring

### Check Logs

Using PM2:

```bash
pm2 logs school-timetable
```

Using systemd:

```bash
sudo journalctl -u school-timetable -f
```

### Health Check

Access the health endpoint:

```bash
curl http://localhost:5000/health
```

## Backup

### Database Backup

```bash
cp backend/database.sqlite backups/database-$(date +%Y%m%d).sqlite
```

### Automated Backup Script

Create a backup script:

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d)
mkdir -p $BACKUP_DIR
cp /path/to/time/backend/database.sqlite $BACKUP_DIR/database-$DATE.sqlite
# Keep only last 7 days
find $BACKUP_DIR -name "database-*.sqlite" -mtime +7 -delete
```

Add to crontab for daily backup:

```bash
crontab -e
# Add this line for daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Security Recommendations

1. **Change JWT Secret**: Use a strong, random JWT secret in production
2. **Use HTTPS**: Always use SSL/TLS in production
3. **Firewall**: Configure firewall to only allow necessary ports
4. **Regular Updates**: Keep Node.js and dependencies updated
5. **Database Security**: Ensure database file has proper permissions
6. **Environment Variables**: Never commit `.env` file to version control

## Performance Optimization

1. **Enable Compression**: Already configured with `compression` middleware
2. **Static File Caching**: Configure CDN for static assets
3. **Database Indexing**: Already configured in database schema
4. **Load Balancing**: Use Nginx load balancing for multiple instances

## Support

For issues or questions:
- Check the logs for error messages
- Review the health endpoint status
- Ensure all dependencies are installed
- Verify environment variables are correct
