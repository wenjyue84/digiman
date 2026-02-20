@echo off
title Ralph Progress Monitor
color 0B
mode con: cols=70 lines=40

set "PROJECT_DIR=C:\Users\Jyue\Documents\1-projects\Projects\PelangiManager-Zeabur"

:loop
cls
echo.
echo   ===================================================
echo     Ralph Progress Monitor   %date% %time:~0,8%
echo   ===================================================
echo.

cd /d "%PROJECT_DIR%"

REM Count stories
for /f %%i in ('jq "[.userStories | length] | .[0]" prd.json 2^>nul') do set TOTAL=%%i
for /f %%i in ('jq "[.userStories[] | select(.passes == true)] | length" prd.json 2^>nul') do set DONE=%%i
for /f %%i in ('jq "[.userStories[] | select(.passes == false)] | length" prd.json 2^>nul') do set LEFT=%%i

echo   Stories: %DONE%/%TOTAL% complete  (%LEFT% remaining)
echo.

REM Show completed stories
echo   --- Completed Stories ---
jq -r ".userStories[] | select(.passes == true) | \"   [\" + .id + \"] \" + .title" prd.json 2>nul
echo.

REM Show current story (first incomplete)
echo   --- Current Story ---
jq -r "[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0] | \"   [\" + .id + \"] \" + .title" prd.json 2>nul
echo.

REM Show retry counts
echo   --- Retries ---
if exist retry-counts.json (
  jq -r "to_entries[] | \"   \" + .key + \": \" + (.value | tostring) + \"/3 attempts\"" retry-counts.json 2>nul
) else (
  echo   (none)
)
echo.

REM Show recent git commits
echo   --- Recent Commits ---
git log --oneline -5 2>nul
echo.

REM Show branch
echo   --- Branch ---
git branch --show-current 2>nul
echo.
echo   ===================================================
echo   Refreshing in 15 seconds... (Ctrl+C to close)
echo   ===================================================

timeout /t 15 /nobreak >nul
goto loop
