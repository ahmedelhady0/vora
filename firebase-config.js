// firebase-config.js

// 1. استيراد المكتبات عبر الـ CDN لتعمل مباشرة في المتصفح
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import Icon from './icons.js';

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
export const auth = getAuth(app);
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };

// 4. الدوال المساعدة الحالية الخاصة بنظامك (أبقها كما هي لضمان عمل بقية الصفحات)
function setMessageIcon(text) {
    const iconEl = document.getElementById('messageIcon');
    if (!iconEl) return;
    const isSuccess = text.includes('✅') || text.includes('✓');
    const iconSvg = isSuccess ? Icon.check() : Icon.warning();
    iconEl.innerHTML = iconSvg;
    iconEl.className = 'flex justify-center text-4xl mb-2 ' + (isSuccess ? 'text-green-500' : 'text-red-500');
}

export function showMessage(text) {
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer && typeof window.showMessage === 'function') {
        window.showMessage(text);
        return;
    }
    const box = document.getElementById('messageBox');
    if (!box) return;
    const el = document.getElementById('messageText');
    if (el) el.innerHTML = text;
    setMessageIcon(text);
    box.classList.remove('hidden');
}

export function hideMessage() {
    const box = document.getElementById('messageBox');
    if (box) { box.classList.add('hidden'); }
}

export function usernameToEmail(username) {
    return `${username.toLowerCase()}@vora.app`;
}

window.signOutUser = async function() {
    try { await signOut(auth); } catch (e) { console.warn(e); }
    localStorage.removeItem('vora_user');
    window.location.href = "index.html";
};
