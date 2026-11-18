@echo off
title XR18-Studio Bridge & Web Server v8
echo Iniciando XR18-Studio v8...
cd /d "%~dp0"
start http://localhost:8080
python -m http.server 8080
