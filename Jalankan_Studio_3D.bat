@echo off
title Forecraft 3D Studio Server
cd /d "%~dp0"
echo ===================================================
echo     Forecraft 3D Studio Server
echo ===================================================
echo.
echo Memulai server Forecraft 3D Studio...
echo Server berjalan di: http://127.0.0.1:8080/
echo.
node scripts/studio.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Gagal menjalankan server. Pastikan Node.js sudah terinstall.
    pause
)
