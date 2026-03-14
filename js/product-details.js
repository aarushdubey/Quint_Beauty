import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentProduct = null;
let currentProductId = null;
let selectedShade = null;

// Load Product Details
async function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        return;
    }

    currentProductId = productId;

    try {
        console.log('Loading product from Firestore:', productId);
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            const product = productSnap.data();
            currentProduct = product;
            console.log('Product data:', product);

            // Update Title
            const titleEl = document.querySelector('.product-title');
            if (titleEl) titleEl.textContent = product.name;
            document.title = `${product.name} | Quint Beauty`;

            // Update Breadcrumb
            const breadcrumbSpan = document.querySelector('.breadcrumbs span');
            if (breadcrumbSpan) breadcrumbSpan.textContent = product.name;

            // Update Price
            const priceEl = document.querySelector('.product-price');
            if (priceEl) priceEl.textContent = `₹${parseFloat(product.price).toFixed(2)}`;

            // Update Description
            const descEl = document.querySelector('.product-description');
            if (descEl) descEl.textContent = product.description;

            // Check if product has shades
            if (product.hasShades && product.shades && product.shades.length > 0) {
                renderShadeSelector(product);
                // Select first shade by default
                selectShade(0, product);
            } else {
                // No shades — use regular gallery
                const images = product.images || (product.image ? [product.image] : []);
                updateGallery(images, product.name);
            }

            // Quantity Selector Logic
            const qtyMinus = document.getElementById('qty-minus');
            const qtyPlus = document.getElementById('qty-plus');
            const qtyInput = document.getElementById('quantity');

            if (qtyMinus && qtyPlus && qtyInput) {
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
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'ADD TO CART';
                addToCartBtn.style.opacity = '1';
                addToCartBtn.style.cursor = 'pointer';

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

            // Update Ingredients and How to Use tabs dynamically
            const ingredientsDetails = document.querySelectorAll('.product-tabs details');
            if (ingredientsDetails.length >= 1) {
                const ingredientsSection = ingredientsDetails[0];
                if (product.ingredients && product.ingredients.trim()) {
                    const ingredientsParagraph = ingredientsSection.querySelector('p');
                    if (ingredientsParagraph) {
                        ingredientsParagraph.textContent = product.ingredients;
                    }
                } else {
                    ingredientsSection.style.display = 'none';
                }
            }

            if (ingredientsDetails.length >= 2) {
                const howToUseSection = ingredientsDetails[1];
                if (product.howToUse && product.howToUse.trim()) {
                    const howToUseParagraph = howToUseSection.querySelector('p');
                    if (howToUseParagraph) {
                        howToUseParagraph.textContent = product.howToUse;
                    }
                } else {
                    howToUseSection.style.display = 'none';
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

// ========== SHADE SELECTOR UI ==========

function renderShadeSelector(product) {
    const productDetails = document.querySelector('.product-details');
    if (!productDetails) return;

    // Find where to insert — after description, before actions
    const description = productDetails.querySelector('.product-description');
    const actions = productDetails.querySelector('.actions');

    if (!description || !actions) return;

    // Check if shade selector already exists
    let existingSelector = document.getElementById('shadeSelector');
    if (existingSelector) existingSelector.remove();

    // Create shade selector container
    const selectorDiv = document.createElement('div');
    selectorDiv.id = 'shadeSelector';
    selectorDiv.className = 'shade-selector';
    selectorDiv.innerHTML = `
        <div class="shade-selector-header">
            <span class="shade-selector-label">SELECT SHADE</span>
            <span class="shade-selected-name" id="selectedShadeName">${product.shades[0].name}</span>
        </div>
        <div class="shade-swatches" id="shadeSwatches">
            ${product.shades.map((shade, index) => `
                <button
                    class="shade-swatch-btn ${index === 0 ? 'active' : ''}"
                    data-shade-index="${index}"
                    title="${shade.name}"
                    aria-label="Select shade: ${shade.name}"
                >
                    <img src="${shade.swatchUrl}" alt="${shade.name}" class="shade-swatch-image">
                    <span class="shade-swatch-ring"></span>
                </button>
            `).join('')}
        </div>
    `;

    // Insert before actions
    actions.parentNode.insertBefore(selectorDiv, actions);

    // Add event listeners
    const swatchBtns = selectorDiv.querySelectorAll('.shade-swatch-btn');
    swatchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.shadeIndex);
            selectShade(index, product);

            // Update active state
            swatchBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function selectShade(index, product) {
    const shade = product.shades[index];
    if (!shade) return;

    selectedShade = shade;

    // Update shade name display
    const nameEl = document.getElementById('selectedShadeName');
    if (nameEl) nameEl.textContent = shade.name;

    // Update gallery with shade-specific images
    const galleryImages = shade.galleryUrls || [];
    if (galleryImages.length > 0) {
        updateGallery(galleryImages, `${product.name} - ${shade.name}`);
    }
}

function updateGallery(images, altText) {
    // Set Main Image
    const mainImg = document.getElementById('mainImg');
    if (mainImg && images.length > 0) {
        mainImg.src = images[0];
        mainImg.alt = altText;
    }

    // Update Thumbnails
    const thumbsContainer = document.querySelector('.product-thumbs');
    if (thumbsContainer) {
        thumbsContainer.innerHTML = '';

        images.forEach((imgUrl, index) => {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = `thumb ${index === 0 ? 'active' : ''}`;

            thumbDiv.onclick = function () {
                const main = document.getElementById('mainImg');
                if (main) main.src = imgUrl;
                document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            };

            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = `${altText} ${index + 1}`;

            thumbDiv.appendChild(img);
            thumbsContainer.appendChild(thumbDiv);
        });
    }
}


// Simple Cart Functionality for Firestore products
function addToCart(product, id) {
    let cart = JSON.parse(localStorage.getItem('quintCart')) || [];

    const quantityInput = document.getElementById('quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    // Build a unique key that includes shade
    const shadeName = selectedShade ? selectedShade.name : null;
    const cartItemId = shadeName ? `${id}_shade_${shadeName}` : id;

    // Check if item exists (with same shade)
    const existingItem = cart.find(item => item.id === cartItemId);

    // Use shade-specific image or fallback
    const itemImage = selectedShade && selectedShade.galleryUrls && selectedShade.galleryUrls.length > 0
        ? selectedShade.galleryUrls[0]
        : product.image;

    const itemName = shadeName ? `${product.name} - ${shadeName}` : product.name;

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: cartItemId,
            productId: id,
            name: itemName,
            shade: shadeName || null,
            price: product.price,
            image: itemImage,
            quantity: quantity
        });
    }

    localStorage.setItem('quintCart', JSON.stringify(cart));

    // Update cart count UI
    updateCartCount();

    // Show feedback
    const btn = document.querySelector('.add-to-cart');
    const originalText = btn.textContent;
    btn.textContent = shadeName ? `ADDED ${shadeName.toUpperCase()}!` : 'ADDED!';
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
