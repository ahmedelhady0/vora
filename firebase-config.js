// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAtMjR7QBvfLZ3c2QS6FpGrzBF-EIUbS4Q",
    authDomain: "warehouse-8edf4.firebaseapp.com",
    projectId: "warehouse-8edf4",
    storageBucket: "warehouse-8edf4.firebasestorage.app",
    messagingSenderId: "819315880651",
    appId: "1:819315880651:web:03221eb8c80d115897214e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const primaryColor = '#c25a80';

export function usernameToEmail(username) {
    return `${username.toLowerCase()}@vora.app`;
}

export function showMessage(text) {
    const box = document.getElementById('messageBox');
    if (box) {
        document.getElementById('messageText').textContent = text;
        box.classList.remove('hidden');
        box.classList.add('flex');
    } else alert(text);
}

export function hideMessage() {
    const box = document.getElementById('messageBox');
    if (box) box.classList.add('hidden');
}
