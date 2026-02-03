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
$logData .= "User-Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown') . "\n";
$logData .= "POST Data: " . print_r($_POST, true) . "\n";
$logData .= "GET Data: " . print_r($_GET, true) . "\n";
$logData .= "Query String: " . ($_SERVER['QUERY_STRING'] ?? '') . "\n";
$logData .= "-----------------------------------\n";
file_put_contents($logFile, $logData, FILE_APPEND);
// ---------------------

// CRITICAL FIX: Accept parameters from both POST and GET
// Mobile browsers (especially Safari/Chrome on iOS/Android) redirect via GET after payment
// Desktop browsers usually submit via POST through JavaScript handler
$rzp_payment_id = null;
$rzp_order_id = null;
$rzp_signature = null;

// Try POST first (desktop/card payments)
if (!empty($_POST['razorpay_payment_id'])) {
    $rzp_payment_id = $_POST['razorpay_payment_id'];
    $rzp_order_id = $_POST['razorpay_order_id'] ?? null;
    $rzp_signature = $_POST['razorpay_signature'] ?? null;
    $logData .= "SOURCE: POST (Desktop Flow)\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
}
// Fallback to GET (mobile redirect)
else if (!empty($_GET['razorpay_payment_id'])) {
    $rzp_payment_id = $_GET['razorpay_payment_id'];
    $rzp_order_id = $_GET['razorpay_order_id'] ?? null;
    $rzp_signature = $_GET['razorpay_signature'] ?? null;
    $logData .= "SOURCE: GET (Mobile Redirect Flow)\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
}

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

        // Get order_id from payment
        if (!empty($payment_data['order_id'])) {
            $rzp_order_id = $payment_data['order_id'];
        } else {
            $rzp_order_id = "ORD-" . time() . "-" . rand(100, 999);
        }

        $amount_paid = number_format(($payment_data['amount'] ?? 0) / 100, 2);

        // CRITICAL: Fetch ORDER details to get complete customer notes
        // Payment API doesn't always return full notes, but Order API does
        if (!empty($payment_data['order_id'])) {
            $ch_order = curl_init();
            curl_setopt($ch_order, CURLOPT_URL, 'https://api.razorpay.com/v1/orders/' . $payment_data['order_id']);
            curl_setopt($ch_order, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch_order, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

            $order_result = curl_exec($ch_order);
            $order_data = json_decode($order_result, true);
            curl_close($ch_order);

            // Log order data
            $debugLog = "Order API Result for " . $payment_data['order_id'] . ": " . print_r($order_data, true) . "\n----------------\n";
            file_put_contents($logFile, $debugLog, FILE_APPEND);

            // Use ORDER notes (contains full customer data)
            if (isset($order_data['notes']) && !empty($order_data['notes'])) {
                $payment_notes_json = json_encode($order_data['notes']);

                // Extract items_summary if available
                if (isset($order_data['notes']['items_summary'])) {
                    $items_summary = $order_data['notes']['items_summary'];
                }
            } else {
                $payment_notes_json = "{}";
            }
        }

        // Fallback to payment notes if order fetch failed
        if ($payment_notes_json === "{}") {
            if (isset($payment_data['notes'])) {
                $payment_notes_json = json_encode($payment_data['notes']);
                if (isset($payment_data['notes']['items_summary'])) {
                    $items_summary = $payment_data['notes']['items_summary'];
                }
            }
        }
    } else {
        $error = "Payment status verification failed. Status: " . ($payment_data['status'] ?? 'unknown');
    }
} else {
    // Case 3: No payment data received
    $debugInfo = [
        'method' => $_SERVER['REQUEST_METHOD'],
        'has_post' => !empty($_POST),
        'has_get' => !empty($_GET),
        'post_keys' => !empty($_POST) ? array_keys($_POST) : [],
        'get_keys' => !empty($_GET) ? array_keys($_GET) : [],
        'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 100)
    ];

    file_put_contents($logFile, "ERROR: No payment data found.\nDebug Info: " . print_r($debugInfo, true) . "\n---\n", FILE_APPEND);

    $error = "Invalid Access. Missing payment details.<br><br>";
    $error .= "<small style='color:#666;'>If you just completed payment on mobile, please contact support with this info:<br>";
    $error .= "Request Method: " . htmlspecialchars($_SERVER['REQUEST_METHOD']) . "<br>";
    $error .= "Time: " . date('Y-m-d H:i:s') . "</small>";
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

    // Initial data from Payment API
    if (isset($payment_data['amount'])) {
        $amount_paid = number_format($payment_data['amount'] / 100, 2);
    }

    // CRITICAL: Fetch ORDER details to get complete customer notes (Mirroring Mobile Logic)
    $order_notes_found = false;
    if (!empty($payment_data['order_id'])) {
        $ch_order = curl_init();
        curl_setopt($ch_order, CURLOPT_URL, 'https://api.razorpay.com/v1/orders/' . $payment_data['order_id']);
        curl_setopt($ch_order, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch_order, CURLOPT_USERPWD, $key_id . ':' . $key_secret);

        $order_result = curl_exec($ch_order);
        $order_data = json_decode($order_result, true);
        curl_close($ch_order);

        if (isset($order_data['notes']) && !empty($order_data['notes'])) {
            $payment_notes_json = json_encode($order_data['notes']);
            if (isset($order_data['notes']['items_summary'])) {
                $items_summary = $order_data['notes']['items_summary'];
            }
            $order_notes_found = true;
        }
    }

    // Fallback to payment notes if order fetch failed/empty
    if (!$order_notes_found && isset($payment_data['notes'])) {
        $payment_notes_json = json_encode($payment_data['notes']);
        if (isset($payment_data['notes']['items_summary'])) {
            $items_summary = $payment_data['notes']['items_summary'];
        }
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
            <!-- EmailJS SDK -->
            <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

            <script>
                // Initialize Services
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

                (function () {
                    emailjs.init("ERevR8RO4LajPBrwk");
                })();

                // --- SHARED DATA PARSER (The Source of Truth) ---
                function getSafeCustomerInfo(paymentNotes, userEmail = '') {
                    // 1. Parse Name
                    let fName = paymentNotes.firstName;
                    let lName = paymentNotes.lastName;

                    // Fallback: splitting combined name
                    if (!fName && paymentNotes.name) {
                        const parts = paymentNotes.name.trim().split(' ');
                        fName = parts[0];
                        lName = parts.slice(1).join(' ');
                    }

                    // Defaults
                    if ((!fName || fName === 'Guest') && (paymentNotes.email || userEmail)) {
                        const em = paymentNotes.email || userEmail;
                        if (em && em.includes('@')) {
                            fName = em.split('@')[0];
                        }
                    }

                    fName = fName || 'Guest';
                    lName = lName || '';
                    const fullName = (fName + ' ' + lName).trim();

                    // 2. Parse Address
                    // Client flow provides separate fields, Server flow usually checking notes
                    const city = paymentNotes.city || '';
                    const state = paymentNotes.state || '';
                    const zip = paymentNotes.zipCode || '';

                    let address = paymentNotes.address || '';
                    // Combine if address looks short/incomplete
                    if (city && !address.includes(city)) address += `, ${city}`;
                    if (state && !address.includes(state)) address += `, ${state}`;
                    if (zip && !address.includes(zip)) address += ` ${zip}`;

                    // 3. Return Clean Object
                    return {
                        firstName: fName,
                        lastName: lName,
                        fullName: fullName,
                        email: paymentNotes.email || userEmail || 'No Email',
                        phone: paymentNotes.phone || '',
                        address: address, // Full formatted address
                        city: city,
                        state: state,
                        zipCode: zip,
                        zipCode: zip
                    };
                }

                // --- 2. CRITICAL PATH: IMMEDIATE SAVE & EMAIL (No Auth Wait) ---
                async function processCriticalTasks() {
                    console.log("🚀 Starting Critical Tasks...");

                    // A. Prepare Data from PHP (The Source of Truth)
                    const rzpOrderId = '<?php echo $rzp_order_id; ?>';
                    const paymentNotes = <?php echo $payment_notes_json; ?>;

                    // Parse Cart
                    let cartItems = [];
                    if (paymentNotes.cart_items_json) {
                        try { cartItems = JSON.parse(paymentNotes.cart_items_json); }
                        catch (e) { console.error('Cart parse error', e); }
                    }

                    // Generate Customer Info (Without user email fallback initially)
                    const customer = getSafeCustomerInfo(paymentNotes, '');
                    const amount = parseFloat("<?php echo $amount_paid; ?>");

                    const orderData = {
                        orderId: rzpOrderId,
                        paymentId: '<?php echo $rzp_payment_id; ?>',
                        total: amount,
                        items: cartItems,
                        customerInfo: customer,
                        date: new Date().toISOString(),
                        status: 'paid',
                        source: 'critical_path'
                    };

                    console.log("📦 Order Data Prepared:", orderData);

                    // B. Save to Global Admin DB
                    try {
                        await db.collection('orders').add(orderData);
                        console.log('✅ SAVED TO ADMIN DB');
                    } catch (error) {
                        console.error('❌ ADMIN DB SAVE FAILED:', error);
                    }

                    // C. Send Emails
                    <?php if ($success): ?>
                        const emailParams = {
                            to_email: customer.email,
                            email: customer.email,
                            order_id: rzpOrderId,
                            order_items_html: "<?php echo str_replace(array("\r", "\n"), '', addslashes($items_summary)); ?>",
                            cost_shipping: "0.00",
                            cost_tax: "0.00",
                            cost_total: amount.toFixed(2),
                            customer_name: customer.fullName,
                            admin_email: 'beautyquint@gmail.com',
                            customer_email: customer.email,
                            customer_phone: customer.phone,
                            customer_address: customer.address,
                            payment_id: "<?php echo $rzp_payment_id; ?>",
                            order_date: new Date().toLocaleString('en-IN')
                        };

                        // User Email (Always try)
                        if (customer.email && customer.email !== 'No Email') {
                            emailjs.send('service_xrl22yi', 'template_5zwuogh', emailParams)
                                .then(() => console.log('✅ User Email Sent'))
                                .catch(e => console.error('❌ User Email Failed', e));
                        }

                        // Admin Email
                        emailjs.send('service_xrl22yi', 'template_ryjw82n', emailParams)
                            .then(() => console.log('✅ Admin Email Sent'))
                            .catch(e => console.error('❌ Admin Email Failed', e));
                    <?php endif; ?>
                }

                // Execute immediately
                processCriticalTasks();


                // --- 3. SECONDARY PATH: USER HISTORY (Waits for Auth) ---
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        console.log("👤 User Logged In:", user.email);

                        // We reconstruct the data just for the user history save
                        const rzpOrderId = '<?php echo $rzp_order_id; ?>';
                        const paymentNotes = <?php echo $payment_notes_json; ?>;
                        let cartItems = [];
                        if (paymentNotes.cart_items_json) {
                            try { cartItems = JSON.parse(paymentNotes.cart_items_json); } catch (e) { }
                        }
                        const customer = getSafeCustomerInfo(paymentNotes, user.email);

                        const orderData = {
                            orderId: rzpOrderId,
                            paymentId: '<?php echo $rzp_payment_id; ?>',
                            total: parseFloat("<?php echo $amount_paid; ?>"),
                            items: cartItems,
                            customerInfo: customer,
                            date: new Date().toISOString(),
                            status: 'paid'
                        };

                        try {
                            await db.collection('users').doc(user.uid).collection('orders').add(orderData);
                            console.log('✅ SAVED TO USER HISTORY');

                            // Local Backup
                            const storageKey = `quintOrders_${user.uid}`;
                            const orders = JSON.parse(localStorage.getItem(storageKey)) || [];
                            orders.push(orderData);
                            localStorage.setItem(storageKey, JSON.stringify(orders));
                        } catch (error) {
                            console.error('❌ USER HISTORY SAVE FAILED:', error);
                        }
                    } else {
                        console.log("👤 User is Guest - Skipping History Save");
                    }

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
    </div>
</body>

</html>