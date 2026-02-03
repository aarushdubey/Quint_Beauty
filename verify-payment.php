<?php
// verify-payment.php - The "Thank You" Page Handler

$key_id = 'rzp_live_S83Chu6RWaxfaV';
$key_secret = 'glCoiM7Eq1KKevTp1OyNkbL1';

// -----------------------------------------------------------------------------
// 1. Verify Payment Signature (Security)
// -----------------------------------------------------------------------------
$success = false;
$error = "Payment Verification Failed";
$items_summary = "Items information unavailable";
$amount_paid = "0.00";
$payment_notes_json = "{}";

// --- DEBUG LOGGING ---
$logFile = 'payment_debug.txt';
$logData = "Time: " . date('Y-m-d H:i:s') . "\n";
$logData .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$logData .= "POST Data: " . print_r($_POST, true) . "\n";
$logData .= "GET Data: " . print_r($_GET, true) . "\n";
$logData .= "Input Stream: " . file_get_contents('php://input') . "\n";
$logData .= "-----------------------------------\n";
file_put_contents($logFile, $logData, FILE_APPEND);
// ---------------------

// Check both POST and GET for payment details (mobile browsers may use GET)
$rzp_payment_id = $_POST['razorpay_payment_id'] ?? $_GET['razorpay_payment_id'] ?? null;
$rzp_order_id = $_POST['razorpay_order_id'] ?? $_GET['razorpay_order_id'] ?? null;
$rzp_signature = $_POST['razorpay_signature'] ?? $_GET['razorpay_signature'] ?? null;

// --- VERIFICATION LOGIC ---
if ($rzp_payment_id && $rzp_order_id && $rzp_signature) {
    // Case 1: All parameters present - Verify Signature (Local Check)
    $generated_signature = hash_hmac('sha256', $rzp_order_id . "|" . $rzp_payment_id, $key_secret);
    if ($generated_signature === $rzp_signature) {
        $success = true;
    } else {
        $error = "Invalid Signature";
    }
} elseif ($rzp_payment_id) {
    // Case 2: Only Payment ID present (Mobile Flow) - Verify via API (Server check)
    // Mobile redirects sometimes drop the order_id/signature, so we ask Razorpay directly
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/payments/' . $rzp_payment_id);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

    $result = curl_exec($ch);
    $payment_data = json_decode($result, true);
    curl_close($ch);

    // --- DEBUG: Log API Response ---
    $debugLog = "API Verify Result for $rzp_payment_id: " . print_r($payment_data, true) . "\n----------------\n";
    file_put_contents($logFile, $debugLog, FILE_APPEND);
    // -------------------------------

    if (isset($payment_data['status']) && ($payment_data['status'] === 'captured' || $payment_data['status'] === 'authorized')) {
        $success = true;

        // Fill in missing details from API response
        // Use a Fallback ID if order_id is missing from API
        if (!empty($payment_data['order_id'])) {
            $rzp_order_id = $payment_data['order_id'];
        } else {
            $rzp_order_id = "ORD-" . time() . "-" . rand(100, 999);
        }

        $amount_paid = number_format(($payment_data['amount'] ?? 0) / 100, 2);

        // Capture notes if available
        if (isset($payment_data['notes']['items_summary'])) {
            $items_summary = $payment_data['notes']['items_summary'];
        }
        if (isset($payment_data['notes'])) {
            $payment_notes_json = json_encode($payment_data['notes']);
        } else {
            $payment_notes_json = "{}";
        }
    } else {
        $error = "Payment status verification failed. Status: " . ($payment_data['status'] ?? 'unknown');
    }
} else {
    // Case 3: No data at all
    $debug_info = "POST: " . json_encode($_POST) . " | GET: " . json_encode($_GET);
    $error = "Invalid Access. Missing payment details. <br><small>Debug: " . htmlspecialchars($debug_info) . "</small>";
}

