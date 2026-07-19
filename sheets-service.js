// sheets-service.js
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

async function syncFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "products"));
    const fbProducts = [];
    querySnapshot.forEach((doc) => {
        fbProducts.push({ id: doc.id, ...doc.data() });
    });
    return fbProducts;
}

export async function getProducts() {
    const local = STORE.products;
    if (local.length > 0) {
        syncFromFirestore().then(fb => {
            if (fb.length > 0) STORE.products = fb;
        }).catch(() => {});
        return local;
    }
    try {
        const fbProducts = await syncFromFirestore();
        if (fbProducts.length > 0) {
            STORE.products = fbProducts;
            return fbProducts;
        }
    } catch (error) {
        console.error("خطأ أثناء جلب البيانات من Firestore، جاري الاعتماد على المخزن المحلي:", error);
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

// ==================== إدارة الطلبات والمستخدمين والإعدادات عبر FIRESTORE ====================

export async function getOrders() {
    const local = STORE.orders;
    if (local.length > 0) {
        syncOrdersFromFirestore().then(fb => {
            if (fb.length > 0) {
                const merged = fb.map(fbOrder => {
                    const match = local.find(o => o.orderId === fbOrder.orderId);
                    if (match) {
                        if (match.status && match.status !== fbOrder.status) fbOrder.status = match.status;
                        if (match.trackingId && match.trackingId !== fbOrder.trackingId) fbOrder.trackingId = match.trackingId;
                    }
                    return fbOrder;
                });
                STORE.orders = merged;
            }
        }).catch(() => {});
        return local;
    }
    try {
        const fbOrders = await syncOrdersFromFirestore();
        if (fbOrders.length > 0) {
            STORE.orders = fbOrders;
            return fbOrders;
        }
    } catch (error) {
        console.warn("Firestore orders unavailable, using local:", error);
    }
    const local2 = STORE.orders;
    if (local2.length > 0) return local2;
    const res = await tryFetch(() => fetch(`${WEB_APP_URL}?action=getOrders`));
    if (res) {
        const data = await res.json();
        STORE.orders = data;
        return data;
    }
    return [];
}

async function syncOrdersFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const fbOrders = [];
    querySnapshot.forEach((doc) => {
        fbOrders.push({ id: doc.id, ...doc.data() });
    });
    return fbOrders;
}

export async function placeOrder(orderData) {
    const orders = STORE.orders;
    orders.push(orderData);
    STORE.orders = orders;
    
    try {
        await addDoc(collection(db, "orders"), orderData);
        console.log("🔥 تم حفظ الطلب في Firestore");
    } catch (error) {
        console.warn("Could not save order to Firestore:", error);
    }
    
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
        console.log("User saved to Firestore:", docId);
    } catch (error) {
        console.warn("Could not save user to Firestore:", error);
    }
    
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
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
    } catch (error) {
        console.warn("Could not fetch user from Firestore:", error);
    }
    return null;
}

export async function saveSettingsToFirestore(settings) {
    try {
        await setDoc(doc(db, "config", "settings"), settings);
        console.log("🔥 تم حفظ الإعدادات في Firestore");
        return { success: true };
    } catch (error) {
        console.error("Could not save settings to Firestore:", error);
        return { success: false, error };
    }
}

export async function getSettingsFromFirestore() {
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) {
        syncSettingsFromFirestore().then(cloud => {
            if (cloud) localStorage.setItem('vora_settings', JSON.stringify(cloud));
        }).catch(() => {});
        return local;
    }
    try {
        return await syncSettingsFromFirestore();
    } catch (error) {
        console.warn("Could not fetch settings from Firestore:", error);
    }
    return null;
}

async function syncSettingsFromFirestore() {
    const docRef = doc(db, "config", "settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return null;
}
