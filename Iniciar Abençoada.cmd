@echo off
cd /d "%~dp0"
set "PATH=C:\Users\Usuario\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
start "" "http://127.0.0.1:4780"
node sqlserver/server.mjs
pause
