import Icon from './icons.js';
import { escapeHTML } from './security-utils.js';

window.openMobileMenu = function() { document.getElementById('mobileMenu').classList.add('open'); document.getElementById('mobileMenuOverlay').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.closeMobileMenu = function() { document.getElementById('mobileMenu').classList.remove('open'); document.getElementById('mobileMenuOverlay').classList.remove('show'); document.body.style.overflow = 'auto'; };
window.navigateTo = function(url) { window.closeMobileMenu(); setTimeout(() => { window.location.href = url; }, 150); };
window.logout = function() { localStorage.removeItem('vora_user'); window.location.href = 'home.html'; };

function loadAccount() {
    const user = JSON.parse(localStorage.getItem('vora_user'));
    const required = document.getElementById('loginRequired');
    const content = document.getElementById('accountContent');
    if (!user) { required.style.display = 'block'; content.style.display = 'none'; return; }
    required.style.display = 'none'; content.style.display = 'block';
    document.getElementById('displayUsername').textContent = user.username || '—';
    document.getElementById('displayEmail').textContent = user.email || '—';
    document.getElementById('displayPhone').textContent = user.phone || '—';

    const orders = JSON.parse(localStorage.getItem('vora_orders')) || [];
    const list = document.getElementById('ordersList');
    if (orders.length === 0) { list.innerHTML = `<p class="text-stone-400 text-sm">${t('noOrders')}</p>`; return; }
    const lang = localStorage.getItem('vora_lang') || 'ar';
    list.innerHTML = orders.slice().reverse().map((o, i) => {
        const date = o.timestamp ? new Date(o.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : o.date || '—';
        const status = o.status || t('statusPending');
        const total = o.total || o.subtotal || 0;
        return `
        <div class="border border-stone-200 rounded-lg p-4 mb-3 hover:border-amber-200 transition">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-stone-400">${date}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">${status}</span>
            </div>
            <p class="text-sm font-semibold text-stone-900">${escapeHTML(o.customerName || '—')}</p>
            <p class="text-xs text-stone-500">${(() => {
                let items = [];
                try { items = o.itemDetails ? JSON.parse(o.itemDetails) : []; } catch(e) {}
                if (items.length) return items.map(i => `${escapeHTML(i.name)} (\u00d7${i.qty})`).join(' - ');
                return escapeHTML(o.items || '');
            })()}</p>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                <span class="text-sm font-bold text-amber-600">${total} ${t('currency')}</span>
                ${o.trackingId ? `<span class="text-[10px] text-blue-600">${Icon.pkg()} ${t('orderTracking') + ': '}${o.trackingId}</span>` : ''}
            </div>
        </div>`;
    }).join('');

    const addresses = JSON.parse(localStorage.getItem('vora_addresses')) || [];
    const addrList = document.getElementById('addressesList');
    if (addresses.length === 0) { addrList.innerHTML = `<p class="text-stone-400 text-sm">${t('noAddresses')}</p>`; return; }
    addrList.innerHTML = addresses.map(a => `
        <div class="border border-stone-200 rounded-lg p-3 mb-2 text-sm">
            <p class="font-semibold text-stone-900">${escapeHTML(a.name || '—')}</p>
            <p class="text-stone-500 text-xs">${escapeHTML(a.address || '')}${a.governorate ? ' - ' + escapeHTML(a.governorate) : ''}</p>
            <p class="text-stone-400 text-xs">${escapeHTML(a.phone || '')}</p>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadAccount);
document.addEventListener('langchange', loadAccount);
