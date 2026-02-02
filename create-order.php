<?php
// create-order.php

// -----------------------------------------------------------------------------
// 1. Secure Headers & CORS
// -----------------------------------------------------------------------------
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow from any domain (or strict it to your domain)
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle pre-flight checks
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

// -----------------------------------------------------------------------------
// 2. Configuration (Edit these)
// -----------------------------------------------------------------------------
$key_id = 'rzp_live_S83Chu6RWaxfaV';
$key_secret = 'glCoiM7Eq1KKevTp1OyNkbL1'; // Keep this safe!

// -----------------------------------------------------------------------------
// 3. Get Request Body
// -----------------------------------------------------------------------------
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['amount'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Amount is required']);
    exit();
}

$amount = $data['amount'];
$notes = isset($data['notes']) ? $data['notes'] : []; // Capture notes (email, address, etc.)

// -----------------------------------------------------------------------------
// 4. Call Razorpay API (Create Order)
// -----------------------------------------------------------------------------

$url = 'https://api.razorpay.com/v1/orders';

$fields = [
    'amount' => $amount,
    'currency' => 'INR',
    'receipt' => 'order_' . time(),
    'payment_capture' => 1,
    'notes' => $notes // Pass notes to Razorpay
];

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret); // Auth
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$err = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// -----------------------------------------------------------------------------
// 5. Return Response to Frontend
// -----------------------------------------------------------------------------

if ($err) {
    http_response_code(500);
    echo json_encode(['error' => 'Curl Error: ' . $err]);
} elseif ($http_code !== 200) {
    http_response_code($http_code);
    echo $response; // Return Razorpay's error message
} else {
    echo $response; // Return successful Order object
}
?>