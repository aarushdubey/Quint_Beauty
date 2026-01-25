import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC8d9OfIXC6J6EFIAqVZgyVm2S3yujLMk8",
    authDomain: "quint-beauty.firebaseapp.com",
    projectId: "quint-beauty",
    storageBucket: "quint-beauty.firebasestorage.app",
    messagingSenderId: "182771986293",
    appId: "1:182771986293:web:164925cd16b6e9343ead3c",
    measurementId: "G-TEM9DYZEEC"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export auth and db for admin dashboard (must be before other code uses them)
export { auth, db };


// --- FIRESTORE DATABASE FUNCTIONS ---

// 1. Save Order to Cloud
export async function saveOrderToCloud(userId, orderData) {
    try {
        const ordersRef = collection(db, "orders");
        // Add user ID to the order data itself for security rules
        const orderWithUser = { ...orderData, uid: userId };
        const docRef = await addDoc(ordersRef, orderWithUser);
        console.log("Document written with ID: ", docRef.id);
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
}

// 2. Get User Orders from Cloud
export async function getUserOrdersFromCloud(userId) {
    try {
        const ordersRef = collection(db, "orders");
        // Query: Get orders where uid == userId
        const q = query(ordersRef, where("uid", "==", userId), orderBy("date", "desc"));

        const querySnapshot = await getDocs(q);
        let orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
    } catch (e) {
        console.error("Error getting documents: ", e);
        // Fallback to local storage logic handled by caller if empty
        return [];
    }
}

// Make them available globally for main.js
window.saveOrderToCloud = saveOrderToCloud;
window.getUserOrdersFromCloud = getUserOrdersFromCloud;


// Current User State (can be accessed globally)
window.currentUser = null;

// --- LOGIN FUNCTION ---
export function loginWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("Logged in as:", user.displayName);
            // Reload to update UI
            window.location.reload();
        }).catch((error) => {
            console.error("Login Error:", error);
            alert("Login failed: " + error.message);
        });
}

// --- LOGOUT FUNCTION ---
export function logoutUser() {
    signOut(auth).then(() => {
        console.log("Logged out");
        // Clear guest data logic if needed, but for now just reload
        window.location.reload();
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// --- AUTH STATE MONITOR ---
// This runs automatically when the page loads to check if user is logged in
export function initAuthMonitor(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            window.currentUser = user;
            console.log("User is authenticated:", user.email);

            // --- MIGRATE GUEST ORDERS TO USER ---
            const guestOrders = JSON.parse(localStorage.getItem('quintOrders')) || [];
            if (guestOrders.length > 0) {
                const userKey = `quintOrders_${user.uid}`;
                const userOrders = JSON.parse(localStorage.getItem(userKey)) || [];

                // Merge orders (avoid duplicates by Order ID)
                let newOrdersAdded = false;
                guestOrders.forEach(guestOrder => {
                    const exists = userOrders.some(uOrder => uOrder.orderId === guestOrder.orderId);
                    if (!exists) {
                        userOrders.push(guestOrder);
                        newOrdersAdded = true;
                    }
                });

                if (newOrdersAdded) {
                    localStorage.setItem(userKey, JSON.stringify(userOrders));
                    console.log("Migrated guest orders to user account.");
                    // Optional: Clear guest orders or keep them? Keeping them is safer for now.
                    // localStorage.removeItem('quintOrders'); 
                }
            }
            // ------------------------------------

        } else {
            // User is signed out
            window.currentUser = null;
            console.log("No user signed in");
        }
        if (callback) callback(user);
    });
}
