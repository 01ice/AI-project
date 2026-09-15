@echo off
REM ===========================================================================
REM  TongPingHui - start the backend (Express + JSON store)
REM  Usage: double-click this file. Keep the window open while testing.
REM  Stop: press Ctrl+C in this window, close it, or run tools\stop-server.bat
REM  NOTE: keep this file ASCII-only, or the console may garble the output.
REM ===========================================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0.."

REM node may not be on PATH for some shells - fall back to the default install dir
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  ) else (
    echo [ERROR] Node.js not found. Install Node.js 18+ first.
    goto :end
  )
)

if not exist "node_modules" (
  echo [1/2] node_modules missing - running npm install ...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check your network / npm registry.
    goto :end
  )
)

if not exist ".env" (
  echo [WARN] .env not found - copy .env.example to .env and fill TRTC_SDK_SECRET_KEY,
  echo        otherwise UserSig cannot be issued and joining a room will fail.
)

echo.
echo === starting backend on port 8080 ===
echo   local :  http://127.0.0.1:8080
echo   phones:  http://^<this-PC-LAN-IP^>:8080   (same Wi-Fi as the phones)
echo.
echo   If the phone cannot connect, allow node.exe through Windows Firewall
echo   for private networks, or add an inbound rule for TCP 8080.
echo.
echo   Stop: press Ctrl+C here, close this window, or run tools\stop-server.bat
echo.
%NODE_EXE% src/index.js

:end
echo.
if "%~1"=="" pause
