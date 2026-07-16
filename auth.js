import { showMessage, hideMessage, usernameToEmail } from "./firebase-config.js";
import { getUserFromFirestore, registerUser } from "./sheets-service.js";

function getUsers() {
    return JSON.parse(localStorage.getItem('vora_users')) || {};
}

function saveUsers(users) {
    localStorage.setItem('vora_users', JSON.stringify(users));
}

window.signIn = async function() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    if (!user || !pass) return showMessage(t('authFillFields'));

    try {
        const fbUser = await getUserFromFirestore(user);
        if (fbUser && fbUser.password === pass) {
            localStorage.setItem('vora_user', JSON.stringify({ username: user, role: fbUser.role || 'customer', email: fbUser.email || usernameToEmail(user) }));
            hideMessage();
            window.location.href = "home.html";
            return;
        }
    } catch (e) {
        console.warn("Firestore auth unavailable, checking local:", e);
    }

    const users = getUsers();
    if (users[user] && users[user].password === pass) {
        localStorage.setItem('vora_user', JSON.stringify({ username: user, role: users[user].role || 'customer', email: users[user].email || usernameToEmail(user) }));
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

    try {
        const existing = await getUserFromFirestore(user);
        if (existing) return showMessage(t('authExists'));
    } catch (e) {
        console.warn("Firestore check unavailable:", e);
    }

    const users = getUsers();
    if (users[user]) return showMessage(t('authExists'));

    const userData = { username: user, password: pass, role: 'customer', email: usernameToEmail(user) };
    await registerUser(userData);

    users[user] = { password: pass, role: 'customer', email: usernameToEmail(user) };
    saveUsers(users);
    showMessage(t('authCreated'));
};

window.hideMessage = hideMessage;
