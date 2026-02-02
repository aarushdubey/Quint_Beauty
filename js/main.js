/* Main JS for Quint Beauty */

// Product Database
const productsDB = {
    'kajal': {
        name: "Intense Black Kajal",
        price: "2.00",
        image: "assets/images/product-1.jpg",
        desc: "Define your eyes with our ultra-pigmented, long-lasting kajal. Smudge-proof and waterproof."
    },
    'liquid-lipstick': {
        name: "Non Transfer Liquid Lipstick",
        price: "800.00",
        image: "https://images.unsplash.com/photo-1586495777744-4413f21062dc?q=80&w=2630&auto=format&fit=crop",
        desc: "Long-wear liquid lipstick that stays put all day. Comfortable matte finish that won't dry your lips."
    },
    'matte-lipstick': {
        name: "Creamy Charm Matte Lipstick",
        price: "1500.00",
        image: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=2680&auto=format&fit=crop",
        desc: "Rich, creamy matte formula that glides on smoothly for a velvet finish."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Load Product Details if on product page
    loadProductDetails();

    // Header Scroll Effect
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
            } else {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = 'white';
                navLinks.style.padding = '1rem';
                navLinks.style.boxShadow = '0 5px 10px rgba(0,0,0,0.1)';
            }
        });
    }

    // Contact Form Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            const formData = {
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value
            };

            // Send to PHP backend
            fetch('send-contact.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Message sent successfully! We will get back to you soon.');
                        contactForm.reset();
                        btn.textContent = 'Message Sent ✓';
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.disabled = false;
                        }, 3000);
                    } else {
                        throw new Error(data.error || 'Failed to send');
                    }
                })
                .catch(error => {
                    console.error('Contact form error:', error);
                    alert('Failed to send message. Please email us directly at beautyquint@gmail.com');
                    btn.textContent = originalText;
                    btn.disabled = false;
                });
        });
    }

    // Initialize Cart State
    refreshCartUI();

    // Setup Add to Cart Buttons
    setupAddToCartButtons();

    // Render Cart Page if we are on it
    if (document.querySelector('.cart-table')) {
        renderCartPage();
    }

    // Render Checkout Page if we are on it
    if (document.querySelector('.order-summary-box')) {
        renderCheckoutPage();
    }

    // Initialize on load
    if (window.initRevealAnimations) {
        window.initRevealAnimations();
    }
});

// Scroll Animation Observer (Global)
window.initRevealAnimations = function () {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal:not(.active)');
    revealElements.forEach(el => observer.observe(el));
};

// --- Cart Logic ---

function getCart() {
    return JSON.parse(localStorage.getItem('quintCart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('quintCart', JSON.stringify(cart));
    refreshCartUI();
}

function addToCart(product, quantityToAdd = 1) {
    const cart = getCart();
    // Check if item already exists
    const existingItem = cart.find(item => item.name === product.name);

    if (existingItem) {
        existingItem.quantity += parseInt(quantityToAdd);
    } else {
        cart.push({
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: parseInt(quantityToAdd)
        });
    }

    saveCart(cart);
}

function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCartPage(); // Re-render if on cart page
}

function updateCartQuantity(index, newQuantity) {
    const cart = getCart();
    if (newQuantity < 1) return;
    cart[index].quantity = parseInt(newQuantity);
    saveCart(cart);
    renderCartPage();
}

function refreshCartUI() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const badges = document.querySelectorAll('.cart-count');
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        // Ensure styling persists
        badge.style.position = 'absolute';
        badge.style.top = '-5px';
        badge.style.right = '-8px';
        badge.style.background = 'var(--color-text-main)';
        badge.style.color = 'white';
        badge.style.borderRadius = '50%';
        badge.style.width = '18px';
        badge.style.height = '18px';
        badge.style.fontSize = '10px';
        badge.style.lineHeight = '1';
        badge.style.justifyContent = 'center';
        badge.style.alignItems = 'center';
    });
}

