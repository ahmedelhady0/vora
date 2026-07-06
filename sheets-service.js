// sheets-service.js - متوافق تماماً مع بنية Google Apps Script الفاخرة لـ Vora
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";

// دالة GET الأساسية
async function callGet(params) {
    const url = new URL(WEB_APP_URL);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    try {
        const res = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (err) {
        console.error("GET Error:", err);
        throw err;
    }
}

// دالة POST الأساسية (تستخدم text/plain لتجاوز قيود الـ Preflight المعقدة مع جوجل)
async function callPost(body) {
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (err) {
        console.error("POST Error:", err);
        throw err;
    }
}

// ==================== المنتجات ====================
export async function getProducts() {
    const data = await callGet({ action: 'getProducts' });
    return data.products || [];
}

// ==================== الطلبات ====================
export async function getOrders() {
    const data = await callGet({ action: 'getOrders' });
    return data.orders || [];
}

export async function placeOrder(orderData) {
    return callPost({ action: 'placeOrder', ...orderData });
}

// ==================== المستخدمين والتحقق ====================
export async function getUserRole(email) {
    return callGet({ action: 'getUserRole', email: email });
}

export async function registerUser(userData) {
    return callPost({ action: 'registerUser', ...userData });
}

// ==================== لوحة الإدارة ====================
export async function addProduct(product) {
    return callPost({ action: 'addProduct', ...product });
}
