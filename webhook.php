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
        // -----------------------------------------------------------------------------
        // 3. Send Email (Server-Side Reliability)
        // -----------------------------------------------------------------------------
        $to = $email;
        $subject = "Order Confirmed - Quint Beauty";

        $message = "
        Hi $name,
        
        Thank you for your order! We have received your payment of ₹$amount.
        
        Order Details:
        $items
        
        We will ship your items shortly.
        
        Regards,
        Quint Beauty Team
        ";

        $headers = "From: no-reply@quintbeauty.com" . "\r\n" .
            "Reply-To: support@quintbeauty.com" . "\r\n" .
            "X-Mailer: PHP/" . phpversion();

        // Send user email
        mail($to, $subject, $message, $headers);

        // Send admin notification
        mail('beautyquint@gmail.com', "New Order from $name", "New payment of ₹$amount. Items: $items", $headers);
    }
}

http_response_code(200);
?>