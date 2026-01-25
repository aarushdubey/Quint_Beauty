/* Main JS for Quint Beauty */

// Product Database
const productsDB = {
    'kajal': {
        name: "Intense Black Kajal",
        price: "10.00",
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

    // Scroll Animation Observer
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

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    // FORCE FIX: Update Kajal price in local storage if old price is found
    const currentCart = JSON.parse(localStorage.getItem('quintCart')) || [];
    let cartModified = false;
    currentCart.forEach(item => {
        if (item.name === "Intense Black Kajal" && item.price !== "10.00") {
            item.price = "10.00";
            cartModified = true;
        }
    });
    if (cartModified) {
        localStorage.setItem('quintCart', JSON.stringify(currentCart));
        refreshCartUI();
        if (document.querySelector('.cart-table')) renderCartPage();
        console.log('Fixed old prices in cart.');
    }
});

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
                    price: price ? price.innerText.replace(/[^0-9.]/g, '') : '10.00',
                    image: img ? img.src : '',
                    quantityToAdd: addedQty
                };
            } else {
                // Final fallback
                product = { name: "Quint Beauty Product", price: "10.00", image: "assets/images/product-1.jpg" };
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
function initiateRazorpayPayment(totalAmount) {
    // Validate form first
    const form = document.getElementById('checkoutForm');
    if (!form) {
        alert('Checkout form not found!');
        return;
    }

    // Check if form is valid
    if (!form.checkValidity()) {
        // Trigger HTML5 validation UI
        form.reportValidity();
        return;
    }

    // Get form data
    const formData = getCheckoutFormData();

    // Convert total to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(totalAmount * 100);

    // Get cart items for order notes
    const cart = getCart();
    const itemsList = cart.map(item => `${item.name} (${item.quantity}x)`).join(', ');

    // Razorpay options
    const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: amountInPaise, // Amount in paise
        currency: RAZORPAY_CONFIG.currency,
        name: RAZORPAY_CONFIG.company_name,
        description: 'Order for ' + itemsList,
        image: RAZORPAY_CONFIG.company_logo || '', // Your logo URL

        // Prefill customer information
        prefill: {
            name: formData.firstName + ' ' + formData.lastName,
            email: formData.email,
            contact: formData.phone || '' // Add phone field if you have one
        },

        // Shipping address
        notes: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            items: itemsList
        },

        theme: {
            color: RAZORPAY_CONFIG.theme_color
        },

        // Payment success handler
        handler: function (response) {
            handlePaymentSuccess(response, formData, cart, totalAmount);
        },

        // Payment modal closed
        modal: {
            ondismiss: function () {
                console.log('Payment cancelled by user');
                // You can show a message or handle cancellation
            }
        }
    };

    // Create Razorpay instance and open checkout
    try {
        const razorpayInstance = new Razorpay(options);

        // Handle payment failure
        razorpayInstance.on('payment.failed', function (response) {
            handlePaymentFailure(response);
        });

        razorpayInstance.open();
    } catch (error) {
        console.error('Razorpay initialization error:', error);
        alert('Payment gateway could not be initialized. Please try again.');
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
        phone: document.getElementById('phone')?.value || '' // Optional
    };
}

// Handle successful payment
function handlePaymentSuccess(response, formData, cart, totalAmount) {
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

    // Save to history (permanent)
    saveOrderToHistory(orderDetails);

    // Save to temp storage for confirmation page
    localStorage.setItem('quintLastOrder', JSON.stringify(orderDetails));

    // Clear the cart
    localStorage.removeItem('quintCart');

    // Redirect to Order Confirmation Page
    window.location.href = 'order-confirmed.html';
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
function saveOrderToHistory(orderData) {
    let storageKey = 'quintOrders'; // Default guest storage

    // Check if we have a logged-in user (set by firebase-init.js)
    if (window.currentUser && window.currentUser.uid) {
        storageKey = `quintOrders_${window.currentUser.uid}`;
        console.log(`Saving order to user storage: ${storageKey}`);
    } else {
        console.log("Saving order to guest storage");
    }

    const orders = JSON.parse(localStorage.getItem(storageKey)) || [];
    orders.push(orderData);
    localStorage.setItem(storageKey, JSON.stringify(orders));
}

