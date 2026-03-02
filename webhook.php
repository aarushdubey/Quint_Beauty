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
    $email = $payment['notes']['email'] ?? '';
    $name = $payment['notes']['name'] ?? 'Customer';
    $firstName = $payment['notes']['firstName'] ?? $name;
    $lastName = $payment['notes']['lastName'] ?? '';
    $phone = $payment['notes']['phone'] ?? '';
    $address = $payment['notes']['address'] ?? '';
    $city = $payment['notes']['city'] ?? '';
    $state = $payment['notes']['state'] ?? '';
    $zipCode = $payment['notes']['zipCode'] ?? '';
    $items = $payment['notes']['items_summary'] ?? '';
    $amount = $payment['amount'] / 100; // Convert back to Rupees
    $paymentId = $payment['id'] ?? '';
    $orderId = $payment['order_id'] ?? '';

    // Build full address
    $fullAddress = $address;
    if ($city)
        $fullAddress .= ", $city";
    if ($state)
        $fullAddress .= ", $state";
    if ($zipCode)
        $fullAddress .= " $zipCode";

    // Log payment
    $logMessage = date('Y-m-d H:i:s') . " - Payment captured: ₹$amount from $name ($email) - Items: $items\n";
    file_put_contents('payment_log.txt', $logMessage, FILE_APPEND);

    // Build items HTML for email
    $itemsArr = explode(', ', $items);
    $itemsHTML = '';
    foreach ($itemsArr as $item) {
        $itemsHTML .= '<table style="width: 100%; border-collapse: collapse">
            <tr style="vertical-align: top">
              <td style="padding: 12px 0;">
                <strong style="font-size:14px; display:block;">' . htmlspecialchars($item) . '</strong>
              </td>
            </tr>
        </table>';
    }

    $orderDate = date('d M Y, h:i A');

    // -------------------------------------------------------------------------
    // 3. Send Admin Notification Email (HTML)
    // -------------------------------------------------------------------------
    if ($email) {
        $adminSubject = "New Order from $name";

        $adminBody = '
<div style="background-color:#f9f9f9; padding:40px 0; font-family:Arial, sans-serif; color:#000;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff; padding:40px; border:1px solid #eaeaea;">
        <div style="text-align:center; padding-bottom:30px; border-bottom:2px solid #000;">
            <h1 style="margin:0; font-size:24px; font-weight:bold;">🛍️ NEW ORDER RECEIVED</h1>
        </div>
        <div style="background-color:#f4f4f4; padding:20px; margin:30px 0;">
            <h2 style="margin:0 0 10px 0; font-size:18px;">Order #' . htmlspecialchars($orderId) . '</h2>
            <p style="margin:5px 0; color:#666;">Date: ' . $orderDate . '</p>
            <p style="margin:5px 0; color:#666;">Payment ID: ' . htmlspecialchars($paymentId) . '</p>
        </div>
        <div style="margin-bottom:30px;">
            <h3 style="font-size:16px; margin-bottom:15px; text-transform:uppercase; color:#333;">Customer Details</h3>
            <table style="width:100%; font-size:14px; line-height:1.8;">
                <tr>
                    <td style="color:#666; width:120px;">Name:</td>
                    <td><strong>' . htmlspecialchars($firstName . ' ' . $lastName) . '</strong></td>
                </tr>
                <tr>
                    <td style="color:#666;">Email:</td>
                    <td><strong>' . htmlspecialchars($email) . '</strong></td>
                </tr>
                <tr>
                    <td style="color:#666;">Phone:</td>
                    <td><strong>' . htmlspecialchars($phone) . '</strong></td>
                </tr>
                <tr>
                    <td style="color:#666; vertical-align:top;">Address:</td>
                    <td><strong>' . htmlspecialchars($fullAddress) . '</strong></td>
                </tr>
            </table>
        </div>
        <div style="margin-bottom:30px;">
            <h3 style="font-size:16px; margin-bottom:15px; text-transform:uppercase; color:#333;">Order Items</h3>
            ' . $itemsHTML . '
        </div>
        <div style="border-top:2px solid #eaeaea; padding-top:20px;">
            <table style="width:100%; font-size:14px;">
                <tr>
                    <td style="padding-bottom:10px;">Shipping</td>
                    <td style="text-align:right; padding-bottom:10px;">₹0.00</td>
                </tr>
                <tr>
                    <td style="padding-bottom:10px;">Taxes</td>
                    <td style="text-align:right; padding-bottom:10px;">₹0.00</td>
                </tr>
                <tr style="font-size:18px; font-weight:bold;">
                    <td style="border-top:2px solid #000; padding-top:15px;">Total</td>
                    <td style="border-top:2px solid #000; padding-top:15px; text-align:right;">₹' . number_format($amount, 2) . '</td>
                </tr>
            </table>
        </div>
        <div style="margin-top:40px; text-align:center; font-size:12px; color:#999;">
            <p>This is an automated notification from Quint Beauty</p>
        </div>
    </div>
</div>';

        $adminHeaders = "From: no-reply@quintbeauty.com\r\n";
        $adminHeaders .= "Reply-To: support@quintbeauty.com\r\n";
        $adminHeaders .= "MIME-Version: 1.0\r\n";
        $adminHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
        $adminHeaders .= "X-Mailer: PHP/" . phpversion();

        // Send admin email
        mail('beautyquint@gmail.com', $adminSubject, $adminBody, $adminHeaders);

        // -------------------------------------------------------------------------
        // 4. Send Customer Confirmation Email (HTML)
        // -------------------------------------------------------------------------
        $customerSubject = "Order Confirmed - Quint Beauty";

        $customerBody = '
<div style="background-color:#f9f9f9; padding:40px 0; font-family:\'Times New Roman\', Times, serif; color:#000;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff; padding:40px; border:1px solid #eaeaea;">
        <div style="text-align:center; padding-bottom:30px; border-bottom:1px solid #000;">
            <h1 style="margin:0; font-size:28px; letter-spacing:2px; font-weight:400; text-transform:uppercase;">Quint Beauty</h1>
        </div>
        <div style="padding:40px 0; text-align:center;">
            <h2 style="font-size:20px; font-weight:400; margin-bottom:15px; letter-spacing:0.5px;">Order Confirmed</h2>
            <p style="font-family:Arial, sans-serif; font-size:14px; line-height:1.6; color:#555; margin:0;">
                Hi <strong>' . htmlspecialchars($firstName) . '</strong>,<br>
                Thank you for your purchase. We are getting your order ready to be shipped.
            </p>
        </div>
        <div style="background-color:#f4f4f4; padding:20px; text-align:center; margin-bottom:30px;">
            <span style="font-family:Arial, sans-serif; font-size:12px; color:#666; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:5px;">Order Number</span>
            <span style="font-size:18px;">#' . htmlspecialchars($orderId) . '</span>
        </div>
        <div style="margin-bottom:30px;">
            ' . $itemsHTML . '
        </div>
        <div style="border-top:1px solid #eaeaea; padding-top:20px;">
            <table style="width:100%; font-family:Arial, sans-serif; font-size:14px;">
                <tr>
                    <td style="padding-bottom:10px;">Shipping</td>
                    <td style="text-align:right; padding-bottom:10px;">₹0.00</td>
                </tr>
                <tr>
                    <td style="padding-bottom:10px;">Taxes</td>
                    <td style="text-align:right; padding-bottom:10px;">₹0.00</td>
                </tr>
                <tr style="font-size:16px; font-weight:bold;">
                    <td style="border-top:1px solid #000; padding-top:15px;">Total</td>
                    <td style="border-top:1px solid #000; padding-top:15px; text-align:right;">₹' . number_format($amount, 2) . '</td>
                </tr>
            </table>
        </div>
        <div style="margin-top:60px; text-align:center; font-family:Arial, sans-serif; font-size:12px; color:#999;">
            <p style="margin-bottom:10px;">Need help? Reply to this email.</p>
            <p style="text-transform:uppercase; letter-spacing:1px;">&copy; Quint Beauty</p>
        </div>
    </div>
</div>';

        $customerHeaders = "From: no-reply@quintbeauty.com\r\n";
        $customerHeaders .= "Reply-To: support@quintbeauty.com\r\n";
        $customerHeaders .= "MIME-Version: 1.0\r\n";
        $customerHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
        $customerHeaders .= "X-Mailer: PHP/" . phpversion();

        // Send customer email
        mail($email, $customerSubject, $customerBody, $customerHeaders);
    }
}

http_response_code(200);
?>