import { getProducts, getSettingsFromFirestore } from "./sheets-service.js";

const BOTTLE_SVG = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="4" width="16" height="8" rx="1.5" fill="currentColor" opacity="0.7"/>
    <path d="M20 14 Q20 12 22 12 L42 12 Q44 12 44 14 L48 30 Q49 36 49 42 L49 56 Q49 60 45 60 L19 60 Q15 60 15 56 L15 42 Q15 36 16 30 Z"
          stroke="currentColor" stroke-width="2" fill="none"/>
    <line x1="15" y1="34" x2="49" y2="34" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
</svg>`;

const userData = JSON.parse(localStorage.getItem('vora_user'));
if (userData && (userData.role === 'admin' || userData.role === 'manager')) {
    document.addEventListener("DOMContentLoaded", () => {
        const el = document.getElementById('adminNavLink');
        if (el) el.classList.remove('hidden');
        const mob = document.getElementById('adminNavMobile');
        if (mob) mob.classList.remove('hidden');
    });
}

function getSettings() {
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) return local;
    return window.__FALLBACK_SETTINGS || {};
}

let slideshowInterval = null;
let currentSlide = 0;

async function loadSettingsFromCloud() {
    try {
        const cloud = await getSettingsFromFirestore();
        if (cloud) localStorage.setItem('vora_settings', JSON.stringify(cloud));
    } catch (e) { /* stay with local */ }
}

document.addEventListener("DOMContentLoaded", async () => {
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
    const isSuccess = msg.includes('✓') || msg.includes('✅') || msg.includes('تم');
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
    document.getElementById('heroBadgeText').textContent = s.heroBadge || t('heroBadge');
    document.getElementById('heroTitleText').textContent = s.heroTitle || t('heroTitle');
    document.getElementById('heroSubText').textContent = s.heroSubtitle || t('heroSubtitle');
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
        results.innerHTML = '<div class="search-empty">لا توجد نتائج</div>';
        return;
    }
    results.innerHTML = matches.slice(0, 8).map(p => `
        <a class="search-result-item" href="shop.html" onclick="closeSearchOverlay()">
            <div class="result-icon">🧴</div>
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

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    try {
        const products = await getProducts();
        container.innerHTML = "";

        if (products.length === 0) {
            container.innerHTML = `
                <div class="w-full text-center py-16 space-y-4">
                    <p class="text-4xl">🎁</p>
                    <p class="text-2xl font-bold text-stone-900">لا توجد عطور بعد</p>
                    <p class="text-stone-600">هنا هتظهر تشكيلة VORA بمجرد ما يتم إضافتها من لوحة الإدارة.</p>
                </div>`;
            return;
        }

        const bestSellers = products.slice(0, 4);

        bestSellers.forEach((prod, index) => {
            const rating = parseFloat(prod.rating) || 0;
            const stars = rating > 0 ? "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)) : "☆☆☆☆☆";
            const discount = prod.discount && prod.originalPrice
                ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
                : 0;

            const card = document.createElement('div');
            card.className = "product-card";
            card.style.width = "220px";
            card.style.flexShrink = "0";
            card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.08}s both`;

            const stock = prod.stock ?? 50;
            const outOfStock = stock <= 0;

            const imageContent = prod.image
                ? `<img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.style.display='none'; this.parentNode.querySelector('.fallback').style.display='flex';">`
                : '';

            let badgeHtml = "";
            if (index === 0) badgeHtml += `<span class="badge badge-new">جديد</span>`;
            if (discount > 0) badgeHtml += `<span class="badge badge-sale">-${discount}%</span>`;
            if (outOfStock) badgeHtml += `<span class="badge badge-out">نفد</span>`;

            const safeName = prod.name.replace(/'/g, "\\'");
            const safeId = prod.id.replace(/'/g, "\\'");

            const sizeHtml = prod.size ? `<span style="font-weight:400;color:#9c7c8c;"> • ${prod.size}</span>` : '';
            const groupHtml = !outOfStock ? `
                <div class="card-product__group group-left">
                    <button onclick="toggleWishlistHome('${safeId}', '${safeName}', ${prod.price})" title="المفضلة">🤍</button>
                    <button onclick="window.location.href='shop.html'" title="عرض سريع">👁️</button>
                </div>` : '';

            card.innerHTML = `
                <div class="card-media">
                    ${badgeHtml}
                    ${imageContent}
                    <div class="fallback w-full h-full flex items-center justify-center text-amber-600 opacity-70" style="${prod.image ? 'display:none;' : 'display:flex;'}">
                        ${BOTTLE_SVG}
                    </div>
                    <a class="card-link" href="shop.html" title="${prod.name}"></a>
                    ${groupHtml}
                    <div class="card-action-overlay">
                        ${!outOfStock
                            ? `<button class="add-cart-btn" onclick="addToCart('${safeId}', '${safeName}', ${prod.price})">🛒 ${t('addToCart')}</button>`
                            : `<div class="out-of-stock-label">${t('outOfStock')}</div>`}
                    </div>
                </div>
                <div class="card-information">
                    <div class="card-information__wrapper text-center">
                        <div class="card-vendor"><a href="shop.html">${prod.brand || prod.category || 'VORA'}</a>${sizeHtml}</div>
                        <a class="card-title" href="shop.html"><span class="text">${prod.name}</span></a>
                        <div class="rating-row"><span class="stars">${stars}</span></div>
                        <div class="card-price">
                            <span class="price-current">${prod.price} ${t('currency')}</span>
                            ${prod.discount && prod.originalPrice ? `<span class="price-original">${prod.originalPrice} ${t('currency')}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading products:', err);
        container.innerHTML = `<p class="text-red-500 text-center w-full py-12">⚠️ حدث خطأ أثناء تحميل المنتجات</p>`;
    }
}

let wishlistHome = JSON.parse(localStorage.getItem('vora_wishlist')) || [];

window.toggleWishlistHome = function(id, name, price) {
    const idx = wishlistHome.findIndex(w => w.id === id);
    if (idx > -1) {
        wishlistHome.splice(idx, 1);
        showWishlistToast(`تمت إزالة "${name}" من المفضلة`);
    } else {
        wishlistHome.push({ id, name, price });
        showWishlistToast(`✓ تمت إضافة "${name}" إلى المفضلة`);
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
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

window.addToCart = function(id, name, price) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].qty += 1;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
    showMessage(`✓ ${t('notifAdded')}`);
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
        showMessage('⚠️ السلة فارغة. أضف منتجات أولاً');
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
                <div class="text-6xl">🛍️</div>
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

        const row = document.createElement('div');
        row.className = "flex gap-4 pb-4 border-b border-stone-200 last:border-0 group hover:bg-stone-50/50 rounded-lg p-3 transition";
        row.innerHTML = `
            <div class="relative w-20 h-24 bg-gradient-to-br from-amber-100 to-stone-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0 shadow-md">
                ${BOTTLE_SVG}
                <div class="absolute inset-0 rounded-lg bg-gradient-to-t from-black/10 to-transparent"></div>
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
                <button class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition text-lg" onclick="removeDrawerItem(${index})">🗑️</button>
                <p class="font-bold text-amber-600 text-sm">${subtotal} ${t('currency')}</p>
            </div>
        `;
        body.appendChild(row);
    });

    document.getElementById('cartDrawerTotal').textContent = `${total} ${t('currency')}`;
    document.getElementById('cartSubtotal').textContent = `${total} ${t('currency')}`;
    document.getElementById('cartShipping').textContent = t('cartFree');
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
    if (!email || !email.includes('@')) return showMessage(`✉️ ${t('footerSubInvalid')}`);
    let subs = JSON.parse(localStorage.getItem('vora_newsletter')) || [];
    if (subs.includes(email)) return showMessage(`✅ ${t('footerSubExists')}`);
    subs.push(email);
    localStorage.setItem('vora_newsletter', JSON.stringify(subs));
    document.getElementById('newsletterEmail').value = '';
    showMessage(`✅ ${t('footerSubSuccess')}`);
};


