@echo off
title Build APK - Project Forecraft
cd /d "%~dp0"

rem ============================================================
rem  Build APK otomatis:
rem  1. copy assets web ke www
rem  2. cap sync android
rem  3. gradle assembleDebug
rem  4. copy APK ke root project
rem ============================================================

set JAVA_HOME=C:\Java\jdk-17.0.10+7
set PATH=%JAVA_HOME%\bin;%PATH%

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall atau belum masuk PATH.
    pause
    exit /b 1
)

if not exist "%JAVA_HOME%" (
    echo [WARNING] JAVA_HOME tidak ditemukan di: %JAVA_HOME%
    echo Pastikan Java 17 sudah benar, atau edit JAVA_HOME di file ini.
    pause
)

echo.
echo ========================================
echo  BUILD APK FORECRAFT
echo ========================================
echo.

echo [1/4] Build web assets...
call node scripts\build.js
if errorlevel 1 goto :error

echo.
echo [2/4] Capacitor sync Android...
call npx.cmd cap sync android
if errorlevel 1 goto :error

echo.
echo [3/4] Gradle assembleDebug...
pushd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    popd
    goto :error
)
popd

echo.
echo [4/4] Copy APK ke root project...
call node scripts\copy-apk.js
if errorlevel 1 goto :error

echo.
echo ========================================
echo  BUILD SUKSES
echo  APK: ForestSurvival3D.apk
echo ========================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo  BUILD GAGAL
echo ========================================
echo.
pause
exit /b 1
