# Server lokal kecil untuk simulasi (browser memblokir modul JS dari file://).
# Pakai: klik kanan > Run with PowerShell, atau jalankan "Buka simulasi.bat".
param([int]$Port = 8137, [switch]$TanpaBuka)
$akar = $PSScriptRoot
$tipe = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.png'='image/png'; '.svg'='image/svg+xml'; '.json'='application/json' }
$dengar = New-Object System.Net.HttpListener
$dengar.Prefixes.Add("http://localhost:$Port/")
try { $dengar.Start() } catch { Write-Host "Port $Port sedang dipakai. Tutup jendela server lain atau jalankan: .\jalankan.ps1 -Port 8140"; Read-Host 'Tekan Enter untuk keluar'; exit 1 }
$url = "http://localhost:$Port/"
Write-Host "Simulasi berjalan di $url"
Write-Host 'Biarkan jendela ini terbuka. Tutup jendela untuk menghentikan server.'
if (-not $TanpaBuka) { Start-Process $url }
while ($dengar.IsListening) {
  $k = $dengar.GetContext()
  $jalur = [Uri]::UnescapeDataString($k.Request.Url.AbsolutePath.TrimStart('/'))
  if ($jalur -eq '') { $jalur = 'index.html' }
  $berkas = [IO.Path]::GetFullPath((Join-Path $akar $jalur))
  if ($berkas.StartsWith($akar) -and (Test-Path $berkas -PathType Leaf)) {
    $isi = [IO.File]::ReadAllBytes($berkas)
    $ext = [IO.Path]::GetExtension($berkas).ToLower()
    $k.Response.ContentType = if ($tipe.ContainsKey($ext)) { $tipe[$ext] } else { 'application/octet-stream' }
    $k.Response.OutputStream.Write($isi, 0, $isi.Length)
  } else { $k.Response.StatusCode = 404 }
  $k.Response.Close()
}
