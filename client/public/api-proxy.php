<?php
// Simple API proxy for Hostinger shared hosting
// Forwards /api requests to VPS backend

$vps_ip = '187.127.130.81'; // Your VPS IP
$vps_port = '4000';

// Get the request path after /api
$request_uri = $_SERVER['REQUEST_URI'];
$api_path = preg_replace('/^.*\/api/', '', $request_uri);

// Build the target URL
$target_url = "http://{$vps_ip}:{$vps_port}/api{$api_path}";

// Forward the request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Forward headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host') {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward body for POST/PUT/PATCH/DELETE
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $body = file_get_contents('php://input');
    if ($body !== '') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$err = curl_errno($ch);
$http_code = $err ? 0 : (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($err || $response === false || $http_code < 100) {
  http_response_code(503);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'Backend unavailable. Is the API server running on the VPS?']);
  exit;
}

http_response_code($http_code >= 100 ? $http_code : 500);
header('Content-Type: application/json');
echo $response;