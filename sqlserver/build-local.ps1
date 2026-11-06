$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$env:SQL_API_URL='http://127.0.0.1:4780'
node scripts/build.mjs
if($LASTEXITCODE -ne 0){throw 'Web build failed'}
node scripts/build-mobile.mjs
if($LASTEXITCODE -ne 0){throw 'Mobile build failed'}
