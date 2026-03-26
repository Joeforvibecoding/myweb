@echo off
cd /d "%~dp0"
echo 正在安装依赖...
npm install
echo.
echo 正在启动服务器...
node server.js
pause
