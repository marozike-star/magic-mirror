@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Nerastas Node.js. Idiekite ji is https://nodejs.org ^(LTS versija^) ir paleiskite si faila is naujo.
  echo.
  pause
  exit /b 1
)
node server.js
pause
