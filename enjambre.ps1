<#
.SYNOPSIS
  Corre y actualiza TU Enjambre en esta PC (instancia personal, estado persistente).

.DESCRIPTION
  1) Actualiza: hace `git pull` de tu rama SOLO si el arbol esta limpio (no toca tu
     trabajo sin commitear; si hay cambios o estas en detached, avisa y NO actualiza).
  2) Levanta el sidecar (FastAPI) + el frontend (Vite) en dos ventanas y abre el navegador.
  Usa el data-dir por defecto (%APPDATA%\enjambre): tus API keys, agentes y sesiones
  PERSISTEN entre corridas. Flags de features encendidos (agente CLI, tool calling, dock).

  Diferencia con launch-review.ps1: aquel aisla una VERSION concreta para revisarla;
  este es tu instalacion de uso diario sobre tu propio checkout.

.EXAMPLE
  .\enjambre.ps1                 # actualiza y corre
  .\enjambre.ps1 -NoUpdate       # corre sin git pull
  .\enjambre.ps1 -WebPort 5180 -SidecarPort 8005
#>
[CmdletBinding()]
param(
  [switch]$NoUpdate,
  [int]$SidecarPort = 8000,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontDir = Join-Path $repoRoot "frontend"
$srcPath  = Join-Path $repoRoot "src"

# --- 1) Actualizar de forma segura ------------------------------------------
if (-not $NoUpdate) {
  $branch = (git -C $repoRoot rev-parse --abbrev-ref HEAD).Trim()
  # --untracked-files=no: los launchers/scratch sin trackear no deben bloquear un
  # ff-pull; solo bloqueamos si hay cambios en archivos YA versionados.
  $dirty  = git -C $repoRoot status --porcelain --untracked-files=no
  if ($branch -eq "HEAD") {
    Write-Host "[update] estas en detached HEAD; no actualizo." -ForegroundColor Yellow
  } elseif ($dirty) {
    Write-Host "[update] tienes cambios sin commitear; NO actualizo (protejo tu trabajo)." -ForegroundColor Yellow
    Write-Host "         corre con -NoUpdate o commitea/guarda para silenciar este aviso." -ForegroundColor Yellow
  } else {
    Write-Host "[update] git pull --ff-only origin $branch ..." -ForegroundColor Cyan
    $before = (git -C $repoRoot rev-parse --short HEAD).Trim()
    git -C $repoRoot fetch origin $branch | Out-Null
    try {
      git -C $repoRoot pull --ff-only origin $branch | Out-Null
      $after = (git -C $repoRoot rev-parse --short HEAD).Trim()
      if ($before -eq $after) { Write-Host "[update] ya estabas al dia ($after)." -ForegroundColor Green }
      else { Write-Host "[update] actualizado $before -> $after." -ForegroundColor Green }
    } catch {
      Write-Host "[update] no se pudo fast-forward (rama divergente); sigo con lo que tienes." -ForegroundColor Yellow
    }
  }
} else {
  Write-Host "[update] omitido (-NoUpdate)." -ForegroundColor DarkGray
}

# --- 2) Deps del frontend (solo si faltan) ----------------------------------
if (-not (Test-Path (Join-Path $frontDir "node_modules"))) {
  Write-Host "[deps] npm install (primera vez)..." -ForegroundColor Yellow
  Push-Location $frontDir; npm install; Pop-Location
}

Write-Host ""
Write-Host "  sidecar : http://127.0.0.1:$SidecarPort   (data: %APPDATA%\enjambre, persistente)"
Write-Host "  web     : http://localhost:$WebPort"
Write-Host ""

# --- 3) Sidecar en su ventana -----------------------------------------------
$sidecarCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Enjambre sidecar :$SidecarPort'
`$env:PYTHONPATH = '$srcPath'
`$env:ENJAMBRE_CLI_AGENTS = '1'
`$env:ENJAMBRE_TOOLS = '1'
Write-Host 'TU Enjambre - sidecar en :$SidecarPort  (Ctrl+C para detener)' -ForegroundColor Green
python -m uvicorn enjambre.api:app --host 127.0.0.1 --port $SidecarPort
"@
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $sidecarCmd -WorkingDirectory $repoRoot

# Esperar el token (lo autogenera el sidecar; lo necesita el frontend).
$dataDir = Join-Path $env:APPDATA "enjambre"
$tokenFile = Join-Path $dataDir "api-token"
Write-Host "Esperando el token del sidecar..." -NoNewline
$deadline = (Get-Date).AddSeconds(40)
while (-not (Test-Path $tokenFile) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500; Write-Host "." -NoNewline
}
if (Test-Path $tokenFile) { Write-Host " listo." -ForegroundColor Green }
else { Write-Host " (sin token aun; revisa la ventana del sidecar)" -ForegroundColor Yellow }

# --- 4) Frontend en su ventana ----------------------------------------------
$webCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Enjambre web :$WebPort'
`$env:VITE_API_URL = 'http://127.0.0.1:$SidecarPort'
`$env:VITE_CLI_AGENTS = '1'
`$env:VITE_ACTIVITY_DOCK = '1'
`$env:VITE_TOOLS = '1'
Write-Host 'TU Enjambre - web en :$WebPort  (Ctrl+C para detener)' -ForegroundColor Green
npm run dev -- --port $WebPort --strictPort
"@
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $webCmd -WorkingDirectory $frontDir

# --- 5) Abrir navegador cuando el web responda ------------------------------
$webUrl = "http://localhost:$WebPort"
Write-Host "Esperando el frontend..." -NoNewline
$deadline = (Get-Date).AddSeconds(90); $up = $false
while ((Get-Date) -lt $deadline) {
  try { Invoke-WebRequest $webUrl -UseBasicParsing -TimeoutSec 2 | Out-Null; $up = $true; break }
  catch { Start-Sleep -Seconds 2; Write-Host "." -NoNewline }
}
if ($up) { Write-Host " arriba. Abriendo navegador." -ForegroundColor Green; Start-Process $webUrl }
else { Write-Host " (aun no responde; abrelo a mano: $webUrl)" -ForegroundColor Yellow }

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " TU Enjambre esta corriendo. Agente CLI disponible (tienes claude." -ForegroundColor Cyan
Write-Host " exe + login). Cerrar: Ctrl+C en cada ventana." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