function setupAddToCartButtons() {
    // Standardize button class or just select what we have
    const addToCartBtns = document.querySelectorAll('.add-to-cart-quick, .add-to-cart-btn, .btn.btn-primary.reveal');
    // Added selector for "Shop Now" or other buttons if they were intended. 
    // Actually .btn.btn-primary might be the Hero button "Shop Collection".
    // We only want 'add-to-cart' buttons.

    document.querySelectorAll('.add-to-cart-quick, .add-to-cart-btn').forEach(btn => {

        btn.onclick = (e) => {
            e.preventDefault();

            // 1. Check if we are adding from a Product Card (Home/Shop Page)
            const card = btn.closest('.product-card');

            // 2. Check if we are adding from the Product Details Page
            const productPageDetails = btn.closest('.product-details') || document.querySelector('.product-details');

            let product = {};

            if (card) {
                // Scrape from card
                const img = card.querySelector('img');
                const title = card.querySelector('h3, h4, h1');
                const price = card.querySelector('p, .price');

                product = {
                    name: title ? title.innerText.trim() : 'Product',
                    price: price ? price.innerText.replace(/[^0-9.]/g, '') : '0.00',
                    image: img ? img.src : ''
                };
            } else if (productPageDetails && document.querySelector('h1')) {
                // Scrape from Product Page
                const img = document.getElementById('mainImg') || document.querySelector('.product-main-img');
                const title = document.querySelector('.product-details h1') || document.querySelector('h1');
                const price = document.querySelector('.product-details .price') || document.querySelector('.price');
                const qtyInput = document.querySelector('.qty-input');

                // Add explicit quantity support for product page
                const addedQty = qtyInput ? parseInt(qtyInput.value) : 1;

                product = {
                    name: title ? title.innerText.trim() : 'Detailed Product',
                    price: price ? price.innerText.replace(/[^0-9.]/g, '') : '2.00',
                    image: img ? img.src : '',
                    quantityToAdd: addedQty
                };
            } else {
                // Final fallback
                product = { name: "Quint Beauty Product", price: "2.00", image: "assets/images/product-1.jpg" };
            }

            addToCart(product, product.quantityToAdd || 1);

            // Visual Feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = feather && feather.icons['check'] ? feather.icons['check'].toSvg() : 'Added';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                if (typeof feather !== 'undefined') feather.replace();
            }, 1000);
        };
    });
}

function renderCartPage() {
    const tbody = document.querySelector('.cart-table tbody');
    const summarySubtotal = document.querySelector('.cart-summary .summary-row:nth-of-type(1) span:last-child');
    const summaryTotal = document.querySelector('.cart-summary .summary-row.total span:last-child');

    if (!tbody) return;

    const cart = getCart();
    tbody.innerHTML = '';

    let total = 0;

    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #777;">Your cart is currently empty.</td></tr>';
    } else {
        cart.forEach((item, index) => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            total += itemTotal;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="flex" style="gap: 1rem; align-items: start;">
                        <img src="${item.image}" class="cart-item-img" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; background: #f9f9f9;">
                        <div>
                            <h4 style="margin-bottom: 0.2rem;">${item.name}</h4>
                            <p style="font-size: 0.9rem; color: #777;">₹${item.price}</p>
                            <button class="remove-item-btn" data-index="${index}" style="color: red; font-size: 0.8rem; text-decoration: underline; margin-top: 0.5rem; border:none; background:none; cursor:pointer;">Remove</button>
                        </div>
                    </div>
                </td>
                <td>₹${item.price}</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" data-index="${index}" class="qty-input"
                        style="width: 50px; padding: 0.5rem; border: 1px solid #ddd; text-align: center;">
                </td>
                <td>₹${itemTotal.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update Totals
    if (summarySubtotal) summarySubtotal.textContent = '₹' + total.toFixed(2);
    if (summaryTotal) summaryTotal.textContent = '₹' + total.toFixed(2);

    // Clean up old listeners (not strictly necessary since we replaced innerHTML, but good practice if we were appending)
    // Add listeners to new elements
    const removeBtns = document.querySelectorAll('.remove-item-btn');
    removeBtns.forEach(btn => {
        btn.onclick = function () {
            removeFromCart(this.getAttribute('data-index'));
        }
    });

    const qtyInputs = document.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
        input.onchange = function () {
            updateCartQuantity(this.getAttribute('data-index'), this.value);
        }
    });
}

