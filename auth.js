import { showMessage, hideMessage, usernameToEmail, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase-config.js";
import { getUserFromFirestore, registerUser } from "./sheets-service.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        const stored = JSON.parse(localStorage.getItem('vora_user')) || {};
        if (!stored.uid) {
            getUserFromFirestore(user.uid).then(doc => {
                localStorage.setItem('vora_user', JSON.stringify({
                    uid: user.uid, email: user.email,
                    username: doc?.username || user.email.split('@')[0],
                    role: doc?.role || 'customer'
                }));
            }).catch(() => {});
        }
    }
});

window.signIn = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    if (!user || !pass) return showMessage(t('authFillFields'));

    const email = usernameToEmail(user);
    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;
        const fbUser = await getUserFromFirestore(uid);
        localStorage.setItem('vora_user', JSON.stringify({
            uid, email,
            username: user,
            role: fbUser?.role || 'customer'
        }));
        hideMessage();
        window.location.href = "home.html";
    } catch (e) {
        console.error("Auth error:", e);
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
            showMessage(t('authInvalid'));
        } else {
            showMessage(t('authError') || 'Login failed. Check console.');
        }
    }
};

window.signUp = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    if (!user || pass.length < 6) return showMessage(t('authWeakPassword'));

    const email = usernameToEmail(user);
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await registerUser({ uid: cred.user.uid, username: user, email, password: pass, role: 'customer' });
        localStorage.setItem('vora_user', JSON.stringify({
            uid: cred.user.uid, email,
            username: user, role: 'customer'
        }));
        showMessage(t('authCreated'));
        setTimeout(() => { hideMessage(); window.location.href = "home.html"; }, 1500);
    } catch (e) {
        console.error("Signup error:", e);
        if (e.code === 'auth/email-already-in-use') {
            showMessage(t('authExists'));
        } else {
            showMessage(t('authError') || 'Signup failed.');
        }
    }
};

window.signOutUser = async function() {
    await signOut(auth);
    localStorage.removeItem('vora_user');
    window.location.href = "index.html";
};

window.hideMessage = hideMessage;
