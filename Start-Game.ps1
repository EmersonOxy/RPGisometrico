param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (!(Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) { throw 'Instale as dependencias primeiro: npm install' }
$gameUrl = 'http://127.0.0.1:5173'
$serverReady = $false
try { $serverReady = (Invoke-WebRequest -Uri $gameUrl -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { }
if (!$serverReady) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
    if (!(Test-Path -LiteralPath $nodePath)) { throw 'Instale Node.js 22.12 ou mais recente.' }
    Start-Process -FilePath $nodePath -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'game-server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'game-server-error.log')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 500
        try { $serverReady = (Invoke-WebRequest -Uri $gameUrl -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200 } catch { }
        if ($serverReady) { break }
    }
}
if (!$serverReady) { throw 'O servidor nao iniciou. Consulte game-server-error.log.' }
Write-Output ('Jogo disponivel em '+$gameUrl)
if (!$NoBrowser) { Start-Process $gameUrl }
