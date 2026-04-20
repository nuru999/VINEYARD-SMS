@echo off
REM VINEYARD-SMS Backend Setup for Windows

echo.
echo ================================================
echo   VINEYARD-SMS Backend - Quick Setup
echo ================================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Step 1: Database Setup
echo =====================
echo.
echo Make sure PostgreSQL is running on localhost:5432
echo.
pause

node setup-db.js

if errorlevel 1 (
    echo.
    echo ❌ Database setup failed!
    echo.
    echo Troubleshooting:
    echo   1. Check if PostgreSQL is running
    echo   2. Verify credentials in .env file
    echo   3. Check DB_HOST, DB_PORT, DB_USER settings
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   ✅ Setup Complete!
echo ================================================
echo.
echo Starting server...
echo.

npm run dev

pause