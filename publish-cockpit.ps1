# publish-cockpit.ps1 — Flow Cockpit per FTPS auf die Subdomains bringen (seit 03.09.2026)
#   site\va\  → va.vishnuartists.com    (Vishnu-Instanz, Zugangsschutz per .htaccess; inkl. va-data.json als Startstand)
#   site\     → demo.vishnuartists.com/cockpit/   (Starter-Demo + Hilfe; der Ordner va\ bleibt hier aussen vor)
#
#   Der eigentliche Weg ist deploy.yml (GitHub → KAS). Dieses Skript ist der zweite Weg von diesem Rechner aus,
#   nach dem Muster von publish-compass.ps1 im Repo flow-compass: solange dem Repo die Secrets FTP_SERVER /
#   FTP_USERNAME / FTP_PASSWORD fehlen, liefert nur dieser Weg wirklich aus. Beide schreiben dieselben Bytes,
#   jeder mit eigenem Stand; geloescht wird hier nie.
#   Nur Dateien, deren Hash sich seit dem letzten Upload geaendert hat (site\.publish-state\<sub>.json, gitignored).
#   Zugang ausschliesslich aus User-Umgebungsvariablen: VA_FTP_HOST, VA_FTP_USER, VA_FTP_PASS (nie in Dateien).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File publish-cockpit.ps1   [-NurVa] [-NurStarter]
param([switch]$NurVa, [switch]$NurStarter)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$log  = Join-Path $repo 'publish-cockpit.log'
function Log($m) { $line = "{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m; Add-Content -Path $log -Value $line -Encoding UTF8; Write-Host $line }

function Hole-FtpZugang {
  $z = @{}
  foreach ($k in 'VA_FTP_HOST','VA_FTP_USER','VA_FTP_PASS') {
    $v = [Environment]::GetEnvironmentVariable($k, 'User'); if (-not $v) { $v = [Environment]::GetEnvironmentVariable($k, 'Process') }
    if (-not $v) { return $null }
    $z[$k] = $v.Trim()
  }
  return $z
}
function Neu-FtpAnfrage($zugang, [string]$fernPfad, [string]$methode) {
  $a = [Net.FtpWebRequest]::Create('ftp://' + $zugang.VA_FTP_HOST + $fernPfad)
  $a.Credentials = New-Object Net.NetworkCredential($zugang.VA_FTP_USER, $zugang.VA_FTP_PASS)
  $a.EnableSsl = $true; $a.UsePassive = $true; $a.UseBinary = $true; $a.KeepAlive = $false
  $a.Timeout = 30000; $a.ReadWriteTimeout = 60000
  $a.Method = $methode
  return $a
}
function Sichere-FtpOrdner($zugang, [string]$fernPfad) {
  try { $r = (Neu-FtpAnfrage $zugang $fernPfad ([Net.WebRequestMethods+Ftp]::MakeDirectory)).GetResponse(); $r.Close() }
  catch { if ("$($_.Exception.Message)" -notmatch '550') { throw } }   # 550 = gibt es schon
}
function Lade-FtpHoch($zugang, [string]$lokal, [string]$fernPfad) {
  $bytes = [IO.File]::ReadAllBytes($lokal)
  $a = Neu-FtpAnfrage $zugang $fernPfad ([Net.WebRequestMethods+Ftp]::UploadFile)
  $a.ContentLength = $bytes.Length
  $s = $a.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
  $r = $a.GetResponse(); $r.Close()
}
function Hash([string]$p) { (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash }

$stateDir = Join-Path $repo 'site\.publish-state'
if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Force $stateDir | Out-Null }

# $ohne: Unterordner (relativ, mit Schraegstrich) die NICHT mit sollen — site\va geht als eigenes Ziel.
function Lade-Ordner($zugang, [string]$lokal, [string]$fernBasis, [string]$stateName, [string]$was, [string[]]$ohne = @()) {
  if (-not (Test-Path $lokal)) { Log ("WARNUNG: {0} — {1} fehlt, nichts hochzuladen." -f $was, $lokal); return }
  $stateDatei = Join-Path $stateDir "$stateName.json"
  $state = @{}
  if (Test-Path $stateDatei) { try { $j = (Get-Content -LiteralPath $stateDatei -Raw -Encoding UTF8) | ConvertFrom-Json; foreach ($p in $j.PSObject.Properties) { $state[$p.Name] = [string]$p.Value } } catch { $state = @{} } }
  $dateien = @(Get-ChildItem -LiteralPath $lokal -Recurse -File -Force | Where-Object { $_.Name -notlike '.publish-state*' -and $_.Name -notlike '.ftp-*' })
  $hoch = 0; $fehler = 0; $ordnerDa = @{}
  foreach ($f in $dateien) {
    $rel = $f.FullName.Substring($lokal.Length).TrimStart('\').Replace('\', '/')
    $raus = $false; foreach ($o in $ohne) { if ($rel.StartsWith($o)) { $raus = $true } }; if ($raus) { continue }
    $h = Hash $f.FullName
    if ($state.ContainsKey($rel) -and $state[$rel] -eq $h) { continue }
    try {
      $teile = $rel.Split('/'); $pfad = $fernBasis
      for ($i = 0; $i -lt $teile.Count - 1; $i++) { $pfad = $pfad + '/' + $teile[$i]; if (-not $ordnerDa.ContainsKey($pfad)) { Sichere-FtpOrdner $zugang $pfad; $ordnerDa[$pfad] = $true } }
      Lade-FtpHoch $zugang $f.FullName ($fernBasis + '/' + $rel)
      $state[$rel] = $h; $hoch++
    } catch { $fehler++; Log "FEHLER beim Upload von $rel : $($_.Exception.Message)" }
  }
  try { [IO.File]::WriteAllText($stateDatei, ($state | ConvertTo-Json), (New-Object Text.UTF8Encoding($false))) } catch { }
  Log ("{0}: {1} Datei(en) hochgeladen, {2} Fehler → {3}" -f $was, $hoch, $fehler, $fernBasis)
}

$zugang = Hole-FtpZugang
if (-not $zugang) { Log 'ABBRUCH: FTP-Zugang fehlt (User-Umgebungsvariablen VA_FTP_HOST / VA_FTP_USER / VA_FTP_PASS).'; return }
Sichere-FtpOrdner $zugang '/demo.vishnuartists.com/cockpit'
if (-not $NurStarter) { Lade-Ordner $zugang (Join-Path $repo 'site\va') '/va.vishnuartists.com' 'va' 'Vishnu-Instanz (va.)' }
if (-not $NurVa)      { Lade-Ordner $zugang (Join-Path $repo 'site')    '/demo.vishnuartists.com/cockpit' 'demo-cockpit' 'Starter + Hilfe (demo./cockpit/)' @('va/', '.publish-state/') }
