@echo off
rem ===========================================================================
rem  Qanawa — construction du lanceur Windows (Qanawa.exe)
rem  Aucun outil à installer : on utilise le compilateur C# livré avec
rem  .NET Framework 4.x, déjà présent sur Windows 7 SP1 → Windows 11.
rem  Sortie : win32\bin\Qanawa.exe  (+ copie du dossier prototype à côté)
rem ===========================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "CSKBIN="
for %%v in (v4.0.30319 v4.0.30319) do (
  if not defined CSKBIN (
    if exist "%WINDIR%\Microsoft.NET\Framework64\%%v\csc.exe" set "CSKBIN=%WINDIR%\Microsoft.NET\Framework64\%%v"
    if not defined CSKBIN if exist "%WINDIR%\Microsoft.NET\Framework\%%v\csc.exe" set "CSKBIN=%WINDIR%\Microsoft.NET\Framework\%%v"
  )
)
if not defined CSKBIN (
  echo.
  echo [ERREUR] .NET Framework 4.x ^(csc.exe^) introuvable.
  echo          Installe ".NET Framework 4.8" ou utilise directement:
  echo          ..\prototype\index.html   ^(double-clic, mode dégradé^)
  echo.
  exit /b 3
)
echo Compilateur : %CSKBIN%

set "BIN=%~dp0bin"
if not exist "%BIN%" mkdir "%BIN%"
del /q "%BIN%\*.exe" "%BIN%\*.res" "%BIN%\*.ico" 2>nul

echo.
echo 1/4  Icône (le manifeste est appliqué à l'exécution : pas besoin de rc.exe)
"%CSKBIN%\csc.exe" /nologo /target:exe /out:"%BIN%\QanawaIcon.exe" "%~dp0QanawaIcon.cs"             || exit /b 4
"%BIN%\QanawaIcon.exe" "%BIN%\Qanawa.ico"

echo.
echo 2/4  Compilation du lanceur
set "ICOARG="
if exist "%BIN%\Qanawa.ico" set "ICOARG=/win32icon:%BIN%\Qanawa.ico"
echo       (csc refuse /win32icon + /win32res ensemble : l'icône seule suffit)
"%CSKBIN%\csc.exe" /nologo /nowarn:0105 /target:winexe /optimize+ %ICOARG% ^
  /out:"%BIN%\Qanawa.exe" "%~dp0QanawaLauncher.cs"                                                   || exit /b 5

echo.
echo 3/4  Copie du contenu pédagogique à côté de l'exe
if exist "%~dp0..\prototype" (
  if exist "%BIN%\prototype" rmdir /s /q "%BIN%\prototype"
  xcopy /e /i /q /y "%~dp0..\prototype" "%BIN%\prototype" >nul || echo   [attention] copie partielle du dossier prototype
) else (
  echo   [attention] dossier ..\prototype introuvable — dépose-le à côté de Qanawa.exe
)

echo.
echo 4/4  Test du serveur local
echo       (le lanceur va démarrer, servir, puis s'arrêter tout seul après 4 s)
start "" /b "%BIN%\Qanawa.exe" --serve-only --port 8137 > "%BIN%\smoke.log" 2>&1
ping -n 4 127.0.0.1 >nul
curl -s -m 3 http://localhost:8137/health > "%BIN%\smoke.txt" 2>nul
if exist "%BIN%\smoke.txt" (
  find /i "prototype" "%BIN%\smoke.txt" >nul && echo   ✓ serveur OK: /health répond  →  %BIN%\smoke.txt
  if errorlevel 1 echo   ! /health a répondu mais sans chemin attendu — ouvre http://localhost:8137/ à la main
) else (
  echo   ! curl absent ^(Windows 7^) : teste en ouvrant ..\bin\Qanawa.exe
)
taskkill /f /im Qanawa.exe >nul 2>&1

echo.
echo  ========================================================================
echo   Terminé.  Lanceur : %BIN%\Qanawa.exe   ^(double-clic pour lancer^)
echo   À distribuer : le dossier bin\ entier ^(Qanawa.exe + dossier prototype\^).
echo   Si Windows affiche « Windows a protégé votre PC » : plus d'infos ^> Exécuter
echo   quand même (bâtiment non signé, pas un virus). Source sous AGPL-3.0.
echo  ========================================================================
endlocal
