@echo off
REM ===========================================================================
REM  TongPingHui - one-click debug APK builder
REM  Usage: double-click this file (or run: tools\build-apk.bat [extra gradle args])
REM  It pins JAVA_HOME to JDK 17 (required by Gradle 8.x), then:
REM    [1/4] prints Java + Gradle version
REM    [2/4] lists project modules
REM    [3/4] builds :app:assembleDebug
REM    [4/4] reports the APK path
REM  A FULL log (every step, all errors) is always written to:
REM    tools\build-log.txt
REM  Send that file when something fails - it has everything needed.
REM  NOTE: keep this file ASCII-only, or the console may garble the output.
REM ===========================================================================
setlocal
chcp 65001 >nul

set "HERE=%~dp0"
set "LOG=%HERE%build-log.txt"
set "JDK17=C:\Program Files\Java\jdk-17"

> "%LOG%" echo ===== build-apk.bat =====
>> "%LOG%" echo started: %DATE% %TIME%

if not exist "%JDK17%\bin\java.exe" (
  >> "%LOG%" echo [ERROR] JDK 17 not found at "%JDK17%".
  >> "%LOG%" echo         Edit tools\build-apk.bat and change the JDK17 variable.
  goto :fail
)
set "JAVA_HOME=%JDK17%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%HERE%.."
>> "%LOG%" echo project dir: %CD%
>> "%LOG%" echo JAVA_HOME:   %JAVA_HOME%

echo.
echo === [1/4] Java / Gradle version ===
>> "%LOG%" echo === [1/4] Java / Gradle version ===
call gradlew.bat --version >> "%LOG%" 2>&1
if errorlevel 1 (
  >> "%LOG%" echo [ERROR] "gradlew.bat --version" failed - Gradle could not start at all.
  >> "%LOG%" echo         Check JAVA_HOME above and that gradlew.bat + gradle\wrapper\gradle-wrapper.jar exist.
  goto :fail
)

echo.
echo === [2/4] Project modules ===
>> "%LOG%" echo === [2/4] Project modules ===
call gradlew.bat projects --offline >> "%LOG%" 2>&1

echo.
echo === [3/4] Building debug APK (this may download a lot on the first run) ===
>> "%LOG%" echo === [3/4] Building debug APK ===
call gradlew.bat :app:assembleDebug --stacktrace --console=plain %* >> "%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto :fail

echo.
echo === [4/4] Result ===
echo ==========================================================
echo  BUILD OK
echo  APK: %CD%\app\build\outputs\apk\debug\app-debug.apk
echo  Log: %LOG%
echo ==========================================================
echo.
echo Install to a connected device with:
echo   adb install -r app\build\outputs\apk\debug\app-debug.apk
if "%~1"=="" pause
exit /b 0

:fail
echo.
echo ---------------- build log (last 45 lines) ----------------
powershell -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 45"
echo -----------------------------------------------------------
echo ==========================================================
echo  BUILD FAILED
echo  Full log saved to:
echo    %LOG%
echo  Do not copy anything - just say "failed", the log has it all.
echo ==========================================================
echo.
if "%~1"=="" pause
exit /b 1
