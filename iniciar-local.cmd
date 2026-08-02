@echo off
setlocal
cd /d "%~dp0"
title Clinica Municipal - localhost

echo Iniciando Clinica Municipal en primer plano...
echo Cierre esta terminal o presione Ctrl+C para detener el servidor.
echo.

call "%~dp0node_modules\.bin\next.cmd" dev
set "serverExitCode=%ERRORLEVEL%"

if not "%serverExitCode%"=="0" (
  echo.
  echo El servidor finalizo con codigo %serverExitCode%.
  pause
)

exit /b %serverExitCode%