function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const product = productsDB[productId];

    if (product) {
        // Update Main Image
        const mainImg = document.getElementById('mainImg') || document.querySelector('.product-main-img');
        if (mainImg) mainImg.src = product.image;

        // Update Title
        const titleEl = document.querySelector('.product-details h1') || document.querySelector('h1');
        if (titleEl) titleEl.textContent = product.name;

        // Update Price
        const priceEl = document.querySelector('.product-details .price') || document.querySelector('.price');
        if (priceEl) priceEl.textContent = '₹' + product.price;

        // Update Description (Optional)
        const descEl = document.querySelector('.product-details p');
        if (descEl && product.desc) descEl.textContent = product.desc;

        // Update Title Tag
        document.title = product.name + " | Quint Beauty";

        // Update Thumbnails (optional simple fix - set all thumbs to same image for now or just main)
        const thumbs = document.querySelectorAll('.thumb img');
        thumbs.forEach(img => img.src = product.image);
    }
}

function renderCheckoutPage() {
    const summaryBox = document.querySelector('.order-summary-box');
    if (!summaryBox) return;

    const cart = getCart();
    let total = 0;

    let productsHTML = '';

    if (cart.length === 0) {
        productsHTML = '<p style="color: #777; margin-bottom: 1rem;">Your cart is empty.</p>';
        // If empty, maybe keep the total as 0.00
    } else {
        cart.forEach(item => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            total += itemTotal;

            productsHTML += `
                <div class="flex" style="gap: 1rem; margin-bottom: 1.5rem; align-items: start;">
                    <img src="${item.image}" style="width: 60px; height: 60px; object-fit: cover; background: #f9f9f9; min-width: 60px;">
                    <div style="flex: 1;">
                        <h4 style="font-size: 0.9rem; margin-bottom: 0.2rem;">${item.name}</h4>
                        <p style="font-size: 0.8rem; color: #777;">Qty: ${item.quantity}</p>
                    </div>
                    <span>₹${itemTotal.toFixed(2)}</span>
                </div>
            `;
        });
    }

    const summaryHTML = `
        <h3 style="margin-bottom: 1.5rem;">Order Summary</h3>
        
        ${productsHTML}

        <div class="order-row" style="margin-top: 1rem; border-top: 1px solid #ddd; padding-top: 1rem;">
            <span>Subtotal</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
        <div class="order-row">
            <span>Shipping</span>
            <span>Free</span>
        </div>
        <div class="order-total">
            <span>Total</span>
            <span>₹${total.toFixed(2)}</span>
        </div>

        <div class="payment-methods">
            <h4 style="margin-bottom: 1rem;">Payment</h4>
            <p style="font-size: 0.8rem; color: #666; margin-bottom: 1rem;">Transactions are secure and encrypted.</p>

            <button id="razorpayPayBtn" class="btn btn-primary" style="width: 100%;">Pay Now</button>
            <p style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #888;">Powered by Razorpay</p>
        </div>
    `;

    summaryBox.innerHTML = summaryHTML;

    // Attach Razorpay payment handler
    const payBtn = document.getElementById('razorpayPayBtn');
    if (payBtn) {
        payBtn.onclick = (e) => {
            e.preventDefault();
            initiateRazorpayPayment(total);
        };
    }
}

