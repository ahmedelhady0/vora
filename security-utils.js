// security-utils.js
// Escapes text before it's inserted into innerHTML, to prevent stored XSS
// from product names/descriptions/settings values that come from the database.
export function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
