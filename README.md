# DMS (Document Management System)

A comprehensive document management system with OCR capabilities, user management, and company-based document organization.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **MySQL**: 8.0 or higher

## 🛠️ Backend Installation

### 1. Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Python and pip
```bash
sudo apt install python3 python3-pip python3-venv -y
```

### 3. Install MySQL Server
```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 4. Secure MySQL Installation
```bash
sudo mysql_secure_installation
```

### 5. Create MySQL Database and User
```bash
sudo mysql -u root -p
```

In MySQL prompt:
```sql
CREATE DATABASE dms_db;
CREATE USER 'dms_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON dms_db.* TO 'dms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6. Install System Dependencies
```bash
# Install required system packages
sudo apt install -y \
    build-essential \
    python3-dev \
    libmysqlclient-dev \
    pkg-config \
    libssl-dev \
    libffi-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libwebp-dev \
    libopenjp2-7-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libgdk-pixbuf2.0-dev \
    libgtk-3-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libatlas-base-dev \
    gfortran \
    libhdf5-dev \
    libhdf5-serial-dev \
    libhdf5-103 \
    libqtgui4 \
    libqtwebkit4 \
    libqt4-test \
    python3-pyqt5 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgtk-3-0 \
    libavcodec-extra \
    libavformat-extra \
    libswscale-extra \
    libv4l-0 \
    libxvidcore4 \
    libx264-155 \
    libjpeg-turbo8 \
    libpng16-16 \
    libtiff5 \
    libatlas-base-dev \
    gfortran \
    libhdf5-dev \
    libhdf5-serial-dev \
    libhdf5-103 \
    libqtgui4 \
    libqtwebkit4 \
    libqt4-test \
    python3-pyqt5
```

### 7. Navigate to Backend Directory
```bash
cd dms-backend
```

### 8. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 9. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

If requirements.txt doesn't exist, install these packages:
```bash
pip install \
    flask==2.3.3 \
    flask-cors==4.0.0 \
    flask-jwt-extended==4.5.3 \
    mysql-connector-python==8.1.0 \
    python-dotenv==1.0.0 \
    werkzeug==2.3.7 \
    pillow==10.0.1 \
    opencv-python==4.8.1.78 \
    pytesseract==0.3.10 \
    pdf2image==1.16.3 \
    PyPDF2==3.0.1 \
    reportlab==4.0.4 \
    numpy==1.24.3 \
    pandas==2.0.3 \
    python-dateutil==2.8.2 \
    requests==2.31.0 \
    bcrypt==4.0.1 \
    cryptography==41.0.4 \
    email-validator==2.0.0
```

### 10. Install Tesseract OCR
```bash
sudo apt install tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng -y
```

### 11. Install Poppler (for PDF processing)
```bash
sudo apt install poppler-utils -y
```

### 12. Configure Environment Variables
Create `.env` file in backend directory:
```bash
cp .env.example .env
# or create manually
nano .env
```

Add the following content:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=dms_user
DB_PASSWORD=your_secure_password
DB_NAME=dms_db

# JWT Configuration
JWT_SECRET_KEY=your_super_secret_jwt_key_here
JWT_ACCESS_TOKEN_EXPIRES=3600

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True

# System Configuration
SYSTEM_ENABLED=true

# File Upload Configuration
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads
ALLOWED_EXTENSIONS=pdf,png,jpg,jpeg,tiff,bmp

# OCR Configuration
TESSERACT_CMD=/usr/bin/tesseract
```

### 13. Initialize Database
```bash
python3 -c "from db import DatabaseManager; db = DatabaseManager(); db.init_database()"
```

### 14. Test Backend Installation
```bash
python3 app.py
```

The backend should start on `http://localhost:5000`

## 🎨 Frontend Installation

### 1. Install Node.js and npm
```bash
# Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Yarn (optional)
```bash
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update
sudo apt install yarn -y
```

### 3. Navigate to Frontend Directory
```bash
cd dms-frontend
```

### 4. Install Dependencies
```bash
npm install
# or with yarn
yarn install
```

### 5. Configure Environment Variables
Create `.env` file in frontend directory:
```bash
cp .env.example .env
# or create manually
nano .env
```

Add the following content:
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000

# Production Logs Configuration
REACT_APP_PRODUCTION_LOGS=false

# Environment
REACT_APP_ENVIRONMENT=development
```

### 6. Start Development Server
```bash
npm start
# or with yarn
yarn start
```

The frontend should start on `http://localhost:3000`

## 🔧 Development Setup

### 1. Install Development Tools
```bash
# Install Git
sudo apt install git -y

# Install VS Code (optional)
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code -y
```

### 2. Install Additional Development Dependencies
```bash
# Backend development tools
pip install \
    black==23.7.0 \
    flake8==6.0.0 \
    pytest==7.4.0 \
    pytest-cov==4.1.0

# Frontend development tools
npm install -g \
    eslint \
    prettier \
    @typescript-eslint/eslint-plugin \
    @typescript-eslint/parser
```

## 🚀 Production Deployment

### 1. Backend Production Setup
```bash
# Install Gunicorn
pip install gunicorn

# Create systemd service
sudo nano /etc/systemd/system/dms-backend.service
```

Add the following content:
```ini
[Unit]
Description=DMS Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/your/dms-backend
Environment="PATH=/path/to/your/dms-backend/venv/bin"
ExecStart=/path/to/your/dms-backend/venv/bin/gunicorn --workers 3 --bind unix:dms-backend.sock -m 007 app:app

[Install]
WantedBy=multi-user.target
```

### 2. Frontend Production Build
```bash
# Build for production
npm run build
# or with yarn
yarn build
```

### 3. Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/dms
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/your/dms-frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://unix:/path/to/your/dms-backend/dms-backend.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dms /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## 🔗 Useful Links

### Documentation
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://reactjs.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Nginx Documentation](https://nginx.org/en/docs/)

### Tools and Libraries
- [Node.js](https://nodejs.org/)
- [Python](https://www.python.org/)
- [MySQL](https://www.mysql.com/)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- [OpenCV](https://opencv.org/)
- [Pillow](https://python-pillow.org/)

### Development Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/) (API testing)
- [MySQL Workbench](https://www.mysql.com/products/workbench/)

## 🐛 Troubleshooting

### Common Issues

1. **MySQL Connection Error**
   ```bash
   # Check MySQL status
   sudo systemctl status mysql
   
   # Reset MySQL root password if needed
   sudo mysql -u root -p
   ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
   ```

2. **Python Virtual Environment Issues**
   ```bash
   # Recreate virtual environment
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Node.js/npm Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER /path/to/your/project
   chmod -R 755 /path/to/your/project
   ```

5. **Port Already in Use**
   ```bash
   # Find process using port
   sudo lsof -i :5000  # Backend
   sudo lsof -i :3000  # Frontend
   
   # Kill process
   sudo kill -9 <PID>
   ```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the application logs
3. Check the browser console for frontend errors
4. Check the backend logs for server errors

## 📄 License

This project is proprietary software. All rights reserved. 
