@echo off
echo Cleaning up population scripts to prevent future duplicates...
echo.

echo Deleting the following files:
echo - populate_data.mjs
echo - populate_data_with_auth.mjs
echo - populate_guests.js
echo - populate_correct.mjs
echo - add_remaining_guests.mjs
echo.

del "populate_data.mjs"
del "populate_data_with_auth.mjs"
del "populate_guests.js"
del "populate_correct.mjs"
del "add_remaining_guests.mjs"

echo.
echo Population scripts deleted successfully!
echo This will prevent future duplicate guest records.
echo.
pause

