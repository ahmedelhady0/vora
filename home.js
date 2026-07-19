import Icon from './icons.js';
import { getProducts, getSettingsFromFirestore } from "./sheets-service.js";
import { escapeHTML } from "./security-utils.js";

const BOTTLE_SVG = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="4" width="16" height="8" rx="1.5" fill="currentColor" opacity="0.7"/>
    <path d="M20 14 Q20 12 22 12 L42 12 Q44 12 44 14 L48 30 Q49 36 49 42 L49 56 Q49 60 45 60 L19 60 Q15 60 15 56 L15 42 Q15 36 16 30 Z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="15" y1="34" x2="49" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
</svg>`;

let allProducts = [];

const userData = JSON.parse(localStorage.getItem('vora_user'));
document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem('vora_user'));
    if (user) {
        const userLink = document.getElementById('userNavLink');
        if (userLink) { userLink.href = 'account.html'; userLink.title = t('navLogin'); }
        const userMob = document.getElementById('userNavMobile');
        if (userMob) { userMob.href = 'account.html'; userMob.title = t('navLogin'); }
        if (user.role === 'admin' || user.role === 'manager') {
            const el = document.getElementById('adminNavLink');
            if (el) el.classList.remove('hidden');
            const mob = document.getElementById('adminNavMobile');
            if (mob) mob.classList.remove('hidden');
        }
    }
});

function getSettings() {
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) return local;
    return window.__FALLBACK_SETTINGS || {};
}

let slideshowInterval = null;
let currentSlide = 0;

let lastScrollY = 0;
function initScrollNav() {
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav.fixed');
        if (!nav) return;
        const y = window.scrollY;
        if (y > 80 && y > lastScrollY) {
            nav.classList.add('header-hidden');
            nav.classList.remove('header-visible');
        } else {
            nav.classList.remove('header-hidden');
            nav.classList.add('header-visible');
        }
        lastScrollY = y;
    }, { passive: true });
}

function handleImageLoad(img) {
    if (img.complete) { img.classList.add('loaded'); return; }
    img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
}

async function loadSettingsFromCloud() {
    try {
        const cloud = await getSettingsFromFirestore();
        if (cloud) localStorage.setItem('vora_settings', JSON.stringify(cloud));
    } catch (e) { /* stay with local */ }
}

document.addEventListener("DOMContentLoaded", async () => {
    initScrollNav();
    await loadSettingsFromCloud();
    setTimeout(() => {
        const loader = document.getElementById('pageLoader');
        if (loader) loader.classList.add('hidden');
    }, 600);
    updateCartCount();
    loadHeroSettings();
    initSlideshow();
    loadBanners();
    initBrandSlider();
    loadLogo();
    applyFooterSettings();
    loadProducts();
    updateUserNav();
    document.querySelectorAll('.btn-primary, .btn-secondary, .btn, button.bg-gradient-to-r').forEach(el => {
        el.classList.add('ripple-btn');
        el.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = this.getBoundingClientRect();
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';
            ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
});

// ===== Premium Toast System =====
window.showMessage = function(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    const isSuccess = msg.includes('✓') || msg.includes('✅') || msg.includes(t('success'));
    const icon = isSuccess ? 'success' : 'warning';
    toast.innerHTML = `<div class="toast-icon ${icon}">${isSuccess ? '✓' : '!'}</div><div class="toast-text">${msg}</div>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2800);
};

