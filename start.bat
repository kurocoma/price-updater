@echo off
cd /d "%~dp0"
start http://localhost:3500
npx next dev -p 3500
