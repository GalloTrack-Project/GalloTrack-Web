#Requires -Version 5.1
# Pins the GalloTrack managed Supabase project auth config so production
# email OTP codes are strictly 6 digits.
#
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."     # PAT (Account -> Access Tokens)
#   powershell -ExecutionPolicy Bypass -File supabase\set_otp_length.ps1
#
# The Management API (api.supabase.com) requires a PAT ("sbp_..."). The
# service role key / anon key in .env.local CANNOT be used for this endpoint.
$ErrorActionPreference = 'Stop'

$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
  Write-Error ("SUPABASE_ACCESS_TOKEN is not set. Run the following first: " + "`$env:SUPABASE_ACCESS_TOKEN = 'sbp_...'")
}

$base = 'https://api.supabase.com/v1/projects/mjvsbzayumcxmjcokwki/config/auth'
$headers = @{ Authorization = "Bearer $token" }

function Invoke-Api([string]$Method) {
  try {
    $res = Invoke-RestMethod -Method $Method -Uri $base -Headers $headers -ContentType 'application/json; charset=utf-8' -Body (@{ mailer_otp_length = 6 } | ConvertTo-Json)
    return $res
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

Write-Output ('Current auth config: GET ' + $base)
$before = Invoke-RestMethod -Method Get -Uri $base -Headers $headers
Write-Output ('    before mailer_otp_length = ' + $before.mailer_otp_length)

Write-Output 'Patching mailer_otp_length to 6 ...'
Invoke-Api 'Patch' | Out-Null

Write-Output 'Verifying ...'
$after = Invoke-RestMethod -Method Get -Uri $base -Headers $headers
Write-Output ('    after  mailer_otp_length = ' + $after.mailer_otp_length)

if ([string]$after.mailer_otp_length -eq '6') {
  Write-Output 'OK  Production email OTP length is now 6 digits.'
} else {
  Write-Error "Expected mailer_otp_length = 6 but got '$($after.mailer_otp_length)'."
}