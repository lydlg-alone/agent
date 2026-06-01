@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "APP_DIR=%ROOT_DIR%\1"

echo ==========================================
echo AI Learning Desktop - New Machine Setup
echo ==========================================
echo.

echo [1/6] Checking project directory...
if not exist "%APP_DIR%\package.json" (
  echo [ERROR] Could not find "%APP_DIR%\package.json"
  echo Make sure this script stays in the project root directory.
  exit /b 1
)

if not exist "%ROOT_DIR%\start-project.bat" (
  echo [WARN] Root startup script was not found: "%ROOT_DIR%\start-project.bat"
  echo You can still continue, but daily startup from the root directory will be unavailable.
  echo.
)

echo [2/6] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js 18.18 or later, then run this script again.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  echo Please install npm 9 or later, then run this script again.
  exit /b 1
)

for /f "delims=" %%i in ('node -v') do set "NODE_VERSION=%%i"
for /f "delims=" %%i in ('npm -v') do set "NPM_VERSION=%%i"
echo Node.js: %NODE_VERSION%
echo npm: %NPM_VERSION%
echo.

pushd "%APP_DIR%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to enter "%APP_DIR%"
  exit /b 1
)

echo [3/6] Installing project dependencies...
call npm run setup
if errorlevel 1 goto :setup_failed
echo.

echo [4/6] Verifying local environment...
call npm run check:env
if errorlevel 1 goto :setup_failed
echo.

echo [5/6] Verifying production build...
call npm run build
if errorlevel 1 goto :setup_failed
echo.

echo [6/6] Setup completed successfully.
echo.
echo You can now start the project with:
echo   cd /d "%ROOT_DIR%"
echo   start-project.bat
echo.
goto :done

:setup_failed
echo.
echo [ERROR] Environment setup failed.
echo Common fixes:
echo   1. Make sure your network can access the npm registry.
echo   2. Re-run this script as a normal user after closing terminal tools that are locking node_modules.
echo   3. If better-sqlite3 fails to install, verify Node.js version matches the project requirement.
echo   4. If the build fails, check whether Electron, Vite, and native dependencies were installed completely.
popd >nul
exit /b 1

:done
popd >nul
exit /b 0
