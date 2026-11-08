@echo off
rem Fast development server with hot reload (Turbopack).
cd /d "%~dp0"
if not exist "package.json" goto :notextracted
if not exist "scripts\serve.mjs" goto :notextracted
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then run this again.
  pause
  exit /b 1
)
node scripts\serve.mjs --dev %*
if errorlevel 1 pause
exit /b

:notextracted
echo This file must be run from the extracted project folder.
echo If you opened it inside a ZIP file: right-click the ZIP, choose "Extract All...",
echo then open the extracted "agrivision" folder and double-click %~nx0 again.
pause
exit /b 1
