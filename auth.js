// auth.js - Updated
import { auth, usernameToEmail, showMessage, hideMessage } from "./firebase-config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { registerUser, getUserRole } from "./sheets-service.js";

window.signIn = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;

    if (!user || !pass) {
        return showMessage("يرجى إدخال اسم المستخدم وكلمة المرور", "⚠️");
    }

    showMessage("جاري تسجيل الدخول...", "⏳");

    try {
        const email = usernameToEmail(user);
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        
        const res = await getUserRole(cred.user.email);
        
        localStorage.setItem('vora_user', JSON.stringify({
            email: cred.user.email,
            username: user,
            role: res.role || 'customer'
        }));
        
        hideMessage();
        window.location.href = "home.html";
    } catch(err) {
        console.error(err);
        showMessage("خطأ في اسم المستخدم أو كلمة المرور", "❌");
    }
};

window.signUp = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;

    if (!user || pass.length < 6) {
        return showMessage("اسم المستخدم مطلوب وكلمة المرور 6 أحرف على الأقل", "⚠️");
    }

    showMessage("جاري إنشاء الحساب...", "⏳");

    try {
        const email = usernameToEmail(user);
        await createUserWithEmailAndPassword(auth, email, pass);
        await registerUser({ email, username: user, role: 'customer' });
        
        showMessage("✅ تم إنشاء الحساب بنجاح!\nيمكنك تسجيل الدخول الآن", "🎉");
    } catch(err) {
        console.error(err);
        showMessage("هذا المستخدم موجود بالفعل", "⚠️");
    }
};

// تحسين عرض الرسائل
export function showMessage(text, icon = "ℹ️") {
    const box = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const messageIcon = document.getElementById('messageIcon');

    if (messageIcon) messageIcon.innerHTML = `<span class="text-4xl">${icon}</span>`;
    if (messageText) messageText.textContent = text;

    box.classList.remove('hidden');
    box.classList.add('flex');
}
