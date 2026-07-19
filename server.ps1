$r="C:\Users\LENOVO\perfume-shop"
$m=@{'.html'='text/html; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.css'='text/css; charset=utf-8'}
$l=New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:9090/")
$l.Start()
while($l.IsListening){
 $c=$l.GetContext()
 $rr=$c.Response
 $p=$c.Request.Url.LocalPath
 if($p-eq'/'){$p='/home.html'}
 $f=Join-Path $r $p.TrimStart('/')
 if(Test-Path $f){
   $e=[System.IO.Path]::GetExtension($f)
   $rr.ContentType=if($m.ContainsKey($e)){$m[$e]}else{'application/octet-stream'}
   $b=[System.IO.File]::ReadAllBytes($f)
   $rr.ContentLength64=$b.Length
   $rr.OutputStream.Write($b,0,$b.Length)
 }else{$rr.StatusCode=404}
 $rr.Close()
}
$l.Stop()
