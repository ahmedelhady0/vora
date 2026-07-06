// sheets-service.js - Vora Perfumes (مشروع جديد)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec"; 
// ← غير الرابط ده لو عندك Web App جديد

async function callGet(params) {
    const url = new URL(WEB_APP_URL);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
}

async function callPost(body) {
    const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
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
