<?php
/**
 * Check Payment Status
 * Called by mobile-payment-bridge.js to verify if a payment was completed
 */

header('Content-Type: application/json');

$key_id = 'rzp_live_S83Chu6RWaxfaV';
$key_secret = 'glCoiM7Eq1KKevTp1OyNkbL1';

$order_id = $_GET['order_id'] ?? null;

if (!$order_id) {
    echo json_encode(['success' => false, 'error' => 'No order_id provided']);
    exit;
}

// Fetch order details from Razorpay
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/orders/' . $order_id);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['success' => false, 'error' => 'Order not found']);
    exit;
}

$orderData = json_decode($result, true);

// Check if order exists and has payments
if (!$orderData || !isset($orderData['id'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid order data']);
    exit;
}

// Now fetch all payments for this order
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/orders/' . $order_id . '/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

$result = curl_exec($ch);
curl_close($ch);

$paymentsData = json_decode($result, true);

// Check if any payment is captured
$capturedPayment = null;
if (isset($paymentsData['items']) && count($paymentsData['items']) > 0) {
    foreach ($paymentsData['items'] as $payment) {
        if ($payment['status'] === 'captured' || $payment['status'] === 'authorized') {
            $capturedPayment = $payment;
            break;
        }
    }
}

if ($capturedPayment) {
    // Payment successful!
    echo json_encode([
        'success' => true,
        'payment_status' => $capturedPayment['status'],
        'payment_id' => $capturedPayment['id'],
        'order_id' => $order_id,
        'amount' => $capturedPayment['amount'] / 100
    ]);
} else {
    // No captured payment found
    $status = isset($paymentsData['items'][0]) ? $paymentsData['items'][0]['status'] : 'pending';
    echo json_encode([
        'success' => false,
        'payment_status' => $status,
        'order_id' => $order_id
    ]);
}
?>