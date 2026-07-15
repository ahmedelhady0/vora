import Icon from './icons.js';

window.openMobileMenu = function() { document.getElementById('mobileMenu').classList.add('open'); document.getElementById('mobileMenuOverlay').classList.add('show'); document.body.style.overflow = 'hidden'; };
window.closeMobileMenu = function() { document.getElementById('mobileMenu').classList.remove('open'); document.getElementById('mobileMenuOverlay').classList.remove('show'); document.body.style.overflow = 'auto'; };
window.navigateTo = function(url) { window.closeMobileMenu(); setTimeout(() => { window.location.href = url; }, 150); };
window.logout = function() { localStorage.removeItem('vora_user'); window.location.href = 'home.html'; };

function renderBrands() {
    const products = JSON.parse(localStorage.getItem('vora_products')) || [];
    const vendors = [...new Set(products.map(p => (p.vendor || 'VORA').trim()).filter(Boolean))];
    const grid = document.getElementById('brandsGrid');
    if (vendors.length === 0) { grid.innerHTML = '<p class="text-stone-400 text-center col-span-full py-12">' + t('noBrands') + '</p>'; return; }
    grid.innerHTML = vendors.map(v => {
        const prod = products.find(p => (p.vendor || 'VORA').trim() === v && p.image);
        const img = prod ? prod.image : '';
        const count = products.filter(p => (p.vendor || 'VORA').trim() === v).length;
        return `
            <a href="shop.html?vendor=${encodeURIComponent(v)}" class="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all duration-300">
                <div class="aspect-square bg-gradient-to-br from-amber-50 to-pink-50 flex items-center justify-center p-4">
                    ${img ? `<img src="${img}" alt="${v}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300">` : `<span class="text-5xl text-amber-600 opacity-40">${Icon.store()}</span>`}
                </div>
                <div class="p-3 text-center">
                    <h3 class="font-bold text-stone-900 text-sm">${v}</h3>
                    <p class="text-[11px] text-stone-400 mt-0.5">${count} ${t('brandProducts')}</p>
                </div>
            </a>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderBrands();
    if (window.applyTranslations) { applyTranslations(); document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if (t(k)) el.textContent = t(k); }); }
});
document.addEventListener('langchange', () => { if (window.renderBrands) renderBrands(); });