// Razorpay Payment Integration
// Razorpay Payment Integration (Updated with Backend Order API)
async function initiateRazorpayPayment(totalAmount) {
    // Validate form first
    const form = document.getElementById('checkoutForm');
    if (!form) {
        alert('Checkout form not found!');
        return;
    }

    // Manual validation
    const requiredFields = ['email', 'phone', 'firstName', 'lastName', 'address', 'city', 'zipCode', 'state'];
    let isValid = true;
    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && (!el.value || el.value.trim() === '')) {
            el.setCustomValidity('Please fill out this field');
            isValid = false;
        } else if (el) {
            el.setCustomValidity('');
        }
    });

    if (!isValid || !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get form data
    const formData = getCheckoutFormData();

    // Get cart for success handler
    const cart = getCart();

    // Convert total to paise
    const amountInPaise = Math.round(totalAmount * 100);

    // Call Backend to Create Order
    try {
        console.log("Contacting Server to Create Order...");

        // Call Backend to Create Order (PHP Version)
        console.log("Contacting Server to Create Order...");

        // Use 'create-order.php' logic
        const response = await fetch('create-order.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amountInPaise,
                notes: {
                    email: formData.email,
                    name: formData.firstName + " " + formData.lastName,
                    phone: formData.phone,
                    address: formData.address,
                    items_summary: cart.map(i => `${i.name} (x${i.quantity})`).join(', ')
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error: ${errText}`);
        }

        const orderData = await response.json();

        if (!orderData.id) {
            throw new Error("No Order ID returned from server.");
        }

        console.log("Order Created Successfully:", orderData.id);

        // Open Razorpay with the Server Options
        const options = {
            key: RAZORPAY_CONFIG.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: RAZORPAY_CONFIG.company_name,
            description: 'Order Payment',
            image: RAZORPAY_CONFIG.company_logo || '',

            // --- CRITICAL: Pass the Server-Generated Order ID ---
            order_id: orderData.id,
            // -----------------------------------------------------

            // --- REDIRECT FIX: Ensure user is redirected even if tab reloads ---
            callback_url: window.location.origin + '/verify-payment.php',
            redirect: true,
            // -------------------------------------------------------------------

            prefill: {
                name: formData.firstName + ' ' + formData.lastName,
                email: formData.email,
                contact: formData.phone || ''
            },

            notes: {
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                items_summary: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
                cart_items_json: JSON.stringify(cart),
                total_amount: totalAmount
            },

            theme: {
                color: RAZORPAY_CONFIG.theme_color
            },

            // Note: 'handler' is ignored when callback_url is present
            modal: {
                ondismiss: function () {
                    console.log('Payment cancelled by user');
                }
            }
        };

        const razorpayInstance = new Razorpay(options);

        razorpayInstance.on('payment.failed', function (response) {
            handlePaymentFailure(response);
        });

        razorpayInstance.open();

    } catch (error) {
        console.error('Payment Initialization Error:', error);
        alert('Could not verify payment security with server. Please try again.\n\nDetails: ' + error.message);
    }
}

// Get checkout form data
function getCheckoutFormData() {
    return {
        email: document.getElementById('email')?.value || '',
        firstName: document.getElementById('firstName')?.value || '',
        lastName: document.getElementById('lastName')?.value || '',
        address: document.getElementById('address')?.value || '',
        city: document.getElementById('city')?.value || '',
        zipCode: document.getElementById('zipCode')?.value || '',
        state: document.getElementById('state')?.value || '',
        phone: document.getElementById('phone')?.value || ''
    };
}

// Handle successful payment
async function handlePaymentSuccess(response, formData, cart, totalAmount) {
    console.log('Payment successful!', response);

    // Payment details
    const paymentId = response.razorpay_payment_id;
    const orderId = response.razorpay_order_id; // If you're using order API
    const signature = response.razorpay_signature; // If you're using order API

    // In a real application, you should:
    // 1. Send this data to your backend server
    // 2. Verify the payment signature on the server
    // 3. Update order status in your database
    // 4. Send confirmation email to customer

    // For now, clear the cart but waiting for redirect

    // Save current order for confirmation page
    const orderDetails = {
        paymentId: paymentId,
        orderId: orderId || 'ORD-' + Date.now(),
        date: new Date().toISOString(),
        items: cart,
        total: totalAmount,
        customerInfo: formData,
        status: 'paid'
    };

    // --- 1. SAVE ORDER IMMEDIATELY (Critical Step) ---
    try {
        // Save to history (permanent)
        await saveOrderToHistory(orderDetails);
        // Save to temp storage for confirmation page
        localStorage.setItem('quintLastOrder', JSON.stringify(orderDetails));
        // Clear the cart
        localStorage.removeItem('quintCart');
        console.log("Order saved locally successfully.");
    } catch (e) {
        console.error("CRITICAL: Failed to save order locally", e);
        alert("Payment successful but failed to save order locally. Please copy your Payment ID: " + paymentId);
    }

    // --- 2. GENERATE EMAIL HTML FOR ITEMS ---
    let itemsHTML = '';
    try {
        cart.forEach(item => {
            itemsHTML += `
                <table style="width: 100%; border-collapse: collapse">
                    <tr style="vertical-align: top">
                      <td style="padding: 12px 0;">
                        <strong style="font-size:14px; display:block;">${item.name}</strong>
                        <div style="font-size: 13px; color: #888;">Qty: ${item.quantity}</div>
                      </td>
                      <td style="padding: 12px 0; text-align:right; white-space: nowrap">
                        <strong>₹${item.price}</strong>
                      </td>
                    </tr>
                </table>`;
        });
    } catch (e) { console.error("Error generating email HTML", e); }

    // --- 1.5 UPDATE STOCK (Inventory Management) ---
    if (window.updateStockOnOrder) {
        console.log("Updating stock inventory...");
        // Non-blocking call
        window.updateStockOnOrder(cart).catch(err => console.error("Stock update failed", err));
    }

    // --- 3. SEND EMAIL CONFIRMATION (Async) ---
    console.log("Attempting to send email...");
    const emailParams = {
        to_email: formData.email,
        email: formData.email,
        order_id: orderDetails.orderId,
        order_items_html: itemsHTML,
        cost_shipping: "0.00",
        cost_tax: "0.00",
        cost_total: totalAmount.toFixed(2),
        customer_name: formData.firstName
    };


    console.log("Email params being sent:", emailParams);

    // Send customer confirmation email
    const customerEmailPromise = emailjs.send('service_xrl22yi', 'template_5zwuogh', emailParams);

    // Prepare admin notification email
    const adminEmailParams = {
        to_email: 'beautyquint@gmail.com',
        admin_email: 'beautyquint@gmail.com',
        order_id: orderDetails.orderId,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        customer_phone: formData.phone || 'Not provided',
        customer_address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
        order_items_html: itemsHTML,
        cost_shipping: "0.00",
        cost_tax: "0.00",
        cost_total: totalAmount.toFixed(2),
        payment_id: orderDetails.paymentId,
        order_date: new Date().toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    };

    // Send admin notification email
    const adminEmailPromise = emailjs.send('service_xrl22yi', 'template_ryjw82n', adminEmailParams);

    // Wait for both emails (but don't block if admin email fails)
    Promise.allSettled([customerEmailPromise, adminEmailPromise])
        .then(function (results) {
            if (results[0].status === 'fulfilled') {
                console.log('Customer email sent successfully!');
            } else {
                console.error('Customer email failed:', results[0].reason);
            }

            if (results[1].status === 'fulfilled') {
                console.log('Admin notification sent successfully!');
            } else {
                console.error('Admin notification failed:', results[1].reason);
            }

            // Redirect to Order Confirmation Page
            window.location.href = 'order-confirmed.html';
        })
        .catch(function (error) {
            console.error('Email sending error:', error);
            // Redirect anyway - do not block user
            console.log("Redirecting despite email error...");
            window.location.href = 'order-confirmed.html';
        });
}

// Handle payment failure
function handlePaymentFailure(response) {
    console.error('Payment failed:', response);

    const errorCode = response.error.code;
    const errorDescription = response.error.description;
    const errorReason = response.error.reason;

    alert(`Payment Failed!\n\nError: ${errorDescription}\nReason: ${errorReason}\n\nPlease try again.`);
}

// Save order to history (Supports User Specific Storage)
async function saveOrderToHistory(orderData) {
    let storageKey = 'quintOrders'; // Default guest storage

    // Check if we have a logged-in user (set by firebase-init.js)
    if (window.currentUser && window.currentUser.uid) {
        storageKey = `quintOrders_${window.currentUser.uid}`;
        console.log(`Saving order to LOCAL storage: ${storageKey}`);

        // --- NEW: SAVE TO CLOUD FIRESTORE ---
        if (window.saveOrderToCloud) {
            console.log("Attempting to save to Cloud Database...");
            await window.saveOrderToCloud(window.currentUser.uid, orderData);
        }
        // -------------------------------------
    } else {
        console.log("Saving order to guest storage");
    }

    const orders = JSON.parse(localStorage.getItem(storageKey)) || [];
    orders.push(orderData);

    localStorage.setItem(storageKey, JSON.stringify(orders));
}

// --- AUTO-FIX: Force update cart prices to match current DB ---
(function fixCartPrices() {
    try {
        const cart = JSON.parse(localStorage.getItem('quintCart')) || [];
        let updated = false;

        cart.forEach(item => {
            // Find product by matching name
            for (const key in productsDB) {
                if (productsDB[key].name === item.name) {
                    // Force update price
                    if (item.price !== productsDB[key].price) {
                        console.log(`Fixing Price for ${item.name}: ${item.price} -> ${productsDB[key].price}`);
                        item.price = productsDB[key].price;
                        updated = true;
                    }
                }
            }
        });

        if (updated) {
            localStorage.setItem('quintCart', JSON.stringify(cart));
            console.log("Cart prices auto-corrected.");
            // If on cart page, reload to show changes
            if (window.location.pathname.includes('cart.html')) {
                setTimeout(() => window.location.reload(), 500);
            }
        }
    } catch (e) { console.error("Error auto-fixing prices:", e); }
})();

