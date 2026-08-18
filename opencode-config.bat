@echo off
chcp 65001 >nul
title OpenCode - Custom API Configuration
echo.
echo  ======================================
echo   OpenCode - Custom API Configuration
echo  ======================================
echo.

set /p "BASE_URL=  Base URL: "
echo.
set /p "API_KEY=  API Key: "
echo.
set /p "MODEL_ID=  Model ID: "
echo.
set /p "MODEL_NAME=  Model Display Name: "
echo.

echo  Menyimpan konfigurasi...

:: Write using PowerShell to avoid batch escaping issues
powershell -Command "$json = @{ '$schema' = 'https://opencode.ai/config.json'; provider = @{ 'custom-api' = @{ name = 'Custom OpenAI Compatible'; npm = '@ai-sdk/openai-compatible'; options = @{ baseURL = '%BASE_URL%'; apiKey = '%API_KEY%' }; models = @{ '%MODEL_ID%' = @{ name = '%MODEL_NAME%' } } } } }; $json | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 'D:\Project\Game\Project Forecraft v0.0.2\opencode.json'"

:: Write global config
powershell -Command "if(!(Test-Path $env:USERPROFILE\.config\opencode)){New-Item -ItemType Directory -Path $env:USERPROFILE\.config\opencode -Force | Out-Null}; $json = @{ '$schema' = 'https://opencode.ai/config.json'; provider = @{ 'custom-api' = @{ name = 'Custom OpenAI Compatible'; npm = '@ai-sdk/openai-compatible'; options = @{ baseURL = '%BASE_URL%'; apiKey = '%API_KEY%' }; models = @{ '%MODEL_ID%' = @{ name = '%MODEL_NAME%' } } } } }; $json | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $env:USERPROFILE\.config\opencode\opencode.json"

echo.
echo  ======================================
echo   Konfigurasi berhasil disimpan!
echo  ======================================
echo.
echo   Base URL : %BASE_URL%
echo   Model    : %MODEL_NAME% [%MODEL_ID%]
echo.
pause
