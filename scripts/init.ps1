$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env from .env.example. Change demo credentials before exposing the stack publicly.'
}

docker compose up -d --build db wordpress frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose run --rm wp-cli /scripts/bootstrap-wp.sh
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose ps
