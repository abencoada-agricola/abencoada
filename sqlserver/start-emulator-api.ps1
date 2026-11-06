$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$env:PORT = '4782'
$env:SQL_API_HOST = '127.0.0.1'
$env:SQL_ALLOWED_ORIGINS = 'http://localhost,http://10.0.2.2:4782,http://127.0.0.1:4782'
node sqlserver/server.mjs
