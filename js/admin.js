// Admin Dashboard JavaScript
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, query, orderBy, limit, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Authorized admin emails
const ADMIN_EMAILS = ['beautyquint@gmail.com'];

let currentUser = null;
let allOrders = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin dashboard loaded');
    setupAuthListeners();
    setupNavigation();
    setupLogout();
    setupLogin();
});

// Auth State Listener
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user && ADMIN_EMAILS.includes(user.email)) {
            // Authorized admin
            currentUser = user;
            showDashboard();
            updateUserInfo(user);
            await loadDashboardData();
        } else if (user) {
            // Logged in but not admin
            alert('Access Denied: You are not authorized to access this page.');
            await signOut(auth);
            showLogin();
        } else {
            // Not logged in
            showLogin();
        }
    });
}

// Login with Email/Password
function setupLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const loginBtn = document.getElementById('adminLoginBtn');

            // Disable button and show loading
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            try {
                await signInWithEmailAndPassword(auth, email, password);
                console.log('Login successful!');
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });
    }
}

// Logout
function setupLogout() {
    document.getElementById('adminLogoutBtn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showLogin();
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
}

// Show/Hide Screens
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'grid';
}

// Update User Info
function updateUserInfo(user) {
    const userInfoDiv = document.getElementById('adminUserInfo');
    if (userInfoDiv) {
        userInfoDiv.querySelector('.admin-name').textContent = user.displayName || 'Admin';
        userInfoDiv.querySelector('.admin-email').textContent = user.email;
        if (user.photoURL) {
            userInfoDiv.querySelector('.admin-avatar').style.backgroundImage = `url(${user.photoURL})`;
            userInfoDiv.querySelector('.admin-avatar').style.backgroundSize = 'cover';
        }
    }
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(pageName) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

    // Update page visibility
    document.querySelectorAll('.admin-page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}Page`)?.classList.add('active');

    // Load page data
    if (pageName === 'orders') {
        loadAllOrders();
    } else if (pageName === 'products') {
        loadProducts();
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Fetch all orders from Firestore
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        allOrders = [];
        querySnapshot.forEach((doc) => {
            allOrders.push({ id: doc.id, ...doc.data() });
        });

        console.log('Loaded orders:', allOrders.length);

        // Calculate stats
        updateDashboardStats();

        // Show recent orders
        displayRecentOrders();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('recentOrdersList').innerHTML =
            '<p style="text-align: center; padding: 2rem; color: red;">Error loading orders. Please refresh.</p>';
    }
}

// Update Dashboard Stats
function updateDashboardStats() {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const pendingOrders = allOrders.filter(o => o.status === 'paid' || !o.status).length;

    // Get unique customers
    const uniqueCustomers = new Set(allOrders.map(o => o.customerInfo?.email)).size;

    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalCustomers').textContent = uniqueCustomers;
}

// Display Recent Orders
function displayRecentOrders() {
    const recentOrders = allOrders.slice(0, 10);
    const container = document.getElementById('recentOrdersList');

    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">No orders yet.</p>';
        return;
    }

    const table = createOrdersTable(recentOrders);
    container.innerHTML = '';
    container.appendChild(table);
}

// Display All Orders
function loadAllOrders() {
    const container = document.getElementById('allOrdersList');

    if (allOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">No orders yet.</p>';
        return;
    }

    const table = createOrdersTable(allOrders);
    container.innerHTML = '';
    container.appendChild(table);
}

// Create Orders Table
function createOrdersTable(orders) {
    const table = document.createElement('table');
    table.className = 'orders-table';

    table.innerHTML = `
        <thead>
            <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            ${orders.map(order => {
        const date = new Date(order.date);
        const formattedDate = date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        return `
                    <tr>
                        <td class="order-id">${order.orderId || 'N/A'}</td>
                        <td>${order.customerInfo?.firstName || 'N/A'} ${order.customerInfo?.lastName || ''}</td>
                        <td>${formattedDate}<br><small style="color: #999;">${formattedTime}</small></td>
                        <td>${order.items?.length || 0} item(s)</td>
                        <td><strong>₹${parseFloat(order.total || 0).toFixed(2)}</strong></td>
                        <td><span class="order-status status-${order.status || 'paid'}">${(order.status || 'paid').toUpperCase()}</span></td>
                        <td>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="viewOrderDetails('${order.id}')">
                                View
                            </button>
                        </td>
                    </tr>
                `;
    }).join('')}
        </tbody>
    `;

    return table;
}

