@echo off
title Forecraft UI Studio
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall atau belum masuk PATH.
    echo Install Node.js dulu, lalu coba lagi.
    pause
    exit /b 1
)

echo Menjalankan UI Studio server...
echo Buka: http://localhost:8123
echo Tekan Ctrl+C di jendela ini untuk menghentikan server.

start "" /min cmd /c "timeout /t 1 >nul && start http://localhost:8123"
node tools\ui-studio-server.js

pause
