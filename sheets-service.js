import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";
const IMGBB_API_KEY = "8621949d7967c0c66d9ab1290454d70e";
const API_BASE = window.location.origin + "/api";

const STORE = {
    get products() { return JSON.parse(localStorage.getItem('vora_products')) || []; },
    set products(v) {
        try { localStorage.setItem('vora_products', JSON.stringify(v)); } catch (e) { console.warn("localStorage full"); }
    },
    get orders() { return JSON.parse(localStorage.getItem('vora_orders')) || []; },
    set orders(v) {
        try { localStorage.setItem('vora_orders', JSON.stringify(v)); } catch (e) { console.warn("localStorage full"); }
    },
    get users() { return JSON.parse(localStorage.getItem('vora_users')) || {}; },
    set users(v) {
        try { localStorage.setItem('vora_users', JSON.stringify(v)); } catch (e) { console.warn("localStorage full"); }
    }
};

async function tryFetch(fn) {
    try { return await fn(); } catch (e) { return null; }
}

async function apiGet(collection) {
    const res = await fetch(`${API_BASE}/${collection}`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
}

async function apiSave(collection, data) {
    const res = await fetch(`${API_BASE}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, action: 'save', data })
    });
    if (!res.ok) throw new Error('API save error');
    return await res.json();
}

export async function uploadImageToStorage(fileObject) {
    if (!fileObject) return "";
    const formData = new FormData();
    formData.append("image", fileObject);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (result.success) return result.data.url;
        else throw new Error(result.error.message);
    } catch (error) {
        console.error("ImgBB upload error:", error);
        throw error;
    }
}

async function syncFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "products"));
    const fbProducts = [];
    querySnapshot.forEach((doc) => { fbProducts.push({ id: doc.id, ...doc.data() }); });
    return fbProducts;
}

export async function getProducts() {
    try {
        const apiProducts = await apiGet('products');
        if (apiProducts.length > 0) {
            const local = STORE.products;
            if (local.length > 0) {
                const merged = [...apiProducts];
                local.forEach(lp => {
                    const idx = merged.findIndex(m => m.id === lp.id || m.id === lp.id);
                    if (idx === -1) merged.push(lp);
                });
                STORE.products = merged;
                apiSave('products', merged).catch(() => {});
                return merged;
            }
            STORE.products = apiProducts;
            return apiProducts;
        }
    } catch (e) { /* API unavailable */ }
    const local = STORE.products;
    if (local.length > 0) {
        apiSave('products', local).catch(() => {});
        syncFromFirestore().then(fb => {
            if (fb.length > 0) {
                const merged = [...local];
                fb.forEach(fbp => {
                    const idx = merged.findIndex(m => m.id === fbp.id);
                    if (idx === -1) merged.push(fbp);
                    else merged[idx] = { ...merged[idx], ...fbp, id: fbp.id };
                });
                STORE.products = merged;
                apiSave('products', merged).catch(() => {});
            }
        }).catch(() => {});
        return local;
    }
    try {
        const fbProducts = await syncFromFirestore();
        if (fbProducts.length > 0) {
            STORE.products = fbProducts;
            return fbProducts;
        }
    } catch (error) { console.error("Firestore unavailable:", error); }
    return [];
}

export async function addProduct(product) {
    const products = STORE.products;
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newProduct = { ...product, id };
    products.push(newProduct);
    STORE.products = products;
    apiSave('products', STORE.products).catch(() => {});
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addProduct', ...newProduct })
    }));
    try {
        const docRef = await addDoc(collection(db, "products"), product);
        console.log("Firestore add success:", docRef.id);
        const updated = STORE.products;
        const idx = updated.findIndex(p => p.id === id);
        if (idx !== -1) { updated[idx].id = docRef.id; STORE.products = updated; }
    } catch (error) { console.error("Firestore add failed:", error); }
    return { success: true, id };
}

export async function updateProduct(id, updated) {
    const products = STORE.products;
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
        products[idx] = { ...products[idx], ...updated, id };
        STORE.products = products;
        apiSave('products', STORE.products).catch(() => {});
    }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateProduct', id, ...updated })
    }));
    try {
        const productRef = doc(db, "products", id);
        await updateDoc(productRef, updated);
        console.log("Firestore update success:", id);
    } catch (error) { console.error("Firestore update failed:", error); }
    return { success: true };
}

export async function deleteProduct(id) {
    const products = STORE.products.filter(p => p.id !== id);
    STORE.products = products;
    apiSave('products', STORE.products).catch(() => {});
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteProduct', id })
    }));
    try {
        const productRef = doc(db, "products", id);
        await deleteDoc(productRef);
        console.log("Firestore delete success:", id);
    } catch (error) { console.error("Firestore delete failed:", error); }
    return { success: true };
}

export async function getOrders() {
    try {
        const apiOrders = await apiGet('orders');
        if (apiOrders.length > 0) {
            STORE.orders = apiOrders;
            return apiOrders;
        }
    } catch (e) { /* API unavailable */ }
    const local = STORE.orders;
    if (local.length > 0) {
        syncOrdersFromFirestore().then(fb => {
            const merged = [...local];
            fb.forEach(fbOrder => {
                const idx = merged.findIndex(o => o.orderId === fbOrder.orderId);
                if (idx === -1) merged.push(fbOrder);
                else {
                    if (merged[idx].status && merged[idx].status !== fbOrder.status) fbOrder.status = merged[idx].status;
                    if (merged[idx].trackingId && merged[idx].trackingId !== fbOrder.trackingId) fbOrder.trackingId = merged[idx].trackingId;
                    merged[idx] = fbOrder;
                }
            });
            STORE.orders = merged;
            apiSave('orders', merged).catch(() => {});
        }).catch(() => {});
        return local;
    }
    try {
        const fbOrders = await syncOrdersFromFirestore();
        if (fbOrders.length > 0) {
            STORE.orders = fbOrders;
            return fbOrders;
        }
    } catch (error) { console.warn("Firestore orders unavailable:", error); }
    return STORE.orders;
}

async function syncOrdersFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const fbOrders = [];
    querySnapshot.forEach((doc) => { fbOrders.push({ id: doc.id, ...doc.data() }); });
    return fbOrders;
}

export async function placeOrder(orderData) {
    const orders = STORE.orders;
    orders.push(orderData);
    STORE.orders = orders;
    apiSave('orders', orders).catch(() => {});
    try {
        await addDoc(collection(db, "orders"), orderData);
        console.log("Firestore order saved");
    } catch (error) { console.warn("Firestore order failed:", error); }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'placeOrder', ...orderData })
    }));
    return { success: true };
}

export async function registerUser(userData) {
    const users = STORE.users;
    users[userData.username.toLowerCase()] = { ...userData, password: 'firebase-managed' };
    STORE.users = users;
    try {
        const docId = userData.uid || userData.username.toLowerCase();
        await setDoc(doc(db, "users", docId), {
            uid: userData.uid || '',
            username: userData.username?.toLowerCase() || '',
            password: userData.password,
            role: userData.role || 'customer',
            email: userData.email || '',
            createdAt: new Date().toISOString()
        });
        console.log("Firestore user saved:", docId);
    } catch (error) { console.warn("Firestore user failed:", error); }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'registerUser', ...userData })
    }));
    return { success: true };
}

export async function getUserFromFirestore(uidOrUsername) {
    if (!uidOrUsername) return null;
    const id = uidOrUsername.toLowerCase();
    try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    } catch (error) { console.warn("Firestore user fetch failed:", error); }
    return null;
}

export async function saveSettingsToFirestore(settings) {
    localStorage.setItem('vora_settings', JSON.stringify(settings));
    apiSave('settings', settings).catch(() => {});
    try {
        await setDoc(doc(db, "config", "settings"), settings);
        console.log("Firestore settings saved");
    } catch (error) { console.error("Firestore settings failed:", error); }
    return { success: true };
}

export async function getSettingsFromFirestore() {
    try {
        const apiSettings = await apiGet('settings');
        if (apiSettings && !Array.isArray(apiSettings) && Object.keys(apiSettings).length > 0) {
            localStorage.setItem('vora_settings', JSON.stringify(apiSettings));
            return apiSettings;
        }
        if (Array.isArray(apiSettings) && apiSettings.length > 0) {
            const merged = apiSettings.reduce((acc, item) => ({ ...acc, ...item }), {});
            if (Object.keys(merged).length > 0) {
                localStorage.setItem('vora_settings', JSON.stringify(merged));
                return merged;
            }
        }
    } catch (e) { /* API unavailable */ }
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) {
        syncSettingsFromFirestore().then(cloud => {
            if (cloud) {
                localStorage.setItem('vora_settings', JSON.stringify(cloud));
                apiSave('settings', cloud).catch(() => {});
            }
        }).catch(() => {});
        return local;
    }
    try {
        const cloud = await syncSettingsFromFirestore();
        if (cloud) {
            localStorage.setItem('vora_settings', JSON.stringify(cloud));
            return cloud;
        }
    } catch (error) { console.warn("Firestore settings fetch failed:", error); }
    return null;
}

async function syncSettingsFromFirestore() {
    const docRef = doc(db, "config", "settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return null;
}
