@echo off
title Torre de Controle - Frontend
set "NODE_DIR=%~dp0node"
set "NODE_ZIP=%~dp0node.zip"

IF NOT EXIST "%NODE_DIR%\node.exe" (
    echo ===========================================
    echo [1/4] Baixando Node.js - Motor do React...
    echo Isso pode levar alguns minutos dependendo da internet.
    echo ===========================================
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip' -OutFile '%NODE_ZIP%'"
    
    echo ===========================================
    echo [2/4] Extraindo arquivos do Node.js...
    echo ===========================================
    powershell -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%~dp0' -Force"
    
    move "%~dp0node-v20.11.1-win-x64" "%NODE_DIR%"
    del "%NODE_ZIP%"
)

echo ===========================================
echo [3/4] Configurando ambiente local...
echo ===========================================
set PATH=%NODE_DIR%;%PATH%

cd "torre-controle"

echo ===========================================
echo [4/4] Instalando dependencias do React...
echo (Apenas na primeira vez isso pode demorar um pouquinho)
echo ===========================================
call npm install

echo ===========================================
echo Tudo pronto! Iniciando a Interface Visual...
echo Abra o navegador no link que aparecer abaixo (ex: http://localhost:5173)
echo ===========================================
call npm run dev
