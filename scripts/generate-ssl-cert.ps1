$ErrorActionPreference = "Stop"

$certDir = "certs"
$certFile = Join-Path $certDir "red-tetris.crt"
$keyFile = Join-Path $certDir "red-tetris.key"
$hostnameShort = ($env:HOSTNAME, $env:COMPUTERNAME, "localhost" | Where-Object { $_ } | Select-Object -First 1) -replace "\..*", ""

New-Item -ItemType Directory -Force -Path $certDir | Out-Null

if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Write-Host "SSL certificate already exists in $certDir"
    exit 0
}

$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
    "CN=$hostnameShort",
    $rsa,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)

$sanBuilder = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$sanBuilder.AddDnsName($hostnameShort)
$sanBuilder.AddDnsName("localhost")
$sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("127.0.0.1"))
$request.CertificateExtensions.Add($sanBuilder.Build())

$request.CertificateExtensions.Add(
    [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true)
)
$request.CertificateExtensions.Add(
    [System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(
        [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor
        [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment,
        $true
    )
)

$ekuOids = [System.Security.Cryptography.OidCollection]::new()
$ekuOids.Add([System.Security.Cryptography.Oid]::new("1.3.6.1.5.5.7.3.1")) | Out-Null
$request.CertificateExtensions.Add(
    [System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($ekuOids, $false)
)

$notBefore = [System.DateTimeOffset]::Now.AddDays(-1)
$notAfter = $notBefore.AddDays(365)
$cert = $request.CreateSelfSigned($notBefore, $notAfter)

function Write-Asn1Length {
    param([System.IO.MemoryStream] $Stream, [int] $Length)

    if ($Length -lt 128) {
        $Stream.WriteByte($Length)
        return
    }

    $bytes = @()
    while ($Length -gt 0) {
        $bytes = @($Length -band 0xff) + $bytes
        $Length = $Length -shr 8
    }

    $Stream.WriteByte(0x80 -bor $bytes.Count)
    foreach ($byte in $bytes) {
        $Stream.WriteByte($byte)
    }
}

function Write-Asn1Integer {
    param([System.IO.MemoryStream] $Stream, [byte[]] $Value)

    $offset = 0
    while ($offset -lt ($Value.Length - 1) -and $Value[$offset] -eq 0) {
        $offset++
    }

    $normalized = $Value[$offset..($Value.Length - 1)]
    if (($normalized[0] -band 0x80) -ne 0) {
        $normalized = [byte[]] (@(0) + $normalized)
    }

    $Stream.WriteByte(0x02)
    Write-Asn1Length $Stream $normalized.Length
    $Stream.Write($normalized, 0, $normalized.Length)
}

function Export-RsaPrivateKeyDer {
    param([System.Security.Cryptography.RSA] $Rsa)

    $params = $Rsa.ExportParameters($true)
    $body = [System.IO.MemoryStream]::new()

    Write-Asn1Integer $body ([byte[]] @(0))
    Write-Asn1Integer $body $params.Modulus
    Write-Asn1Integer $body $params.Exponent
    Write-Asn1Integer $body $params.D
    Write-Asn1Integer $body $params.P
    Write-Asn1Integer $body $params.Q
    Write-Asn1Integer $body $params.DP
    Write-Asn1Integer $body $params.DQ
    Write-Asn1Integer $body $params.InverseQ

    $bodyBytes = $body.ToArray()
    $sequence = [System.IO.MemoryStream]::new()
    $sequence.WriteByte(0x30)
    Write-Asn1Length $sequence $bodyBytes.Length
    $sequence.Write($bodyBytes, 0, $bodyBytes.Length)
    $sequence.ToArray()
}

$certPem = "-----BEGIN CERTIFICATE-----`n" +
    [Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [Base64FormattingOptions]::InsertLineBreaks) +
    "`n-----END CERTIFICATE-----`n"

$keyPem = "-----BEGIN RSA PRIVATE KEY-----`n" +
    [Convert]::ToBase64String((Export-RsaPrivateKeyDer $rsa), [Base64FormattingOptions]::InsertLineBreaks) +
    "`n-----END RSA PRIVATE KEY-----`n"

[System.IO.File]::WriteAllText((Resolve-Path $certDir).Path + "\red-tetris.crt", $certPem)
[System.IO.File]::WriteAllText((Resolve-Path $certDir).Path + "\red-tetris.key", $keyPem)

Write-Host "Generated self-signed SSL certificate in $certDir"
