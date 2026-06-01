@echo off
title Almoxarifado Drevo - Servidor
echo ==============================================
echo INICIANDO O SISTEMA DO ALMOXARIFADO DREVO...
echo ==============================================
echo.
echo O seu navegador vai abrir automaticamente.
echo Por favor, NAO FECHE ESTA JANELA PRETA enquanto estiver usando o app!
echo.
cd /d "%~dp0"
start http://localhost:5180
npm run dev -- --host --force
