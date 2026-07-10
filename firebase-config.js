// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// بيانات مشروع Firebase الخاص بك (انسخها من 콘솔 Firebase)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تشغيل Firebase
const app = initializeApp(firebaseConfig);
// تشغيل Firestore Database
const db = getFirestore(app);

// دالة لجلب المنتجات من Firestore
export async function getProductsFromFirestore() {
    try {
        // تحديد الكوليكشن (الجدول) اللي اسمه products
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        
        querySnapshot.forEach((doc) => {
            // دمج معرف المستند (ID) مع البيانات
            products.push({ id: doc.id, ...doc.data() });
        });
        
        return products;
    } catch (error) {
        console.error("خطأ في جلب البيانات من Firestore:", error);
        return null;
    }
}

// الدوال القديمة المخصصة للرسائل (ابقِ عليها كما هي)
export function showMessage(text) {
    const box = document.getElementById('messageBox');
    if (!box) return;
    const el = document.getElementById('messageText');
    if (el) el.textContent = text;
    box.classList.remove('hidden');
}

export function hideMessage() {
    const box = document.getElementById('messageBox');
    if (box) { box.classList.add('hidden'); }
}
