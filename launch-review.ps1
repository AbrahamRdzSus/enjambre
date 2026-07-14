<#
.SYNOPSIS
  Levanta Enjambre (sidecar + frontend) de una version concreta para revisarla en el
  navegador. Reutilizable: una llamada por version.

.DESCRIPTION
  - Sin -Ref: usa la copia de trabajo ACTUAL (la version que ya tienes checkeada).
  - Con -Ref <rama|tag|commit>: crea un git worktree aislado de esa version en
    ..\.enjambre-review\<ref> y la levanta ahi (no toca tu checkout).
  Cada version corre con su PROPIO puerto y su propio data-dir (token/estado aislado),
  asi puedes tener varias versiones abiertas a la vez sin que se pisen.

  Corre el codigo Python del worktree via PYTHONPATH usando el Python del sistema (no
  reinstala el paquete). El frontend hace `npm install` solo si falta node_modules.

.EXAMPLE
  .\launch-review.ps1                       # revisa la version actual
  .\launch-review.ps1 -Ref v0.6.1           # revisa el tag v0.6.1 (worktree)
  .\launch-review.ps1 -Ref feat/tool-calling -SidecarPort 8010 -WebPort 5183
#>
[CmdletBinding()]
param(
  [string]$Ref = "",
  [int]$SidecarPort = 8000,
  [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Resolver la version y el directorio de trabajo -------------------------
if ([string]::IsNullOrWhiteSpace($Ref)) {
  $workdir = $repoRoot
  $Ref = (git -C $repoRoot rev-parse --abbrev-ref HEAD).Trim()
  Write-Host "Version: copia de trabajo actual ($Ref)" -ForegroundColor Cyan
} else {
  $safe = ($Ref -replace '[^\w\.\-]', '-')
  $reviewBase = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "..\.enjambre-review"))
  $workdir = Join-Path $reviewBase $safe
  if (-not (Test-Path $workdir)) {
    Write-Host "Creando worktree aislado de '$Ref' en $workdir ..." -ForegroundColor Cyan
    git -C $repoRoot worktree add $workdir $Ref | Out-Null
  } else {
    Write-Host "Reusando worktree existente de '$Ref' en $workdir" -ForegroundColor Cyan
  }
}

# Data-dir aislado por version (token/estado no colisionan entre versiones).
$safeRef = ($Ref -replace '[^\w\.\-]', '-')
$dataDir = Join-Path $env:LOCALAPPDATA "enjambre-review\$safeRef"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$srcPath  = Join-Path $workdir "src"
$frontDir = Join-Path $workdir "frontend"
$tokenFile = Join-Path $dataDir "api-token"
Remove-Item $tokenFile -ErrorAction SilentlyContinue  # forzar token fresco

Write-Host ""
Write-Host "  sidecar : http://127.0.0.1:$SidecarPort   (data: $dataDir)"
Write-Host "  web     : http://localhost:$WebPort"
Write-Host ""

# --- 1) Sidecar (FastAPI) en su propia ventana ------------------------------
# Flags de review encendidos: agente CLI + tool calling + dock de actividad.
$sidecarCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Enjambre sidecar [$Ref] :$SidecarPort'
`$env:PYTHONPATH = '$srcPath'
`$env:ENJAMBRE_DATA_DIR = '$dataDir'
`$env:ENJAMBRE_CLI_AGENTS = '1'
`$env:ENJAMBRE_TOOLS = '1'
Write-Host 'Sidecar Enjambre [$Ref] en :$SidecarPort  (Ctrl+C para detener)' -ForegroundColor Green
python -m uvicorn enjambre.api:app --host 127.0.0.1 --port $SidecarPort
"@
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $sidecarCmd -WorkingDirectory $workdir

# Esperar a que el sidecar genere el token (lo necesita el frontend).
Write-Host "Esperando el token del sidecar..." -NoNewline
$deadline = (Get-Date).AddSeconds(40)
while (-not (Test-Path $tokenFile) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500; Write-Host "." -NoNewline
}
if (Test-Path $tokenFile) { Write-Host " listo." -ForegroundColor Green }
else { Write-Host " (sin token; el sidecar puede tardar o fallo, revisa su ventana)" -ForegroundColor Yellow }

# --- 2) Frontend (Vite) en su propia ventana --------------------------------
$webCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Enjambre web [$Ref] :$WebPort'
`$env:ENJAMBRE_DATA_DIR = '$dataDir'
`$env:VITE_API_URL = 'http://127.0.0.1:$SidecarPort'
`$env:VITE_CLI_AGENTS = '1'
`$env:VITE_ACTIVITY_DOCK = '1'
`$env:VITE_TOOLS = '1'
if (-not (Test-Path node_modules)) { Write-Host 'npm install (primera vez)...' -ForegroundColor Yellow; npm install }
Write-Host 'Frontend Enjambre [$Ref] en :$WebPort  (Ctrl+C para detener)' -ForegroundColor Green
npm run dev -- --port $WebPort --strictPort
"@
Start-Process pwsh -ArgumentList '-NoExit', '-Command', $webCmd -WorkingDirectory $frontDir

# --- 3) Abrir el navegador cuando el web este arriba ------------------------
$webUrl = "http://localhost:$WebPort"
Write-Host "Esperando el frontend..." -NoNewline
$deadline = (Get-Date).AddSeconds(90)
$up = $false
while ((Get-Date) -lt $deadline) {
  try { Invoke-WebRequest "$webUrl" -UseBasicParsing -TimeoutSec 2 | Out-Null; $up = $true; break }
  catch { Start-Sleep -Seconds 2; Write-Host "." -NoNewline }
}
if ($up) { Write-Host " arriba. Abriendo navegador." -ForegroundColor Green; Start-Process $webUrl }
else { Write-Host " (aun no responde; abrelo a mano: $webUrl)" -ForegroundColor Yellow }

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Enjambre [$Ref] levantado. Dos ventanas: sidecar y web." -ForegroundColor Cyan
Write-Host " Para cerrarlo: Ctrl+C en cada ventana (o cierralas)." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
