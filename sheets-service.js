// sheets-service.js
import { db } from "./firebase-config.js";
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzqpERKwbKumUlYM0CU4KAYOKrp8XXJ6c3v-Gvda1151eLN3zFnHU4--1jU1Mz1zPpPCw/exec";
const IMGBB_API_KEY = "8621949d7967c0c66d9ab1290454d70e";

// تحصين كائن STORE لمنع توقف الكود عند امتلاء الـ LocalStorage (QuotaExceededError)
const STORE = {
    get products() { return JSON.parse(localStorage.getItem('vora_products')) || []; },
    set products(v) { 
        try { 
            localStorage.setItem('vora_products', JSON.stringify(v)); 
        } catch (e) { 
            console.warn("⚠️ تم تخطي حفظ المنتجات محلياً (المخزن ممتلئ)، والاعتماد الآن كلياً على الروابط السحابية و Firestore."); 
        } 
    },
    get orders() { return JSON.parse(localStorage.getItem('vora_orders')) || []; },
    set orders(v) { 
        try { 
            localStorage.setItem('vora_orders', JSON.stringify(v)); 
        } catch (e) { 
            console.warn("⚠️ تم تخطي حفظ الطلبات محلياً بسبب امتلاء مساحة المتصفح."); 
        } 
    },
    get users() { return JSON.parse(localStorage.getItem('vora_users')) || {}; },
    set users(v) { 
        try { 
            localStorage.setItem('vora_users', JSON.stringify(v)); 
        } catch (e) { 
            console.warn("⚠️ تم تخطي حفظ المستخدمين محلياً بسبب امتلاء مساحة المتصفح."); 
        } 
    }
};

async function tryFetch(fn) {
    try { return await fn(); } catch (e) { console.error('Backup sync error:', e); return null; }
}

// ==================== دالة الرفع السحابي إلى ImgBB ====================
export async function uploadImageToStorage(fileObject) {
    if (!fileObject) return "";
    const formData = new FormData();
    formData.append("image", fileObject);

    try {
        console.log("جاري رفع الصورة سحابياً إلى ImgBB...");
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            console.log("✅ تم الرفع بنجاح! الرابط السحابي:", result.data.url);
            return result.data.url;
        } else {
            throw new Error(result.error.message);
        }
    } catch (error) {
        console.error("خطأ أثناء رفع الصورة إلى السحابة:", error);
        throw error;
    }
}

// ==================== إدارة المنتجات عبر FIRESTORE ====================

export async function getProducts() {
    try {
        console.log("جاري جلب المنتجات من Firestore...");
        const querySnapshot = await getDocs(collection(db, "products"));
        const fbProducts = [];
        
        querySnapshot.forEach((doc) => {
            fbProducts.push({ id: doc.id, ...doc.data() });
        });

        if (fbProducts.length > 0) {
            STORE.products = fbProducts;
            return fbProducts;
        }
    } catch (error) {
        console.error("خطأ أثناء جلب البيانات من Firestore، جاري الاعتماد على المخزن المحلي:", error);
    }

    const local = STORE.products;
    if (local.length > 0) return local;

    if (window.__FALLBACK_PRODUCTS) {
        STORE.products = window.__FALLBACK_PRODUCTS;
        return window.__FALLBACK_PRODUCTS;
    }
    return [];
}

export async function addProduct(product) {
    try {
        const docRef = await addDoc(collection(db, "products"), product);
        console.log("🔥 تم حفظ المنتج بنجاح في الفايرستور بمعرف: ", docRef.id);

        const products = STORE.products;
        const newProduct = { ...product, id: docRef.id };
        products.push(newProduct);
        STORE.products = products;

        tryFetch(() => fetch(WEB_APP_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: 'addProduct', ...newProduct }) 
        }));

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("خطأ أثناء إضافة المنتج إلى الفايرستور:", error);
        return { success: false, error };
    }
}

export async function updateProduct(id, updated) {
    try {
        const productRef = doc(db, "products", id);
        await updateDoc(productRef, updated);
        console.log(`✏️ تم تحديث المنتج ${id} في الفايرستور بنجاح`);

        const products = STORE.products;
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) {
            products[idx] = { ...products[idx], ...updated, id };
            STORE.products = products;
        }

        tryFetch(() => fetch(WEB_APP_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: 'updateProduct', id, ...updated }) 
        }));

        return { success: true };
    } catch (error) {
        console.error("خطأ أثناء تحديث المنتج في الفايرستور:", error);
        return { success: false, error };
    }
}

export async function deleteProduct(id) {
    try {
        const productRef = doc(db, "products", id);
        await deleteDoc(productRef);
        console.log(`❌ تم حذف المنتج ${id} من الفايرستور`);

        const products = STORE.products.filter(p => p.id !== id);
        STORE.products = products;

        tryFetch(() => fetch(WEB_APP_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: 'deleteProduct', id }) 
        }));

        return { success: true };
    } catch (error) {
        console.error("خطأ أثناء حذف المنتج من الفايرستور:", error);
        return { success: false, error };
    }
}

// ==================== إدارة الطلبات والمستخدمين ====================

export async function getOrders() {
    const local = STORE.orders;
    if (local.length > 0) return local;
    
    const res = await tryFetch(() => fetch(`${WEB_APP_URL}?action=getOrders`));
    if (res) {
        const data = await res.json();
        STORE.orders = data;
        return data;
    }
    return [];
}

export async function placeOrder(orderData) {
    const orders = STORE.orders;
    orders.push(orderData);
    STORE.orders = orders;
    
    const res = await tryFetch(() => fetch(WEB_APP_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: 'placeOrder', ...orderData }) 
    }));
    
    if (res) return { success: true };
    return { success: false };
}

export async function registerUser(userData) {
    const users = STORE.users;
    users[userData.username.toLowerCase()] = { ...userData, password: 'firebase-managed' };
    STORE.users = users;
    
    tryFetch(() => fetch(WEB_APP_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: 'registerUser', ...userData }) 
    }));
    return { success: true };
}
