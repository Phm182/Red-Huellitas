# Parchea index.html del export Expo web:
# quita body{overflow:hidden} que congela inputs en mobile browsers.
param(
  [string]$DistDir = ""
)

if (-not $DistDir) {
  $DistDir = Join-Path (Split-Path $PSScriptRoot -Parent) "dist"
}

$index = Join-Path $DistDir "index.html"
if (-not (Test-Path $index)) {
  Write-Error "No existe $index. Corré antes: npm run export:web"
  exit 1
}

$html = Get-Content $index -Raw -Encoding UTF8

# Extraer src del bundle
if ($html -notmatch 'src="([^"]+_expo/static/js/web/entry-[^"]+\.js)"') {
  Write-Error "No se encontró el script entry en index.html"
  exit 1
}
$scriptSrc = $Matches[1]

# Conservar CSS del export (maplibre-gl / mapbox-gl). Sin eso el canvas del
# mapa queda en altura 0 y se ve negro/vacío en el navegador.
$cssSeen = New-Object 'System.Collections.Generic.HashSet[string]'
$cssLinks = New-Object System.Collections.Generic.List[string]
foreach ($m in [regex]::Matches($html, 'href="([^"]+_expo/static/css/[^"]+\.css)"')) {
  $href = $m.Groups[1].Value
  if (-not $href.StartsWith('/')) { $href = '/' + $href.TrimStart('./') }
  if ($cssSeen.Add($href)) {
    $cssLinks.Add("    <link rel=`"stylesheet`" href=`"$href`" />")
  }
}
# Si el HTML ya venía parchado y perdió los link, buscar los CSS en disco.
if ($cssLinks.Count -eq 0) {
  $cssDir = Join-Path $DistDir '_expo\static\css'
  if (Test-Path $cssDir) {
    Get-ChildItem $cssDir -Filter '*.css' | ForEach-Object {
      $href = "/_expo/static/css/$($_.Name)"
      if ($cssSeen.Add($href)) {
        $cssLinks.Add("    <link rel=`"stylesheet`" href=`"$href`" />")
      }
    }
  }
}
$cssBlock = ($cssLinks -join "`n")

$fixed = @"
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Red Huellitas</title>
    <style id="rh-web-reset">
      html, body { height: 100%; margin: 0; }
      #root { display: flex; flex: 1; min-height: 100%; height: 100%; }
      body { overflow: auto; overscroll-behavior-y: none; }
      input, textarea, select { font-size: 16px; }
    </style>
$cssBlock
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <noscript>Necesitas JavaScript para usar Red Huellitas.</noscript>
    <div id="root"></div>
    <script src="$scriptSrc" defer></script>
  </body>
</html>
"@

[System.IO.File]::WriteAllText($index, $fixed.TrimStart(), (New-Object System.Text.UTF8Encoding $false))
Write-Host "Patched $index (overflow:auto, bundle=$scriptSrc)"
