@echo off
echo Fixing capacitor.config.json and index.html...

cd /d C:\Users\DraveMor\projects\asterics-grid-android\android\app\src\main\assets

echo Fixing capacitor.config.json hostname...
powershell -Command "(Get-Content capacitor.config.json) -replace '\"hostname\": \"asterics-grid\"', '\"hostname\": \"localhost\"' | Set-Content capacitor.config.json"

echo Fixing index.html paths...
powershell -Command "(Get-Content index.html) -replace 'src=\"build/', 'src=\"js/' | Set-Content index.html"

echo Done! Now run: cd ..\..\..\..\.. && cd android && gradlew assembleDebug
pause
