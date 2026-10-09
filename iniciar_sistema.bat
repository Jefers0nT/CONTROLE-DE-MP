@echo off
title Torre de Controle - Iniciador do Sistema
color 0B

echo ===========================================
echo BEM VINDO A TORRE DE CONTROLE
echo ===========================================
echo.
echo Iniciando todos os motores do sistema em paralelo...
echo Por favor, nao feche as telas pretas que vao se abrir.
echo Elas sao o coracao do sistema trabalhando.
echo.

echo [1/3] Iniciando o Servidor de Dados (API)...
start "Servidor API" cmd /k "cd backend && python app.py"
timeout /t 2 /nobreak >nul

echo [2/3] Iniciando o Monitor de Planilhas (Robo Leitor)...
start "Monitor Excel" cmd /k "cd backend && python monitor.py"
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando a Tela Principal (Dashboard Visual)...
call iniciar_frontend.bat
