@echo off
color 0B
echo ===================================================
echo     AUTO PUSH IOTZY KE GITHUB DAN VERCEL
echo ===================================================
echo.
echo Sedang mendeteksi perubahan file...
git add .

echo Menyimpan perubahan (Commit)...
git commit -m "Auto-update: %date% %time%"

echo.
echo Mengunggah ke GitHub (Pushing)...
git push origin main

echo.
echo ===================================================
echo   BERHASIL TERRY-PUSH! Vercel sedang me-redeploy...
echo ===================================================
timeout /t 5 >nul
