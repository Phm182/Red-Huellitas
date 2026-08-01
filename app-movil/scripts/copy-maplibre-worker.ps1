# Copia el worker ESM de MapLibre v6 al dist (y deja public/ al día).
# Sin estos archivos el mapa web monta pero queda en blanco.
param(
  [string]$DistDir = ""
)

$root = Split-Path $PSScriptRoot -Parent
if (-not $DistDir) {
  $DistDir = Join-Path $root "dist"
}

$srcDir = Join-Path $root "node_modules\maplibre-gl\dist"
$files = @("maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs")

foreach ($name in $files) {
  $src = Join-Path $srcDir $name
  if (-not (Test-Path $src)) {
    Write-Error "No existe $src. Corré npm install en app-movil."
    exit 1
  }
  Copy-Item -Force $src (Join-Path $root "public\$name")
  if (Test-Path $DistDir) {
    Copy-Item -Force $src (Join-Path $DistDir $name)
  }
}

Write-Host "MapLibre worker copiado a public/ y dist/"
