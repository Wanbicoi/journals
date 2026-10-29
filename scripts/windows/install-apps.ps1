#Requires -Version 5.1
<#
.SYNOPSIS
    Reinstalls the Windows apps backed up in winget-packages.json.

.DESCRIPTION
    Reads winget-packages.json (a `winget export` manifest), imports every
    package with `winget import`, and skips anything already installed.
    Packages that are no longer available from their source are ignored.

.PARAMETER Manifest
    Path to the winget export manifest. Defaults to winget-packages.json
    next to this script.

.PARAMETER List
    Only print the packages in the manifest; do not install anything.

.EXAMPLE
    .\install-apps.ps1 -List

.EXAMPLE
    .\install-apps.ps1

.NOTES
    Run from an elevated PowerShell if you want apps that require admin
    (Visual Studio Build Tools, TeamViewer, OpenVPN, ...) to install without
    repeated UAC prompts.
#>
[CmdletBinding()]
param(
    [string]$Manifest = (Join-Path $PSScriptRoot 'winget-packages.json'),
    [switch]$List
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw 'winget was not found. Install "App Installer" first: https://apps.microsoft.com/detail/9nblggh4nns1'
}

if (-not (Test-Path -LiteralPath $Manifest)) {
    throw "Manifest not found: $Manifest"
}

$data = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$packages = @(
    foreach ($source in $data.Sources) {
        $sourceName = $source.SourceDetails.Name
        foreach ($package in $source.Packages) {
            [pscustomobject]@{
                Id     = $package.PackageIdentifier
                Source = $sourceName
            }
        }
    }
)

if ($packages.Count -eq 0) {
    throw "No packages found in $Manifest"
}

Write-Host "Manifest: $Manifest"
Write-Host ("Packages: {0}" -f $packages.Count)

if ($List) {
    $packages | Sort-Object Source, Id | Format-Table -AutoSize | Out-String | Write-Host
    return
}

$wingetArgs = @(
    'import'
    '--import-file', $Manifest
    '--accept-package-agreements'
    '--accept-source-agreements'
    '--ignore-unavailable'
    '--no-upgrade'
)

Write-Host "Running: winget $($wingetArgs -join ' ')"
winget @wingetArgs
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host 'All available packages are installed.' -ForegroundColor Green
    return
}

Write-Warning "winget import exited with code $exitCode. Some packages may have failed."
Write-Warning 'Rerun this script, or install the missing apps from installed-apps.txt.'
exit $exitCode
