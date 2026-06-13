@echo off
title Vineyard School SMS
cd /d "%~dp0"

:: Check if the app is already built (dist-electron exists)
if exist "dist-electron\main.js" (
    echo Starting Vineyard School...
    npx electron . 
    goto :eof
)

:: Not built yet — build first
echo Building Vineyard School for the first time...
echo This will take about 1-2 minutes. Please wait.
echo.
call npm install 2>nul || call bun install
call npx vite build
echo.
echo Launch complete. Starting app...
npx electron .
