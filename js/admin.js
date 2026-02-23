// Admin Dashboard JavaScript
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, query, orderBy, limit, where, doc, updateDoc, addDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Authorized admin emails
const ADMIN_EMAILS = ['beautyquint@gmail.com', 'support@quintbeauty.com', 'aarushdubey@gmail.com'];

let currentUser = null;
let allOrders = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin dashboard loaded');
    setupAuthListeners();
    setupNavigation();
    setupLogout();
    setupLogin();

    // Legacy sync tool
    document.getElementById('syncLegacyOrdersBtn')?.addEventListener('click', syncLegacyOrders);
});

// Auth State Listener
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed. User:", user ? user.email : "None");

        if (user) {
            const normalizedEmail = user.email.toLowerCase();
            const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === normalizedEmail);

            if (isAdmin) {
                // Authorized admin
                currentUser = user;
                showDashboard();
                updateUserInfo(user);
                await loadDashboardData();
            } else {
                // Logged in but not admin
                console.error('Unauthorized access attempt:', user.email);
                alert(`Access Denied: ${user.email} is not authorized. \n\nAuthorized admins: ${ADMIN_EMAILS.join(', ')}`);
                await signOut(auth);
                showLogin();
            }
        } else {
            // Not logged in
            showLogin();
        }
    });
}

// Login with Email/Password
// Login with Email/Password (Deprecated) -> Now Google Only
function setupLogin() {
    const googleLoginBtn = document.getElementById('adminGoogleLoginBtn');

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                googleLoginBtn.disabled = true;
                const originalText = googleLoginBtn.innerHTML;
                googleLoginBtn.textContent = 'Connecting...';

                await signInWithPopup(auth, provider);
                console.log('Google Login initiated');
            } catch (error) {
                console.error('Google Login error:', error);
                alert('Google Sign-In failed: ' + error.message);
                googleLoginBtn.disabled = false;
                googleLoginBtn.innerHTML = originalText;
            }
        });
    }
}


// Logout
function setupLogout() {
    const logoutHandler = async () => {
        try {
            await signOut(auth);
            showLogin();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    document.getElementById('adminLogoutBtn')?.addEventListener('click', logoutHandler);
    document.getElementById('adminLogoutBtnMain')?.addEventListener('click', logoutHandler);
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
    } else if (pageName === 'customers') {
        loadCustomers();
    }
}

// Load Customers (Derived from Orders)
function loadCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">Loading...</td></tr>';

    // Ensure data is loaded
    if (!allOrders || allOrders.length === 0) {
        // If orders aren't loaded, try checking if dashboard loaded them.
        // Or wait for loadDashboardData which runs on init. 
        // If empty, display empty.
        loadDashboardData().then(() => {
            processCustomersData();
        });
    } else {
        processCustomersData();
    }
}