// ===== Banner Grid Dynamic =====
function loadBanners() {
    const grid = document.getElementById('bannerGrid');
    if (!grid) return;
    const s = getSettings();
    const arDefaults = [
        { tag: '🧬 جديد', title: 'أحدث العطور', subtitle: 'اكتشف تشكيلتنا الجديدة كلياً' },
        { tag: '🔥 تخفيضات', title: 'عروض خاصة', subtitle: 'خصم يصل إلى 50% على تشكيلة محددة' },
        { tag: '🎁 هدايا', title: 'مجموعات الهدايا', subtitle: 'هدية فاخرة تناسب كل مناسبة' }
    ];
    const defaults = [
        { image: '', tag: t('bannerNew'), title: t('bannerNewTitle'), subtitle: t('bannerNewSub'), link: 'shop.html', tagStyle: '' },
        { image: '', tag: t('bannerSale'), title: t('bannerSaleTitle'), subtitle: t('bannerSaleSub'), link: 'shop.html', tagStyle: 'background:linear-gradient(135deg,#dc2626,#b91c1c);' },
        { image: '', tag: t('bannerGifts'), title: t('bannerGiftsTitle'), subtitle: t('bannerGiftsSub'), link: 'shop.html', tagStyle: '' }
    ];
    let banners = defaults;
    if (s.banners && s.banners.length === 3) {
        banners = s.banners.map((b, i) => {
            const isArabicDefault = arDefaults[i] && b.tag === arDefaults[i].tag && b.title === arDefaults[i].title && b.subtitle === arDefaults[i].subtitle;
            return {
                image: b.image || '',
                tag: isArabicDefault ? defaults[i].tag : (b.tag || defaults[i].tag),
                title: isArabicDefault ? defaults[i].title : (b.title || defaults[i].title),
                subtitle: isArabicDefault ? defaults[i].subtitle : (b.subtitle || defaults[i].subtitle),
                link: b.link || 'shop.html',
                tagStyle: b.tagStyle || ''
            };
        });
    }
    grid.innerHTML = banners.map(b => {
        const bgStyle = b.image ? `background-image:url('${b.image}');` : `background:linear-gradient(135deg, #3a1a2a, #2a0f1a);`;
        return `
        <div class="banner-card" onclick="window.location.href='${b.link || 'shop.html'}'">
            <div class="banner-bg" style="${bgStyle}"></div>
            <div class="banner-overlay"></div>
            <div class="banner-content">
                <span class="banner-tag" style="${b.tagStyle || ''}">${b.tag || ''}</span>
                <h3>${b.title || ''}</h3>
                <p>${b.subtitle || ''}</p>
            </div>
        </div>`;
    }).join('');
}

// ===== Hero Section Dynamic =====
function loadHeroSettings() {
    const s = getSettings();
    const lang = getLang();
    document.getElementById('heroBadgeText').textContent = s.heroBadge || t('heroBadge');
    document.getElementById('heroTitleText').textContent = s.heroTitle || t('heroTitle');
    document.getElementById('heroSubText').textContent = lang === 'ar' ? (s.heroSubtitleAr || t('heroSubtitle')) : (s.heroSubtitleEn || t('heroSubtitle'));
    if (s.heroImage) {
        const img = document.getElementById('heroCustomImage');
        img.src = s.heroImage;
        img.classList.remove('hidden');
        document.getElementById('heroDefaultIcon').classList.add('hidden');
    }
}

document.addEventListener('langchange', () => {
    loadHeroSettings();
    loadBanners();
    renderBundles();
    renderBrandSlider();
    updateCartCount();
    applyFooterSettings();
    const text = getLang() === 'ar' ? 'EN' : 'AR';
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = text;
    document.querySelectorAll('.lang-toggle-btn').forEach(el => el.textContent = '🌐 ' + text);
});

// ===== Load Logo from Settings =====
function loadLogo() {
    const s = getSettings();
    if (s.logo) {
        ['footerLogo', 'mobileLogo'].forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.querySelector('img')) return;
            const img = document.createElement('img');
            img.src = s.logo;
            img.alt = 'VORA';
            img.style.cssText = id === 'footerLogo' ? 'height:28px;width:auto;' : 'height:24px;width:auto;';
            el.insertBefore(img, el.firstChild);
        });
    }
}

// ===== Footer Contact from Settings =====
function applyFooterSettings() {
    const s = getSettings();
    const wa = document.getElementById('footerWhatsapp');
    const em = document.getElementById('footerEmail');
    if (wa) wa.textContent = t('footerWhatsappLabel') + ' ' + (s.whatsapp || '01000000000');
    if (em) em.textContent = t('footerEmailLabel') + ' ' + (s.email || 'info@vora.com');
    const ig = document.getElementById('footerInstagram');
    if (ig) {
        const handle = s.instagram || 'v0ra.eg';
        ig.innerHTML = t('footerInstagramLabel') + ' <a href="https://instagram.com/' + handle + '" target="_blank" rel="noopener" class="hover:text-[var(--primary)] transition">@' + handle + '</a>';
    }
}

