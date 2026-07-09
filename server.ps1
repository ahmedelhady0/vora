$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server started at http://localhost:$port" -ForegroundColor Green
Write-Host "Open http://localhost:$port/index.html in your browser" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/home.html" }
        
        $filePath = Join-Path $root ($localPath.TrimStart("/").Replace("/", "\"))
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentTypes = @{
                ".html" = "text/html; charset=utf-8"
                ".css"  = "text/css; charset=utf-8"
                ".js"   = "application/javascript; charset=utf-8"
                ".json" = "application/json; charset=utf-8"
                ".png"  = "image/png"
                ".jpg"  = "image/jpeg"
                ".svg"  = "image/svg+xml"
            }
            $contentType = $contentTypes[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found")
            $response.StatusCode = 404
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "Server stopped." -ForegroundColor Red
}