function processCustomersData() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const customersMap = new Map();

    if (allOrders && allOrders.length > 0) {
        allOrders.forEach(order => {
            const info = order.customerInfo || {};
            let email = info.email;

            if (!email) return; // Skip invalid entries
            email = email.toLowerCase();

            if (!customersMap.has(email)) {
                customersMap.set(email, {
                    name: `${info.firstName || ''} ${info.lastName || ''}`.trim() || 'Unknown',
                    email: info.email, // Keep original casing display? or normalized
                    phone: info.phone || '-',
                    orderCount: 0,
                    totalSpent: 0
                });
            }

            const customer = customersMap.get(email);
            customer.orderCount += 1;
            customer.totalSpent += parseFloat(order.total || 0);
        });
    }

    if (customersMap.size === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No customers found.</td></tr>';
        return;
    }

    // Convert to array and sort by spend desc
    const sortedCustomers = Array.from(customersMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent);

    sortedCustomers.forEach(customer => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500;">${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.orderCount}</td>
            <td style="font-weight: 600;">₹${customer.totalSpent.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Update total count
    const totalCountEl = document.getElementById('totalCustomers');
    if (totalCountEl) totalCountEl.textContent = customersMap.size;
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Fetch all orders from Firestore
        const ordersRef = collection(db, 'orders');
        let querySnapshot;

        try {
            // Try with server-side sorting (requires Index)
            const q = query(ordersRef, orderBy('date', 'desc'));
            querySnapshot = await getDocs(q);
        } catch (indexError) {
            console.warn("Index missing for date sorting, falling back to client-side sort.", indexError);
            if (indexError.code === 'failed-precondition' || indexError.message.includes('index')) {
                // Fallback: Fetch without sort
                querySnapshot = await getDocs(ordersRef);
            } else {
                throw indexError; // Re-throw permission errors
            }
        }

        allOrders = [];
        querySnapshot.forEach((doc) => {
            allOrders.push({ id: doc.id, ...doc.data() });
        });

        // Client-side sort fallback (if server sort failed or just to be safe)
        allOrders.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });

        console.log('Loaded orders:', allOrders.length);

        // Calculate stats
        updateDashboardStats();

        // Show recent orders
        displayRecentOrders();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('recentOrdersList').innerHTML =
            `<div style="text-align: center; padding: 2rem; color: #d32f2f; background: #ffebee; border-radius: 8px;">
                <p><strong>Error loading orders:</strong> ${error.message}</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem;">Code: ${error.code || 'unknown'}</p>
                <button class="btn btn-outline" onclick="location.reload()" style="margin-top: 1rem; border-color: #d32f2f; color: #d32f2f;">Retry</button>
             </div>`;
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
                <th>Actions</th>
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

        const isCompleted = order.status === 'completed';

        return `
                    <tr>
                        <td class="order-id">${order.orderId || 'N/A'}</td>
                        <td>${order.customerInfo?.firstName || 'N/A'} ${order.customerInfo?.lastName || ''}</td>
                        <td>${formattedDate}<br><small style="color: #999;">${formattedTime}</small></td>
                        <td>${order.items?.length || 0} item(s)</td>
                        <td><strong>₹${parseFloat(order.total || 0).toFixed(2)}</strong></td>
                        <td><span class="order-status status-${order.status || 'paid'}">${(order.status || 'paid').toUpperCase()}</span></td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="viewOrderDetails('${order.id}')">
                                    View
                                </button>
                                ${!isCompleted ? `
                                <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: #4CAF50; border-color: #4CAF50;" onclick="markOrderComplete('${order.id}')">
                                    Complete
                                </button>
                                ` : `
                                <span style="color: #4CAF50; font-size: 0.85rem; padding: 0.4rem 0.8rem;">✓ Done</span>
                                `}
                            </div>
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

// Mark Order as Complete
window.markOrderComplete = async function (orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const confirmed = confirm(`Mark order ${order.orderId} as completed?`);
    if (!confirmed) return;

    try {
        // Update in Firestore
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: 'completed',
            completedAt: new Date().toISOString()
        });

        // Update local data
        order.status = 'completed';
        order.completedAt = new Date().toISOString();

        // Refresh displays
        displayRecentOrders();
        loadAllOrders();

        alert('✓ Order marked as completed!');
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Failed to update order: ' + error.message);
    }
};

// Close modal on outside click
document.getElementById('orderModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') {
        window.closeOrderModal();
    }
});

// ========== PRODUCT MANAGEMENT ==========

// Imports moved to top

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

// ========== IMAGE UPLOAD HANDLING ==========

// ImgBB API Key (Get yours free at: https://api.imgbb.com/)
const IMGBB_API_KEY = '936f516a5f95c452991da863a0bc841d';

// Track if image upload has been initialized
let imageUploadInitialized = false;
let currentImageFiles = []; // Store selected files here
let existingImageUrls = []; // Store existing URLs when editing

// Initialize drag & drop functionality

function initializeImageUpload() {
    if (imageUploadInitialized) return;

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('productImageFile');
    const clearBtn = document.getElementById('clearAllImages');

    if (!dropZone || !fileInput) return;

    // Click to upload (delegated to input)
    dropZone.addEventListener('click', (e) => {
        // Don't trigger if clicking on remove buttons or clear button
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        fileInput.click();
    });

    // Drag & Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '#4CAF50';
            dropZone.style.background = '#f1f8f4';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '#ddd';
            dropZone.style.background = '#fafafa';
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleImageFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleImageFiles(e.target.files);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImageFiles = [];
            renderPreviews();
            fileInput.value = ''; // Reset input
        });
    }

    imageUploadInitialized = true;
    console.log('Image upload initialized (Multi-file)');
}

function handleImageFiles(files) {
    if (!files || files.length === 0) return;

    // Convert to array
    const fileArray = Array.from(files);

    // Check limit
    const totalCurrent = existingImageUrls.length + currentImageFiles.length;

    if (totalCurrent + fileArray.length > 6) {
        alert('You can only upload up to 6 images.');
        document.getElementById('productImageFile').value = '';
        return;
    }

    fileArray.forEach(file => {
        if (!file.type.startsWith('image/')) {
            alert(`Skipped ${file.name}: Not an image.`);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert(`Skipped ${file.name}: Size > 5MB.`);
            return;
        }
        // Add to list
        currentImageFiles.push(file);
    });

    renderPreviews();

    // Reset input to ensure change event fires reliably
    const fileInput = document.getElementById('productImageFile');
    if (fileInput) fileInput.value = '';
}

function renderPreviews() {
    const container = document.getElementById('imagePreviewContainer');
    const actions = document.getElementById('imagePreviewActions');
    const dropContent = document.getElementById('dropZoneContent');

    if (!container) return;

    container.innerHTML = '';

    const totalCount = existingImageUrls.length + currentImageFiles.length;

    // Always keep drop zone content visible
    if (dropContent) {
        dropContent.style.display = 'block';
        const p = dropContent.querySelector('p');
        if (p) {
            if (totalCount > 0) {
                p.textContent = totalCount >= 6 ? 'Maximum images reached' : 'Click to add more images';
                p.style.fontWeight = 'bold';
                p.style.color = '#1976d2';
            } else {
                p.textContent = 'Click to upload or drag and drop';
                p.style.fontWeight = '500';
                p.style.color = 'black';
            }
        }
    }

    if (totalCount > 0) {
        container.style.display = 'grid';
        if (actions) actions.style.display = 'block';

        // Render Existing
        existingImageUrls.forEach((url, index) => {
            createPreviewItem(container, url, true, index);
        });

        // Render New
        currentImageFiles.forEach((file, index) => {
            createPreviewItem(container, file, false, index);
        });
    } else {
        container.style.display = 'none';
        if (actions) actions.style.display = 'none';
    }
}

function createPreviewItem(container, source, isExisting, index) {
    const div = document.createElement('div');
    div.style.position = 'relative';
    div.style.borderRadius = '8px';
    div.style.overflow = 'hidden';
    div.style.aspectRatio = '1/1';
    div.style.border = '1px solid #ddd';
    div.style.background = '#f9f9f9';

    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';

    if (isExisting) {
        img.src = source;
    } else {
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.readAsDataURL(source);
    }

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '5px';
    removeBtn.style.right = '5px';
    removeBtn.style.background = 'rgba(255,0,0,0.8)';
    removeBtn.style.color = 'white';
    removeBtn.style.border = 'none';
    removeBtn.style.borderRadius = '50%';
    removeBtn.style.width = '24px';
    removeBtn.style.height = '24px';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.display = 'flex';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.justifyContent = 'center';

    removeBtn.onclick = (e) => {
        e.stopPropagation();
        if (isExisting) {
            existingImageUrls.splice(index, 1);
        } else {
            currentImageFiles.splice(index, 1);
            const fileInput = document.getElementById('productImageFile');
            if (fileInput) fileInput.value = '';
        }
        renderPreviews();
    };

    div.appendChild(img);
    div.appendChild(removeBtn);
    container.appendChild(div);
}

// Upload image to ImgBB
async function uploadImageToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('ImgBB response:', data);

        if (data.success) {
            const imageUrl = data.data.display_url || data.data.url;
            console.log('Image uploaded successfully:', imageUrl);
            return imageUrl;
        } else {
            console.error('ImgBB upload failed:', data);
            throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('ImgBB upload error:', error);
        throw error;
    }
}


// Open Add Product Modal
// Open Add Product Modal
document.getElementById('addProductBtn')?.addEventListener('click', () => {
    editingProductId = null;
    currentImageFiles = []; // Clear any previous files
    existingImageUrls = []; // Clear existing URLs
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productSubmitText').textContent = 'Add Product';
    document.getElementById('productForm').reset();

    // Reset image upload area
    const dropZoneContent = document.getElementById('dropZoneContent');
    const container = document.getElementById('imagePreviewContainer');
    const actions = document.getElementById('imagePreviewActions');

    if (dropZoneContent) dropZoneContent.style.display = 'block';
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    if (actions) actions.style.display = 'none';

    document.getElementById('productModal').classList.add('active');

    // Initialize image upload after modal is visible
    setTimeout(() => {
        initializeImageUpload();
    }, 100);
});

// Close Product Modal
window.closeProductModal = function () {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
    currentImageFiles = [];
    existingImageUrls = [];
};

// Submit Product Form
// Submit Product Form
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('productSubmitText');
    const originalText = submitBtn.textContent;

    try {
        let imageUrls = [...existingImageUrls];

        console.log('Stored image files:', currentImageFiles);

        if (currentImageFiles.length > 0) {
            // New images selected - upload them
            if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
                alert('Please configure your ImgBB API key in admin.js');
                submitBtn.textContent = originalText;
                return;
            }

            for (let i = 0; i < currentImageFiles.length; i++) {
                submitBtn.textContent = `Uploading ${i + 1}/${currentImageFiles.length}...`;
                try {
                    const url = await uploadImageToImgBB(currentImageFiles[i]);
                    imageUrls.push(url);
                } catch (err) {
                    console.error('Failed upload:', err);
                    alert(`Failed to upload ${currentImageFiles[i].name}`);
                }
            }
        }



        console.log('Final image URLs:', imageUrls);

        if (imageUrls.length === 0) {
            alert('Please upload at least one product image');
            submitBtn.textContent = originalText;
            return;
        }

        submitBtn.textContent = 'Saving...';

        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            ingredients: document.getElementById('productIngredients').value || '',
            howToUse: document.getElementById('productHowToUse').value || '',
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            category: document.getElementById('productCategory').value,
            image: imageUrls[0], // Main image (first one)
            images: imageUrls,   // Full gallery
            updatedAt: new Date().toISOString()
        };

        console.log('Saving product with data:', productData);

        if (editingProductId) {
            // Update existing product
            // Check if we have imports, assume accessible as per original file
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
            alert('Product updated successfully!');
        } else {
            // Add new product
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }

        closeProductModal();
        await loadProducts(); // Refresh the products list
        await loadDashboardData(); // Refresh dashboard stats
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product: ' + error.message);
        submitBtn.textContent = originalText;
    }
});



// Edit Product
// Edit Product
window.editProduct = function (productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    editingProductId = productId;
    currentImageFiles = []; // Clear new files list

    // Populate existing images
    existingImageUrls = product.images || (product.image ? [product.image] : []);

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productSubmitText').textContent = 'Update Product';

    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productIngredients').value = product.ingredients || '';
    document.getElementById('productHowToUse').value = product.howToUse || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImage').value = product.image || '';

    // Render previews
    renderPreviews();

    document.getElementById('productModal').classList.add('active');

    // Initialize upload in case it wasn't done yet
    setTimeout(() => {
        if (typeof initializeImageUpload === 'function') {
            initializeImageUpload();
        }
    }, 100);
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

// --- RETROACTIVE DATA SYNC ---
async function syncLegacyOrders() {
    const btn = document.getElementById('syncLegacyOrdersBtn');
    if (!btn) return;

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = 'Syncing...';

    try {
        // 1. Get all registered users from the 'users' collection
        const usersRef = collection(db, 'users');
        const userSnapshot = await getDocs(usersRef);
        const usersByEmail = {};

        userSnapshot.forEach(userDoc => {
            const data = userDoc.data();
            if (data.email) usersByEmail[data.email.trim().toLowerCase()] = data.uid;
        });

        // 2. Fetch all orders
        const ordersRef = collection(db, 'orders');
        const orderSnapshot = await getDocs(ordersRef);

        let syncedCount = 0;
        const updatePromises = [];

        orderSnapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            // Try to find email in any possible field
            let rawOrderEmail = (order.customerInfo?.email || order.email || order.customer_email || '');
            const orderEmail = rawOrderEmail.trim().toLowerCase();

            // If order has no uid, but matches an existing user's registered email
            if (!order.uid && orderEmail && usersByEmail[orderEmail]) {
                const targetUid = usersByEmail[orderEmail];
                console.log(`Linking order ${orderDoc.id} (${orderEmail}) to UID ${targetUid}`);
                const orderRef = doc(db, 'orders', orderDoc.id);
                updatePromises.push(updateDoc(orderRef, { uid: targetUid }));
                syncedCount++;
            }
        });

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            alert(`Success! Linked ${syncedCount} historical guest orders to registered user accounts.`);
            await loadDashboardData();
        } else {
            alert('Everything is already synced! No guest orders matching registered users found.');
        }

    } catch (e) {
        console.error('Sync error:', e);
        alert('Error syncing data: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}
