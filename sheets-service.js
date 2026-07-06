// sheets-service.js - النسخة المستقرة والخالية من مشاكل CORS تماماً لـ Vora
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";

// دالة GET الأساسية (تستخدم للمنتجات والطلبات)

async function callGet(params) {
    const url = new URL(WEB_APP_URL);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
    return await res.json();
}

async function callPost(body) {
    const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
    });
    return await res.json();
}

export async function getProducts() { return (await callGet({ action: 'getProducts' })).products || []; }
export async function getOrders() { return (await callGet({ action: 'getOrders' })).orders || []; }
export async function placeOrder(orderData) { return callPost({ action: 'placeOrder', ...orderData }); }
export async function getUserRole(email) { return callPost({ action: 'getUserRole', email: email }); } // تعتمد على الـ POST قسرياً!
export async function registerUser(userData) { return callPost({ action: 'registerUser', ...userData }); }
// دالة POST الأساسية (تستخدم لتجاوز قيود الـ CORS والـ Preflight المعقدة في متصفحات الكروم وسفاري)
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
// تم تحويلها هنا إلى دالة POST لضمان تخطي قيود الـ CORS بنجاح أثناء تسجيل الدخول
export async function getUserRole(email) {
    return callPost({ action: 'getUserRole', email: email });
}

export async function registerUser(userData) {
    return callPost({ action: 'registerUser', ...userData });
}

// ==================== لوحة الإدارة ====================
export async function addProduct(product) {
    return callPost({ action: 'addProduct', ...product });
}
