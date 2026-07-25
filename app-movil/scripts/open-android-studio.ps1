# Abre el proyecto nativo en Android Studio (requiere haber corrido prebuild antes).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$androidDir = Join-Path $root "android"
$studio = "C:\Program Files\Android\Android Studio\bin\studio64.exe"

if (-not (Test-Path $androidDir)) {
  Write-Host "No existe la carpeta android/. Generala con:"
  Write-Host "  npm run prebuild:android"
  exit 1
}
if (-not (Test-Path $studio)) {
  Write-Error "No se encontró Android Studio en: $studio"
  exit 1
}

Write-Host "Abriendo $androidDir en Android Studio..."
Start-Process -FilePath $studio -ArgumentList $androidDir
