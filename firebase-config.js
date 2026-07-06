// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBiNwI8GkdVXhsKrQ3kczbpAwhn5QPn4nU",
    authDomain: "vora-1bc51.firebaseapp.com",
    projectId: "vora-1bc51",
    storageBucket: "vora-1bc51.firebasestorage.app",
    messagingSenderId: "394205183331",
    appId: "1:394205183331:web:dba1a0ac900e90682de756"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function usernameToEmail(username) {
    return `${username.toLowerCase()}@vora.app`;
}

// Message System (محسن)
export function showMessage(text, type = "info") {
    const box = document.getElementById('messageBox');
    if (!box) return alert(text);

    const messageText = document.getElementById('messageText');
    messageText.textContent = text;

    // تغيير لون حسب النوع
    if (type === "success") {
        box.style.borderColor = "#10b981";
    } else if (type === "error") {
        box.style.borderColor = "#ef4444";
    } else {
        box.style.borderColor = "#c25a80";
    }
    
    box.classList.remove('hidden');
    box.classList.add('flex');
}

export function hideMessage() {
    const box = document.getElementById('messageBox');
    if (box) {
        box.classList.add('hidden');
        box.classList.remove('flex');
    }
}
