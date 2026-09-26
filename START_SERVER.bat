@echo off
title Forecraft Online - Dedicated Server
cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 goto NO_NODE

if exist "node_modules\ws" goto START_SRV
echo Menginstall dependensi modul ws...
call npm install ws
echo.

:START_SRV
echo ========================================================
echo   FORECRAFT ONLINE - DEDICATED SERVER MULTIPLAYER
echo ========================================================
echo Menjalankan Dedicated Server di port 3000...
echo.
rem Tutup instance server lama di port 3000 jika masih berjalan
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /f /pid %%a >nul 2>&1
)
node server/server.js
echo.
echo Server berhenti dengan kode: %errorlevel%
pause
exit /b 0

:NO_NODE
echo ========================================================
echo ERROR: Node.js tidak ditemukan!
echo Pastikan Node.js terinstall di komputer ini.
echo ========================================================
pause
exit /b 1
