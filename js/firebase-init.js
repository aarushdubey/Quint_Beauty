import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 2. Get User Orders from Cloud (Resilient Multi-Path Search)
export async function getUserOrdersFromCloud(userId, userEmail = null) {
    try {
        const ordersRef = collection(db, "orders");
        const ordersMap = new Map();
        const queryPromises = [];

        // 1. Primary: Search by Authenticated User ID
        if (userId) {
            queryPromises.push(getDocs(query(ordersRef, where("uid", "==", userId))));
        }

        // 2. Secondary: Search by Email variations across common field paths
        const email = userEmail || (auth.currentUser ? auth.currentUser.email : null);
        if (email) {
            const rawEmail = email.trim(); // Trim original
            const variations = [rawEmail, rawEmail.toLowerCase()];

            // Add variation without spaces just in case
            const noSpaces = rawEmail.replace(/\s/g, '').toLowerCase();
            if (!variations.includes(noSpaces)) variations.push(noSpaces);

            // Fetch combinations for each email variation
            variations.forEach(curEmail => {
                // Try three most likely schema paths for email storage
                queryPromises.push(getDocs(query(ordersRef, where("customerInfo.email", "==", curEmail))));
                queryPromises.push(getDocs(query(ordersRef, where("email", "==", curEmail))));
                queryPromises.push(getDocs(query(ordersRef, where("customer_email", "==", curEmail))));
            });
        }

        // Execute queries in parallel, catching errors per-query (e.g. missing index)
        const snapshots = await Promise.all(
            queryPromises.map(p => p.catch(err => {
                console.warn("An individual order query failed or requires an index:", err);
                return { forEach: () => { } }; // Return empty result set
            }))
        );

        // Populate map to deduplicate orders by Firestore Document ID
        snapshots.forEach(snapshot => {
            if (snapshot && typeof snapshot.forEach === 'function') {
                snapshot.forEach(doc => {
                    ordersMap.set(doc.id, { id: doc.id, ...doc.data() });
                });
            }
        });

        // Convert to array and sort by date descending (Safely)
        const sortedOrders = Array.from(ordersMap.values()).sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });

        console.log(`Cloud sync complete. ${sortedOrders.length} orders found for ${email || userId}`);
        return sortedOrders;
    } catch (error) {
        console.error("Fatal error in getUserOrdersFromCloud:", error);
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

            // Sync User Profile to Firestore (for retroactive linking)
            const userRef = doc(db, 'users', user.uid);
            setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: new Date().toISOString()
            }, { merge: true }).catch(err => console.warn("Could not sync profile:", err));

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
