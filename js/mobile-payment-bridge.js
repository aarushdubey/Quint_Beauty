/**
 * Mobile Payment Bridge
 * 
 * This script runs BEFORE Razorpay is initialized and creates a recovery mechanism
 * for mobile payments that might lose context during app-switching.
 */

(function () {
    'use strict';

    const PAYMENT_STORAGE_KEY = 'rzp_payment_pending';
    const PAYMENT_CHECK_INTERVAL = 2000; // Check every 2 seconds

    /**
     * Store pending payment info before Razorpay modal opens
     */
    window.storePendingPayment = function (orderData, customerData) {
        const pendingPayment = {
            order_id: orderData.id,
            timestamp: Date.now(),
            customer: customerData,
            status: 'initiated'
        };

        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(pendingPayment));
        console.log('📱 Stored pending payment for mobile recovery:', pendingPayment);
    };

    /**
     * Clear pending payment after successful verification
     */
    window.clearPendingPayment = function () {
        localStorage.removeItem(PAYMENT_STORAGE_KEY);
        console.log('✅ Cleared pending payment');
    };

    /**
     * Check for abandoned payments when page loads
     * This handles the case where user returns from payment app manually
     */
    window.addEventListener('load', function () {
        const pending = localStorage.getItem(PAYMENT_STORAGE_KEY);

        if (!pending) return;

        const payment = JSON.parse(pending);
        const ageInSeconds = (Date.now() - payment.timestamp) / 1000;

        // If payment was initiated recently (within 10 minutes), check its status
        if (ageInSeconds < 600) {
            console.log('🔍 Found recent pending payment, checking status...', payment);
            checkPaymentStatus(payment.order_id);
        } else {
            // Clean up old pending payments
            window.clearPendingPayment();
        }
    });

    /**
     * Check payment status via API call to our backend
     */
    function checkPaymentStatus(orderId) {
        console.log(`Checking payment status for order: ${orderId}`);

        // Show a loading indicator
        showPaymentCheckNotification('Checking payment status...');

        fetch(`check-payment-status.php?order_id=${orderId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.payment_status === 'captured') {
                    // Payment was successful! Redirect to verification page
                    console.log('✅ Payment successful! Redirecting...');
                    showPaymentCheckNotification('Payment successful! Redirecting...');

                    setTimeout(() => {
                        window.location.href = `verify-payment.php?razorpay_payment_id=${data.payment_id}&razorpay_order_id=${orderId}&from=recovery`;
                    }, 1000);
                } else if (data.payment_status === 'failed') {
                    console.log('❌ Payment failed');
                    window.clearPendingPayment();
                    hidePaymentCheckNotification();
                } else {
                    console.log('⏳ Payment still pending');
                    hidePaymentCheckNotification();
                }
            })
            .catch(error => {
                console.error('Error checking payment status:', error);
                hidePaymentCheckNotification();
            });
    }

    /**
     * Show notification to user while checking payment
     */
    function showPaymentCheckNotification(message) {
        let notification = document.getElementById('payment-check-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'payment-check-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                animation: slideDown 0.3s ease;
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.display = 'block';
    }

    /**
     * Hide notification
     */
    function hidePaymentCheckNotification() {
        const notification = document.getElementById('payment-check-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    console.log('📱 Mobile Payment Bridge initialized');
})();
