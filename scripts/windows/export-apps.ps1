#Requires -Version 5.1
<#
.SYNOPSIS
    Refreshes the Windows app backup in this folder.

.DESCRIPTION
    Exports every winget-managed app on this machine into:
      winget-packages.json           - versionless list used by install-apps.ps1
      winget-packages.versions.json  - same list with installed versions (archival)
      installed-apps.txt             - full `winget list` snapshot (includes
                                       store/MSIX/ARP apps winget cannot export)

    Run this after installing or removing apps, then commit the changes.

.EXAMPLE
    .\export-apps.ps1
#>
[CmdletBinding()]
param(
    [string]$OutputDirectory = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw 'winget was not found. Install "App Installer" first: https://apps.microsoft.com/detail/9nblggh4nns1'
}

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

$plainPath = Join-Path $OutputDirectory 'winget-packages.json'
$versionedPath = Join-Path $OutputDirectory 'winget-packages.versions.json'
$listPath = Join-Path $OutputDirectory 'installed-apps.txt'

Write-Host 'Exporting package list...'
winget export --output $plainPath --accept-source-agreements
if ($LASTEXITCODE -ne 0) {
    throw "winget export failed with exit code $LASTEXITCODE"
}

Write-Host 'Exporting package list with versions...'
winget export --include-versions --output $versionedPath --accept-source-agreements
if ($LASTEXITCODE -ne 0) {
    throw "winget export (versions) failed with exit code $LASTEXITCODE"
}

Write-Host 'Writing full installed-apps snapshot...'
winget list --accept-source-agreements | Out-File -FilePath $listPath -Encoding utf8
if ($LASTEXITCODE -ne 0) {
    throw "winget list failed with exit code $LASTEXITCODE"
}

Write-Host ''
Write-Host "Updated: $plainPath"
Write-Host "Updated: $versionedPath"
Write-Host "Updated: $listPath"
Write-Host 'Commit the changes to keep the backup current.' -ForegroundColor Green