// -----------------------------------------------------------------------------
// 2. Fetch Order Details (To show items) - Only if not already fetched in Case 2
// -----------------------------------------------------------------------------
if ($success && $amount_paid === "0.00") {
    // Standard fetch if we verified via signature (Case 1)
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
    if (isset($payment_data['notes'])) {
        $payment_notes_json = json_encode($payment_data['notes']);
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

            <!-- Firebase Scripts -->
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

            <script>
                // Initialize Firebase
                const firebaseConfig = {
                    apiKey: "AIzaSyC8d9OfIXC6J6EFIAqVZgyVm2S3yujLMk8",
                    authDomain: "quint-beauty.firebaseapp.com",
                    projectId: "quint-beauty",
                    storageBucket: "quint-beauty.firebasestorage.app",
                    messagingSenderId: "182771986293",
                    appId: "1:182771986293:web:164925cd16b6e9343ead3c"
                };

                firebase.initializeApp(firebaseConfig);
                const auth = firebase.auth();
                const db = firebase.firestore();

                // Save order to user's account
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        console.log('User logged in:', user.email);

                        // Get payment notes from PHP
                        const paymentNotes = <?php echo $payment_notes_json; ?>;
                        console.log('Payment notes:', paymentNotes);

                        // Parse cart items
                        let cartItems = [];
                        if (paymentNotes.cart_items_json) {
                            try {
                                cartItems = JSON.parse(paymentNotes.cart_items_json);
                            } catch (e) {
                                console.error('Failed to parse cart items:', e);
                            }
                        }

                        // --- ROBUST NAME & ADDRESS PARSING ---
                        let fName = paymentNotes.firstName;
                        let lName = paymentNotes.lastName;

                        // Fallback: Parse 'name' if separate fields are missing
                        if (!fName && paymentNotes.name) {
                            const nameParts = paymentNotes.name.trim().split(' ');
                            fName = nameParts[0];
                            lName = nameParts.slice(1).join(' ');
                        }

                        // Fallback: Address
                        // If separate fields like city are missing, try to infer or just keep empty

                        // Build customer info object for Firestore
                        const customerInfo = {
                            firstName: fName || 'Guest',
                            lastName: lName || '',
                            email: user.email,
                            phone: paymentNotes.phone || '',
                            address: paymentNotes.address || '',
                            city: paymentNotes.city || '',
                            state: paymentNotes.state || '',
                            zipCode: paymentNotes.zipCode || ''
                        };

                        // Create order object in the format expected by orders.html
                        const orderData = {
                            orderId: '<?php echo $rzp_order_id; ?>',
                            paymentId: '<?php echo $rzp_payment_id; ?>',
                            total: parseFloat(paymentNotes.total_amount || <?php echo $amount_paid; ?>),
                            items: cartItems,
                            customerInfo: customerInfo,
                            date: new Date().toISOString(),
                            status: 'Paid'
                        };

                        console.log('Saving order:', orderData);

                        try {
                            // Save to Firestore
                            await db.collection('users').doc(user.uid).collection('orders').add(orderData);
                            console.log('✅ Order saved to Firebase');

                            // Also save to localStorage as backup
                            const storageKey = `quintOrders_${user.uid}`;
                            const orders = JSON.parse(localStorage.getItem(storageKey)) || [];
                            orders.push(orderData);
                            localStorage.setItem(storageKey, JSON.stringify(orders));
                            console.log('✅ Order saved to localStorage');
                        } catch (error) {
                            console.error('❌ Error saving order:', error);
                        }
                    } else {
                        console.log('No user logged in - order saved to admin only');
                    }

                    // Clear cart regardless
                    localStorage.removeItem('quintCart');
                });
            </script>
        <?php else: ?>
            <div class="icon">❌</div>
            <h1>Payment Failed</h1>
            <p>
                <?php echo $error; ?>
            </p>
            <a href="cart.html" class="btn" style="background: #dc3545;">Try Again</a>
        <?php endif; ?>
        <!-- EmailJS SDK -->
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

        <script>
            (function () {
                emailjs.init("ERevR8RO4LajPBrwk");
            })();

            // Send Email on Page Load
            document.addEventListener('DOMContentLoaded', async () => {
                <?php if ($success): ?>
                    console.log("Preparing to send confirmation emails...");

                    const paymentNotes = <?php echo $payment_notes_json; ?>;
                    const orderId = "<?php echo $rzp_order_id; ?>";
                    const amount = "<?php echo $amount_paid; ?>";
                    const itemsSummary = "<?php echo str_replace(array("\r", "\n"), '', addslashes($items_summary)); ?>";

                    // Construct email parameters
                    const emailParams = {
                        to_email: paymentNotes.email,
                        email: paymentNotes.email,
                        order_id: orderId,
                        order_items_html: itemsSummary,
                        cost_shipping: "0.00",
                        cost_tax: "0.00",
                        cost_total: amount,
                        customer_name: paymentNotes.name || (paymentNotes.firstName + ' ' + paymentNotes.lastName),

                        // Extra fields for Admin email
                        admin_email: 'beautyquint@gmail.com',
                        customer_email: paymentNotes.email,
                        customer_phone: paymentNotes.phone || 'Not provided',
                        customer_address: (paymentNotes.address || '') + ', ' + (paymentNotes.city || '') + ', ' + (paymentNotes.state || '') + ' ' + (paymentNotes.zipCode || ''),
                        payment_id: "<?php echo $rzp_payment_id; ?>",
                        order_date: new Date().toLocaleString('en-IN')
                    };

                    // Send Customer Email
                    emailjs.send('service_xrl22yi', 'template_5zwuogh', emailParams)
                        .then(function () {
                            console.log('✅ Customer email sent!');
                        }, function (error) {
                            console.error('❌ Customer email failed:', error);
                        });

                    // Send Admin Email
                    emailjs.send('service_xrl22yi', 'template_ryjw82n', emailParams)
                        .then(function () {
                            console.log('✅ Admin email sent!');
                        }, function (error) {
                            console.error('❌ Admin email failed:', error);
                        });
                <?php endif; ?>
            });
        </script>
    </div>
</body>

</html>