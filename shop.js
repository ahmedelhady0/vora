import { getProducts, getSettingsFromFirestore } from "./sheets-service.js";
// استيراد أدوات فاير ستور وقاعدة البيانات من ملف الإعدادات المتوفر لديك
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    });
}

let allProducts = [];
let activeCategory = "الكل";
let searchQuery = "";
let sortMode = "default";
let minPrice = null;
let maxPrice = null;
let activeSection = '';
let activeVendor = null;

async function loadSettingsFromCloud() {
    try {
        const cloud = await getSettingsFromFirestore();
        if (cloud) localStorage.setItem('vora_settings', JSON.stringify(cloud));
    } catch (e) { /* stay with local */ }
}

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

document.addEventListener("DOMContentLoaded", async () => {
    initScrollNav();
    await loadSettingsFromCloud();
    setTimeout(() => {
        const loader = document.getElementById('pageLoader');
        if (loader) loader.classList.add('hidden');
    }, 600);

    updateCartCount();
    initBrandSlider();
    loadLogo();
    applyFooterSettings();
    loadProducts();

    updateBreadcrumbs();
    updateUserNav();

    document.addEventListener('langchange', () => {
        updateCartCount();
        applyFooterSettings();
        renderProducts();
        updateBreadcrumbs();
        const text = getLang() === 'ar' ? 'EN' : 'AR';
        document.querySelectorAll('.lang-toggle-btn').forEach(el => el.textContent = '🌐 ' + text);
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        sortMode = e.target.value;
        renderProducts();
    });

    document.getElementById('minPrice').addEventListener('input', debounce((e) => {
        minPrice = e.target.value ? parseFloat(e.target.value) : null;
        renderProducts();
    }, 300));

    document.getElementById('maxPrice').addEventListener('input', debounce((e) => {
        maxPrice = e.target.value ? parseFloat(e.target.value) : null;
        renderProducts();
    }, 300));

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

function getSettings() {
    const local = JSON.parse(localStorage.getItem('vora_settings'));
    if (local) return local;
    return window.__FALLBACK_SETTINGS || {};
}

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

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

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
            img.style.cssText = 'height:28px;width:auto;';
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

// ===== Premium Toast =====
window.showMessage = function(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    const isSuccess = msg.includes('✓') || msg.includes('✅') || msg.includes('تم');
    toast.innerHTML = `<div class="toast-icon ${isSuccess ? 'success' : 'warning'}">${isSuccess ? '✓' : '!'}</div><div class="toast-text">${msg}</div>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2800);
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

// ===== Search Overlay (Shop) =====
window.openSearchOverlay = function() {
    document.getElementById('searchOverlay').classList.add('active');
    const inp = document.getElementById('searchOverlayInput');
    inp.value = '';
    document.getElementById('searchOverlayResults').innerHTML = '';
    setTimeout(() => inp.focus(), 100);
    inp.onkeydown = (e) => {
        if (e.key === 'Enter' && inp.value.trim()) {
            searchQuery = inp.value.trim().toLowerCase();
            closeSearchOverlay();
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
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
    const matches = allProducts.filter(p => (p.name||'').toLowerCase().includes(trimmed) || (p.category||'').toLowerCase().includes(trimmed));
    if (matches.length === 0) {
        results.innerHTML = `<div class="search-empty">${t('searchNoResults')}</div>`;
        return;
    }
    results.innerHTML = matches.slice(0, 8).map(p => `
        <div class="search-result-item" onclick="closeSearchOverlay(); window.location.href='product.html?id=${p.id}'">
            <div class="result-icon">${p.image ? '<img src="'+p.image+'" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;">' : '🧴'}</div>
            <div class="result-info">
                <p>${p.name}</p>
                <span>${p.category || ''}</span>
            </div>
            <span class="result-price">${p.price} ${t('currency')}</span>
        </div>
    `).join('');
};
window.selectSearchResult = function(id) {
    closeSearchOverlay();
    const prod = allProducts.find(p => p.id === id);
    if (prod) { searchQuery = prod.name; renderProducts(); }
};

async function loadProducts() {
    const container = document.getElementById('productsContainer');
    renderSkeletons(container);

    try {
        // محاولة جلب البيانات مباشرة من Firestore أولاً لتحقيق الربط الفعلي التلقائي
        const querySnapshot = await getDocs(collection(db, "products"));
        const fbProducts = [];
        querySnapshot.forEach((doc) => {
            fbProducts.push({ id: doc.id, ...doc.data() });
        });

        if (fbProducts.length > 0) {
            allProducts = fbProducts;
        } else {
            // كخيار احتياطي في حال كانت المجموعة فارغة في فاير ستور، يستمر بالاعتماد على sheets
            allProducts = await getProducts();
        }

        buildCategoryPills();
        applySectionFilter();
        renderProducts();
    } catch (err) {
        console.error('Error loading products from Firestore, trying Sheets...', err);
        try {
            allProducts = await getProducts();
            buildCategoryPills();
            applySectionFilter();
            renderProducts();
        } catch (sheetErr) {
            console.error('Error loading products from Sheets:', sheetErr);
            container.innerHTML = `<p class="text-red-500 text-center py-12">⚠️ حدث خطأ أثناء تحميل المنتجات</p>`;
        }
    }
}

function applySectionFilter() {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('section');
    if (s && ['new-arrivals','best-sellers','for-him','for-her','unisex'].includes(s)) {
        activeSection = s;
    }
    const v = params.get('vendor');
    if (v) activeVendor = v;
}

const SECTION_META = {
    'new-arrivals': { icon: '🆕', labelAr: 'جديد', labelEn: 'New Arrivals' },
    'best-sellers': { icon: '🏆', labelAr: 'الأكثر مبيعاً', labelEn: 'Best Sellers' },
    'for-him': { icon: '👔', labelAr: 'For Him', labelEn: 'For Him' },
    'for-her': { icon: '👗', labelAr: 'For Her', labelEn: 'For Her' },
    'unisex': { icon: '🔄', labelAr: 'Unisex', labelEn: 'Unisex' }
};

function updateBreadcrumbs() {
    const el = document.getElementById('breadcrumbs');
    if (!el) return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get('section');
    const v = params.get('vendor');
    const lang = getLang();
    const homeLabel = lang === 'ar' ? 'الرئيسية' : 'Home';
    const shopLabel = lang === 'ar' ? 'المتجر' : 'Shop';
    if (s && SECTION_META[s]) {
        const sec = SECTION_META[s];
        const secLabel = lang === 'ar' ? sec.labelAr : sec.labelEn;
        el.innerHTML = `<a href="home.html" class="hover:text-amber-600 transition">${homeLabel}</a><span class="mx-1">›</span><a href="shop.html" class="hover:text-amber-600 transition">${shopLabel}</a><span class="mx-1">›</span><span class="text-stone-600 font-medium">${secLabel}</span>`;
    } else if (v) {
        el.innerHTML = `<a href="home.html" class="hover:text-amber-600 transition">${homeLabel}</a><span class="mx-1">›</span><a href="shop.html" class="hover:text-amber-600 transition">${shopLabel}</a><span class="mx-1">›</span><span class="text-stone-600 font-medium">${v}</span>`;
    } else {
        el.innerHTML = `<a href="home.html" class="hover:text-amber-600 transition">${homeLabel}</a><span class="mx-1">›</span><span class="text-stone-600 font-medium">${shopLabel}</span>`;
    }
}

function renderSkeletons(container) {
    container.innerHTML = `<div class="products-grid">${Array.from({ length: 6 }).map(() => `
        <div class="space-y-3">
            <div class="skeleton rounded-2xl" style="aspect-ratio: 1;"></div>
            <div class="skeleton rounded h-3 w-1/3"></div>
            <div class="skeleton rounded h-4 w-2/3"></div>
            <div class="skeleton rounded h-3 w-1/4"></div>
        </div>
    `).join("")}</div>`;
}

function buildCategoryPills() {
    const categories = ["الكل", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const wrap = document.getElementById('categoryPills');
    wrap.innerHTML = categories.map(cat => `
        <button class="category-pill ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">
            ${cat}
        </button>
    `).join("");

    wrap.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category;
            wrap.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts();
        });
    });
}

function getFilteredProducts() {
    let list = [...allProducts];

    if (activeCategory !== "الكل") {
        list = list.filter(p => p.category === activeCategory);
    }

    if (searchQuery) {
        list = list.filter(p =>
            (p.name || "").toLowerCase().includes(searchQuery) ||
            (p.description || "").toLowerCase().includes(searchQuery) ||
            (p.category || "").toLowerCase().includes(searchQuery)
        );
    }

    if (minPrice !== null && !isNaN(minPrice)) {
        list = list.filter(p => parseFloat(p.price) >= minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
        list = list.filter(p => parseFloat(p.price) <= maxPrice);
    }

    if (activeSection) {
        list = list.filter(p => (p.sections || []).includes(activeSection));
    }
    if (activeVendor) {
        list = list.filter(p => (p.vendor || 'VORA').trim().toLowerCase() === activeVendor.trim().toLowerCase());
    }

    switch (sortMode) {
        case "price-asc":
            list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case "price-desc":
            list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case "rating-desc":
            list.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
            break;
        case "name-asc":
            list.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ar'));
            break;
        default:
            break;
    }

    return list;
}

function renderProducts() {
    const container = document.getElementById('productsContainer');
    const countEl = document.getElementById('resultsCount');
    const filtered = getFilteredProducts();

    countEl.textContent = allProducts.length > 0
        ? `${t('shopResults')} ${filtered.length} ${t('shopOf')} ${allProducts.length} ${t('shopProducts')}`
        : "";

    let sectionHeader = '';
    if (activeSection && SECTION_META[activeSection]) {
        const m = SECTION_META[activeSection];
        const label = getLang() === 'ar' ? m.labelAr : m.labelEn;
        sectionHeader = `
        <div class="w-full mb-6 pb-4 border-b border-stone-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="text-2xl">${m.icon}</span>
                <div>
                    <h2 class="text-2xl font-bold text-stone-900">${label}</h2>
                    <p class="text-sm text-stone-500">${t('shopResults')} ${filtered.length} ${t('shopProducts')}</p>
                </div>
            </div>
            <button onclick="window.clearSectionFilter()" class="text-xs text-amber-600 hover:text-amber-700 font-semibold px-3 py-1.5 rounded-lg border border-amber-600/30 hover:bg-amber-50 transition">✕ إزالة الفلتر</button>
        </div>`;
    } else if (activeVendor) {
        const label = getLang() === 'ar' ? activeVendor : activeVendor;
        sectionHeader = `
        <div class="w-full mb-6 pb-4 border-b border-stone-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="text-2xl">🏪</span>
                <div>
                    <h2 class="text-2xl font-bold text-stone-900">${label}</h2>
                    <p class="text-sm text-stone-500">${t('shopResults')} ${filtered.length} ${t('shopProducts')}</p>
                </div>
            </div>
            <button onclick="window.clearVendorFilter()" class="text-xs text-amber-600 hover:text-amber-700 font-semibold px-3 py-1.5 rounded-lg border border-amber-600/30 hover:bg-amber-50 transition">✕ إزالة الفلتر</button>
        </div>`;
    }

    container.innerHTML = sectionHeader;

    if (allProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 space-y-4">
                <p class="text-4xl">🎁</p>
                <p class="text-2xl font-bold text-stone-900">${t('shopNoProducts')}</p>
                <p class="text-stone-600">${t('shopNoProductsHint')}</p>
            </div>`;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 space-y-4">
                <p class="text-4xl">🔍</p>
                <p class="text-2xl font-bold text-stone-900">${t('shopNoResults')}</p>
                <p class="text-stone-600">${t('shopNoResultsHint')}</p>
                <button onclick="window.resetFilters()" class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg font-semibold hover:shadow-lg transition">${t('shopReset')}</button>
            </div>`;
        return;
    }

    const groups = new Map();
    filtered.forEach(prod => {
        const key = prod.category || 'VORA';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(prod);
    });

    groups.forEach((products, categoryName) => {
        const section = document.createElement('div');
        section.className = "mb-12";
        section.innerHTML = `
            <h2 class="text-xl font-bold text-stone-900 mb-1">${categoryName}</h2>
            <div class="h-px bg-gradient-to-r from-amber-600/50 to-transparent w-full mb-6"></div>
            <div class="products-grid"></div>
        `;
        const grid = section.querySelector('.products-grid');

        const firstIndex = allProducts.findIndex(p => p.id === products[0].id);
        const delayBase = firstIndex >= 0 ? firstIndex * 0.05 : 0;

        products.forEach((prod, i) => {
            const card = buildProductCard(prod);
            card.style.animation = `fadeInUp 0.4s ease-out ${delayBase + i * 0.05}s both`;
            grid.appendChild(card);
        });

        container.appendChild(section);
    });
}

function buildProductCard(prod) {
    const discountPct = prod.discountPercent || (prod.discount && prod.originalPrice
        ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) : 0);
    const rating = parseFloat(prod.rating) || 0;
    const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
    const isNew = parseInt(prod.id?.split('-')[1]) % 3 === 0;
    const stock = prod.stock ?? 50;
    const outOfStock = stock <= 0;

    const card = document.createElement('div');
    card.className = "product-card";
    const safeName = prod.name.replace(/'/g, "\\'");
    const safeId = prod.id.replace(/'/g, "\\'");
    const safeImage = (prod.image || "").replace(/'/g, "\\'");

    let badgeHtml = "";
    if (isNew) badgeHtml += `<span class="badge badge-new">${t('newBadge')}</span>`;
    if (discountPct > 0) badgeHtml += `<span class="badge badge-sale">-${discountPct}%</span>`;
    if (outOfStock) badgeHtml += `<span class="badge badge-out">${t('outOfStockBadge')}</span>`;

    const imageContent = prod.image
        ? `<img src="${prod.image}" alt="${prod.name}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.display='none'; this.parentNode.querySelector('.fallback').style.display='flex';">`
        : '';

    const stockLabel = outOfStock ? '' : `<span style="color:#16a34a;font-size:10px;font-weight:600;">✓ ${t('inStock')}</span>`;

    const sizeHtml = prod.size ? `<span style="font-weight:400;color:#9c7c8c;"> • ${prod.size}</span>` : '';
    const groupHtml = !outOfStock ? `
        <div class="card-product__group group-left">
            <button onclick="toggleWishlist('${safeId}', '${safeName}', ${prod.price})" title="${t('wishlist')}">🤍</button>
            <button onclick="quickView('${safeId}')" title="${t('quickView')}">👁️</button>
        </div>` : '';

    card.innerHTML = `
        <div class="card-media">
            ${badgeHtml}
            ${imageContent}
            <div class="fallback w-full h-full flex items-center justify-center text-amber-600 opacity-70" style="${prod.image ? 'display:none;' : 'display:flex;'}">
                ${BOTTLE_SVG}
            </div>
            <a class="card-link" href="product.html?id=${safeId}" title="${prod.name}"></a>
            ${groupHtml}
            <div class="card-action-overlay">
                ${!outOfStock
                    ? `<button class="add-cart-btn" onclick="addToCart('${safeId}', '${safeName}', ${prod.price}, '${safeImage}')">🛒 ${t('addToCart')}</button>`
                    : `<div class="out-of-stock-label">${t('outOfStock')}</div>`}
            </div>
        </div>
        <div class="card-information">
            <div class="card-information__wrapper text-center">
                <div class="card-vendor"><a href="product.html?id=${safeId}">${prod.vendor || 'VORA'}</a>${sizeHtml}</div>
                <a class="card-title" href="product.html?id=${safeId}"><span class="text">${prod.name}</span></a>
                ${rating > 0 ? `<div class="rating-row"><span class="stars">${stars}</span><span class="count">(${prod.ratingCount || 0})</span></div>` : ''}
                <div class="card-desc">${stockLabel}</div>
                <div class="card-price">
                    <span class="price-current">${prod.price} ${t('currency')}</span>
                    ${prod.discount && prod.originalPrice ? `<span class="price-original">${prod.originalPrice} ${t('currency')}</span>` : ''}
                </div>
            </div>
        </div>
    `;
    return card;
}

window.quickView = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;
    const modal = document.getElementById('quickViewModal');
    const imageContent = prod.image
        ? `<img src="${prod.image}" alt="${prod.name}" onload="this.classList.add('loaded')" onerror="this.style.display='none'; this.parentNode.querySelector('.qv-fallback').style.display='flex';">`
        : '';

    modal.querySelector('.modal-image').innerHTML = `
        ${imageContent}
        <div class="qv-fallback w-full h-full flex items-center justify-center text-amber-600 opacity-70" style="${prod.image ? 'display:none;' : 'display:flex;'}">
            ${BOTTLE_SVG}
        </div>
    `;
    const stock = prod.stock ?? 50;
    const outOfStock = stock <= 0;
    const stockLabel = outOfStock ? `<span style="color:#dc2626;font-weight:700;font-size:13px;">${t('outOfStock')}</span>` : `<span style="color:#16a34a;font-size:13px;">✓ ${t('inStock')}</span>`;
    const safeImage = (prod.image || "").replace(/'/g, "\\'");

    modal.querySelector('.modal-info').innerHTML = `
        <span class="text-amber-600 text-xs font-bold tracking-widest uppercase">${prod.brand || prod.category || 'VORA'} ${prod.size ? '• '+prod.size : ''}</span>
        <h2>${prod.name}</h2>
        ${stockLabel}
        ${parseFloat(prod.rating) > 0 ? `<div class="rating-row"><span class="stars">${"★".repeat(Math.round(parseFloat(prod.rating)))+"☆".repeat(5-Math.round(parseFloat(prod.rating)))}</span><span class="count">(${prod.ratingCount || 0})</span></div>` : ''}
        <div class="modal-price">
            ${prod.price} ${t('currency')}
            ${prod.discount && prod.originalPrice ? `<span style="font-size:14px;color:#9c7c8c;text-decoration:line-through;font-weight:400;">${prod.originalPrice} ${t('currency')}</span>` : ''}
        </div>
        <p class="modal-desc">${prod.description || ''}</p>
        <div class="flex gap-2 mt-3">
            ${!outOfStock ? `<button class="modal-add-btn flex-1" onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price}, '${safeImage}'); closeQuickView();">
                ➕ ${t('addToCart')} - ${prod.price} ${t('currency')}
            </button>` : ''}
            <button onclick="shareOnWhatsApp('${prod.name}', ${prod.price}, '${safeImage}')" class="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center gap-1">📱</button>
        </div>
    `;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    trackRecentlyViewed(prod.id);
};

window.closeQuickView = function() {
    document.getElementById('quickViewModal').classList.remove('active');
    document.body.style.overflow = 'auto';
};

let wishlist = JSON.parse(localStorage.getItem('vora_wishlist')) || [];

window.toggleWishlist = function(id, name, price) {
    const idx = wishlist.findIndex(w => w.id === id);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        showWishlistToast(t('notifWishlistRemoved'));
    } else {
        wishlist.push({ id, name, price });
        showWishlistToast(`✓ ${t('notifWishlistAdded')}`);
    }
    localStorage.setItem('vora_wishlist', JSON.stringify(wishlist));
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

window.clearSectionFilter = function() {
    activeSection = '';
    window.history.replaceState({}, '', window.location.pathname);
    renderProducts();
};

window.clearVendorFilter = function() {
    activeVendor = null;
    window.history.replaceState({}, '', window.location.pathname);
    renderProducts();
};

window.resetFilters = function() {
    activeCategory = "الكل";
    searchQuery = "";
    sortMode = "default";
    minPrice = null;
    maxPrice = null;
    activeSection = '';

    const ss = document.getElementById('shopSearch');
    if (ss) ss.value = "";
    document.getElementById('sortSelect').value = "default";
    document.getElementById('minPrice').value = "";
    document.getElementById('maxPrice').value = "";

    buildCategoryPills();
    renderProducts();
};

window.addToCart = function(id, name, price, image) {
    let cart = JSON.parse(localStorage.getItem('vora_cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === id);
    
    // إذا لم يتم تمرير الصورة مباشرة، نبحث عنها في المصفوفة الرئيسية كاحتياط
    if (!image) {
        const prod = allProducts.find(p => p.id === id);
        image = prod ? prod.image : '';
    }

    if (itemIndex > -1) {
        cart[itemIndex].qty += 1;
    } else {
        // إضافة حقل image لتخزينه في الـ LocalStorage للسلة
        cart.push({ id, name, price, image: image || '', qty: 1 });
    }
    localStorage.setItem('vora_cart', JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
    const badge = document.getElementById('cartCount');
    if (badge) { badge.classList.remove('cart-badge-bounce'); void badge.offsetWidth; badge.classList.add('cart-badge-bounce'); }
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
        showMessage(`⚠️ ${t('notifCartEmpty')}`);
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

        // التحقق الذكي لعرض صورة المنتج الحقيقية المخزنة أو الـ SVG كاحتياط
        const drawerImage = item.image 
            ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover rounded-lg">` 
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
    const lang = getLang();
    const msg = lang === 'ar'
        ? `👋 مرحباً! أود الاستفسار عن: ${name} (${price} ج.م)`
        : `👋 Hello! I'd like to ask about: ${name} (${price} EGP)`;
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
