# Captures README screenshots with headless Edge.
# Needs `npm run dev` running (for the dev-only /dev/board preview).
# Usage: powershell -File scripts/screenshots.ps1 [-Base http://localhost:3000]
param([string]$Base = "http://localhost:3000")
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$out = Join-Path $PSScriptRoot "..\docs\assets"
$prof = Join-Path $env:TEMP "retro-shot-profile"

$shots = @(
  @{ name = "landing-dark";    url = "$Base/";                         lang = "en"; dark = $true;  w = 1440; h = 860 },
  @{ name = "landing-light";   url = "$Base/";                         lang = "en"; dark = $false; w = 1440; h = 860 },
  @{ name = "board-dark";      url = "$Base/dev/board?phase=discussion"; lang = "en"; dark = $true;  w = 1440; h = 940 },
  @{ name = "voting-ar";       url = "$Base/dev/board?phase=voting";     lang = "ar"; dark = $false; w = 1440; h = 940 },
  @{ name = "action-plan";     url = "$Base/dev/board?phase=action_plan"; lang = "en"; dark = $true;  w = 1440; h = 1100 },
  @{ name = "lobby";           url = "$Base/dev/board?phase=lobby";      lang = "en"; dark = $false; w = 1440; h = 820 }
)

foreach ($s in $shots) {
  $edgeArgs = @(
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--user-data-dir=$prof-$($s.name)",
    "--lang=$($s.lang)",
    "--window-size=$($s.w),$($s.h)",
    "--virtual-time-budget=6000",
    "--screenshot=$out\$($s.name).png"
  )
  if ($s.dark) { $edgeArgs += "--force-dark-mode"; $edgeArgs += "--blink-settings=preferredColorScheme=0" }
  else { $edgeArgs += "--blink-settings=preferredColorScheme=1" }
  $edgeArgs += $s.url
  Start-Process -FilePath $edge -ArgumentList $edgeArgs -Wait -WindowStyle Hidden | Out-Null
  Write-Output "$($s.name): $(Test-Path "$out\$($s.name).png")"
}
