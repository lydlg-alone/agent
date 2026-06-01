@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "APP_DIR=%ROOT_DIR%\1"

echo ==========================================
echo AI Learning Desktop - Start Project
echo ==========================================
echo.

if not exist "%APP_DIR%\package.json" (
  echo [ERROR] Could not find "%APP_DIR%\package.json"
  echo Make sure this script stays in the project root directory.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js 18.18 or later, then run setup-new-machine.bat.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  echo Please install npm 9 or later, then run setup-new-machine.bat.
  exit /b 1
)

if not exist "%APP_DIR%\node_modules" (
  echo [ERROR] Dependencies are not installed yet.
  echo Run setup-new-machine.bat first.
  exit /b 1
)

set "ELECTRON_RUN_AS_NODE="

pushd "%APP_DIR%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to enter "%APP_DIR%"
  exit /b 1
)

echo Starting renderer, API server, and Electron...
echo.
call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul
exit /b %EXIT_CODE%
