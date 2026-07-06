// auth.js - Fixed Version
import { auth, usernameToEmail, showMessage, hideMessage } from "./firebase-config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { registerUser, getUserRole } from "./sheets-service.js";

window.signIn = async function() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (!user || !pass) {
        return showMessage("يرجى ملء اسم المستخدم وكلمة المرور", "⚠️");
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
    } catch (err) {
        console.error("Login Error:", err);
        showMessage("اسم المستخدم أو كلمة المرور غير صحيحة", "❌");
    }
};

window.signUp = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;

    if (!user || pass.length < 6) {
        return showMessage("اسم المستخدم مطلوب\nوكلمة المرور يجب أن تكون 6 أحرف على الأقل", "⚠️");
    }

    showMessage("جاري إنشاء الحساب...", "⏳");

    try {
        const email = usernameToEmail(user);
        await createUserWithEmailAndPassword(auth, email, pass);
        
        await registerUser({ email, username: user, role: 'customer' });
        
        showMessage("✅ تم إنشاء الحساب بنجاح!\nيمكنك الآن تسجيل الدخول", "🎉");
    } catch (err) {
        console.error("Signup Error:", err);
        showMessage("هذا الاسم مستخدم بالفعل\nجرب اسم آخر", "⚠️");
    }
};

// Export hideMessage to be used from HTML
window.hideMessage = hideMessage;
