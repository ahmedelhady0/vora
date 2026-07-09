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
