// firebase-config.js

// 1. استيراد المكتبات عبر الـ CDN لتعمل مباشرة في المتصفح
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. إعدادات مشروع VORA الحقيقية والخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyBiNwI8GkdVXhsKrQ3kczbpAwhn5QPn4nU",
  authDomain: "vora-1bc51.firebaseapp.com",
  projectId: "vora-1bc51",
  storageBucket: "vora-1bc51.firebasestorage.app",
  messagingSenderId: "394205183331",
  appId: "1:394205183331:web:dba1a0ac900e90682de756"
};

// 3. تهيئة التطبيق وقاعدة البيانات
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 4. الدوال المساعدة الحالية الخاصة بنظامك (أبقها كما هي لضمان عمل بقية الصفحات)
export function showMessage(text) {
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer && typeof window.showMessage === 'function') {
        window.showMessage(text);
        return;
    }
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

export function usernameToEmail(username) {
    return `${username.toLowerCase()}@vora.app`;
}
