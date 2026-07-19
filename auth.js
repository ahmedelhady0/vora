import { showMessage, hideMessage, usernameToEmail, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase-config.js";
import { getUserFromFirestore, registerUser } from "./sheets-service.js";

function getUsers() {
    return JSON.parse(localStorage.getItem('vora_users')) || {};
}
function saveUsers(users) {
    localStorage.setItem('vora_users', JSON.stringify(users));
}

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
            uid, email, username: user,
            role: fbUser?.role || 'customer'
        }));
        hideMessage();
        window.location.href = "home.html";
        return;
    } catch (e) {
        console.warn("Firebase Auth unavailable, trying local:", e);
    }

    const users = getUsers();
    if (users[user] && users[user].password === pass) {
        localStorage.setItem('vora_user', JSON.stringify({
            username: user,
            role: users[user].role || 'customer',
            email: users[user].email || usernameToEmail(user)
        }));
        hideMessage();
        window.location.href = "home.html";
    } else {
        showMessage(t('authInvalid'));
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
            uid: cred.user.uid, email, username: user, role: 'customer'
        }));
        showMessage(t('authCreated'));
        setTimeout(() => { hideMessage(); window.location.href = "home.html"; }, 1500);
        return;
    } catch (e) {
        console.warn("Firebase signup unavailable, trying local:", e);
    }

    const users = getUsers();
    if (users[user]) return showMessage(t('authExists'));
    users[user] = { password: pass, role: 'customer', email };
    saveUsers(users);
    await registerUser({ username: user, email, password: pass, role: 'customer' }).catch(() => {});
    localStorage.setItem('vora_user', JSON.stringify({ username: user, role: 'customer', email }));
    showMessage(t('authCreated'));
};

window.signOutUser = async function() {
    try { await signOut(auth); } catch (e) { /* ignore */ }
    localStorage.removeItem('vora_user');
    window.location.href = "index.html";
};

window.hideMessage = hideMessage;
