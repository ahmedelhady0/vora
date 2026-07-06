// sheets-service.js - Vora Perfumes (مع Proxy لـ CORS)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";

const PROXY = "https://corsproxy.io/?";

// دالة GET مع Proxy
async function callGet(params) {
    const url = new URL(WEB_APP_URL);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    try {
        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (err) {
        console.error("GET Error:", err);
        throw err;
    }
}

// دالة POST مع Proxy
async function callPost(body) {
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("POST Error:", err);
        throw err;
    }
}

// ==================== Products ====================
export async function getProducts() {
    const data = await callGet({ action: 'getProducts' });
    return data.products || [];
}

// ==================== Orders ====================
export async function getOrders(email = null) {
    const data = await callGet({ action: 'getOrders', email });
    return data.orders || [];
}

export async function placeOrder(order) {
    return callPost({ action: 'placeOrder', ...order });
}

// ==================== Users ====================
export async function getUserRole(email) {
    return callGet({ action: 'getUserRole', email });
}

export async function registerUser(userData) {
    return callPost({ action: 'registerUser', ...userData });
}

// ==================== Admin ====================
export async function addProduct(product) {
    return callPost({ action: 'addProduct', ...product });
}
