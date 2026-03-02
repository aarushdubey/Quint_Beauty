<?php
// webhook.php - Listen for Razorpay Success & Send Email

// -----------------------------------------------------------------------------
// 0. Secret for Security (Must match the one you set in Razorpay Dashboard)
// -----------------------------------------------------------------------------
$webhook_secret = 'quint_webhook_secret_123';

// -----------------------------------------------------------------------------
// 1. Verify Webhook Signature
// -----------------------------------------------------------------------------
$payload = file_get_contents('php://input');
$received_signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'];

$expected_signature = hash_hmac('sha256', $payload, $webhook_secret);

if ($expected_signature !== $received_signature) {
    // Invalid request - reject it
    http_response_code(400);
    exit();
}

// -----------------------------------------------------------------------------
// 2. Parse Data
// -----------------------------------------------------------------------------
$data = json_decode($payload, true);

// Check if it's a "payment.captured" event (Success)
if ($data['event'] === 'payment.captured') {

    $payment = $data['payload']['payment']['entity'];

    // Extract info we saved in "notes" during order creation
    $email = $payment['notes']['email'];
    $name = $payment['notes']['name'];
    $items = $payment['notes']['items_summary'];
    $amount = $payment['amount'] / 100; // Convert back to Rupees

    if ($email) {
        // Emails are handled by EmailJS on the client-side (verify-payment.php)
        // with proper HTML templates. No server-side plain text email needed.
        // Log the successful payment for reference.
        $logMessage = date('Y-m-d H:i:s') . " - Payment captured: ₹$amount from $name ($email) - Items: $items\n";
        file_put_contents('payment_log.txt', $logMessage, FILE_APPEND);
    }
}

http_response_code(200);
?>