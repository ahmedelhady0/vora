const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";

const STORE = {
    get products() { return JSON.parse(localStorage.getItem('vora_products')) || []; },
    set products(v) { localStorage.setItem('vora_products', JSON.stringify(v)); },
    get orders() { return JSON.parse(localStorage.getItem('vora_orders')) || []; },
    set orders(v) { localStorage.setItem('vora_orders', JSON.stringify(v)); },
    get users() { return JSON.parse(localStorage.getItem('vora_users')) || {}; },
    set users(v) { localStorage.setItem('vora_users', JSON.stringify(v)); }
};

async function tryFetch(fn) {
    try { return await fn(); } catch { return null; }
}

export async function getProducts() {
    // الأولوية للبيانات المحلية (لوحة الإدارة)
    const local = STORE.products;
    if (local.length > 0) {
        // تنظيف المنتجات الافتراضية القديمة (مرة واحدة)
        if (!localStorage.getItem('vora_cleanup_done')) {
            const oldIds = ['VORA-1001','VORA-1002','VORA-1003','VORA-1004','VORA-1005','VORA-1006','VORA-1007','VORA-1008'];
            const isOldDefaults = local.length === 8 && local.every(p => oldIds.includes(p.id));
            if (isOldDefaults) {
                localStorage.removeItem('vora_products');
                localStorage.setItem('vora_cleanup_done', '1');
                return [];
            }
            localStorage.setItem('vora_cleanup_done', '1');
        }
        return local;
    }

    // لو مفيش بيانات محلية، نجيب من remote (Google Sheets)
    const remote = await tryFetch(async () => {
        const r = await fetch(WEB_APP_URL + '?action=getProducts');
        if (!r.ok) throw Error();
        const d = await r.json();
        return d.products || [];
    });
    if (remote && remote.length > 0) {
        STORE.products = remote;
        return remote;
    }

    // لو مفيش ولا local ولا remote، نرجع array فاضي
    return [];
}

export async function getOrders(email = null) {
    const remote = await tryFetch(async () => {
        const r = await fetch(WEB_APP_URL + '?action=getOrders' + (email ? '&email=' + encodeURIComponent(email) : ''));
        if (!r.ok) throw Error();
        const d = await r.json();
        return d.orders || [];
    });
    if (remote && remote.length > 0) {
        STORE.orders = remote;
        return remote;
    }
    const all = STORE.orders;
    return email ? all.filter(o => o.userEmail === email) : all;
}

export async function placeOrder(order) {
    STORE.orders = [...STORE.orders, { ...order, id: 'ORD-' + Date.now(), timestamp: Date.now() }];
    tryFetch(() => fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'placeOrder', ...order }) }));
    return { success: true };
}

export async function getUserRole(email) {
    const remote = await tryFetch(async () => {
        const r = await fetch(WEB_APP_URL + '?action=getUserRole&email=' + encodeURIComponent(email));
        if (!r.ok) throw Error();
        return await r.json();
    });
    if (remote && remote.role) return remote;
    const users = STORE.users;
    for (const key in users) {
        if (users[key].email === email) return { role: users[key].role || 'customer' };
    }
    return { role: 'customer' };
}

export async function registerUser(userData) {
    const users = STORE.users;
    users[userData.username || userData.email] = { ...userData, password: 'firebase-managed' };
    STORE.users = users;
    tryFetch(() => fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'registerUser', ...userData }) }));
    return { success: true };
}

export async function addProduct(product) {
    const products = STORE.products;
    products.push(product);
    STORE.products = products;
    tryFetch(() => fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addProduct', ...product }) }));
    return { success: true };
}

export async function updateProduct(id, updated) {
    const products = STORE.products;
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, error: "المنتج غير موجود" };
    products[idx] = { ...products[idx], ...updated, id };
    STORE.products = products;
    tryFetch(() => fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateProduct', id, ...updated }) }));
    return { success: true };
}

export async function deleteProduct(id) {
    const products = STORE.products.filter(p => p.id !== id);
    STORE.products = products;
    tryFetch(() => fetch(WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteProduct', id }) }));
    return { success: true };
}
