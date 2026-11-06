$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$previousUrl = $env:SQL_API_URL
try {
    $env:SQL_API_URL = 'http://10.0.2.2:4782'
    node scripts/build-mobile.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Mobile build failed' }
    node node_modules/@capacitor/cli/bin/capacitor sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
    Push-Location android
    try {
        ./gradlew.bat assembleSqlEmulator '-Pandroid.overridePathCheck=true'
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
    } finally { Pop-Location }
} finally { $env:SQL_API_URL = $previousUrl }
