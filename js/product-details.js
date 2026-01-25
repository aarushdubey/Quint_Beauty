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
            const titleEl = document.querySelector('.product-details h1');
            if (titleEl) titleEl.textContent = product.name;
            document.title = `${product.name} | Quint Beauty`;

            // Update Price
            const priceEl = document.querySelector('.product-details .price');
            if (priceEl) priceEl.textContent = `₹${parseFloat(product.price).toFixed(2)}`;

            // Update Description
            const descEl = document.querySelector('.product-details p');
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

            // Handle Stock
            const addToCartBtn = document.querySelector('.add-to-cart');
            if (addToCartBtn) {
                // Reset button state
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'ADD TO CART';
                addToCartBtn.style.opacity = '1';
                addToCartBtn.style.cursor = 'pointer';

                // Add click event for cart
                // We'll attach a custom event listener that overrides the one in main.js or works alongside it.
                // Since main.js uses productsDB, we need to handle "Add to Cart" here for Firestore products.

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
            console.log('Product not found in Firestore, checking legacy DB...');
            // Optional: fallback to main.js logic if not found (already handled by main.js running first)
            // But main.js runs on DOMContentLoaded as well. 
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
