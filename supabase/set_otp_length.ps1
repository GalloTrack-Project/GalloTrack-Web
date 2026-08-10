#Requires -Version 5.1
# Pins the GalloTrack managed Supabase project auth config so production
# email OTP codes are strictly 6 digits.
#
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   powershell -ExecutionPolicy Bypass -File supabase\set_otp_length.ps1
#
# Token: Supabase Dashboard -> Account -> Access Tokens -> Generate new token.
$ErrorActionPreference = 'Stop'

$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
  Write-Error ("SUPABASE_ACCESS_TOKEN is not set. Run the following first: " + "`$env:SUPABASE_ACCESS_TOKEN = 'sbp_...'")
}

$uris = @(
  'https://api.supabase.com/v1/projects/mjvsbzayumcxmjcokwki/config/auth'
)

foreach ($uri in $uris) {
  try {
    $res = Invoke-RestMethod -Method Patch -Uri $uri `
      -Headers @{ Authorization = "Bearer $token" } `
      -ContentType 'application/json; charset=utf-8' `
      -Body (@{ mailer_otp_length = 6 } | ConvertTo-Json)

    Write-Output ("OK  $uri")
    Write-Output ('    mailer_otp_length = ' + $res.mailer_otp_length)
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $errBody = $reader.ReadToEnd()
      Write-Error ("Status " + [int]$resp.StatusCode + ": " + $errBody)
    } else {
      Write-Error $_.Exception.Message
    }
  }
}