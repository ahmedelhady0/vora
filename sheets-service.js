import { db } from "./firebase-config.js";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";
const CLOUD_NAME = "mq2mwonc";
const CLOUD_UPLOAD_PRESET = "vora_shop";
const API_BASE = window.location.origin + "/api";

const STORE = {
    get products() { return JSON.parse(localStorage.getItem('vora_products')) || []; },
    set products(v) { try { localStorage.setItem('vora_products', JSON.stringify(v)); } catch (e) {} },
    get orders() { return JSON.parse(localStorage.getItem('vora_orders')) || []; },
    set orders(v) { try { localStorage.setItem('vora_orders', JSON.stringify(v)); } catch (e) {} },
    get users() { return JSON.parse(localStorage.getItem('vora_users')) || {}; },
    set users(v) { try { localStorage.setItem('vora_users', JSON.stringify(v)); } catch (e) {} }
};

async function tryFetch(fn) {
    try { return await fn(); } catch (e) { return null; }
}

async function apiSave(collection, data) {
    try {
        await fetch(`${API_BASE}/data`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, action: 'save', data })
        });
    } catch (e) {}
}

export async function uploadImageToStorage(fileObject) {
    if (!fileObject) return "";
    const formData = new FormData();
    formData.append("file", fileObject);
    formData.append("upload_preset", CLOUD_UPLOAD_PRESET);
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const result = await response.json();
        if (result.secure_url) return result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
        throw new Error(result.error?.message || "Cloudinary upload failed");
    } catch (error) { console.error("Cloudinary:", error); throw error; }
}

async function fbGetProducts() {
    const qs = await getDocs(collection(db, "products"));
    const r = [];
    qs.forEach(d => r.push({ id: d.id, ...d.data() }));
    return r;
}

export async function getProducts() {
    // 1) Try Firestore first (works on GitHub Pages, shares across devices)
    try {
        const fb = await fbGetProducts();
        if (fb.length > 0) { STORE.products = fb; apiSave('products', fb); return fb; }
    } catch (e) { console.warn("Firestore read failed:", e); }
    // 2) Fall back to localStorage
    const local = STORE.products;
    if (local.length > 0) {
        // Background sync to Firestore if possible
        local.forEach(p => { try { setDoc(doc(db, "products", p.id), p); } catch (e) {} });
        apiSave('products', local);
        return local;
    }
    return [];
}

export async function addProduct(product) {
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newProduct = { ...product, id };
    // 1) Save to Firestore first
    try {
        const docRef = await addDoc(collection(db, "products"), product);
        newProduct.id = docRef.id;
    } catch (e) { console.error("Firestore write failed:", e); }
    // 2) Save to localStorage
    const products = STORE.products;
    products.push(newProduct);
    STORE.products = products;
    apiSave('products', products);
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addProduct', ...newProduct })
    }));
    return { success: true, id: newProduct.id };
}

export async function updateProduct(id, updated) {
    const products = STORE.products;
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
        products[idx] = { ...products[idx], ...updated, id };
        STORE.products = products;
    }
    try { await setDoc(doc(db, "products", id), updated); } catch (e) { console.error("Firestore update:", e); }
    apiSave('products', products);
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateProduct', id, ...updated })
    }));
    return { success: true };
}

export async function deleteProduct(id) {
    STORE.products = STORE.products.filter(p => p.id !== id);
    try { await deleteDoc(doc(db, "products", id)); } catch (e) { console.error("Firestore delete:", e); }
    apiSave('products', STORE.products);
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteProduct', id })
    }));
    return { success: true };
}

export async function getOrders() {
    try {
        const qs = await getDocs(collection(db, "orders"));
        const fb = [];
        qs.forEach(d => fb.push({ id: d.id, ...d.data() }));
        if (fb.length > 0) { STORE.orders = fb; return fb; }
    } catch (e) {}
    const local = STORE.orders;
    if (local.length > 0) {
        local.forEach(o => { try { setDoc(doc(db, "orders", o.orderId || o.id || ''), o); } catch (e) {} });
        return local;
    }
    return [];
}

export async function placeOrder(orderData) {
    STORE.orders = [...STORE.orders, orderData];
    try {
        const docRef = await addDoc(collection(db, "orders"), orderData);
        // Save the Firestore doc ID back to localStorage
        const orders = STORE.orders;
        const lastIdx = orders.length - 1;
        orders[lastIdx] = { ...orders[lastIdx], id: docRef.id };
        STORE.orders = orders;
    } catch (e) { console.warn("Firestore order:", e); }
    tryFetch(() => fetch(WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'placeOrder', ...orderData })
    }));
    return { success: true };
}

export async function findAndUpdateOrder(orderId, field, value) {
    try {
        const qs = await getDocs(collection(db, "orders"));
        qs.forEach(async (d) => {
            const data = d.data();
            if (data.orderId === orderId || data.id === orderId) {
                await updateDoc(doc(db, "orders", d.id), { [field]: value });
            }
        });
    } catch (e) { console.warn("Firestore findAndUpdateOrder:", e); }
}

export async function registerUser(userData) {
    const users = STORE.users;
    users[userData.username.toLowerCase()] = { ...userData, password: 'firebase-managed' };
    STORE.users = users;
    try {
        await setDoc(doc(db, "users", userData.uid || userData.username.toLowerCase()), {
            uid: userData.uid || '', username: userData.username?.toLowerCase() || '',
            password: userData.password, role: userData.role || 'customer',
            email: userData.email || '', createdAt: new Date().toISOString()
        });
    } catch (e) { console.warn("Firestore user:", e); }
    return { success: true };
}

export async function getUserFromFirestore(uidOrUsername) {
    if (!uidOrUsername) return null;
    try {
        const snap = await getDoc(doc(db, "users", uidOrUsername.toLowerCase()));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch (e) {}
    return null;
}

export async function getSettingsFromFirestore() {
    try {
        const snap = await getDoc(doc(db, "config", "settings"));
        if (snap.exists()) { localStorage.setItem('vora_settings', JSON.stringify(snap.data())); return snap.data(); }
    } catch (e) {}
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) return local;
    return null;
}

export async function saveSettingsToFirestore(settings) {
    localStorage.setItem('vora_settings', JSON.stringify(settings));
    try { await setDoc(doc(db, "config", "settings"), settings); } catch (e) {}
    return { success: true };
}