// ===== Quick View =====
window.quickViewHome = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;
    const modal = document.getElementById('quickViewModal');
    if (!modal) return;
    const imageContent = prod.image
        ? `<img src="${prod.image}" alt="${prod.name}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.display='none'; this.parentNode.querySelector('.qv-fallback').style.display='flex';">`
        : '';

    modal.querySelector('.modal-image').innerHTML = `
        ${imageContent}
        <div class="qv-fallback w-full h-full flex items-center justify-center text-amber-600 opacity-70" style="${prod.image ? 'display:none;' : 'display:flex;'}">
            ${BOTTLE_SVG}
        </div>
    `;
    const stock = prod.stock ?? 50;
    const outOfStock = stock <= 0;
    const stockLabel = outOfStock ? `<span style="color:#dc2626;font-weight:700;font-size:13px;">${t('outOfStock')}</span>` : `<span style="color:#16a34a;font-size:13px;">${Icon.check()} ${t('inStock')}</span>`;

    modal.querySelector('.modal-info').innerHTML = `
        <span class="text-amber-600 text-xs font-bold tracking-widest uppercase">${prod.vendor || 'VORA'} ${prod.size ? '• '+prod.size : ''}</span>
        <h2>${prod.name}</h2>
        ${stockLabel}
        ${parseFloat(prod.rating) > 0 ? `<div class="rating-row"><span class="stars">${"★".repeat(Math.round(parseFloat(prod.rating)))+"☆".repeat(5-Math.round(parseFloat(prod.rating)))}</span><span class="count">(${prod.ratingCount || 0})</span></div>` : ''}
        <div class="modal-price">
            ${prod.price} ${t('currency')}
            ${prod.discount && prod.originalPrice ? `<span style="font-size:14px;color:#9c7c8c;text-decoration:line-through;font-weight:400;">${prod.originalPrice} ${t('currency')}</span>` : ''}
        </div>
        <p class="modal-desc">${prod.description || ''}</p>
        <div class="flex gap-2 mt-3">
            ${!outOfStock ? `<button class="modal-add-btn flex-1" onclick="addToCart('${prod.id.replace(/'/g, "\\'")}', '${prod.name.replace(/'/g, "\\'")}', ${prod.price}, '${(prod.image || '').replace(/'/g, "\\'")}'); closeQuickViewHome();">
                ${Icon.plus()} ${t('addToCart')} - ${prod.price} ${t('currency')}
            </button>` : ''}
            <button onclick="shareOnWhatsApp('${prod.name}', ${prod.price}, '${(prod.image || '').replace(/'/g, "\\'")}')" class="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center gap-1">${Icon.mobile()}</button>
        </div>`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    trackRecentlyViewed(prod.id);
};

window.closeQuickViewHome = function() {
    const modal = document.getElementById('quickViewModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
};

// ===== Mobile Menu =====
window.openMobileMenu = function() {
    document.getElementById('mobileMenu').classList.add('open');
    document.getElementById('mobileMenuOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
};
window.closeMobileMenu = function() {
    document.getElementById('mobileMenu').classList.remove('open');
    document.getElementById('mobileMenuOverlay').classList.remove('show');
    document.body.style.overflow = 'auto';
};
window.navigateTo = function(url) {
    closeMobileMenu();
    setTimeout(() => { window.location.href = url; }, 150);
};

// ===== Search Overlay =====
window.openSearchOverlay = function() {
    document.getElementById('searchOverlay').classList.add('active');
    document.getElementById('searchOverlayInput').value = '';
    document.getElementById('searchOverlayResults').innerHTML = '';
    setTimeout(() => document.getElementById('searchOverlayInput').focus(), 100);
    document.body.style.overflow = 'hidden';
};
window.closeSearchOverlay = function() {
    document.getElementById('searchOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
};
window.liveSearch = function(q) {
    const results = document.getElementById('searchOverlayResults');
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) { results.innerHTML = ''; return; }
    const all = JSON.parse(localStorage.getItem('vora_products')) || [];
    const matches = all.filter(p => (p.name||'').toLowerCase().includes(trimmed) || (p.category||'').toLowerCase().includes(trimmed));
    if (matches.length === 0) {
        results.innerHTML = `<div class="search-empty">${t('searchNoResults')}</div>`;
        return;
    }
    results.innerHTML = matches.slice(0, 8).map(p => `
        <a class="search-result-item" href="product.html?id=${p.id}" onclick="closeSearchOverlay()">
            <div class="result-icon">${p.image ? '<img src="'+p.image+'" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;">' : '🧴'}</div>
            <div class="result-info">
                <p>${p.name}</p>
                <span>${p.category || ''}</span>
            </div>
            <span class="result-price">${p.price} ${t('currency')}</span>
        </a>
    `).join('');
};

// ===== Hero Slideshow =====
function initSlideshow() {
    const container = document.getElementById('heroSlideshow');
    const dotsEl = document.getElementById('heroDots');
    if (!container) return;
    const s = getSettings();
    const images = s.slideshowImages || [];
    if (images.length === 0) {
        container.innerHTML = '<div class="hero-slide active" style="background:linear-gradient(160deg, #3a1a2a 0%, #2a0f1a 40%, #3a1a2a 100%);"></div>';
        if (dotsEl) dotsEl.innerHTML = '';
        return;
    }
    container.innerHTML = images.map((img, i) =>
        `<div class="hero-slide ${i === 0 ? 'active' : ''}" style="background-image:url('${img}');"></div>`
    ).join('');
    if (dotsEl) {
        dotsEl.innerHTML = images.map((_, i) =>
            `<button class="hero-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
        ).join('');
    }
    currentSlide = 0;
    startSlideshow();
}

function startSlideshow() {
    clearInterval(slideshowInterval);
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length <= 1) return;
    slideshowInterval = setInterval(() => {
        const s = document.querySelectorAll('.hero-slide');
        goToSlide((currentSlide + 1) % s.length);
    }, 5000);
}

window.goToSlide = function(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    currentSlide = index;
    startSlideshow();
};

// ===== Brand Slider =====
function initBrandSlider() {
    const track = document.getElementById('brandTrack');
    if (!track) return;
    const products = JSON.parse(localStorage.getItem('vora_products')) || [];
    const brands = [...new Set(products.map(p => (p.brand || 'THE ESSENCE OF RADIANCE').trim()).filter(Boolean))];
    if (!brands.includes('THE ESSENCE OF RADIANCE')) brands.unshift('THE ESSENCE OF RADIANCE');
    const items = brands.map(b => `<div class="brand-track-item">${b}</div>`).join('');
    track.innerHTML = items + items;
}

function buildHomeCard(prod, index) {
    const rating = parseFloat(prod.rating) || 0;
    const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
    const discount = prod.discount && prod.originalPrice
        ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
        : 0;

    const card = document.createElement('div');
    card.className = "product-card";
    card.style.cssText = 'flex: 0 0 200px; scroll-snap-align: start;';
    card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.08}s both`;

    const stock = prod.stock ?? 50;
    const outOfStock = stock <= 0;

    const safeNameHtml = escapeHTML(prod.name);
    const safeImageHtml = escapeHTML(prod.image);
    const imageContent = prod.image
        ? `<img src="${safeImageHtml}" alt="${safeNameHtml}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.display='none'; this.parentNode.querySelector('.fallback').style.display='flex';">`
        : '';

    let badgeHtml = "";
    if (index === 0) badgeHtml += `<span class="badge badge-new">${t('newBadge')}</span>`;
    if (discount > 0) badgeHtml += `<span class="badge badge-sale">-${discount}%</span>`;
    if (outOfStock) badgeHtml += `<span class="badge badge-out">${t('outOfStockBadge')}</span>`;

    const safeName = prod.name.replace(/'/g, "\\'");
    const safeId = prod.id.replace(/'/g, "\\'");
    const safeImage = prod.image ? prod.image.replace(/'/g, "\\'") : '';

    const sizeHtml = prod.size ? `<span style="font-weight:400;color:#9c7c8c;"> • ${prod.size}</span>` : '';
    const groupHtml = !outOfStock ? `
        <div class="card-product__group group-left">
            <button onclick="toggleWishlistHome('${safeId}', '${safeName}', ${prod.price})" title="${t('wishlist')}">${Icon.heart()}</button>
            <button onclick="quickViewHome('${safeId}')" title="${t('quickView')}">${Icon.eye()}</button>
        </div>` : '';

    card.innerHTML = `
        <div class="card-media">
            ${badgeHtml}
            ${imageContent}
            <div class="fallback w-full h-full flex items-center justify-center text-amber-600 opacity-70" style="${prod.image ? 'display:none;' : 'display:flex;'}">
                ${BOTTLE_SVG}
            </div>
            <a class="card-link" href="product.html?id=${safeId}" title="${safeNameHtml}"></a>
            ${groupHtml}
            <div class="card-action-overlay">
                ${!outOfStock
                    ? `<button class="add-cart-btn" onclick="addToCart('${safeId}', '${safeName}', ${prod.price}, '${safeImage}')">${Icon.cart()} ${t('addToCart')}</button>`
                    : `<div class="out-of-stock-label">${t('outOfStock')}</div>`}
            </div>
        </div>
        <div class="card-information">
            <div class="card-information__wrapper text-center">
                <div class="card-vendor"><a href="product.html?id=${safeId}">${escapeHTML(prod.vendor || 'VORA')}</a>${sizeHtml}</div>
                <a class="card-title" href="product.html?id=${safeId}"><span class="text">${safeNameHtml}</span></a>
                <div class="rating-row"><span class="stars">${stars}</span></div>
                <div class="card-price">
                    <span class="price-current">${prod.price} ${t('currency')}</span>
                    ${prod.discount && prod.originalPrice ? `<span class="price-original">${prod.originalPrice} ${t('currency')}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    return card;
}

function renderHomeSkeletons(container) {
    container.innerHTML = `
    <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        ${Array.from({ length: 4 }).map(() => `
        <div class="flex-[0_0_200px] space-y-3">
            <div class="skeleton rounded-2xl" style="aspect-ratio:3/4;"></div>
            <div class="skeleton rounded h-3 w-2/3 mx-auto"></div>
            <div class="skeleton rounded h-4 w-1/3 mx-auto"></div>
        </div>
        `).join('')}
    </div>`;
}

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    renderHomeSkeletons(container);
    try {
        const products = await getProducts();
        allProducts = products;
        container.innerHTML = "";

        if (products.length === 0) {
            container.innerHTML = `
                <div class="w-full text-center py-16 space-y-4">
                    <p class="text-4xl">${Icon.gift()}</p>
                    <p class="text-2xl font-bold text-stone-900">${t('shopNoProducts')}</p>
                    <p class="text-stone-600">${t('shopNoProductsHint')}</p>
                </div>`;
            return;
        }

        const sections = [
        { key: 'new-arrivals', labelAr: t('catNew'), labelEn: 'New Arrivals', icon: '🆕' },
        { key: 'best-sellers', labelAr: t('catBestsellers'), labelEn: 'Best Sellers', icon: '🏆' },
            { key: 'for-him', labelAr: 'For Him', labelEn: 'For Him', icon: '👔' },
            { key: 'for-her', labelAr: 'For Her', labelEn: 'For Her', icon: '👗' },
            { key: 'unisex', labelAr: 'Unisex', labelEn: 'Unisex', icon: '🔄' }
        ];

        const grouped = {};
        sections.forEach(s => grouped[s.key] = []);
        products.forEach(prod => {
            const ps = prod.sections || [];
            if (ps.length === 0) {
                if (grouped['best-sellers']) grouped['best-sellers'].push(prod);
            } else {
                ps.forEach(k => { if (grouped[k]) grouped[k].push(prod); });
            }
        });

        let hasAny = false;
        const lang = getLang();
        sections.forEach(section => {
            const items = grouped[section.key] || [];
            if (items.length === 0) return;
            hasAny = true;

            const wrap = document.createElement('div');
            wrap.className = 'w-full mb-8';

            const title = document.createElement('div');
            title.className = 'section-divider mb-5';
            title.innerHTML = `<span>${section.icon} ${lang === 'ar' ? section.labelAr : section.labelEn}</span>`;
            wrap.appendChild(title);

            const row = document.createElement('div');
            row.className = 'flex gap-4 overflow-x-auto pb-2 scrollbar-hide';
            row.style.cssText = 'scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;';

            items.forEach((prod, i) => {
                row.appendChild(buildHomeCard(prod, i));
            });

            wrap.appendChild(row);

            const more = document.createElement('div');
            more.className = 'text-center mt-4';
            more.innerHTML = `<a href="shop.html?section=${section.key}" class="inline-block text-xs font-semibold text-amber-600 hover:text-amber-700 border border-amber-600/30 hover:bg-amber-50 rounded-full px-5 py-2 transition">${t('homeDiscoverMore')}</a>`;
            wrap.appendChild(more);

            container.appendChild(wrap);
        });

        if (!hasAny) {
            const wrap = document.createElement('div');
            wrap.className = 'w-full';
            const title = document.createElement('div');
            title.className = 'section-divider mb-5';
            title.innerHTML = `<span>${Icon.trophy()} ${t('catBestsellers')}</span>`;
            wrap.appendChild(title);
            const row = document.createElement('div');
            row.className = 'flex gap-4 overflow-x-auto pb-2 scrollbar-hide';
            row.style.cssText = 'scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;';
            products.slice(0, 8).forEach((prod, i) => {
                row.appendChild(buildHomeCard(prod, i));
            });
            wrap.appendChild(row);
            const more = document.createElement('div');
            more.className = 'text-center mt-4';
            more.innerHTML = `<a href="shop.html?section=best-sellers" class="inline-block text-xs font-semibold text-amber-600 hover:text-amber-700 border border-amber-600/30 hover:bg-amber-50 rounded-full px-5 py-2 transition">${t('homeDiscoverMore')}</a>`;
            wrap.appendChild(more);
            container.appendChild(wrap);
        }
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = `<p class="text-red-500 text-center w-full py-12">${Icon.warning()} ${t('homeLoadError')}</p>`;
    }
    renderBundles();
    renderBrandSlider();
}

let wishlistHome = JSON.parse(localStorage.getItem('vora_wishlist')) || [];

window.toggleWishlistHome = function(id, name, price) {
    const idx = wishlistHome.findIndex(w => w.id === id);
    if (idx > -1) {
        wishlistHome.splice(idx, 1);
        showWishlistToast(t('notifWishlistRemoved'));
    } else {
        wishlistHome.push({ id, name, price });
        showWishlistToast(`${Icon.check()} ${t('notifWishlistAdded')}`);
    }
    localStorage.setItem('vora_wishlist', JSON.stringify(wishlistHome));
};

function showWishlistToast(msg) {
    let toast = document.getElementById('wishlistToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'wishlistToast';
        toast.className = 'wishlist-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

window.addToCart = function(id, name, price, image) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].qty += 1;
    } else {
        cart.push({ id, name, price, image: image || '', qty: 1 });
    }
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
    const badge = document.getElementById('cartCount');
    if (badge) { badge.classList.remove('cart-badge-bounce'); void badge.offsetWidth; badge.classList.add('cart-badge-bounce'); }
    showMessage(`${Icon.check()} ${t('notifAdded')}`);
};

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = totalQty;
    const text = getLang() === 'ar' ? 'EN' : 'AR';
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = text;
    document.querySelectorAll('.lang-toggle-btn').forEach(el => el.textContent = '🌐 ' + text);
}

window.openCartDrawer = function() {
    renderCartDrawer();
    document.getElementById('cartDrawer').classList.remove('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeCartDrawer = function() {
    document.getElementById('cartDrawer').classList.add('translate-x-full');
    document.getElementById('cartDrawerOverlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
};

window.goToCheckout = function() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    if (cart.length === 0) {
        showMessage(`${Icon.warning()} ${t('notifCartEmpty')}`);
        return;
    }
    window.location.href = 'checkout.html';
};

function renderCartDrawer() {
    const cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');

    if (cart.length === 0) {
        body.innerHTML = `
            <div class="text-center py-16 space-y-4">
                <div class="text-6xl">${Icon.bag()}</div>
                <p class="font-bold text-stone-900 text-lg">${t('cartEmpty')}</p>
                <p class="text-stone-600 text-sm">${t('cartEmptyHint')}</p>
            </div>`;
        footer.classList.add('hidden');
        return;
    }

    footer.classList.remove('hidden');
    body.innerHTML = "";

    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const subtotal = item.price * item.qty;

        const itemSrc = item.image || (allProducts.find(p => p.id === item.id)?.image) || '';
        const drawerImage = itemSrc 
            ? `<img src="${itemSrc}" alt="${item.name}" loading="lazy" class="w-full h-full object-cover rounded-lg">` 
            : BOTTLE_SVG;

        const row = document.createElement('div');
        row.className = "flex gap-4 pb-4 border-b border-stone-200 last:border-0 group hover:bg-stone-50/50 rounded-lg p-3 transition";
        row.innerHTML = `
            <div class="relative w-20 h-24 bg-gradient-to-br from-amber-100 to-stone-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0 shadow-md overflow-hidden">
                ${drawerImage}
                <div class="absolute inset-0 rounded-lg bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            </div>
            <div class="flex-1 space-y-2">
                <div>
                    <p class="font-bold text-stone-900 text-sm">${item.name}</p>
                    <p class="text-xs text-stone-500">${item.price} ${t('currency')}</p>
                </div>
                <div class="flex items-center gap-1 bg-stone-100 rounded-lg w-fit">
                    <button onclick="changeDrawerQty(${index}, -1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">−</button>
                    <span class="w-8 text-center font-bold text-stone-900 text-sm">${item.qty}</span>
                    <button onclick="changeDrawerQty(${index}, 1)" class="w-7 h-7 flex items-center justify-center hover:bg-stone-200 rounded transition text-sm font-bold">+</button>
                </div>
            </div>
            <div class="flex flex-col items-end justify-between">
                <button class="text-red-500 hover:text-red-700 opacity-100 transition text-lg" onclick="removeDrawerItem(${index})">${Icon.trash()}</button>
                <p class="font-bold text-amber-600 text-sm">${subtotal} ${t('currency')}</p>
            </div>
        `;
        body.appendChild(row);
    });

    document.getElementById('cartDrawerTotal').textContent = `${total} ${t('currency')}`;
    document.getElementById('cartSubtotal').textContent = `${total} ${t('currency')}`;
}

window.changeDrawerQty = function(index, change) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
};

window.removeDrawerItem = function(index) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
};

window.logout = function() {
    localStorage.removeItem('vora_user');
    localStorage.removeItem('vora_cart');
    window.location.href = "home.html";
};

window.subscribeNewsletter = function() {
    const email = document.getElementById('newsletterEmail')?.value.trim();
    if (!email || !email.includes('@')) return showMessage(`${Icon.mail()} ${t('footerSubInvalid')}`);
    let subs = JSON.parse(localStorage.getItem('vora_newsletter')) || [];
    if (subs.includes(email)) return showMessage(`${Icon.check()} ${t('footerSubExists')}`);
    subs.push(email);
    localStorage.setItem('vora_newsletter', JSON.stringify(subs));
    document.getElementById('newsletterEmail').value = '';
    showMessage(`${Icon.check()} ${t('footerSubSuccess')}`);
};

function renderBundles() {
    const section = document.getElementById('bundlesSection');
    const grid = document.getElementById('bundlesGrid');
    if (!section || !grid) return;
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const bundles = settings.bundles || [];
    const products = JSON.parse(localStorage.getItem('vora_products')) || [];
    if (bundles.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    const lang = getLang();
    document.getElementById('bundlesSectionTitle').textContent = t('bundlesTitle');
    grid.innerHTML = bundles.map(bundle => {
        const bundleProds = bundle.products.map(id => products.find(p => p.id === id)).filter(Boolean);
        const img = bundleProds.find(p => p.image)?.image || '';
        const total = bundleProds.reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
        const savings = total - bundle.price;
        return `
        <div class="bg-gradient-to-br from-amber-50 to-pink-50 rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div class="aspect-video bg-white flex items-center justify-center p-4">
                ${img ? `<img src="${img}" alt="${bundle.name}" loading="lazy" class="max-w-full max-h-full object-contain">` : '<span class="text-5xl text-amber-600 opacity-40">${Icon.gift()}</span>'}
            </div>
            <div class="p-4 space-y-2">
                <h3 class="font-bold text-stone-900 text-lg" style="font-family:'Playfair Display',serif;">${bundle.name}</h3>
                ${bundle.description ? `<p class="text-sm text-stone-500">${bundle.description}</p>` : ''}
                ${savings > 0 ? `<p class="text-xs text-green-600 font-semibold">${t('bundleSavings').replace('{savings}', savings).replace('{currency}', t('currency'))}</p>` : ''}
                <div class="flex items-center justify-between pt-2">
                    <span class="text-xl font-bold text-amber-600">${bundle.price} ${t('currency')}</span>
                    <button onclick='addBundleToCart(${JSON.stringify(bundle).replace(/'/g, "\\'")})' class="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition">${t('addToCart')}</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderBrandSlider() {
    const section = document.getElementById('brandSliderSection');
    const track = document.getElementById('brandSliderTrack');
    if (!section || !track) return;
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const brands = settings.brands || [];
    if (brands.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    document.getElementById('brandSliderTitle').textContent = t('brandsTitle');
    const cardsHtml = brands.map(b => {
        return `
        <div class="flex flex-col items-center justify-center flex-shrink-0 w-28 sm:w-32 cursor-pointer brand-card" onclick="navigateTo('shop.html?vendor=${encodeURIComponent(b.name)}')">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-50 to-pink-50 border-2 border-stone-100 flex items-center justify-center overflow-hidden hover:border-amber-300 hover:shadow-md transition-all">
                ${b.image ? `<img src="${b.image}" alt="${b.name}" loading="lazy" class="w-full h-full object-cover">` : `<span class="text-2xl font-bold text-stone-300" style="font-family:'Playfair Display',serif;">${(b.name || '?')[0]}</span>`}
            </div>
            <span class="text-xs font-semibold text-stone-700 mt-2 text-center">${b.name || ''}</span>
        </div>`;
    }).join('');
    track.innerHTML = cardsHtml + cardsHtml;
}

window.addBundleToCart = function(bundle) {
    const products = JSON.parse(localStorage.getItem('vora_products')) || [];
    const bundleProds = bundle.products.map(id => products.find(p => p.id === id)).filter(Boolean);
    if (bundleProds.length === 0) { showMessage(t('notifProductUnavailable')); return; }
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const bundleItem = { id: 'bundle_' + Date.now(), name: bundle.name, price: bundle.price, qty: 1, isBundle: true, productIds: bundle.products };
    cart.push(bundleItem);
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    showMessage(`${Icon.check()} ${t('notifAddedToCart').replace('{name}', bundle.name)}`);
};

function trackRecentlyViewed(id) {
    let viewed = JSON.parse(localStorage.getItem('vora_recently_viewed')) || [];
    viewed = viewed.filter(v => v !== id);
    viewed.unshift(id);
    if (viewed.length > 10) viewed = viewed.slice(0, 10);
    localStorage.setItem('vora_recently_viewed', JSON.stringify(viewed));
}

window.shareOnWhatsApp = function(name, price, image) {
    const settings = JSON.parse(localStorage.getItem('vora_settings')) || {};
    const wa = settings.whatsapp || '201000000000';
    const msg = `${Icon.phone()} ${t('whatsappMsg').replace('{name}', name).replace('{price}', price).replace('{currency}', t('currency'))}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
};

function updateUserNav() {
    const user = JSON.parse(localStorage.getItem('vora_user'));
    const desktopEl = document.getElementById('userNavLink');
    const mobileEl = document.getElementById('userNavMobile');
    if (user && user.username) {
        const name = user.username.length > 10 ? user.username.substring(0, 10) + '…' : user.username;
        if (desktopEl) {
            desktopEl.innerHTML = `<span class="text-sm font-semibold text-stone-700 hover:text-amber-600">${name}</span>`;
            desktopEl.href = 'home.html';
        }
        if (mobileEl) {
            mobileEl.innerHTML = `<span class="text-sm font-semibold text-white/80">${name}</span>`;
            mobileEl.href = 'home.html';
        }
    } else {
        if (desktopEl) { desktopEl.innerHTML = '👤'; desktopEl.href = 'index.html'; }
        if (mobileEl) { mobileEl.innerHTML = '👤'; mobileEl.href = 'index.html'; }
    }
}