// View Order Details
window.viewOrderDetails = function (orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('orderModalBody');

    const date = new Date(order.date);
    const formattedDate = date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    modalBody.innerHTML = `
        <h2 style="margin-bottom: 2rem;">Order Details</h2>
        
        <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <div style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Order ID</div>
                    <div style="font-weight: 600;">${order.orderId}</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Payment ID</div>
                    <div style="font-family: monospace; font-size: 0.9rem;">${order.paymentId || 'N/A'}</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Date & Time</div>
                    <div>${formattedDate} at ${formattedTime}</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Status</div>
                    <span class="order-status status-${order.status || 'paid'}">${(order.status || 'paid').toUpperCase()}</span>
                </div>
            </div>
        </div>
        
        <h3 style="margin-bottom: 1rem;">Customer Information</h3>
        <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
            <div style="margin-bottom: 0.8rem;"><strong>Name:</strong> ${order.customerInfo?.firstName} ${order.customerInfo?.lastName}</div>
            <div style="margin-bottom: 0.8rem;"><strong>Email:</strong> ${order.customerInfo?.email}</div>
            <div style="margin-bottom: 0.8rem;"><strong>Phone:</strong> ${order.customerInfo?.phone || 'Not provided'}</div>
            <div><strong>Address:</strong><br>${order.customerInfo?.address}, ${order.customerInfo?.city}, ${order.customerInfo?.state} ${order.customerInfo?.zipCode}</div>
        </div>
        
        <h3 style="margin-bottom: 1rem;">Order Items</h3>
        <div style="margin-bottom: 2rem;">
            ${order.items?.map(item => `
                <div style="display: flex; gap: 1rem; padding: 1rem; border: 1px solid #eee; border-radius: 8px; margin-bottom: 1rem;">
                    <img src="${item.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 0.3rem;">${item.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">Quantity: ${item.quantity}</div>
                    </div>
                    <div style="font-weight: 600;">₹${item.price}</div>
                </div>
            `).join('')}
        </div>
        
        <div style="border-top: 2px solid #eee; padding-top: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 600;">
                <span>Total</span>
                <span>₹${parseFloat(order.total).toFixed(2)}</span>
            </div>
        </div>
    `;

    modal.classList.add('active');
};

window.closeOrderModal = function () {
    document.getElementById('orderModal').classList.remove('active');
};

// Close modal on outside click
document.getElementById('orderModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') {
        window.closeOrderModal();
    }
});

// ========== PRODUCT MANAGEMENT ==========

import { addDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allProducts = [];
let editingProductId = null;

// Load Products from Firestore
async function loadProducts() {
    try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);

        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        console.log('Loaded products:', allProducts.length);
        displayProducts();

    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsList').innerHTML =
            '<p style="text-align: center; padding: 2rem; color: red;">Error loading products. Please refresh.</p>';
    }
}

// Display Products
function displayProducts() {
    const container = document.getElementById('productsList');

    if (allProducts.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">No products yet. Click "Add Product" to get started!</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;';

    allProducts.forEach(product => {
        const card = document.createElement('div');
        card.style.cssText = 'background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s;';
        card.onmouseenter = () => card.style.transform = 'translateY(-4px)';
        card.onmouseleave = () => card.style.transform = 'translateY(0)';

        card.innerHTML = `
            <img src="${product.image}" style="width: 100%; height: 200px; object-fit: cover;">
            <div style="padding: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">${product.name}</h4>
                <p style="color: #666; font-size: 0.9rem; margin: 0 0 0.5rem 0; line-height: 1.4;">${product.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <span style="font-size: 1.2rem; font-weight: 600;">₹${parseFloat(product.price).toFixed(2)}</span>
                    <span style="color: ${product.stock > 10 ? '#388e3c' : product.stock > 0 ? '#f57c00' : '#d32f2f'}; font-size: 0.85rem;">
                        Stock: ${product.stock}
                    </span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline" style="flex: 1; padding: 0.5rem; font-size: 0.85rem;" onclick="editProduct('${product.id}')">
                        Edit
                    </button>
                    <button class="btn btn-outline" style="flex: 1; padding: 0.5rem; font-size: 0.85rem; color: #d32f2f; border-color: #d32f2f;" onclick="deleteProduct('${product.id}', '${product.name}')">
                        Delete
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

// Open Add Product Modal
document.getElementById('addProductBtn')?.addEventListener('click', () => {
    editingProductId = null;
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productSubmitText').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').classList.add('active');
});

// Close Product Modal
window.closeProductModal = function () {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
};

// Submit Product Form
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('productSubmitText');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';

    try {
        // Get image filename and construct full path
        const imageFilename = document.getElementById('productImage').value.trim();
        if (!imageFilename) {
            alert('Please enter an image filename');
            submitBtn.textContent = originalText;
            return;
        }

        // Construct image URL (assumes image is in /assets/images/products/)
        const imageUrl = `assets/images/products/${imageFilename}`;

        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            category: document.getElementById('productCategory').value,
            image: imageUrl,
            updatedAt: new Date().toISOString()
        };

        if (editingProductId) {
            // Update existing product
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
            alert('Product updated successfully!');
        } else {
            // Add new product
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }

        closeProductModal();
        await loadProducts();

    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product: ' + error.message);
        submitBtn.textContent = originalText;
    }
});

// Edit Product
window.editProduct = function (productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    editingProductId = productId;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productSubmitText').textContent = 'Update Product';

    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImage').value = product.image;

    document.getElementById('productModal').classList.add('active');
};

// Delete Product
window.deleteProduct = async function (productId, productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'products', productId));
        alert('Product deleted successfully!');
        await loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product: ' + error.message);
    }
};

// Close product modal on outside click
document.getElementById('productModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'productModal') {
        closeProductModal();
    }
});
