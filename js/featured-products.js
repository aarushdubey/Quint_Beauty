
import { db } from './firebase-init.js';
import { collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

async function loadFeaturedProducts() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;

    try {
        console.log('Loading featured products...');
        const productsRef = collection(db, 'products');

        // Sorting by updatedAt desc to get the 3 newest products
        const q = query(productsRef, orderBy('updatedAt', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);

        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        console.log('Found latest products:', products.length);

        grid.innerHTML = ''; // Clear loading message

        if (products.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No products found.</p>';
            return;
        }

        products.forEach((product, index) => {
            const productCard = document.createElement('a');
            productCard.href = `product.html?id=${product.id}`;
            productCard.className = 'product-card reveal';
            // Add staggered delay
            if (index > 0) productCard.classList.add(`delay-${Math.min(index * 100, 300)}`);

            // Check stock logic
            let badge = '';
            if (product.stock <= 0) {
                badge = `<span class="tag" style="position: absolute; top: 1rem; left: 1rem; background: #d32f2f; color: white; padding: 0.2rem 0.8rem; font-size: 0.8rem; z-index: 2;">Out of Stock</span>`;
            } else if (index === 0) {
                // Tag the latest one as New Arrival
                badge = `<span class="tag" style="position: absolute; top: 1rem; left: 1rem; background: var(--color-text-main); color: white; padding: 0.2rem 0.8rem; font-size: 0.8rem; z-index: 2;">New Arrival</span>`;
            }

            productCard.innerHTML = `
                <div class="product-img-wrapper" style="background: #F9F7F5; height: 350px; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 1rem;">
                    ${badge}
                    <img src="${product.image}" alt="${product.name}" style="max-width: 100%; max-height: 100%; object-fit: cover; width: 100%; height: 100%;">
                </div>
                <div class="product-info text-center">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.3rem;">${product.name}</h3>
                    <p style="color: var(--color-text-muted);">₹${parseFloat(product.price).toFixed(2)}</p>
                </div>
            `;

            grid.appendChild(productCard);
        });

        // Re-initialize reveal animations if they exist
        if (window.initRevealAnimations) {
            window.initRevealAnimations();
        }

    } catch (error) {
        console.error('Error loading featured products:', error);
        // Fallback or detailed error handling
        // If sorting index is missing, firebase throws error. 
        // We might fail silently or show error.

        if (error.code === 'failed-precondition') {
            // Index missing? Try without sorting? Or just log it.
            console.warn('Firestore index might be missing for updatedAt sorting.');
        }

        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Unable to load products at the moment.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadFeaturedProducts);
