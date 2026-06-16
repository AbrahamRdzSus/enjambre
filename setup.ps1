# ENJAMBRE - Setup para Windows
Write-Host "=== Configurando ENJAMBRE ===" -ForegroundColor Green

# Crear estructura si no existe
New-Item -ItemType Directory -Force -Path "projects", "agents", "scripts", "dashboard" | Out-Null

Write-Host "Estructura creada. Copia tus .env y configura las CLIs." -ForegroundColor Cyan
Write-Host "Ejecuta .\enjambre-hub.ps1 para comenzar." -ForegroundColor Yellow
