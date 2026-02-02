<?php
// verify-payment.php - The "Thank You" Page Handler

$key_id = 'rzp_live_S83Chu6RWaxfaV';
$key_secret = 'glCoiM7Eq1KKevTp1OyNkbL1';

// -----------------------------------------------------------------------------
// 1. Verify Payment Signature (Security)
// -----------------------------------------------------------------------------
$success = false;
$error = "Payment Verification Failed";

if (isset($_POST['razorpay_payment_id']) && isset($_POST['razorpay_order_id']) && isset($_POST['razorpay_signature'])) {

    $rzp_payment_id = $_POST['razorpay_payment_id'];
    $rzp_order_id = $_POST['razorpay_order_id'];
    $rzp_signature = $_POST['razorpay_signature'];

    $generated_signature = hash_hmac('sha256', $rzp_order_id . "|" . $rzp_payment_id, $key_secret);

    if ($generated_signature === $rzp_signature) {
        $success = true;
    } else {
        $error = "Invalid Signature";
    }
} else {
    $error = "Invalid Access. Missing payment details.";
}

// -----------------------------------------------------------------------------
// 2. Fetch Order Details (To show items)
// -----------------------------------------------------------------------------
$items_summary = "Items information unavailable";
$amount_paid = "0.00";

if ($success) {
    // We need to fetch the payment details to get the "notes" back
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/payments/' . $rzp_payment_id);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

    $result = curl_exec($ch);
    $payment_data = json_decode($result, true);
    curl_close($ch);

    if (isset($payment_data['notes']['items_summary'])) {
        $items_summary = $payment_data['notes']['items_summary'];
    }
    if (isset($payment_data['amount'])) {
        $amount_paid = number_format($payment_data['amount'] / 100, 2);
    }
}

// -----------------------------------------------------------------------------
// 3. Render HTML Output
// -----------------------------------------------------------------------------
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status | Quint Beauty</title>
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #f9f9f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }

        .card {
            background: white;
            padding: 2.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            max-width: 500px;
            width: 90%;
            text-align: center;
        }

        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        h1 {
            color: #333;
            margin-bottom: 0.5rem;
        }

        p {
            color: #666;
            line-height: 1.6;
        }

        .details {
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            text-align: left;
        }

        .btn {
            display: inline-block;
            background: #000;
            color: white;
            padding: 0.8rem 2rem;
            text-decoration: none;
            border-radius: 50px;
            margin-top: 1rem;
            transition: transform 0.2s;
        }

        .btn:hover {
            transform: translateY(-3px);
        }
    </style>
</head>

<body>
    <div class="card">
        <?php if ($success): ?>
            <div class="icon">✅</div>
            <h1>Order Confirmed!</h1>
            <p>Thank you for your purchase. Your payment was successful and your order has been placed.</p>

            <div class="details">
                <p><strong>Order ID:</strong>
                    <?php echo htmlspecialchars($rzp_order_id); ?>
                </p>
                <p><strong>Payment ID:</strong>
                    <?php echo htmlspecialchars($rzp_payment_id); ?>
                </p>
                <p><strong>Amount:</strong> ₹
                    <?php echo $amount_paid; ?>
                </p>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
                <p><strong>Items:</strong><br>
                    <?php echo htmlspecialchars($items_summary); ?>
                </p>
            </div>

            <p style="font-size: 0.9rem;">A confirmation email has been sent to you.</p>

            <a href="index.html" class="btn">Return to Home</a>

            <!-- Clear Cart Script -->
            <script>
                localStorage.removeItem('quintCart');
            </script>
        <?php else: ?>
            <div class="icon">❌</div>
            <h1>Payment Failed</h1>
            <p>
                <?php echo $error; ?>
            </p>
            <a href="cart.html" class="btn" style="background: #dc3545;">Try Again</a>
        <?php endif; ?>
    </div>
</body>

</html>