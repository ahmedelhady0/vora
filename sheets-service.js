import { db } from "./firebase-config.js";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc
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

function syncProductsToAPI() {
    apiSave('products', STORE.products).catch(() => {});
}
function syncOrdersToAPI() {
    apiSave('orders', STORE.orders).catch(() => {});
}

export async function uploadImageToStorage(fileObject) {
    if (!fileObject) return "";
    const formData = new FormData();
    formData.append("image", fileObject);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await response.json();
        if (result.success) return result.data.url;
        throw new Error(result.error.message);
    } catch (error) { console.error("ImgBB:", error); throw error; }
}

async function syncFromFirestore() {
    const qs = await getDocs(collection(db, "products"));
    const r = [];
    qs.forEach(d => r.push({ id: d.id, ...d.data() }));
    return r;
}

export async function getProducts() {
    // Always return localStorage first (fastest, most up-to-date)
    const local = STORE.products;
    if (local.length > 0) {
        // Background sync from API to pull any remote changes
        apiGet('products').then(api => {
            if (api.length > 0) {
                const merged = [...local];
                api.forEach(ap => {
                    const idx = merged.findIndex(m => m.id === ap.id);
                    if (idx === -1) merged.push(ap);
                });
                STORE.products = merged;
                syncProductsToAPI();
            }
        }).catch(() => {});
        // Background sync from Firestore
        syncFromFirestore().then(fb => {
            if (fb.length > 0) {
                const merged = [...STORE.products];
                fb.forEach(fbp => {
                    const idx = merged.findIndex(m => m.id === fbp.id);
                    if (idx === -1) merged.push(fbp);
                });
                STORE.products = merged;
                syncProductsToAPI();
            }
        }).catch(() => {});
        return local;
    }
    // Nothing local, try API
    try {
        const api = await apiGet('products');
        if (api.length > 0) { STORE.products = api; return api; }
    } catch (e) { /* API unavailable */ }
    // Try Firestore
    try {
        const fb = await syncFromFirestore();
        if (fb.length > 0) { STORE.products = fb; syncProductsToAPI(); return fb; }
    } catch (e) { console.error("Firestore:", e); }
    return [];
}

export async function addProduct(product) {
    const products = STORE.products;
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newProduct = { ...product, id };
    products.push(newProduct);
    STORE.products = products;
    syncProductsToAPI();
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addProduct', ...newProduct })
    }));
    try {
        const docRef = await addDoc(collection(db, "products"), product);
        const idx = STORE.products.findIndex(p => p.id === id);
        if (idx !== -1) { STORE.products[idx].id = docRef.id; STORE.products = STORE.products; syncProductsToAPI(); }
    } catch (e) { console.error("Firestore add:", e); }
    return { success: true, id };
}

export async function updateProduct(id, updated) {
    const products = STORE.products;
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
        products[idx] = { ...products[idx], ...updated, id };
        STORE.products = products;
        syncProductsToAPI();
    }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateProduct', id, ...updated })
    }));
    try {
        await updateDoc(doc(db, "products", id), updated);
    } catch (e) { console.error("Firestore update:", e); }
    return { success: true };
}

export async function deleteProduct(id) {
    const products = STORE.products.filter(p => p.id !== id);
    STORE.products = products;
    syncProductsToAPI();
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteProduct', id })
    }));
    try {
        await deleteDoc(doc(db, "products", id));
    } catch (e) { console.error("Firestore delete:", e); }
    return { success: true };
}

export async function getOrders() {
    const local = STORE.orders;
    if (local.length > 0) {
        syncOrdersFromFirestore().then(fb => {
            if (fb.length > 0) {
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
                syncOrdersToAPI();
            }
        }).catch(() => {});
        return local;
    }
    try {
        const api = await apiGet('orders');
        if (api.length > 0) { STORE.orders = api; return api; }
    } catch (e) { /* API unavailable */ }
    try { const fb = await syncOrdersFromFirestore(); if (fb.length > 0) { STORE.orders = fb; syncOrdersToAPI(); return fb; } }
    catch (e) { /* Firestore unavailable */ }
    return STORE.orders;
}

async function syncOrdersFromFirestore() {
    const qs = await getDocs(collection(db, "orders"));
    const r = [];
    qs.forEach(d => r.push({ id: d.id, ...d.data() }));
    return r;
}

export async function placeOrder(orderData) {
    const orders = STORE.orders;
    orders.push(orderData);
    STORE.orders = orders;
    syncOrdersToAPI();
    try { await addDoc(collection(db, "orders"), orderData); } catch (e) { console.warn("Firestore order:", e); }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
            uid: userData.uid || '', username: userData.username?.toLowerCase() || '',
            password: userData.password, role: userData.role || 'customer',
            email: userData.email || '', createdAt: new Date().toISOString()
        });
    } catch (e) { console.warn("Firestore user:", e); }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'registerUser', ...userData })
    }));
    return { success: true };
}

export async function getUserFromFirestore(uidOrUsername) {
    if (!uidOrUsername) return null;
    try {
        const snap = await getDoc(doc(db, "users", uidOrUsername.toLowerCase()));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch (e) { console.warn("Firestore user:", e); }
    return null;
}

export async function saveSettingsToFirestore(settings) {
    localStorage.setItem('vora_settings', JSON.stringify(settings));
    apiSave('settings', settings).catch(() => {});
    try { await setDoc(doc(db, "config", "settings"), settings); } catch (e) { console.error("Firestore settings:", e); }
    return { success: true };
}

export async function getSettingsFromFirestore() {
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) {
        apiGet('settings').then(api => {
            if (api && typeof api === 'object' && !Array.isArray(api) && Object.keys(api).length > 0) {
                localStorage.setItem('vora_settings', JSON.stringify(api));
            }
        }).catch(() => {});
        syncSettingsFromFirestore().then(cloud => {
            if (cloud) { localStorage.setItem('vora_settings', JSON.stringify(cloud)); apiSave('settings', cloud).catch(() => {}); }
        }).catch(() => {});
        return local;
    }
    try { const api = await apiGet('settings'); if (api && typeof api === 'object' && !Array.isArray(api) && Object.keys(api).length > 0) { localStorage.setItem('vora_settings', JSON.stringify(api)); return api; } } catch (e) {}
    try { const cloud = await syncSettingsFromFirestore(); if (cloud) { localStorage.setItem('vora_settings', JSON.stringify(cloud)); apiSave('settings', cloud).catch(() => {}); return cloud; } } catch (e) {}
    return null;
}

async function syncSettingsFromFirestore() {
    const snap = await getDoc(doc(db, "config", "settings"));
    if (snap.exists()) return snap.data();
    return null;
}
