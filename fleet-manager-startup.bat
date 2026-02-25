@echo off
:: Fleet Manager - Windows Startup Script
:: Register in Task Scheduler:
::   Trigger: At log on
::   Action: Run this file
::   "Run whether user is logged on or not": NO (needs interactive session)
::   Start in: C:\Users\Jyue\Documents\1-projects\Projects\digiman\fleet-manager

echo Starting Fleet Manager on port 9999...
cd /D "C:\Users\Jyue\Documents\1-projects\Projects\digiman\fleet-manager"
node server.js
