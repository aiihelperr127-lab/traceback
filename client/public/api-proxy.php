<?php
/**
 * Forwards /api/* to Node. $BACKEND = your VPS (e.g. http://IP:4000).
 * Authorization must be forwarded — .htaccess RewriteRule E=HTTP_AUTHORIZATION is required.
 */
declare(strict_types=1);

$BACKEND = 'http://187.127.130.81:4000';

if (strpos($BACKEND, 'YOUR_VPS') !== false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Set $BACKEND in api-proxy.php']);
    exit;
}

$path = isset($_GET['__api_path']) ? (string) $_GET['__api_path'] : '';
$path = trim($path, '/');
$url  = rtrim($BACKEND, '/') . '/api/' . $path;

$params = $_GET;
unset($params['__api_path']);
if ($params !== []) {
    $url .= '?' . http_build_query($params);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$headers = [];

// LiteSpeed strips Authorization; X-Auth-Token is forwarded (client sends both)
$headersToForward = ['authorization', 'x-auth-token', 'content-type', 'origin'];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $l = strtolower((string) $name);
        if (in_array($l, $headersToForward, true) && (string) $value !== '') {
            $headers[] = $name . ': ' . $value;
        }
    }
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER         => true,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTPHEADER     => $headers,
]);

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $body = file_get_contents('php://input');
    if ($body !== '') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$raw = curl_exec($ch);
if ($raw === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'API proxy cannot reach backend', 'curl_error' => curl_error($ch)]);
    exit;
}

$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);
$respBody = substr($raw, $headerSize);

http_response_code($code > 0 ? $code : 502);
header('Content-Type: application/json; charset=utf-8');
echo $respBody;
