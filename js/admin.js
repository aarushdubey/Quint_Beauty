// Admin Dashboard JavaScript
import { auth, db } from './firebase-init.js';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, getDocs, query, orderBy, limit, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Authorized admin emails
const ADMIN_EMAILS = ['beautyquint@gmail.com', 'r.kdubey2004@gmail.com'];

let currentUser = null;
let allOrders = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    setupNavigation();
    setupLogout();
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

// Login
document.getElementById('adminLoginBtn')?.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
});

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
