import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Load Product Details
async function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        // No ID, maybe redirect or just stop
        return;
    }

    try {
        console.log('Loading product from Firestore:', productId);
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const product = productSnap.data();
            console.log('Product data:', product);

            // Update Title
            const titleEl = document.querySelector('.product-title');
            if (titleEl) titleEl.textContent = product.name;
            document.title = `${product.name} | Quint Beauty`;

            // Update Price
            const priceEl = document.querySelector('.product-price');
            if (priceEl) priceEl.textContent = `₹${parseFloat(product.price).toFixed(2)}`;

            // Update Description
            const descEl = document.querySelector('.product-description');
            if (descEl) descEl.textContent = product.description;

            // Update Main Image
            const mainImg = document.getElementById('mainImg');
            if (mainImg) {
                mainImg.src = product.image;
                mainImg.alt = product.name;
            }

            // Update Thumbnails (using the same image for now as we only have one)
            const thumbs = document.querySelectorAll('.thumb img');
            thumbs.forEach(img => {
                img.src = product.image;
                img.alt = product.name;
            });

            // Quantity Selector Logic
            const qtyMinus = document.getElementById('qty-minus');
            const qtyPlus = document.getElementById('qty-plus');
            const qtyInput = document.getElementById('quantity');

            if (qtyMinus && qtyPlus && qtyInput) {
                // Remove old listeners by cloning (if needed, but id selection is unique)
                const newMinus = qtyMinus.cloneNode(true);
                qtyMinus.parentNode.replaceChild(newMinus, qtyMinus);
                const newPlus = qtyPlus.cloneNode(true);
                qtyPlus.parentNode.replaceChild(newPlus, qtyPlus);

                newMinus.addEventListener('click', () => {
                    let val = parseInt(qtyInput.value);
                    if (val > 1) qtyInput.value = val - 1;
                });

                newPlus.addEventListener('click', () => {
                    let val = parseInt(qtyInput.value);
                    if (val < 10) qtyInput.value = val + 1;
                });
            }

            // Handle Stock
            const addToCartBtn = document.querySelector('.add-to-cart');
            if (addToCartBtn) {
                // Reset button state
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'ADD TO CART';
                addToCartBtn.style.opacity = '1';
                addToCartBtn.style.cursor = 'pointer';

                // Add click event for cart
                // Remove old listeners (cloning trick)
                const newBtn = addToCartBtn.cloneNode(true);
                addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);

                if (product.stock <= 0) {
                    newBtn.disabled = true;
                    newBtn.textContent = 'OUT OF STOCK';
                    newBtn.style.opacity = '0.6';
                    newBtn.style.cursor = 'not-allowed';
                } else {
                    newBtn.addEventListener('click', () => {
                        addToCart(product, productId);
                    });
                }
            }

        } else {
            console.log('Product not found in Firestore');
            const container = document.querySelector('.product-details');
            if (container) {
                container.innerHTML = '<p>Product not found.</p>';
            }
        }
    } catch (error) {
        console.error('Error loading product details:', error);
    }
}

// Simple Cart Functionality for Firestore products
function addToCart(product, id) {
    let cart = JSON.parse(localStorage.getItem('quintCart')) || [];

    // Check if item exists
    const existingItem = cart.find(item => item.id === id);

    const quantityInput = document.getElementById('quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }

    localStorage.setItem('quintCart', JSON.stringify(cart));

    // Update cart count UI
    updateCartCount();

    // Show feedback
    const btn = document.querySelector('.add-to-cart');
    const originalText = btn.textContent;
    btn.textContent = 'ADDED!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('quintCart')) || [];
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}

document.addEventListener('DOMContentLoaded', loadProductDetails);
