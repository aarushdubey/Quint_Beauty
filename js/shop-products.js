// Shop Page - Load Products from Firestore
import { db } from './firebase-init.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Load and display products
async function loadShopProducts() {
    const productsGrid = document.querySelector('.grid[style*="grid-template-columns"]');

    if (!productsGrid) {
        console.error('Products grid not found');
        return;
    }

    // Show loading state
    productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #999;">Loading products...</p>';

    try {
        // Fetch products from Firestore
        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);

        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        console.log('Loaded products from Firestore:', products.length);

        // Update product count
        const countSpan = document.getElementById('product-count');
        if (countSpan) {
            countSpan.textContent = `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`;
        }

        // Clear grid
        productsGrid.innerHTML = '';

        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #999;">No products available yet. Check back soon!</p>';
            return;
        }

        // Display products
        products.forEach((product, index) => {
            const productCard = document.createElement('a');
            productCard.href = `product?id=${product.id}`;
            productCard.className = 'product-card reveal';
            if (index > 0) productCard.classList.add(`delay-${index * 100}`);

            // Stock badge
            const stockBadge = product.stock > 0
                ? (product.stock <= 5
                    ? `<span class="tag" style="position: absolute; top: 1rem; left: 1rem; background: #f57c00; color: white; padding: 0.2rem 0.8rem; font-size: 0.8rem; z-index: 2;">Only ${product.stock} left!</span>`
                    : `<span class="tag" style="position: absolute; top: 1rem; left: 1rem; background: white; padding: 0.2rem 0.8rem; font-size: 0.8rem; z-index: 2;">In Stock</span>`)
                : `<span class="tag" style="position: absolute; top: 1rem; left: 1rem; background: #d32f2f; color: white; padding: 0.2rem 0.8rem; font-size: 0.8rem; z-index: 2;">Out of Stock</span>`;

            productCard.innerHTML = `
                <div class="product-img-wrapper" style="background: #F9F7F5; height: 350px; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 1rem;">
                    ${stockBadge}
                    <img src="${product.image}" alt="${product.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div class="product-info">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.3rem;">${product.name}</h3>
                    <p style="color: var(--color-text-muted);">₹${parseFloat(product.price).toFixed(2)}</p>
                </div>
            `;

            productsGrid.appendChild(productCard);
        });

        // Re-initialize reveal animations
        if (typeof initRevealAnimations === 'function') {
            initRevealAnimations();
        }

    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: red;">Error loading products. Please refresh the page.</p>';
    }
}

// Load products when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadShopProducts();
});
