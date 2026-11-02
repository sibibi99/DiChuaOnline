@echo off
chcp 65001 >nul
title Chua Online Live
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b
)

if not exist node_modules (
  echo Dang cai thu vien lan dau...
  call npm install --omit=dev
)

if not exist config.json (
  copy config.example.json config.json >nul
  echo Da tao config.json - mo file nay de dien ten kenh, sau do chay lai.
  notepad config.json
)

:loop
echo.
echo === Khoi dong Chua Online (%date% %time%) ===
node server.js
echo Server dung. Tu khoi dong lai sau 5 giay... (dong cua so nay de tat han)
timeout /t 5 >nul
goto loop
