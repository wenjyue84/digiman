@echo off
title Ralph Autonomous Agent
echo ========================================
echo   Ralph Autonomous Agent
echo   Double-click this to run Ralph
echo ========================================
echo.

cd /d "C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur"

REM Unset CLAUDECODE to allow nested Claude sessions
set "CLAUDECODE="

REM Run Ralph via Git Bash (required for bash script)
"C:\Program Files\Git\bin\bash.exe" -l -c "./scripts/ralph/ralph.sh"

echo.
echo ========================================
echo   Ralph finished. Press any key to close.
echo ========================================
pause
