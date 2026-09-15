@echo off
REM ===========================================================================
REM  TongPingHui - stop the backend.
REM  Only kills the process that is LISTENING on port 8080 (our backend).
REM  It never touches other node.exe processes (VS Code, tools, etc.).
REM  NOTE: keep this file ASCII-only, or the console may garble the output.
REM ===========================================================================
setlocal
set "PORT=8080"
set "PID="

for /f "tokens=5" %%p in ('netstat -aon -p tcp ^| findstr ":%PORT% " ^| findstr /i "LISTENING"') do set "PID=%%p"

if "%PID%"=="" (
  echo No process is listening on port %PORT% - backend is not running.
  if "%~1"=="" pause
  endlocal
  exit /b 0
)

echo Backend pid %PID% is listening on port %PORT% - stopping it ...
taskkill /PID %PID% /F >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Failed to stop pid %PID%. Run this file as Administrator and retry.
  if "%~1"=="" pause
  endlocal
  exit /b 1
)

echo Backend stopped.
if "%~1"=="" pause
endlocal
exit /b 0
