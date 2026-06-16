# Registrar nueva CLI
param(
    [string]$Nombre,
    [string]$Ruta,
    [string]$Tipo
)

Write-Host "Registrando CLI: $Nombre ($Tipo)" -ForegroundColor Green
# Lógica simple de registro (guardar en JSON)
$reg = @{Nombre=$Nombre; Ruta=$Ruta; Tipo=$Tipo}
$reg | ConvertTo-Json | Out-File -FilePath "agents/registered.json" -Append
Write-Host "CLI registrada exitosamente!" -ForegroundColor Green
