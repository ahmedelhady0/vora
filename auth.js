// auth.js
import { auth, usernameToEmail, showMessage, hideMessage } from "./firebase-config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { registerUser, getUserRole } from "./sheets-service.js";

window.signIn = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    if(!user || !pass) return showMessage("يرجى ملء كافة الحقول");

    showMessage("جاري تسجيل الدخول...");
    try {
        const email = usernameToEmail(user);
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        
        // جلب الصلاحية من جوجل شيت
        const res = await getUserRole(cred.user.email);
        localStorage.setItem('vora_user', JSON.stringify({
            email: cred.user.email,
            username: user,
            role: res.role || 'customer'
        }));
        
        hideMessage();
        window.location.href = "home.html";
    } catch(err) {
        showMessage("خطأ في البيانات أو الحساب غير موجود");
    }
};

window.signUp = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    if(!user || pass.length < 6) return showMessage("اسم مستخدم مطلوب وكلمة مرور لا تقل عن 6 أحرف");

    showMessage("جاري إنشاء الحساب...");
    try {
        const email = usernameToEmail(user);
        await createUserWithEmailAndPassword(auth, email, pass);
        
        // تسجيل المستخدم في شيت Users بالـ Role التلقائي 'customer'
        await registerUser({ email, username: user, role: 'customer' });
        
        showMessage("تم إنشاء الحساب بنجاح! يمكنك الدخول الآن.");
    } catch(err) {
        showMessage("اسم المستخدم هذا مسجل بالفعل");
    }
};

window.hideMessage = hideMessage;
