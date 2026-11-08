@echo off
rem Fast development server with hot reload (Turbopack).
cd /d "%~dp0"
node scripts\serve.mjs --dev %*
pause
