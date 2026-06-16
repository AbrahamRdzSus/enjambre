# ENJAMBRE - Hub Principal (PowerShell)
param([string]$ProjectName = "")

Write-Host "=== ENJAMBRE IA - Hub Central ===" -ForegroundColor Cyan

# Cargar .env
if (Test-Path ".env") { . .\.env } else { Write-Host "Crea .env desde .env.example" -ForegroundColor Red }

function Show-Menu {
    Write-Host "`nOpciones:"
    Write-Host "1. Crear nuevo proyecto"
    Write-Host "2. Seleccionar proyecto existente"
    Write-Host "3. Detectar e integrar CLIs"
    Write-Host "4. Registrar nueva CLI"
    Write-Host "5. Lanzar Enjambre"
    Write-Host "6. Ver Dashboard"
    Write-Host "0. Salir"
    $choice = Read-Host "Elige"
    return $choice
}

do {
    $choice = Show-Menu
    switch ($choice) {
        "1" { 
            $name = Read-Host "Nombre del proyecto"
            New-Item -ItemType Directory -Force -Path "projects\$name" | Out-Null
            Write-Host "Proyecto creado: $name" 
        }
        "3" { Write-Host "Detectando CLIs en PATH... (simulado)" }
        "5" { 
            $prompt = Read-Host "Prompt para el enjambre"
            Write-Host "Lanzando agentes en paralelo para: $prompt" -ForegroundColor Green
            # Aquí iría launch-agents.ps1
        }
        "6" { 
            Write-Host "Abriendo Dashboard (simulado)..." 
            # Llamar a dashboard script
        }
        "0" { break }
    }
} while ($choice -ne "0")

Write-Host "¡Hasta pronto!" -ForegroundColor Green
