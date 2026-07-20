$r = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 9091
$m = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
}

$dataDir = Join-Path $r "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }

$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:${port}/")
try {
    # Try to bind to all interfaces (requires admin)
    $l2 = New-Object System.Net.HttpListener
    $l2.Prefixes.Add("http://+:${port}/")
    $l2.Start()
    $l2.Stop()
    # If we got here, + works; add it
    $l.Prefixes.Add("http://+:${port}/")
    Write-Host "Network access enabled (admin mode)"
} catch {
    Write-Host "For phone access, run PowerShell as Administrator"
}

$l.Start()
Write-Host "VORA Server running on http://localhost:${port}"
Write-Host "Open http://localhost:${port} in your browser"
Write-Host "Press Ctrl+C to stop"

while ($l.IsListening) {
    $c = $l.GetContext()
    $rr = $c.Response
    $method = $c.Request.HttpMethod
    $p = $c.Request.Url.LocalPath

    try {
        if ($method -eq 'POST' -and $p -eq '/api/data') {
            $reader = New-Object System.IO.StreamReader($c.Request.InputStream)
            $body = $reader.ReadToEnd()
            $reader.Close()
            $data = $body | ConvertFrom-Json
            $collection = $data.collection
            $payload = $data.data
            $file = Join-Path $dataDir "$collection.json"
            if ($data.action -eq 'save') {
                $payload | ConvertTo-Json -Depth 10 | Set-Content -Path $file -Encoding UTF8
                $resp = @{ success = $true } | ConvertTo-Json
            } else {
                if (Test-Path $file) {
                    $resp = Get-Content $file -Raw -Encoding UTF8
                } else {
                    $resp = '[]'
                }
            }
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($resp)
            $rr.ContentType = 'application/json; charset=utf-8'
            $rr.ContentLength64 = $buffer.Length
            $rr.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        elseif ($method -eq 'GET' -and $p -match '^/api/(.+)') {
            $collection = $Matches[1]
            $file = Join-Path $dataDir "$collection.json"
            if (Test-Path $file) {
                $resp = Get-Content $file -Raw -Encoding UTF8
            } else {
                $resp = '[]'
            }
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($resp)
            $rr.ContentType = 'application/json; charset=utf-8'
            $rr.ContentLength64 = $buffer.Length
            $rr.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        else {
            if ($p -eq '/') { $p = '/home.html' }
            $f = Join-Path $r $p.TrimStart('/')
            if (Test-Path $f) {
                $e = [System.IO.Path]::GetExtension($f)
                $rr.ContentType = if ($m.ContainsKey($e)) { $m[$e] } else { 'application/octet-stream' }
                $b = [System.IO.File]::ReadAllBytes($f)
                $rr.ContentLength64 = $b.Length
                $rr.OutputStream.Write($b, 0, $b.Length)
            } else {
                $rr.StatusCode = 404
            }
        }
    } catch {
        try {
            $rr.StatusCode = 500
            $err = @{ error = $_.Exception.Message } | ConvertTo-Json
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($err)
            $rr.ContentType = 'application/json; charset=utf-8'
            $rr.ContentLength64 = $buffer.Length
            $rr.OutputStream.Write($buffer, 0, $buffer.Length)
        } catch {}
    }
    $rr.Close()
}
$l.Stop()
