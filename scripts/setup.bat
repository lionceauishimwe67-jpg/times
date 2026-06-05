@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
:: School Timetable Display System
:: Windows Setup Script
:: ============================================

echo ==========================================
echo School Timetable Display System - Setup
echo ==========================================
echo.

:: Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js v18 or higher.
    pause
    exit /b 1
)
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
echo [SUCCESS] Node.js found: %NODE_VERSION%

:: Check if npm is installed
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed.
    pause
    exit /b 1
)
for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
echo [SUCCESS] npm found: %NPM_VERSION%

:: Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "backend\uploads" mkdir backend\uploads
if not exist "backend\logs" mkdir backend\logs
echo [SUCCESS] Directories created!

:: Setup backend
echo [INFO] Setting up backend...
cd backend

if not exist ".env" (
    echo [INFO] Creating .env file from example...
    copy ..\.env.example .env >nul
    echo [WARNING] Please edit backend\.env with your actual configuration
)

echo [INFO] Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
)

echo [INFO] Initializing database...
call npm run init-db
if errorlevel 1 (
    echo [WARNING] Database initialization may have failed. Check your database configuration.
)

cd ..
echo [SUCCESS] Backend setup complete!

:: Setup frontend
echo [INFO] Setting up frontend...
cd frontend

echo [INFO] Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend dependency installation failed.
    pause
    exit /b 1
)

cd ..
echo [SUCCESS] Frontend setup complete!

:: Success message
echo.
echo ==========================================
echo [SUCCESS] Setup completed successfully!
echo ==========================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your actual configuration
echo 2. Start the backend: cd backend ^&^& npm run dev
echo 3. Start the frontend: cd frontend ^&^& npm start
echo 4. Access the application at http://localhost:3000
echo.
echo Default credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo Display URL: http://localhost:3000/display
echo.

pause
