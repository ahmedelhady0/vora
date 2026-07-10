// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ استبدل هذه الإعدادات ببيانات مشروعك من Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تصدير الـ db لكي يقرأه ملف sheets-service.js
export const db = getFirestore(app);

// الدوال الحالية الموجودة في ملفك (أبقها كما هي لكي لا تتأثر الملفات الأخرى)
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
